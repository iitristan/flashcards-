import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MCExplanationRequest, MCExplanationResponse, ExplanationSource } from '@/types';

const MODEL_CANDIDATES = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-flash'
];

const STANDARD_SOURCES: ExplanationSource[] = [
  {
    title: "Mahan LK, Raymond JL. Krause and Mahan's Food & The Nutrition Care Process, 16th ed. Elsevier, 2024.",
    relevance: "Core Clinical Dietetics & Medical Nutrition Therapy"
  },
  {
    title: "Academy of Nutrition and Dietetics — Evidence Analysis Library (EAL)",
    relevance: "Official evidence-based nutrition practice guidelines",
    url: "https://www.andeal.org/"
  },
  {
    title: "ASPEN Clinical Guidelines — Journal of Parenteral and Enteral Nutrition",
    relevance: "Clinical Nutrition Support & Metabolic Care Protocols",
    url: "https://www.nutritioncare.org/Guidelines_and_Clinical_Resources/Clinical_Guidelines/"
  }
];

/**
 * Domains that are paywalled publishers / bookstores — clicking these is useless
 * for verifying clinical content. We reject these and treat the source as "no link".
 */
const BLOCKED_DOMAINS = [
  'cengage.com', 'elsevier.com', 'springer.com', 'wiley.com',
  'mcgraw-hill.com', 'mheducation.com', 'pearson.com', 'lww.com',
  'wolterskluwer.com', 'thieme.com', 'taylorfrancis.com',
  'amazon.com', 'barnesandnoble.com', 'books.google.com',
  'google.com/books', 'bookdepository.com'
];

/**
 * Given a source returned by the AI, resolve the best direct URL.
 * Priority: direct PMID link > direct DOI link > non-paywall URL > empty
 */
function resolveSourceUrl(source: { url?: string; pmid?: string; doi?: string; title?: string }): string {
  // 1. If a valid PMID is provided, link directly to the PubMed article page
  if (source.pmid) {
    const cleaned = source.pmid.replace(/[^0-9]/g, '');
    if (cleaned.length >= 6 && cleaned.length <= 10) {
      return `https://pubmed.ncbi.nlm.nih.gov/${cleaned}/`;
    }
  }

  // 2. If a valid DOI is provided, link directly via doi.org resolver
  if (source.doi) {
    const cleaned = source.doi.trim().replace(/^https?:\/\/doi\.org\//i, '');
    if (cleaned.startsWith('10.')) {
      return `https://doi.org/${cleaned}`;
    }
  }

  // 3. If a direct URL was given, check it's not a search page or paywall
  if (source.url) {
    const u = source.url.trim();

    // Reject generic search pages
    const isGenericSearch = /^https?:\/\/(scholar\.google|pubmed\.ncbi\.nlm\.nih\.gov\/?\?term=|google\.com\/search)/i.test(u);
    if (isGenericSearch) return '';

    // Reject paywalled publisher / bookstore domains
    const isPaywall = BLOCKED_DOMAINS.some(domain => u.toLowerCase().includes(domain));
    if (isPaywall) return '';

    // Reject bare homepages (e.g. "https://example.org/")
    try {
      const parsed = new URL(u);
      if (parsed.pathname === '/' && !parsed.search && !parsed.hash) return '';
    } catch { /* not a valid URL */ return ''; }

    if (u.startsWith('http')) {
      return u;
    }
  }

  // 4. Fallback: no usable direct link
  return '';
}

function formatModelDisplayName(modelName: string): string {
  const map: Record<string, string> = {
    'gemini-3.6-flash': 'Gemini 3.6 Flash',
    'gemini-3.5-flash': 'Gemini 3.5 Flash',
    'gemini-3.5-flash-lite': 'Gemini 3.5 Flash-Lite',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-flash': 'Gemini Flash'
  };
  return map[modelName] || modelName;
}

function generateFallbackExplanation(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  rationale: string = '',
  allOptions: string[] = [],
  modelUsed: string = 'Unavailable',
  generationTimeMs: number = 0,
  errorMsg: string = 'Gemini service is temporarily experiencing high demand.'
): MCExplanationResponse {
  return {
    searchOverview: '',
    whyRight: '',
    whyWrongChoices: '',
    keyDifference: '',
    sources: [],
    isAiPowered: false,
    modelUsed,
    generationTimeMs,
    unavailable: true,
    error: errorMsg,
    authorRationale: rationale || undefined
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
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
        generateFallbackExplanation(question, userAnswer, correctAnswer, rationale, allOptions, 'Clinical Literature Engine (Local)', Date.now() - startTime)
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const isStudentCorrect = userAnswer && userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

    const prompt = `You are a clinical dietetics and medical nutrition therapy board exam review authority and biomedical educator.
Provide a direct, factual, evidence-based breakdown for this flashcard question.

Question: "${question}"
Available Options: ${JSON.stringify(allOptions)}
Student Chose: "${userAnswer || 'Not answered'}"
Correct Answer: "${correctAnswer}"
Student Result: ${isStudentCorrect ? 'CORRECT' : 'INCORRECT'}
Card Pre-existing Rationale: "${rationale || 'None provided. You MUST act as the primary expert and synthesize the complete, precise factual explanation yourself.'}"

CRITICAL INSTRUCTIONS ON TONE & DEPTH:
- ZERO GENERIC META-FILLER: Absolutely NEVER write phrases like:
  ✖ "is verified by clinical nutrition reference standards"
  ✖ "according to standard references"
  ✖ "based on clinical literature and guidelines"
  ✖ "satisfies the clinical and biochemical requirements defined in the question"
  ✖ "refers to a different clinical parameter"
  ✖ "is the precise answer established for this question"
- BE SPECIFIC, DEEP & CONCRETE: Explain the true mechanisms, biochemical pathways, molecules, organs, enzymes, diagnostic thresholds, or formulas. Match the high-yield depth of clinical board review materials.

EXEMPLAR STYLE (MATCH THIS CALIBER):
For a question like "Which of the following is true about megaloblastic anemia? I. it is clinically manifested by neuropathy II. vitamin E is required for its dietary management":
• searchOverview: "Megaloblastic anemia is primarily caused by deficiencies in Vitamin B12 (cobalamin) or Vitamin B9 (folate), which impair DNA synthesis and nuclear maturation in erythroid precursors."
• whyRight: "Neuropathy (subacute combined degeneration of the spinal cord) is specific to Vitamin B12 deficiency due to impaired myelin synthesis, but is NOT present in pure folate-induced megaloblastic anemia. Furthermore, dietary management requires Vitamin B12 and/or Folate supplementation, NOT Vitamin E (which is involved in hemolytic anemia prevention). Therefore, both general statements as written are clinically incorrect."
• whyWrongChoices: "Statement I is a common clinical board trap: while B12 deficiency causes neuropathy, folate deficiency causes megaloblastic anemia WITHOUT neurologic symptoms. Statement II is incorrect because Vitamin E deficiency causes hemolytic anemia with erythrocyte fragility, not megaloblastic anemia."
• keyDifference: "Differentiate megaloblastic anemias by neuro symptoms (B12 deficiency exhibits neuropathy; folate deficiency does not; management requires B12/folate, not vitamin E)."

SECTION GUIDELINES:
- "searchOverview": A crisp 1-2 sentence direct, punchy answer explaining the core concept and why "${correctAnswer}" is the exact factual solution.
- "whyRight": Explain the actual physiological, biochemical, or clinical mechanism why "${correctAnswer}" is correct. Detail the actual science, pathways, and reactions.
- "whyWrongChoices": Provide a concrete breakdown of other options. Explain what those alternative concepts actually are in real biology/medicine and what condition or pathway they belong to.
- "keyDifference": 1 concise sentence highlighting the single most critical differentiating fact or diagnostic hallmark.

SOURCES:
Provide 2-3 real, specific academic or clinical sources relevant to this topic.
For EACH source, provide:
- "title": Full citation (author, book/guideline/article title, year).
- "relevance": The specific factual takeaway from this source.
- "pmid": Numeric PubMed ID if known (or empty string).
- "doi": DOI if known (or empty string).
- "url": Direct non-paywalled link if known (or empty string).

Return strictly valid JSON matching this schema:
{
  "searchOverview": "string",
  "whyRight": "string",
  "whyWrongChoices": "string",
  "keyDifference": "string",
  "sources": [
    { "title": "string", "relevance": "string", "pmid": "string", "doi": "string", "url": "string" }
  ]
}`;

    let lastError: unknown = null;
    for (const modelName of MODEL_CANDIDATES) {
      for (let attempt = 0; attempt < 2; attempt++) {
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
          if (!parsed.whyRight || !parsed.searchOverview) {
            throw new Error('AI returned incomplete explanation fields');
          }

          const generationTimeMs = Date.now() - startTime;
          const displayName = formatModelDisplayName(modelName);

          // Resolve each source to its best direct URL from PMID/DOI/url
          const rawSources = Array.isArray(parsed.sources) ? parsed.sources : [];
          const resolvedSources: ExplanationSource[] = rawSources.map((s: Record<string, string>) => {
            const directUrl = resolveSourceUrl({
              url: s.url,
              pmid: s.pmid,
              doi: s.doi,
              title: s.title
            });

            return {
              title: s.title || 'Clinical Reference',
              relevance: s.relevance || '',
              url: directUrl || undefined,
              pmid: s.pmid || undefined,
              doi: s.doi || undefined
            };
          });

          return NextResponse.json({
            searchOverview: parsed.searchOverview,
            whyRight: parsed.whyRight,
            whyWrongChoices: parsed.whyWrongChoices || '',
            keyDifference: parsed.keyDifference || '',
            sources: resolvedSources,
            isAiPowered: true,
            modelUsed: displayName,
            generationTimeMs,
            authorRationale: rationale || undefined
          });
        } catch (err: any) {
          lastError = err;
          const isRetryable = err?.status === 503 || String(err?.message || '').includes('503') || err?.status === 429 || String(err?.message || '').includes('429');
          if (isRetryable && attempt === 0) {
            console.warn(`Model ${modelName} encountered 503/429 load spike. Backing off 1.2s and retrying...`);
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          console.warn(`Model ${modelName} error (attempt ${attempt + 1}):`, err?.message || err);
          break;
        }
      }
    }

    const lastErrorMsg = (lastError as any)?.message || 'Gemini service is temporarily experiencing high demand (503/429).';
    console.error('All Gemini candidate models failed in /api/explain-mc:', lastError);
    return NextResponse.json(
      generateFallbackExplanation(question, userAnswer, correctAnswer, rationale, allOptions, 'Unavailable', Date.now() - startTime, lastErrorMsg)
    );
  } catch (error: unknown) {
    console.error('Fatal error in /api/explain-mc:', error);
    const fatalMsg = (error as any)?.message || 'Service unavailable';
    return NextResponse.json(
      generateFallbackExplanation(
        body.question || '',
        body.userAnswer || '',
        body.correctAnswer || '',
        body.rationale || '',
        body.allOptions || [],
        'Unavailable',
        Date.now() - startTime,
        fatalMsg
      )
    );
  }
}
