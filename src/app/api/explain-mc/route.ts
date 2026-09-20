import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MCExplanationRequest, MCExplanationResponse, ExplanationSource } from '@/types';

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
    'gemini-3.5-pro': 'Gemini 3.5 Pro',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-2.0-flash-lite': 'Gemini 2.0 Flash-Lite',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'gemini-1.5-pro': 'Gemini 1.5 Pro'
  };
  return map[modelName] || modelName;
}

function generateFallbackExplanation(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  rationale: string = '',
  allOptions: string[] = [],
  modelUsed: string = 'Clinical Literature Engine',
  generationTimeMs: number = 0
): MCExplanationResponse {
  const isDifferent = userAnswer && userAnswer.trim().toLowerCase() !== correctAnswer.trim().toLowerCase();

  const searchOverview = rationale
    ? `${correctAnswer}: ${rationale}`
    : `"${correctAnswer}" is the specific clinical determination for: "${question}".`;

  const whyRight = rationale
    ? `${correctAnswer} is correct because: ${rationale}`
    : `"${correctAnswer}" directly satisfies the clinical and biochemical requirements defined in the question.`;

  let whyWrongChoices = '';
  if (isDifferent) {
    whyWrongChoices = `"${userAnswer}" refers to a different clinical parameter or intervention and does not meet the specific criteria of "${question}". In contrast, "${correctAnswer}" is the precise target.`;
  } else if (allOptions.length > 1) {
    const distractors = allOptions.filter(o => o.trim().toLowerCase() !== correctAnswer.trim().toLowerCase()).slice(0, 2);
    if (distractors.length > 0) {
      whyWrongChoices = `Alternative options like ${distractors.map(d => `"${d}"`).join(' and ')} apply to different diagnostic criteria or clinical scenarios rather than this question.`;
    }
  }

  const keyDifference = isDifferent
    ? `Differentiate "${userAnswer}" from "${correctAnswer}" by checking the exact biochemical mechanism or clinical diagnostic threshold.`
    : `Review how "${correctAnswer}" is uniquely defined in board exam criteria.`;

  return {
    searchOverview,
    whyRight,
    whyWrongChoices,
    keyDifference,
    sources: STANDARD_SOURCES,
    isAiPowered: false,
    modelUsed,
    generationTimeMs
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

    const prompt = `You are a clinical dietetics and medical nutrition therapy board exam review authority.
Provide a direct, factual, evidence-based clinical breakdown for this flashcard question.

Question: "${question}"
Available Options: ${JSON.stringify(allOptions)}
Student Chose: "${userAnswer || 'Not answered'}"
Correct Answer: "${correctAnswer}"
Student Result: ${isStudentCorrect ? 'CORRECT' : 'INCORRECT'}
Card Clinical Rationale: "${rationale}"

STRICT GUIDELINES:
- DO NOT output vague meta-filler like "is verified by clinical nutrition reference standards" or "according to standard references". Get straight to the concrete medical, biochemical, or dietetic facts!
- "searchOverview": A crisp 1-2 sentence direct answer synthesizing the clinical/nutritional concept and why "${correctAnswer}" is the precise solution.
- "whyRight": Explain the actual physiological mechanism, biochemical pathway, nutrition guideline rule, or diagnostic criterion that makes "${correctAnswer}" correct. Include exact numerical values, units, or clinical thresholds if applicable.
- "whyWrongChoices": Provide a clear differential breakdown explaining what each wrong option or distractor actually refers to (e.g. why choice A is wrong, what clinical scenario choice B belongs to). If the student answered incorrectly, explain why their choice ("${userAnswer}") does not apply.
- "keyDifference": 1 concise sentence highlighting the core distinguishing diagnostic factor between "${correctAnswer}" and other options.

SOURCES — THIS IS CRITICAL:
You MUST provide 2-3 real, specific, citable academic or clinical sources. These are for a student who wants to verify and read the actual material, like in real research.

For EACH source, provide:
- "title": The FULL citation — author(s), article/chapter title, journal or book name, year. Examples:
  • "Mahan LK, Raymond JL. Krause and Mahan's Food & The Nutrition Care Process, 16th ed. Ch. 34: Medical Nutrition Therapy for Renal Disease. Elsevier, 2024."
  • "KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update. Am J Kidney Dis. 2020;76(3 Suppl 1):S1-S107."
  • "Diabetes Care. American Diabetes Association Standards of Care in Diabetes — 2024. Diabetes Care. 2024;47(Suppl 1)."
- "relevance": The specific factual takeaway from this source (e.g. "Recommends 0.55-0.6 g/kg/day protein for CKD stages 3-5 without dialysis").
- "pmid": If citing a PubMed-indexed article, provide the numeric PubMed ID (PMID). E.g. "32829751" for the KDOQI 2020 guideline. Only provide if you are confident it is the real PMID.
- "doi": If known, provide the DOI. E.g. "10.1053/j.ajkd.2020.05.006". Only provide if you are confident it is the real DOI.
- "url": A direct URL where the student can actually READ or verify the content. Acceptable examples:
    • PubMed article page: "https://pubmed.ncbi.nlm.nih.gov/32829751/"
    • Official clinical guideline page: "https://www.nutritioncare.org/..." or "https://diabetesjournals.org/care/..."
    • Open-access journal article
  NEVER provide:
    • Paywalled publisher/bookstore pages (Cengage, Elsevier, Springer, Wiley, McGraw-Hill, Amazon, etc.)
    • Generic Google Scholar or PubMed search links
    • Bare homepage URLs
  If the source is a textbook with no free online page, leave "url" as an empty string.

If you are NOT confident about a specific PMID or DOI, leave those fields as empty strings — do NOT make them up.

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
        const generationTimeMs = Date.now() - startTime;
        const displayName = formatModelDisplayName(modelName);

        // Resolve each source to its best direct URL from PMID/DOI/url
        const rawSources = (Array.isArray(parsed.sources) && parsed.sources.length > 0) ? parsed.sources : fallback.sources;
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
          searchOverview: parsed.searchOverview || fallback.searchOverview,
          whyRight: parsed.whyRight || fallback.whyRight,
          whyWrongChoices: parsed.whyWrongChoices || fallback.whyWrongChoices,
          keyDifference: parsed.keyDifference || fallback.keyDifference,
          sources: resolvedSources.length > 0 ? resolvedSources : fallback.sources,
          isAiPowered: true,
          modelUsed: displayName,
          generationTimeMs
        });
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} encountered error in explain-mc, trying next:`, err);
      }
    }

    console.error('All Gemini candidate models failed in /api/explain-mc:', lastError);
    return NextResponse.json(
      generateFallbackExplanation(question, userAnswer, correctAnswer, rationale, allOptions, 'Clinical Literature Fallback', Date.now() - startTime)
    );
  } catch (error: unknown) {
    console.error('Fatal error in /api/explain-mc:', error);
    return NextResponse.json(
      generateFallbackExplanation(
        body.question || '',
        body.userAnswer || '',
        body.correctAnswer || '',
        body.rationale || '',
        body.allOptions || [],
        'Clinical Literature Fallback',
        Date.now() - startTime
      )
    );
  }
}
