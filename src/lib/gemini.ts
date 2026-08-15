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

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
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

  const model = getModel();
  const prompt = buildUserPrompt(source, count, sourceType);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    const parsed = flashcardSchema.parse(JSON.parse(text));
    return parsed.cards;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error("Gemini returned invalid flashcard JSON");
    }

    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("quota")) {
        throw new Error("Gemini API rate limit reached. Please try again later.");
      }
      throw error;
    }

    throw new Error("Failed to generate flashcards");
  }
}
