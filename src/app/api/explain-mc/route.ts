import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ExplainRequestBody {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  allOptions?: string[];
  rationale?: string;
  apiKey?: string;
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
      whyRight: rationale 
        ? `${correctAnswer} is correct: ${rationale}`
        : `"${correctAnswer}" is the established board-standard answer according to clinical dietetics and nutrition science guidelines.`,
      whyWrong: `Your answer "${userAnswer}" is correct!`,
      keyDifference: `Successfully identified the designated board exam answer.`,
      boardTip: rationale || `High-yield takeaway: Associate this specific keyword with "${correctAnswer}" in your reviewer notes.`
    };
  }

  // When incorrect and fallback is used:
  return {
    whyWrong: `"${userAnswer}" does not match the clinical or scientific standard for this question. ${rationale ? `Refer to standard rationale: ${rationale}` : `Review this topic in your notes to contrast "${userAnswer}" with "${correctAnswer}".`}`,
    whyRight: rationale 
      ? `Board standard explanation: ${rationale}`
      : `"${correctAnswer}" is the established correct answer in Nutrition and Dietetics board standards.`,
    keyDifference: `Contrast "${userAnswer}" with "${correctAnswer}" — ensure you review the exact cutoffs, definitions, or physiological mechanisms for each.`,
    boardTip: rationale
      ? `High-Yield Rationale: ${rationale}`
      : `Board exam anchor: Keep a dedicated flashcard comparing "${userAnswer}" vs "${correctAnswer}".`
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: ExplainRequestBody = await req.json();
    const { question, userAnswer, correctAnswer, allOptions = [], rationale = '', apiKey: clientApiKey } = body;

    if (!question || !correctAnswer) {
      return NextResponse.json(
        { error: 'Missing required parameters: question and correctAnswer' },
        { status: 400 }
      );
    }

    const apiKey = clientApiKey || req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

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

    const prompt = `You are an expert Board Exam Professor in Nutrition and Dietetics (NDLE / RND / RD exam reviewer).
A student is reviewing a multiple-choice question. Provide an insightful, fact-based, scientific comparison.

QUESTION: "${question}"
STUDENT'S CHOSEN ANSWER: "${userAnswer}"
CORRECT BOARD ANSWER: "${correctAnswer}"
ALL CHOICES IN QUESTION: ${JSON.stringify(allOptions)}
REFERENCE / RATIONALE: "${rationale}"

STRICT PEDAGOGICAL & CONTENT RULES:
1. NEVER output generic or robotic filler phrases like:
   - "X is correct because the question asks for the hallmark criteria that define X"
   - "X is an important term in this subject"
   - "pertains to a different stage or mechanism rather than what is specifically asked"
2. DO NOT repeat the entire question text verbatim in your explanation.
3. Provide REAL FACTS, medical/dietetic standards, numbers, gestational timelines, physiological pathways, or biochemical mechanisms:
   - For numerical/gestational questions (e.g. 270 vs 300 days for premature infant):
     * Explain why 270 is the cutoff: Full-term pregnancy averages 280 days (40 weeks). A premature infant is clinically defined by WHO/NDLE as delivery before 37 completed weeks (< 259 to 270 days).
     * Explain why 300 is wrong: 300 days exceeds normal term (> 42 weeks / 294+ days), which defines post-term or prolonged gestation, the opposite of prematurity.
   - For biochemistry, clinical nutrition, or food service questions:
     * Cite the exact metabolic pathway, nutrient requirement, deficiency sign, cooking temperature, or food safety principle.
4. "whyRight":
   - State the factual scientific/dietetic justification and source standard for why "${correctAnswer}" is true.
5. "whyWrong":
   - Point out the specific factual or clinical misconception with "${userAnswer}". State what "${userAnswer}" actually refers to in real science/clinical practice, and contrast it with "${correctAnswer}".
6. "keyDifference":
   - A single, punchy 1-sentence contrast highlighting the core distinction between "${userAnswer}" and "${correctAnswer}".
7. "boardTip":
   - A high-yield memory rule, clinical pearl, or mnemonic to easily remember this on the licensure exam.

Return strictly valid JSON matching this schema:
{
  "whyWrong": "Factual explanation of what '${userAnswer}' actually represents and why it is incorrect for this premise...",
  "whyRight": "Scientific and clinical explanation of '${correctAnswer}' with supporting standards/facts...",
  "keyDifference": "Direct factual distinction between '${userAnswer}' and '${correctAnswer}'...",
  "boardTip": "High-yield memory anchor or mnemonic..."
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed: MCExplanationResponse = JSON.parse(text);

    return NextResponse.json({
      whyWrong: parsed.whyWrong || `"${userAnswer}" does not match the clinical requirement for this question.`,
      whyRight: parsed.whyRight || (rationale ? `${correctAnswer}: ${rationale}` : `"${correctAnswer}" is the established board standard answer.`),
      keyDifference: parsed.keyDifference || `Contrast "${userAnswer}" with "${correctAnswer}".`,
      boardTip: parsed.boardTip || rationale || `Review this high-yield concept in your study notes.`
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
