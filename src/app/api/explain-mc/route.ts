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
      whyRight: `"${correctAnswer}" is the exact board-standard answer for "${question}" because it specifically satisfies the criteria and timeline described in the prompt.`,
      whyWrong: `Your answer is correct! You selected "${userAnswer}", which precisely matches the required clinical/dietetic concept.`,
      keyDifference: `Correctly identified "${correctAnswer}" as the hallmark term for this question.`,
      boardTip: rationale || `High-yield takeaway: Always link the specific keywords in the question directly to the designated clinical mechanism or stage.`
    };
  }

  return {
    whyWrong: `You chose "${userAnswer}". While "${userAnswer}" is an important term in this subject, it does NOT satisfy the specific requirement in "${question}". In correlation to "${correctAnswer}", "${userAnswer}" pertains to a different stage or mechanism rather than what is specifically asked.`,
    whyRight: `"${correctAnswer}" is the correct answer because "${question}" specifically asks for the hallmark criteria that define "${correctAnswer}" (rather than "${userAnswer}").`,
    keyDifference: `Direct Distinction: "${correctAnswer}" represents the exact condition/phase asked in the question, whereas "${userAnswer}" occurs in a different context or phase.`,
    boardTip: rationale
      ? `Board Exam Rationale: ${rationale}`
      : `High-yield memory anchor: Pay close attention to the specific keywords and timelines in the question to distinguish "${correctAnswer}" from related distractors like "${userAnswer}".`
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

    const prompt = `You are a Board Exam Review Professor and Registered Nutritionist-Dietitian (RND) tutor reviewing a multiple choice question with a student.

Question: "${question}"
Student's Selected Answer: "${userAnswer}"
Correct Board Answer: "${correctAnswer}"
Other Choices in Question: ${JSON.stringify(allOptions)}
Reference / Rationale: "${rationale}"

CRITICAL PEDAGOGICAL INSTRUCTIONS:
1. DO NOT give simple dictionary definitions in isolation.
2. In 'whyWrong':
   - Explicitly explain why "${userAnswer}" fails to answer the exact premise of THIS specific question.
   - Explain IN CORRELATION AND CONTRAST to "${correctAnswer}" why "${userAnswer}" is not the right choice (e.g. explain what stage, timeline, condition, or mechanism "${userAnswer}" actually refers to instead of what was asked).
3. In 'whyRight':
   - Explain clearly why "${correctAnswer}" is the precise right answer in direct correlation to the question's keywords, showing why it satisfies the criteria that "${userAnswer}" failed to meet.
4. In 'keyDifference':
   - Give a direct 1-2 sentence head-to-head comparison highlighting the difference between "${userAnswer}" vs "${correctAnswer}".
5. In 'boardTip':
   - Give a high-yield memory tip, mnemonic, or board exam takeaway so the student never confuses "${userAnswer}" with "${correctAnswer}" again.

Return strictly valid JSON matching this schema:
{
  "whyWrong": "Explanation of why '${userAnswer}' does NOT fit this question and how it differs from '${correctAnswer}'...",
  "whyRight": "Explanation of why '${correctAnswer}' is the exact correct answer in correlation to the question...",
  "keyDifference": "Direct head-to-head distinction between '${userAnswer}' vs '${correctAnswer}'...",
  "boardTip": "High-yield memory anchor or mnemonic..."
}`;

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
