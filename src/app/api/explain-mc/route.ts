import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ExplainRequestBody {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  allOptions?: string[];
  rationale?: string;
}

export interface MCExplanationResponse {
  whyWrong: string;
  whyRight: string;
  keyDifference: string;
  boardTip: string;
}

function generateFallbackExplanation(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  rationale: string = ''
): MCExplanationResponse {
  const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  if (isCorrect) {
    return {
      whyRight: `"${correctAnswer}" is the precise board-standard answer for: ${question}.`,
      whyWrong: `Your answer is correct! You selected "${userAnswer}" which accurately matches the required concept.`,
      keyDifference: `Accurate application of core board exam terminology.`,
      boardTip: rationale || `High-yield concept: Always memorize the specific gestational timelines and biological definitions for licensure exams.`
    };
  }

  return {
    whyWrong: `You chose "${userAnswer}". While related to the general topic, "${userAnswer}" does not match the specific criteria asked in the question.`,
    whyRight: `"${correctAnswer}" is the correct board answer because it directly defines: ${question}`,
    keyDifference: `Be sure to distinguish "${userAnswer}" from "${correctAnswer}"—one represents a distinct phase or mechanism compared to the other.`,
    boardTip: rationale
      ? `Board Exam Rationale: ${rationale}`
      : `High-yield tip: Pay close attention to timing, primary organ differentiation, and specific biochemical definitions.`
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: ExplainRequestBody = await req.json();
    const { question, userAnswer, correctAnswer, allOptions = [], rationale = '' } = body;

    if (!question || !correctAnswer) {
      return NextResponse.json(
        { error: 'Missing required parameters: question and correctAnswer' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return smart fallback explanation
      return NextResponse.json(
        generateFallbackExplanation(question, userAnswer, correctAnswer, rationale)
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const prompt = `You are a Board Exam Professor and Registered Nutritionist-Dietitian (RND) tutor reviewing a student's answer.

Question: "${question}"
Student's Selected Answer: "${userAnswer}"
Correct Board Answer: "${correctAnswer}"
Other Choices in Question: ${JSON.stringify(allOptions)}
Card Reference / Rationale: "${rationale}"

Provide an educational, clear, and high-yield explanation formatted strictly as valid JSON matching this schema:
{
  "whyWrong": "Explain specifically why the student's chosen answer ('${userAnswer}') is incorrect for this question, and what '${userAnswer}' actually represents in science/dietetics.",
  "whyRight": "Explain clearly why '${correctAnswer}' is the exact correct answer according to board standards and biological/clinical mechanisms.",
  "keyDifference": "A concise 1-2 sentence distinction summarizing the contrast between '${userAnswer}' and '${correctAnswer}'.",
  "boardTip": "A high-yield memory tip, mnemonic, or board exam takeaway for this concept."
}

Ensure the tone is supportive, academic, concise, and focused on exam mastery.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed: MCExplanationResponse = JSON.parse(text);

    return NextResponse.json({
      whyWrong: parsed.whyWrong || `"${userAnswer}" is not the correct choice for this question.`,
      whyRight: parsed.whyRight || `"${correctAnswer}" is the correct answer.`,
      keyDifference: parsed.keyDifference || `Contrast "${userAnswer}" with "${correctAnswer}".`,
      boardTip: parsed.boardTip || rationale || `Review the standard definitions in your notes.`
    });
  } catch (error: unknown) {
    console.error('Error in /api/explain-mc:', error);
    // Fallback gracefully
    const body: ExplainRequestBody = await req.json().catch(() => ({} as ExplainRequestBody));
    return NextResponse.json(
      generateFallbackExplanation(
        body.question || '',
        body.userAnswer || '',
        body.correctAnswer || '',
        body.rationale || ''
      )
    );
  }
}
