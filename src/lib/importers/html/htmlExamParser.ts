import { Flashcard, Deck, DeckCategory } from '@/types';
import { computeDeckStats } from '@/lib/services/flashcardService';
import { inferCategoryFromName, decodeHtmlEntities, cleanOptionLabel } from '../anki/ankiConverter';
import { classifyCardHeuristic } from '@/lib/services/ndleClassifierService';

export interface ParsedHtmlExamItem {
  number?: number;
  question: string;
  options: string[];
  answer: string;
  answerIndex?: number;
  rationale?: string;
  tags?: string[];
}

export interface HtmlExamParseResult {
  title: string;
  description: string;
  category: DeckCategory;
  cards: Partial<Flashcard>[];
  totalQuestions: number;
}

/**
 * Clean up HTML tags into clean text with newlines
 */
function stripHtmlTags(html: string): string {
  if (!html) return '';
  const text = html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(text).replace(/\s+/g, ' ').trim();
}

/**
 * Extracts a balanced JS/JSON array starting with `[`
 */
function extractBalancedArrayString(str: string, startIndex: number): string | null {
  let depth = 0;
  let inString: string | null = null;
  let isEscaped = false;

  for (let i = startIndex; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
      if (depth === 0) {
        return str.substring(startIndex, i + 1);
      }
    }
  }

  return null;
}

/**
 * Safely parse a JS object array string (supports JSON, unquoted keys, single quotes, trailing commas)
 */
function safeParseJsArray(arrayText: string): unknown[] | null {
  // 1. Try standard JSON parse first
  try {
    const parsed = JSON.parse(arrayText);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Continue to relaxed parsing
  }

  // 2. Try converting JS object literal notation to valid JSON
  try {
    const sanitized = arrayText
      // Replace single-quoted strings with double-quoted strings
      .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, content) => {
        return JSON.stringify(content.replace(/\\'/g, "'"));
      })
      // Quote unquoted object keys (e.g. q:, options:, choices:, answer:)
      .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      // Remove trailing commas before } or ]
      .replace(/,\s*([}\]])/g, '$1');

    const parsed = JSON.parse(sanitized);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Continue to function evaluation fallback
  }

  // 3. Fallback: parse via Function constructor (safe for data literals)
  try {
    // Basic safety check: verify it starts with [ and doesn't contain dangerous tokens
    const trimmed = arrayText.trim();
    if (trimmed.startsWith('[') && !/\b(process|require|import|eval|window|document|fetch|localStorage)\b/.test(trimmed)) {
      const parsed = new Function(`"use strict"; return (${trimmed});`)();
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Parsing failed
  }

  return null;
}

/**
 * Extract question array from script tags in HTML
 */
function extractQuestionsFromScripts(htmlText: string): unknown[] | null {
  // Look for script tags
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(htmlText)) !== null) {
    const scriptContent = match[1];

    // Find variable declarations like: const data=[...], const questions=[...], let quiz=[...]
    const varMatches = [
      /(?:const|let|var|window\.)?\s*(?:data|questions|items|examQuestions|quizQuestions|mcqs|cards|quiz)\s*=\s*\[/i,
      /(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*\[\s*\{/i,
      /\[\s*\{\s*["'](?:q|question|stem|prompt|front)["']\s*:/i
    ];

    for (const pattern of varMatches) {
      const found = scriptContent.search(pattern);
      if (found !== -1) {
        // Find the '[' index
        const bracketIndex = scriptContent.indexOf('[', found);
        if (bracketIndex !== -1) {
          const arrayStr = extractBalancedArrayString(scriptContent, bracketIndex);
          if (arrayStr) {
            const parsed = safeParseJsArray(arrayStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          }
        }
      }
    }
  }

  // Fallback: search anywhere in text if script tags were malformed or omitted
  const directIndex = htmlText.search(/\[\s*\{\s*["'](?:q|question|stem|prompt)["']\s*:/i);
  if (directIndex !== -1) {
    const arrayStr = extractBalancedArrayString(htmlText, directIndex);
    if (arrayStr) {
      const parsed = safeParseJsArray(arrayStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Fallback: parse questions directly from static HTML DOM structure
 */
function parseQuestionsFromDom(htmlText: string): ParsedHtmlExamItem[] {
  const items: ParsedHtmlExamItem[] = [];

  // Match question cards / blocks: <article class="card">, <section class="card">, <div class="card">
  const cardRegex = /<(?:article|section|div)\s+[^>]*class=["'][^"']*(?:card|question-container|q-card)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|section|div)>/gi;
  let cardMatch: RegExpExecArray | null;

  while ((cardMatch = cardRegex.exec(htmlText)) !== null) {
    const cardHtml = cardMatch[1];

    // Extract question text (.qhead, .question, h2, h3)
    const qMatch = cardHtml.match(/<(?:\w+)\s+[^>]*class=["'][^"']*(?:qhead|question|stem|q-text)[^"']*["'][^>]*>([\s\S]*?)<\/\w+>/i);
    if (!qMatch) continue;

    const questionText = stripHtmlTags(qMatch[1]);
    if (!questionText) continue;

    // Extract options
    const optRegex = /<(?:label|div|li)\s+[^>]*class=["'][^"']*(?:opt|option|choice)[^"']*["'][^>]*>([\s\S]*?)<\/(?:label|div|li)>/gi;
    let optMatch: RegExpExecArray | null;
    const options: string[] = [];
    let detectedAnswer: string | null = null;

    while ((optMatch = optRegex.exec(cardHtml)) !== null) {
      const optHtml = optMatch[1];
      const optText = stripHtmlTags(optHtml.replace(/<input[^>]*>/gi, ''));
      const cleaned = cleanOptionLabel(optText);
      if (cleaned) {
        options.push(cleaned);
        // Check if this option has a 'good', 'correct', or 'selected' indicator
        if (/(?:class=["'][^"']*(?:good|correct)[^"']*["'])/i.test(optMatch[0])) {
          detectedAnswer = cleaned;
        }
      }
    }

    // Check for explicit "Correct answer: ..." note
    const ansNoteMatch = cardHtml.match(/(?:correct answer|answer key)[\:\s\-]+(?:<b>|<strong>)?([A-Da-d][\.\)]\s*)?([^<]+)/i);
    if (!detectedAnswer && ansNoteMatch) {
      const rawAns = cleanOptionLabel(stripHtmlTags(ansNoteMatch[2]));
      detectedAnswer = rawAns;
    }

    if (options.length >= 2) {
      const answer = detectedAnswer || options[0];
      items.push({
        question: questionText,
        options,
        answer,
        tags: ['Interactive Exam']
      });
    }
  }

  return items;
}

/**
 * Main parser for Interactive Exam HTML documents
 */
export function parseHtmlExamText(
  htmlText: string,
  fallbackTitle: string = 'Interactive Exam Deck',
  defaultCategory: DeckCategory = 'General Dietetics'
): HtmlExamParseResult {
  // 1. Extract Title
  let title = fallbackTitle;
  const h1Match = htmlText.match(/<header[^>]*>[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i) || htmlText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titleTagMatch = htmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (h1Match && h1Match[1].trim()) {
    title = stripHtmlTags(h1Match[1]);
  } else if (titleTagMatch && titleTagMatch[1].trim()) {
    title = stripHtmlTags(titleTagMatch[1])
      .replace(/\s*\|\s*Interactive Exam.*$/i, '')
      .replace(/\s*-\s*Interactive Exam.*$/i, '')
      .replace(/\s*·\s*Interactive Exam.*$/i, '')
      .trim();
  }

  // 2. Extract Description / Note
  let description = '';
  const subMatch = htmlText.match(/<p\s+[^>]*class=["'][^"']*\bsub\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  const noteMatch = htmlText.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i) || htmlText.match(/<div\s+[^>]*class=["'][^"']*\bsmall\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  if (subMatch) {
    description = stripHtmlTags(subMatch[1]);
  } else if (noteMatch) {
    description = stripHtmlTags(noteMatch[1]);
  }

  // 3. Infer Category from title and description
  const category = inferCategoryFromName(title + ' ' + description, defaultCategory);

  // 4. Extract Questions (try script data first, fallback to DOM)
  const rawQuestions = extractQuestionsFromScripts(htmlText);
  const parsedCards: Partial<Flashcard>[] = [];

  if (rawQuestions && Array.isArray(rawQuestions)) {
    for (let i = 0; i < rawQuestions.length; i++) {
      const item = rawQuestions[i] as Record<string, unknown>;
      if (!item || typeof item !== 'object') continue;

      // Extract question prompt
      const qRaw = String(item.q || item.question || item.prompt || item.stem || item.front || '').trim();
      const front = decodeHtmlEntities(qRaw).trim();
      if (!front) continue;

      // Extract options / choices
      const optsRaw = (item.options || item.choices || item.answers || item.distractors || []) as unknown[];
      if (!Array.isArray(optsRaw) || optsRaw.length === 0) continue;

      const rawOptions: string[] = [];
      let isCorrectIndexFromOpts = -1;

      for (let j = 0; j < optsRaw.length; j++) {
        const o = optsRaw[j];
        if (typeof o === 'string') {
          rawOptions.push(decodeHtmlEntities(o).trim());
        } else if (o && typeof o === 'object') {
          const obj = o as Record<string, unknown>;
          const text = String(obj.text || obj.label || obj.choice || obj.option || '').trim();
          rawOptions.push(decodeHtmlEntities(text));
          if (obj.isCorrect === true || obj.correct === true) {
            isCorrectIndexFromOpts = j;
          }
        }
      }

      // Determine correct answer
      let answerText = '';
      const ansField = item.answer ?? item.correct ?? item.correctAnswer ?? item.correctIndex ?? item.ans ?? item.key;

      if (typeof ansField === 'number') {
        // 0-based or 1-based index
        if (ansField >= 0 && ansField < rawOptions.length) {
          answerText = rawOptions[ansField];
        } else if (ansField >= 1 && ansField <= rawOptions.length) {
          answerText = rawOptions[ansField - 1];
        }
      } else if (typeof ansField === 'string') {
        const trimmedAns = ansField.trim();
        // Check single letter: 'A', 'B', 'C', 'D'
        if (/^[A-Za-z]$/.test(trimmedAns)) {
          const letterIdx = trimmedAns.toUpperCase().charCodeAt(0) - 65;
          if (letterIdx >= 0 && letterIdx < rawOptions.length) {
            answerText = rawOptions[letterIdx];
          }
        } else if (/^\d+$/.test(trimmedAns)) {
          const numIdx = parseInt(trimmedAns, 10);
          if (numIdx >= 0 && numIdx < rawOptions.length) {
            answerText = rawOptions[numIdx];
          } else if (numIdx >= 1 && numIdx <= rawOptions.length) {
            answerText = rawOptions[numIdx - 1];
          }
        } else {
          // Direct text match against options
          const cleanAns = cleanOptionLabel(decodeHtmlEntities(trimmedAns)).toLowerCase();
          const matchedOpt = rawOptions.find(o => cleanOptionLabel(o).toLowerCase() === cleanAns);
          answerText = matchedOpt || decodeHtmlEntities(trimmedAns);
        }
      } else if (isCorrectIndexFromOpts !== -1 && isCorrectIndexFromOpts < rawOptions.length) {
        answerText = rawOptions[isCorrectIndexFromOpts];
      }

      // Clean the answer and choices
      const cleanBack = cleanOptionLabel(answerText || rawOptions[0] || 'Answer');
      const cleanOptions = rawOptions.map(opt => cleanOptionLabel(opt));

      // Guarantee cleanBack is included in cleanOptions
      if (!cleanOptions.some(opt => opt.toLowerCase() === cleanBack.toLowerCase())) {
        cleanOptions.push(cleanBack);
      }

      // Ensure 4 choices for multiple choice mode
      while (cleanOptions.length < 4) {
        cleanOptions.push(`Option ${String.fromCharCode(65 + cleanOptions.length)}`);
      }

      // Extract rationale / explanation
      const rawRationale = String(item.rationale || item.explanation || item.feedback || item.note || '').trim();
      const rationale = decodeHtmlEntities(rawRationale) || `Correct answer: ${cleanBack}`;

      const tags = [category, 'Interactive Exam'];
      if (/ccc\s*2026/i.test(title + ' ' + description + ' ' + htmlText)) {
        tags.push('CCC 2026');
      }

      parsedCards.push({
        front,
        back: cleanBack,
        options: cleanOptions,
        rationale,
        tags
      });
    }
  } else {
    // DOM-based fallback
    const domItems = parseQuestionsFromDom(htmlText);
    for (const item of domItems) {
      const cleanBack = cleanOptionLabel(item.answer);
      const cleanOptions = item.options.map(opt => cleanOptionLabel(opt));
      if (!cleanOptions.some(opt => opt.toLowerCase() === cleanBack.toLowerCase())) {
        cleanOptions.push(cleanBack);
      }
      while (cleanOptions.length < 4) {
        cleanOptions.push(`Option ${String.fromCharCode(65 + cleanOptions.length)}`);
      }

      parsedCards.push({
        front: item.question,
        back: cleanBack,
        options: cleanOptions,
        rationale: item.rationale || `Correct answer: ${cleanBack}`,
        tags: [category, 'Interactive Exam']
      });
    }
  }

  return {
    title: title || 'Interactive Exam Deck',
    description: description || `Interactive exam deck with ${parsedCards.length} practice questions.`,
    category,
    cards: parsedCards,
    totalQuestions: parsedCards.length
  };
}

/**
 * Creates a complete Deck from parsed HTML exam data
 */
export function createDeckFromHtmlExam(
  title: string,
  category: DeckCategory,
  description: string,
  rawCards: Partial<Flashcard>[]
): Deck {
  const now = new Date().toISOString();
  const deckId = `deck-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const cards: Flashcard[] = rawCards.map((c, idx) => {
    const cardId = `card-${Date.now()}-${idx}`;
    const subject = c.ndleSubject || classifyCardHeuristic({
      front: c.front || '',
      back: c.back || '',
      rationale: c.rationale || '',
      tags: c.tags,
      deckCategory: category
    }).subject;

    return {
      id: cardId,
      deckId,
      front: c.front || 'Question',
      back: c.back || 'Answer',
      rationale: c.rationale || '',
      options: c.options && c.options.length >= 2 ? c.options : [c.back || 'Answer', 'Option B', 'Option C', 'Option D'],
      tags: c.tags || [category, 'Interactive Exam'],
      ndleSubject: subject,
      difficulty: 'medium',
      leitnerBox: 1,
      sm2: {
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        dueDate: now
      },
      createdAt: now,
      updatedAt: now
    };
  });

  return {
    id: deckId,
    title,
    description,
    category,
    icon: category === 'Food Service Systems' ? 'Calculator' : category === 'Clinical Nutrition' ? 'Stethoscope' : 'Sparkles',
    color: category === 'Food Service Systems' ? '#D4A373' : category === 'Clinical Nutrition' ? '#7FA98B' : '#FF9A76',
    tags: [category, 'Interactive Exam'],
    cards,
    stats: computeDeckStats(cards),
    createdAt: now,
    updatedAt: now
  };
}
