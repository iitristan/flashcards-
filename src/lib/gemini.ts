import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { GeneratedFlashcard } from "@/types/gemini";

const flashcardSchema = z.object({
  cards: z.array(
    z.object({
      front: z.string().min(1).max(500),
      back: z.string().min(1).max(1000),
    })
  ),
});

const SYSTEM_PROMPT = `You are a flashcard generator. Return ONLY valid JSON, no markdown fences.
Schema: { "cards": [ { "front": string, "back": string } ] }
Rules:
- front: concise question or term (max 120 chars)
- back: clear answer/explanation (max 400 chars)
- No duplicate fronts
- Educational, factually accurate
- Focus on the most important concepts from the source material`;

const MODEL_CANDIDATES = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

function getModel(modelName: string = MODEL_CANDIDATES[0]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
    },
    systemInstruction: SYSTEM_PROMPT,
  });
}

function buildUserPrompt(
  source: string,
  count: number,
  sourceType: string
): string {
  return `Generate exactly ${count} flashcards from this ${sourceType}:

${source}

Return JSON matching the schema with exactly ${count} cards.`;
}

export async function generateFlashcards(options: {
  topic?: string;
  rawText?: string;
  fileContent?: string;
  count?: number;
}): Promise<GeneratedFlashcard[]> {
  const count = Math.min(Math.max(options.count ?? 10, 1), 30);

  let source = "";
  let sourceType = "content";

  if (options.topic?.trim()) {
    source = options.topic.trim();
    sourceType = "topic";
  } else if (options.rawText?.trim()) {
    source = options.rawText.trim();
    sourceType = "text";
  } else if (options.fileContent?.trim()) {
    source = options.fileContent.trim();
    sourceType = "file content";
  } else {
    throw new Error("Provide a topic, text, or file content to generate cards");
  }

  if (source.length > 50000) {
    throw new Error("Source content is too long (max 50,000 characters)");
  }

  const prompt = buildUserPrompt(source, count, sourceType);
  let lastError: unknown = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = getModel(modelName);
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (!text) {
        continue;
      }

      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      }

      const parsed = flashcardSchema.parse(JSON.parse(cleanText));
      return parsed.cards;
    } catch (error) {
      lastError = error;
      if (error instanceof z.ZodError) {
        console.warn(`Model ${modelName} returned invalid schema, trying next:`, error);
      }
    }
  }

  if (lastError instanceof Error && (lastError.message.includes("429") || lastError.message.includes("quota"))) {
    throw new Error("Gemini API rate limit reached. Please try again later.");
  }
  throw new Error("Failed to generate flashcards from source material.");
}
