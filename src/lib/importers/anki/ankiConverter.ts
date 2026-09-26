import { Deck, Flashcard, DeckCategory } from '@/types';
import { AnkiCollectionData, AnkiImportOptions, AnkiRawNote } from '../types';
import { computeDeckStats, shuffleArray } from '@/lib/services/flashcardService';
import { ExtractedArchive } from './ankiArchive';

/**
 * Infer category from deck name or tags
 */
export function inferCategoryFromName(name: string, defaultCategory: DeckCategory = 'General Dietetics'): DeckCategory {
  const lower = name.toLowerCase();
  if (lower.includes('ffss') || lower.includes('food service') || lower.includes('cookery') || lower.includes('meal management') || lower.includes('culinary')) {
    return 'Food Service Systems';
  }
  if (lower.includes('nbcd') || lower.includes('biochem') || lower.includes('microbiology') || lower.includes('metabolism') || lower.includes('vitamin')) {
    return 'Nutritional Biochemistry';
  }
  if (lower.includes('mnt') || lower.includes('clinical') || lower.includes('hospital') || lower.includes('renal') || lower.includes('diet therapy')) {
    return 'Clinical Nutrition';
  }
  if (lower.includes('community') || lower.includes('public health') || lower.includes('epidemiology') || lower.includes('fies') || lower.includes('program')) {
    return 'Public Health & Community';
  }
  if (lower.includes('maternal') || lower.includes('child') || lower.includes('pediatric') || lower.includes('infant') || lower.includes('lactation')) {
    return 'Maternal & Child Nutrition';
  }
  return defaultCategory;
}

/**
 * Choose theme color based on category
 */
function getCategoryColor(category: DeckCategory): string {
  switch (category) {
    case 'Clinical Nutrition': return '#7FA98B'; // Matcha Green
    case 'Nutritional Biochemistry': return '#FF9A76'; // Peach
    case 'Food Service Systems': return '#D4A373'; // Amber / Caramel
    case 'Public Health & Community': return '#76B39D'; // Teal
    case 'Maternal & Child Nutrition': return '#F38BA0'; // Strawberry Pink
    default: return '#8B5CF6'; // Purple
  }
}

/**
 * Choose icon based on category
 */
function getCategoryIcon(category: DeckCategory): string {
  switch (category) {
    case 'Clinical Nutrition': return 'Stethoscope';
    case 'Nutritional Biochemistry': return 'Sparkles';
    case 'Food Service Systems': return 'Calculator';
    default: return 'BookOpen';
  }
}

/**
 * Decode HTML entities like &nbsp;, &amp;, &lt;, &gt;
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

/**
 * Clean up HTML tags into clean text with newlines
 */
export function cleanHtmlText(html: string): string {
  if (!html) return '';
  let text = html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<div[^>]*>/gi, '');
  text = decodeHtmlEntities(text);
  // Keep img tags intact, strip other HTML tags
  text = text.replace(/<(?!img\s*\S*)[^>]+>/gi, '');
  return text.trim();
}

/**
 * Strip letter prefix from option (e.g. "a. Nervous system" -> "Nervous system")
 */
export function cleanOptionLabel(text: string): string {
  return text.replace(/^[a-dA-D1-4][\.\)\:\-]\s*/, '').trim();
}

/**
 * Format cloze text for front side (replaces {{c1::answer}} with [...])
 */
function renderClozeFront(text: string, clozeOrd: number): string {
  const clozeRegex = new RegExp(`\\{\\{c${clozeOrd + 1}::(.*?)(?:::([^}]*))?\\}\\}`, 'gi');
  return text.replace(clozeRegex, (_match, _answer, hint) => {
    return hint ? `[...${hint}]` : '[...]';
  }).replace(/\{\{c\d+::(.*?)(?:::([^}]*))?\}\}/gi, '$1');
}

/**
 * Format cloze text for back side (highlights {{c1::answer}})
 */
function renderClozeBack(text: string, clozeOrd: number): string {
  const clozeRegex = new RegExp(`\\{\\{c${clozeOrd + 1}::(.*?)(?:::([^}]*))?\\}\\}`, 'gi');
  return text.replace(clozeRegex, (_match, answer) => {
    return answer;
  }).replace(/\{\{c\d+::(.*?)(?:::([^}]*))?\}\}/gi, '$1');
}

/**
 * Replace media img tags with base64 data URLs
 */
async function replaceMediaInHtml(
  html: string,
  archive?: ExtractedArchive
): Promise<string> {
  if (!archive || !archive.hasMedia) return html;

  // Match <img src="filename">
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  let result = html;

  while ((match = imgRegex.exec(html)) !== null) {
    const originalSrc = match[1];
    if (originalSrc.startsWith('data:') || originalSrc.startsWith('http')) {
      continue;
    }

    try {
      const dataUrl = await archive.getMediaDataUrl(originalSrc);
      if (dataUrl) {
        result = result.replace(originalSrc, dataUrl);
      }
    } catch {
      // Ignore media lookup error
    }
  }

  return result;
}

/**
 * Clean up hierarchical deck name: "FFSS::Long Exam" -> "Long Exam - FFSS"
 */
function cleanDeckTitle(name: string): string {
  const parts = name.split('::').map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return name;
  
  const prefix = parts[0];
  const subName = parts.slice(1).join(' - ');
  if (subName.toLowerCase().includes(prefix.toLowerCase())) {
    return subName;
  }
  return `${subName} (${prefix})`;
}

/**
 * Intelligently extracts multiple choice options from question front if present
 */
function parseCardMcOptions(rawFront: string, rawBack: string, rawRationale: string) {
  const cleanFront = cleanHtmlText(rawFront);
  const cleanBack = cleanHtmlText(rawBack);
  const cleanRationale = cleanHtmlText(rawRationale || '');

  // Look for options in cleanFront: a. ... b. ... c. ... d. ...
  const lines = cleanFront.split('\n').map(l => l.trim()).filter(Boolean);
  const optionRegex = /^([a-dA-D1-4])[\.\)\:\-]\s*(.+)$/;

  const extractedOpts: string[] = [];
  const questionLines: string[] = [];
  const optionMap: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(optionRegex);
    if (match) {
      const letter = match[1].toUpperCase();
      const text = cleanOptionLabel(match[2]);
      extractedOpts.push(text);
      optionMap[letter] = text;
    } else if (extractedOpts.length === 0) {
      // Check for inline options on a single line
      const inlineMatches = Array.from(line.matchAll(/(?:^|\s+)([a-dA-D1-4])[\.\)\:\-]\s*([^a-dA-D1-4\n]+?)(?=(?:\s+[a-dA-D1-4][\.\)\:\-])|$)/g));
      if (inlineMatches.length >= 2) {
        const firstMatchIdx = line.indexOf(inlineMatches[0][0]);
        if (firstMatchIdx > 0) {
          questionLines.push(line.substring(0, firstMatchIdx).trim());
        }
        for (const im of inlineMatches) {
          const letter = im[1].toUpperCase();
          const text = cleanOptionLabel(im[2]);
          extractedOpts.push(text);
          optionMap[letter] = text;
        }
      } else {
        questionLines.push(line);
      }
    } else {
      extractedOpts[extractedOpts.length - 1] += ' ' + line;
    }
  }

  let finalQuestion = cleanFront;
  let finalAnswer = cleanBack;
  let finalOptions: string[] = [];

  if (extractedOpts.length >= 2) {
    finalQuestion = questionLines.join('\n').trim() || cleanFront;
    finalOptions = extractedOpts;

    // Match answer to option
    const backMatch = cleanBack.match(optionRegex);
    if (backMatch) {
      const ansLetter = backMatch[1].toUpperCase();
      const ansText = cleanOptionLabel(backMatch[2]);
      finalAnswer = optionMap[ansLetter] || ansText;
    } else if (optionMap[cleanBack.toUpperCase()]) {
      finalAnswer = optionMap[cleanBack.toUpperCase()];
    } else {
      const cleanRawBack = cleanOptionLabel(cleanBack);
      const matchOpt = extractedOpts.find(o => o.toLowerCase() === cleanRawBack.toLowerCase());
      if (matchOpt) finalAnswer = matchOpt;
      else finalAnswer = cleanRawBack;
    }
  } else {
    finalAnswer = cleanOptionLabel(cleanBack);
  }

  return {
    front: finalQuestion,
    back: finalAnswer,
    options: finalOptions,
    rationale: cleanRationale
  };
}

/**
 * Convert Anki collection schema data to NutriAnki Deck and Flashcard models
 */
export async function convertAnkiCollectionToDecks(
  data: AnkiCollectionData,
  archive?: ExtractedArchive,
  options?: AnkiImportOptions
): Promise<Deck[]> {
  const { categoryMapping = {}, defaultCategory = 'General Dietetics', includeMedia = true, selectedDeckIds } = options || {};
  const now = new Date();
  const nowIso = now.toISOString();

  // Group cards by deck ID
  const cardsByDeck = new Map<string, typeof data.cards>();
  for (const card of data.cards) {
    const did = String(card.did);
    if (selectedDeckIds && selectedDeckIds.length > 0 && !selectedDeckIds.map(String).includes(did)) {
      continue;
    }

    if (!cardsByDeck.has(did)) {
      cardsByDeck.set(did, []);
    }
    cardsByDeck.get(did)!.push(card);
  }

  const resultDecks: Deck[] = [];

  for (const rawDeck of data.decks) {
    const deckIdStr = String(rawDeck.id);
    const deckCards = cardsByDeck.get(deckIdStr) || [];

    // Skip empty decks
    if (deckCards.length === 0) continue;

    const title = cleanDeckTitle(rawDeck.name);
    const category = categoryMapping[rawDeck.name] || categoryMapping[title] || inferCategoryFromName(rawDeck.name, defaultCategory);
    const color = getCategoryColor(category);
    const icon = getCategoryIcon(category);

    const convertedCards: Flashcard[] = [];

    for (let idx = 0; idx < deckCards.length; idx++) {
      const ankiCard = deckCards[idx];
      const note: AnkiRawNote | undefined = data.notes.get(ankiCard.nid);
      if (!note) continue;

      const model = data.models.get(note.mid);
      const flds = note.flds || [];

      let rawFront = '';
      let rawBack = '';
      let rawRationale = '';

      const isCloze = model?.name.toLowerCase().includes('cloze') || flds.some(f => f.includes('{{c'));

      if (isCloze && flds.length > 0) {
        rawFront = renderClozeFront(flds[0], ankiCard.ord);
        rawBack = renderClozeBack(flds[0], ankiCard.ord);
        rawRationale = flds[1] || '';
      } else if (flds.length === 1) {
        rawFront = flds[0];
        rawBack = 'See Details';
      } else if (flds.length === 2) {
        rawFront = flds[0];
        rawBack = flds[1];
      } else {
        // Multi-field note: find appropriate field names
        let frontIdx = 0;
        let backIdx = 1;
        let rationaleIdx = -1;

        if (model && model.flds.length > 0) {
          model.flds.forEach((f, fIdx) => {
            const fName = f.name.toLowerCase();
            if (fName.includes('front') || fName.includes('question') || fName.includes('term')) {
              frontIdx = fIdx;
            } else if (fName.includes('back') || fName.includes('answer') || fName.includes('definition')) {
              backIdx = fIdx;
            } else if (fName.includes('rationale') || fName.includes('extra') || fName.includes('explanation')) {
              rationaleIdx = fIdx;
            }
          });
        }

        rawFront = flds[frontIdx] || flds[0] || 'Question';
        rawBack = flds[backIdx] || flds[1] || 'Answer';
        if (rationaleIdx >= 0 && flds[rationaleIdx]) {
          rawRationale = flds[rationaleIdx];
        }
      }

      // Replace media references if enabled
      if (includeMedia && archive) {
        rawFront = await replaceMediaInHtml(rawFront, archive);
        rawBack = await replaceMediaInHtml(rawBack, archive);
        if (rawRationale) {
          rawRationale = await replaceMediaInHtml(rawRationale, archive);
        }
      }

      // Intelligently parse multiple choice options and clean questions
      const parsed = parseCardMcOptions(rawFront, rawBack, rawRationale);

      // Calculate SM-2 spaced repetition fields from Anki card data
      const interval = Math.max(1, ankiCard.ivl || 1);
      const easeFactor = (ankiCard.factor && ankiCard.factor > 0) ? +(ankiCard.factor / 1000).toFixed(2) : 2.5;
      const repetitions = Math.max(0, ankiCard.reps || 0);

      // Due date calculation
      let dueDateIso = nowIso;
      if (ankiCard.queue === 2 && ankiCard.due > 0) {
        // Review card: due is in days from collection creation date
        const collectionStart = data.crt ? data.crt * 1000 : Date.now();
        const dueTimestamp = collectionStart + (ankiCard.due * 86400 * 1000);
        dueDateIso = new Date(dueTimestamp).toISOString();
      }

      // Tags
      const tags = note.tags.length > 0 ? note.tags : [category];

      convertedCards.push({
        id: `anki-card-${ankiCard.id}-${idx}`,
        deckId: `anki-deck-${rawDeck.id}`,
        front: parsed.front,
        back: parsed.back,
        rationale: parsed.rationale,
        options: parsed.options,
        tags,
        difficulty: interval >= 21 ? 'easy' : interval >= 7 ? 'medium' : 'hard',
        leitnerBox: Math.min(5, Math.max(1, Math.floor(interval / 7) + 1)),
        sm2: {
          interval,
          easeFactor,
          repetitions,
          dueDate: dueDateIso
        },
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }

    // Populate realistic distractors for cards that don't have multiple choice options
    const allAnswersInDeck = Array.from(new Set(convertedCards.map(c => c.back).filter(b => b && b.length > 1)));

    for (const card of convertedCards) {
      if (!card.options || card.options.length < 2) {
        // Find other answers from this deck
        const otherAnswers = allAnswersInDeck.filter(a => a.toLowerCase() !== card.back.toLowerCase());
        const distractors = shuffleArray(otherAnswers).slice(0, 3);
        const combined = Array.from(new Set([card.back, ...distractors]));
        card.options = combined;
      }
    }

    const newDeckId = `anki-deck-${rawDeck.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const preparedCards = convertedCards.map(c => ({ ...c, deckId: newDeckId }));

    resultDecks.push({
      id: newDeckId,
      title,
      description: rawDeck.desc ? rawDeck.desc.replace(/<[^>]*>/g, '') : `Imported Anki deck with ${preparedCards.length} cards.`,
      category,
      icon,
      color,
      tags: Array.from(new Set(preparedCards.flatMap(c => c.tags))).slice(0, 5),
      cards: preparedCards,
      stats: computeDeckStats(preparedCards),
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }

  return resultDecks;
}
