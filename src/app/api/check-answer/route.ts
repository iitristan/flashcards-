import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIGradeResponse } from '@/types';

interface GradeRequestBody {
  question: string;
  targetAnswer: string;
  userAnswer: string;
  rationale?: string;
}

function evaluateHeuristics(userAnswer: string, targetAnswer: string, rationale: string = ''): AIGradeResponse {
  const normUser = userAnswer.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const normTarget = targetAnswer.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');

  if (!normUser) {
    return {
      verdict: 'incorrect',
      score: 0,
      feedback: 'No answer was provided.',
      rationale: rationale || 'Please review the standard dietetic definition.',
      suggestedAnswer: targetAnswer
    };
  }

  // Exact match
  if (normUser === normTarget) {
    return {
      verdict: 'correct',
      score: 100,
      feedback: 'Spot on! Exactly right.',
      rationale: rationale || 'Accurate board exam terminology.',
      suggestedAnswer: targetAnswer
    };
  }

  // Check substring inclusion
  const userWords = normUser.split(/\s+/).filter(w => w.length > 2);
  const targetWords = normTarget.split(/\s+/).filter(w => w.length > 2);

  let matchCount = 0;
  for (const word of targetWords) {
    if (userWords.includes(word) || normUser.includes(word)) {
      matchCount++;
    }
  }

  const matchRatio = targetWords.length > 0 ? matchCount / targetWords.length : 0;

  if (matchRatio >= 0.75 || normTarget.includes(normUser) || normUser.includes(normTarget)) {
    return {
      verdict: 'correct',
      score: 90,
      feedback: 'Great job! Your answer captures the core clinical concept.',
      rationale: rationale || 'Concept matches board exam criteria.',
      suggestedAnswer: targetAnswer
    };
  } else if (matchRatio >= 0.35) {
    return {
      verdict: 'partially_correct',
      score: 60,
      feedback: 'Partially correct. You mentioned some key elements, but missed key specifics.',
      rationale: rationale || 'Compare your response with the complete definition.',
      suggestedAnswer: targetAnswer
    };
  } else {
    return {
      verdict: 'incorrect',
      score: 20,
      feedback: 'Not quite. Take a moment to review the key concept below.',
      rationale: rationale || 'Review the correct answer and clinical rationale.',
      suggestedAnswer: targetAnswer
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: GradeRequestBody = await req.json();
    const { question, targetAnswer, userAnswer, rationale = '' } = body;

    if (!question || !targetAnswer) {
      return NextResponse.json(
        { error: 'Missing question or targetAnswer parameters' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback to intelligent semantic heuristics if API key is not configured
    if (!apiKey) {
      const fallbackResult = evaluateHeuristics(userAnswer, targetAnswer, rationale);
      return NextResponse.json({
        ...fallbackResult,
        isAiPowered: false,
        note: 'Evaluated using built-in semantic matcher (Add GEMINI_API_KEY in .env.local for full Gemini AI analysis).'
      });
    }

    // Call Google Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const MODEL_CANDIDATES = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'];

    const prompt = `You are a strict yet encouraging Nutrition and Dietetics Board Exam reviewer professor.
Evaluate the student's answer against the target answer for this flashcard question.

Question: "${question}"
Target Key / Answer: "${targetAnswer}"
Clinical / Exam Rationale: "${rationale}"
Student's Answer: "${userAnswer}"

Grade the student's response semantically. Minor spelling variations, abbreviations (e.g., CKD for Chronic Kidney Disease, TPN for Total Parenteral Nutrition, IBW for Ideal Body Weight), or synonymous medical phrasings should be accepted as 'correct'. If they understand the core concept but missed key numbers/units, rate as 'partially_correct'. If completely inaccurate or irrelevant, rate as 'incorrect'.

Return ONLY valid JSON matching this schema:
{
  "verdict": "correct" | "partially_correct" | "incorrect",
  "score": number (0 to 100),
  "feedback": "A concise 1-2 sentence warm, encouraging evaluation of the student's response",
  "rationale": "Clear clinical/biochemical explanation why this is the answer",
  "suggestedAnswer": "Clean, concise target answer"
}`;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        if (!text) continue;

        let cleanText = text.trim();
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }

        const parsed: AIGradeResponse = JSON.parse(cleanText);
        return NextResponse.json({
          ...parsed,
          isAiPowered: true
        });
      } catch (err) {
        console.warn(`Model ${modelName} failed in check-answer, trying next:`, err);
      }
    }
    throw new Error('All model candidates failed in check-answer');
  } catch (error) {
    console.error('Error in /api/check-answer:', error);
    
    // Graceful fallback on error
    try {
      const body = await req.clone().json().catch(() => ({}));
      const fallback = evaluateHeuristics(body.userAnswer || '', body.targetAnswer || '', body.rationale || '');
      return NextResponse.json({
        ...fallback,
        isAiPowered: false,
        note: 'AI evaluation timed out; fallback semantic scoring applied.'
      });
    } catch {
      return NextResponse.json(
        {
          verdict: 'incorrect',
          score: 0,
          feedback: 'Error evaluating answer. Please try again.',
          rationale: '',
          suggestedAnswer: ''
        },
        { status: 500 }
      );
    }
  }
}
