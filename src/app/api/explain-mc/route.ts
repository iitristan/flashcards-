import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MCExplanationRequest, MCExplanationResponse, ExplanationSource } from '@/types';

const MODEL_CANDIDATES = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash'
];

const STANDARD_SOURCES: ExplanationSource[] = [
  {
    title: "Krause and Mahan's Food & The Nutrition Care Process (15th ed.)",
    relevance: "Core Clinical Dietetics & Medical Nutrition Therapy"
  },
  {
    title: "Academy of Nutrition and Dietetics (AND)",
    relevance: "Evidence Analysis Library (EAL) & Nutrition Care Manual"
  },
  {
    title: "ASPEN Clinical Guidelines",
    relevance: "Clinical Nutrition Protocols & Metabolic Support"
  }
];

function generateFallbackExplanation(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  rationale: string = '',
  allOptions: string[] = []
): MCExplanationResponse {
  const isDifferent = userAnswer && userAnswer.trim().toLowerCase() !== correctAnswer.trim().toLowerCase();

  const searchOverview = rationale
    ? `${correctAnswer} is the clinically validated answer for this scenario: ${rationale}`
    : `In clinical nutrition and dietetics practice, "${correctAnswer}" is the accurate determination for: "${question}".`;

  const whyRight = rationale
    ? `According to clinical nutrition reference standards, ${correctAnswer} directly addresses this question because: ${rationale}`
    : `"${correctAnswer}" is verified by clinical nutrition reference standards as the direct, evidence-based answer for this physiological/dietetic concept.`;

  let whyWrongChoices = '';
  if (isDifferent) {
    whyWrongChoices = `You selected "${userAnswer}". While common in study reviews, "${userAnswer}" represents a distinct clinical parameter or intervention that does not fulfill the criteria of "${question}". In contrast, "${correctAnswer}" is specifically indicated here.`;
  } else if (allOptions.length > 1) {
    const distractors = allOptions.filter(o => o.trim().toLowerCase() !== correctAnswer.trim().toLowerCase()).slice(0, 2);
    if (distractors.length > 0) {
      whyWrongChoices = `Alternative choices like ${distractors.map(d => `"${d}"`).join(' and ')} apply to different clinical protocols or metabolic pathways rather than the specific criteria defined in this question.`;
    }
  }

  const keyDifference = isDifferent
    ? `Contrast "${userAnswer}" with "${correctAnswer}": Ensure you differentiate between their respective clinical thresholds, target organs, or biochemical roles.`
    : `Review how "${correctAnswer}" is uniquely defined compared to closely related nutrition board terms.`;

  const boardTip = rationale
    ? `High-Yield Takeaway: ${rationale.split('.')[0]}.`
    : `High-Yield Takeaway: Focus on the specific diagnostic criteria and biochemical mechanism defining "${correctAnswer}".`;

  return {
    searchOverview,
    whyRight,
    whyWrongChoices,
    keyDifference,
    boardTip,
    sources: STANDARD_SOURCES,
    isAiPowered: false
  };
}

export async function POST(req: NextRequest) {
  let body: Partial<MCExplanationRequest> = {};
  try {
    body = await req.json();
    const {
      question,
      userAnswer = '',
      correctAnswer,
      allOptions = [],
      rationale = '',
      apiKey: clientApiKey
    } = body;

    if (!question || !correctAnswer) {
      return NextResponse.json(
        { error: 'Missing required parameters: question and correctAnswer' },
        { status: 400 }
      );
    }

    const apiKey = clientApiKey || req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        generateFallbackExplanation(question, userAnswer, correctAnswer, rationale, allOptions)
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const isStudentCorrect = userAnswer && userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

    const prompt = `You are an authoritative clinical nutrition & dietetics AI search engine (like Google AI Overviews).
Generate a realistic, factual, evidence-based search overview breakdown for this question.

Question: "${question}"
Available Options: ${JSON.stringify(allOptions)}
Student Chose: "${userAnswer || 'Not answered'}"
Correct Answer: "${correctAnswer}"
Student Result: ${isStudentCorrect ? 'CORRECT' : 'INCORRECT'}
Clinical Reference Rationale: "${rationale}"

CRITICAL INSTRUCTION: WHETHER THE STUDENT ANSWER IS CORRECT OR INCORRECT, YOU MUST ALWAYS PROVIDE A FULL, DEEP AI OVERVIEW:
1. "searchOverview": Direct 1-2 sentence authoritative Google AI Overview connecting the question directly to "${correctAnswer}".
2. "whyRight": Detailed explanation of why "${correctAnswer}" is factually, biochemically, and clinically correct based on clinical literature.
3. "whyWrongChoices": Detailed breakdown explaining why alternative choices/distractors are WRONG ("this is right because of this, and other choices are not that because they apply to X instead"). Even if the student got it CORRECT, still explain why the other options are wrong so they understand the differential diagnosis!
4. "keyDifference": 1 concise sentence summarizing the critical distinction between the correct answer and distractor choices.
5. "boardTip": 1 high-yield diagnostic pearl, memory hook, or exam mnemonic.
6. "sources": 2-3 authoritative textbook and clinical guideline citations (e.g. Krause's Food & Nutrition Care Process, Academy of Nutrition and Dietetics EAL, ASPEN, USDA, WHO).

Return strictly valid JSON matching this schema:
{
  "searchOverview": "string",
  "whyRight": "string",
  "whyWrongChoices": "string",
  "keyDifference": "string",
  "boardTip": "string",
  "sources": [
    { "title": "string", "relevance": "string" }
  ]
}`;

    let lastError: unknown = null;
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

        let cleanJson = (text || '').trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }

        const parsed = JSON.parse(cleanJson);
        const fallback = generateFallbackExplanation(question, userAnswer, correctAnswer, rationale, allOptions);

        return NextResponse.json({
          searchOverview: parsed.searchOverview || fallback.searchOverview,
          whyRight: parsed.whyRight || fallback.whyRight,
          whyWrongChoices: parsed.whyWrongChoices || fallback.whyWrongChoices,
          keyDifference: parsed.keyDifference || fallback.keyDifference,
          boardTip: parsed.boardTip || fallback.boardTip,
          sources: (Array.isArray(parsed.sources) && parsed.sources.length > 0) ? parsed.sources : fallback.sources,
          isAiPowered: true
        });
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} encountered error in explain-mc, trying next:`, err);
      }
    }

    console.error('All Gemini candidate models failed in /api/explain-mc:', lastError);
    return NextResponse.json(
      generateFallbackExplanation(question, userAnswer, correctAnswer, rationale, allOptions)
    );
  } catch (error: unknown) {
    console.error('Fatal error in /api/explain-mc:', error);
    return NextResponse.json(
      generateFallbackExplanation(
        body.question || '',
        body.userAnswer || '',
        body.correctAnswer || '',
        body.rationale || '',
        body.allOptions || []
      )
    );
  }
}
