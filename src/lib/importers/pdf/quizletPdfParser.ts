import { Flashcard, Deck, DeckCategory } from '@/types';
import { computeDeckStats } from '@/lib/services/flashcardService';
import { inferCategoryFromName } from '../anki/ankiConverter';

export interface ParsedQuizletItem {
  number?: number;
  question: string;
  options: string[];
  answer: string;
  rationale?: string;
  tags?: string[];
}

/**
 * Normalizes options and removes letter prefixes like "A. ", "B) "
 */
function cleanOptionText(text: string): string {
  return text.replace(/^[A-Da-d][\.\)\:\-]\s*/, '').trim();
}

/**
 * Intelligent parser for Quizlet PDF exams, test sheets, and flashcard printouts
 */
export function parseQuizletExamText(
  rawText: string,
  defaultCategory: DeckCategory = 'Food Service Systems'
): { title: string; category: DeckCategory; cards: Partial<Flashcard>[] } {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Detect title from header e.g. "Food Service - NDLE 2021 Exam"
  let detectedTitle = 'Quizlet Imported Deck';
  const headerLine = lines.find(l => !/^\d+[\.\)]/.test(l) && !l.startsWith('Study online') && !l.startsWith('http') && l.length > 5);
  if (headerLine) {
    detectedTitle = headerLine.replace(/^Food Service - /i, 'Food Service: ');
  }

  const category = inferCategoryFromName(detectedTitle, defaultCategory);

  const parsedItems: ParsedQuizletItem[] = [];

  // Match items starting with numbers: "1. Garlic...", "2. Overboiling..."
  const fullText = rawText
    .replace(/Food Service - NDLE \d+ Exam/gi, '')
    .replace(/Study online at https?:\/\/[^\s]+/gi, '')
    .replace(/\d+\s*\/\s*\d+/g, '') // page numbers e.g. "1 / 56"
    .replace(/==Page \d+==/gi, '');

  // Split by question numbers: "\n1. ", "\n2. ", ... "\n200. "
  const questionBlocks = fullText.split(/\n(?=\s*\d+[\.\)])/g).filter(b => b.trim().length > 0);

  for (const block of questionBlocks) {
    const trimmed = block.trim();
    const qNumMatch = trimmed.match(/^(\d+)[\.\)]\s*([\s\S]+)/);
    if (!qNumMatch) continue;

    const qNum = parseInt(qNumMatch[1], 10);
    const blockBody = qNumMatch[2];

    // Look for options A. B. C. D.
    const optionMatches = Array.from(blockBody.matchAll(/(?:^|\n)\s*([A-Da-d])[\.\)]\s*([^\n]+)/g));

    if (optionMatches.length >= 2) {
      // Find where the first option starts
      const firstOptIndex = blockBody.indexOf(optionMatches[0][0]);
      const questionText = blockBody.substring(0, firstOptIndex).replace(/\n/g, ' ').trim();

      const options: string[] = [];
      const optionMap: Record<string, string> = {};

      for (const m of optionMatches) {
        const letter = m[1].toUpperCase();
        const optText = m[2].trim();
        if (!optionMap[letter]) {
          optionMap[letter] = optText;
          options.push(optText);
        }
      }

      // Look for answer and rationale after options
      const lastOptMatch = optionMatches[optionMatches.length - 1];
      const afterOptionsIdx = blockBody.indexOf(lastOptMatch[0]) + lastOptMatch[0].length;
      const afterOptionsText = blockBody.substring(afterOptionsIdx).trim();

      let answerText = '';
      let rationaleText = '';

      // Check if afterOptionsText starts with an answer pattern e.g. "B. Coagulation" or "D. Bulbs"
      const ansMatch = afterOptionsText.match(/^([A-Da-d])[\.\)\:\-]\s*([^\n]+)([\s\S]*)$/);
      if (ansMatch) {
        const ansLetter = ansMatch[1].toUpperCase();
        const ansLabel = ansMatch[2].trim();
        answerText = optionMap[ansLetter] || ansLabel || cleanOptionText(ansLabel);
        rationaleText = ansMatch[3]?.trim() || '';
      } else if (afterOptionsText) {
        const firstLine = afterOptionsText.split('\n')[0].trim();
        const restLines = afterOptionsText.split('\n').slice(1).join(' ').trim();
        answerText = cleanOptionText(firstLine);
        rationaleText = restLines;
      } else if (options.length > 0) {
        answerText = options[0];
      }

      // If options don't have 4 items, fill or adjust
      const uniqueOpts = Array.from(new Set([answerText, ...options])).filter(Boolean);
      while (uniqueOpts.length < 4) {
        uniqueOpts.push(`Option ${String.fromCharCode(65 + uniqueOpts.length)}`);
      }

      parsedItems.push({
        number: qNum,
        question: questionText,
        options: uniqueOpts.slice(0, 4),
        answer: answerText,
        rationale: rationaleText,
        tags: [category, 'Quizlet']
      });
    } else {
      // Line by line fallback
      const lines = blockBody.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        const questionText = lines[0];
        const answerText = lines[1];
        const rationaleText = lines.slice(2).join(' ');

        parsedItems.push({
          number: qNum,
          question: questionText,
          options: [answerText, 'Option B', 'Option C', 'Option D'],
          answer: answerText,
          rationale: rationaleText,
          tags: [category, 'Quizlet']
        });
      }
    }
  }

  // Convert parsed items to Flashcards
  const cards: Partial<Flashcard>[] = parsedItems.map((item, idx) => ({
    id: `quizlet-card-${item.number || idx + 1}-${Date.now()}`,
    front: item.question,
    back: item.answer,
    rationale: item.rationale || '',
    options: item.options && item.options.length === 4 ? item.options : [item.answer, 'Option B', 'Option C', 'Option D'],
    tags: item.tags || [category],
    difficulty: 'medium',
    leitnerBox: 1
  }));

  return {
    title: detectedTitle || 'Quizlet Reviewer',
    category,
    cards
  };
}

/**
 * Creates a full Deck object from parsed Quizlet items
 */
export function createDeckFromQuizletItems(
  title: string,
  category: DeckCategory,
  cards: Partial<Flashcard>[]
): Deck {
  const now = new Date().toISOString();
  const deckId = `deck-quizlet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const preparedCards: Flashcard[] = cards.map((c, idx) => ({
    id: c.id || `card-${Date.now()}-${idx}`,
    deckId,
    front: c.front || 'Question',
    back: c.back || 'Answer',
    rationale: c.rationale || '',
    options: c.options && c.options.length === 4 ? c.options : [c.back || 'Answer', 'Option B', 'Option C', 'Option D'],
    tags: c.tags || [category],
    difficulty: c.difficulty || 'medium',
    leitnerBox: c.leitnerBox || 1,
    sm2: {
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      dueDate: now
    },
    createdAt: now,
    updatedAt: now
  }));

  return {
    id: deckId,
    title: title || 'Quizlet Reviewer Deck',
    description: `Imported Quizlet deck with ${preparedCards.length} board exam questions.`,
    category,
    icon: category === 'Food Service Systems' ? 'Calculator' : category === 'Clinical Nutrition' ? 'Stethoscope' : 'Sparkles',
    color: '#D4A373',
    tags: ['Quizlet', 'Board Exam', category],
    cards: preparedCards,
    stats: computeDeckStats(preparedCards),
    createdAt: now,
    updatedAt: now
  };
}
