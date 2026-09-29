import { GoogleGenerativeAI } from "@google/generative-ai";
import { NDLESubject, NDLEClassificationResult, NDLE_SUBJECT_CONFIGS } from "@/types/ndle";
import { DeckCategory, Flashcard } from "@/types";

const classificationCache = new Map<string, NDLEClassificationResult>();

// Rich curated dictionaries for deterministic and high-precision fallback classification
const CLINICAL_BIOCHEM_KEYWORDS: (string | RegExp)[] = [
  /\bmetabolism\b/i, /\bglycolysis\b/i, /\bkrebs\b/i, /\btca cycle\b/i, /\bgluconeogenesis\b/i,
  /\bcreatinine\b/i, /\bgfr\b/i, /\bckd\b/i, /\bdialysis\b/i, /\bhemodialysis\b/i, /\bperitoneal\b/i,
  /\btpn\b/i, /\benteral\b/i, /\bparenteral\b/i, /\btube feeding\b/i, /\bosmolality\b/i,
  /\bharris-benedict\b/i, /\bmifflin\b/i, /\bter\b/i, /\bnpc:n\b/i, /\bnitrogen balance\b/i,
  /\bdiabetes\b/i, /\bdka\b/i, /\bhba1c\b/i, /\binsulin\b/i, /\bglycemic index\b/i,
  /\bpancreatitis\b/i, /\bhepatic\b/i, /\bcirrhosis\b/i, /\bencephalopathy\b/i,
  /\balbumin\b/i, /\bprealbumin\b/i, /\bpotassium\b/i, /\bcalcium\b/i, /\bhyperkalemia\b/i,
  /\blipid\b/i, /\bcholesterol\b/i, /\btriglyceride\b/i, /\batherosclerosis\b/i, /\bhypertension\b/i,
  /\bdash\b/i, /\brenal\b/i, /\bnephrotic\b/i, /\burea\b/i, /\bbun\b/i, /\bgout\b/i, /\buric acid\b/i,
  /\bcrohn'?s\b/i, /\bulcerative colitis\b/i, /\bceliac\b/i, /\bgluten\b/i, /\bfodmap\b/i,
  /\bpku\b/i, /\bphenylketonuria\b/i, /\bmaple syrup urine\b/i, /\bgalactosemia\b/i,
  /\bvitamin [a-k]\b/i, /\bthiamine\b/i, /\bniacin\b/i, /\bfolate\b/i, /\bcobalamin\b/i, /\bb12\b/i,
  /\bcoenzyme\b/i, /\benzyme kinetics\b/i, /\bkm\b/i, /\bvmax\b/i, /\bpathology\b/i,
  /\bmedical nutrition therapy\b/i, /\bmnt\b/i, /\bclinical\b/i, /\bintensive care\b/i, /\bicu\b/i,
  /\bcancer cachexia\b/i, /\bchemotherapy\b/i, /\brefeeding syndrome\b/i
];

const COMMUNITY_PUBLIC_HEALTH_KEYWORDS: (string | RegExp)[] = [
  /\bppan\b/i, /\bnnc\b/i, /\bphilippine plan of action for nutrition\b/i,
  /\bnational nutrition council\b/i, /\bdost-fnri\b/i, /\bfnri\b/i,
  /\bpinggang pinoy\b/i, /\bfood pyramid\b/i, /\bdoh\b/i, /\bwho\b/i, /\bunicef\b/i,
  /\boperation timbang\b/i, /\bopt\+?\b/i, /\banthropometr/i, /\bmuac\b/i,
  /\bmid-upper arm circumference\b/i, /\bstunting\b/i, /\bwasting\b/i, /\bunderweight\b/i,
  /\bz-score\b/i, /\bgrowth chart\b/i, /\bheight-for-age\b/i, /\bweight-for-length\b/i,
  /\bra 11148\b/i, /\bfirst 1000 days\b/i, /\bfirst 1,?000 days\b/i,
  /\bra 8976\b/i, /\bfood fortification act\b/i, /\bsangkap pinoy\b/i,
  /\bra 7600\b/i, /\brooming-in\b/i, /\bbreastfeeding act\b/i, /\bexecutive order 51\b/i, /\bmilk code\b/i,
  /\bra 10862\b/i, /\bnutrition and dietetics law\b/i,
  /\bepidemiology\b/i, /\bprevalence\b/i, /\bincidence\b/i, /\bmorbidity\b/i, /\bmortality\b/i,
  /\bpublic health\b/i, /\bcommunity nutrition\b/i, /\bbarangay nutrition scholar\b/i, /\bbns\b/i,
  /\bmaternal\b/i, /\blactation\b/i, /\bpregnancy\b/i, /\bgestational\b/i,
  /\biycf\b/i, /\binfant and young child feeding\b/i, /\bcomplementary feeding\b/i,
  /\bexclusive breastfeeding\b/i, /\bvadd\b/i, /\bvitamin a deficiency\b/i, /\bida\b/i,
  /\biron deficiency anemia\b/i, /\bidd\b/i, /\biodine deficiency\b/i, /\bgoiter\b/i,
  /\bmonitoring and evaluation\b/i, /\bnutrition surveillance\b/i
];

const FOOD_SERVICE_KEYWORDS: (string | RegExp)[] = [
  /\bhaccp\b/i, /\bhazard analysis\b/i, /\bccp\b/i, /\bcritical control point\b/i,
  /\bprerequisite program\b/i, /\bgmp\b/i, /\bgood manufacturing practice\b/i,
  /\bfood service\b/i, /\bfoodservice\b/i, /\bcommissary\b/i, /\bassembly-serve\b/i,
  /\bconventional\b/i, /\breadymade\b/i, /\bcook-chill\b/i, /\bcook-freeze\b/i,
  /\bedible portion\b/i, /\bep\b/i, /\bas purchased\b/i, /\bap\b/i, /\byield factor\b/i,
  /\brecipe costing\b/i, /\brecipe standardization\b/i, /\bfood cost percentage\b/i,
  /\bmenu planning\b/i, /\bcycle menu\b/i, /\bstatic menu\b/i, /\bsingle use menu\b/i,
  /\bportion control\b/i, /\bscoop size\b/i, /\bladle\b/i,
  /\btemperature danger zone\b/i, /\bdanger zone\b/i, /\b40 to 140\b/i, /\b41 to 135\b/i,
  /\bfifo\b/i, /\bfirst in first out\b/i, /\blifo\b/i,
  /\bstoreroom\b/i, /\binventory\b/i, /\bpar stock\b/i, /\bpurchasing\b/i, /\breceiving\b/i,
  /\bspecifications\b/i, /\bvendor\b/i, /\bprocurement\b/i,
  /\bcross-contamination\b/i, /\bsanitiz/i, /\bcleaning\b/i, /\bdishwashing\b/i,
  /\bfood microbiology\b/i, /\bsalmonella\b/i, /\be\. coli\b/i, /\bclostridium\b/i, /\bstaphylococcus\b/i,
  /\blisteria\b/i, /\bbotulinum\b/i, /\bfood poisoning\b/i, /\bfoodborne\b/i,
  /\bcaramelization\b/i, /\bmaillard\b/i, /\bgelatinization\b/i, /\bsyneresis\b/i,
  /\brancidity\b/i, /\bemulsion\b/i, /\bdenaturation\b/i, /\bcoagulation\b/i,
  /\bleavening\b/i, /\bgluten development\b/i, /\bkitchen layout\b/i, /\bwork triangle\b/i
];

/**
 * Score text against keyword collections for instant deterministic heuristics
 */
function scoreKeywords(text: string, keywords: (string | RegExp)[]): number {
  let score = 0;
  for (const kw of keywords) {
    if (typeof kw === "string") {
      if (text.toLowerCase().includes(kw.toLowerCase())) score += 1;
    } else {
      const matches = text.match(kw);
      if (matches) score += matches.length;
    }
  }
  return score;
}

/**
 * Maps existing deck categories or common tags directly to NDLE official subjects
 */
export function mapCategoryToNDLE(
  category?: DeckCategory | string,
  tags: string[] = []
): NDLESubject | null {
  const allTags = tags.map((t) => t.toLowerCase());

  // Direct tag matching
  if (allTags.some((t) => t === "nbcd" || t.includes("biochem") || t.includes("clinical"))) {
    return "Nutritional Biochemistry and Clinical Dietetics";
  }
  if (allTags.some((t) => t === "cphn" || t.includes("public health") || t.includes("community"))) {
    return "Community and Public Health Nutrition";
  }
  if (allTags.some((t) => t === "ffss" || t.includes("food service") || t.includes("haccp"))) {
    return "Foods and Food Service Systems";
  }

  if (!category) return null;

  switch (category) {
    case "Nutritional Biochemistry":
    case "Clinical Nutrition":
      return "Nutritional Biochemistry and Clinical Dietetics";
    case "Public Health & Community":
    case "Maternal & Child Nutrition":
      return "Community and Public Health Nutrition";
    case "Food Service Systems":
      return "Foods and Food Service Systems";
    default:
      return null;
  }
}

/**
 * High-speed heuristic classifier: analyzes card prompt, back answer, rationale, and tags.
 * Runs synchronously with zero network overhead.
 */
export function classifyCardHeuristic(card: {
  front: string;
  back?: string;
  rationale?: string;
  tags?: string[];
  deckCategory?: DeckCategory | string;
}): NDLEClassificationResult {
  // 1. Check explicit tags or category mapping first
  const mapped = mapCategoryToNDLE(card.deckCategory, card.tags || []);
  if (mapped) {
    return {
      subject: mapped,
      confidence: 0.95,
      reasoning: `Matched existing category or NDLE tag (${card.deckCategory || card.tags?.join(", ")})`,
      source: "tag",
    };
  }

  // 2. Score text content
  const fullText = [
    card.front || "",
    card.back || "",
    card.rationale || "",
    (card.tags || []).join(" "),
  ].join(" ");

  const clinicalScore = scoreKeywords(fullText, CLINICAL_BIOCHEM_KEYWORDS);
  const communityScore = scoreKeywords(fullText, COMMUNITY_PUBLIC_HEALTH_KEYWORDS);
  const foodServiceScore = scoreKeywords(fullText, FOOD_SERVICE_KEYWORDS);

  const totalScore = clinicalScore + communityScore + foodServiceScore;

  if (totalScore === 0) {
    // Default fallback to Clinical (highest weighted NDLE pillar) with lower confidence
    return {
      subject: "Nutritional Biochemistry and Clinical Dietetics",
      confidence: 0.45,
      reasoning: "Default baseline classification; manual review recommended.",
      source: "heuristic",
    };
  }

  if (foodServiceScore > clinicalScore && foodServiceScore > communityScore) {
    const confidence = Math.min(0.95, 0.6 + foodServiceScore * 0.08);
    return {
      subject: "Foods and Food Service Systems",
      confidence,
      reasoning: `Detected food service, HACCP, or culinary chemistry terminology (score: ${foodServiceScore})`,
      source: "heuristic",
    };
  }

  if (communityScore > clinicalScore && communityScore >= foodServiceScore) {
    const confidence = Math.min(0.95, 0.6 + communityScore * 0.08);
    return {
      subject: "Community and Public Health Nutrition",
      confidence,
      reasoning: `Detected PPAN, public health policies, or nutritional assessment terms (score: ${communityScore})`,
      source: "heuristic",
    };
  }

  const confidence = Math.min(0.95, 0.6 + clinicalScore * 0.08);
  return {
    subject: "Nutritional Biochemistry and Clinical Dietetics",
    confidence,
    reasoning: `Detected clinical calculations, metabolic pathways, or MNT concepts (score: ${clinicalScore})`,
    source: "heuristic",
  };
}

/**
 * AI/LLM Classification Pipeline using Gemini API.
 * Validates output strictly into one of the 3 official NDLE subjects.
 */
export async function classifyCardWithAI(card: {
  front: string;
  back?: string;
  rationale?: string;
  tags?: string[];
  deckCategory?: DeckCategory | string;
}): Promise<NDLEClassificationResult> {
  const cacheKey = `${card.front.trim()}::${card.back?.trim() || ""}`;
  if (classificationCache.has(cacheKey)) {
    return classificationCache.get(cacheKey)!;
  }

  // Check tag/category heuristics first
  const heuristicResult = classifyCardHeuristic(card);
  if (heuristicResult.confidence >= 0.9) {
    classificationCache.set(cacheKey, heuristicResult);
    return heuristicResult;
  }

  // Attempt AI classification with Admin or User key
  const apiKey =
    process.env.ADMIN_GEMINI_API_KEY ||
    process.env.ADMIN_AI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    classificationCache.set(cacheKey, heuristicResult);
    return heuristicResult;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are the Official Chief Exam Classifier for the Philippine Board of Nutrition and Dietetics (PRC NDLE).
Classify the following flashcard/question into EXACTLY ONE of the three official NDLE board subjects:

1. "Nutritional Biochemistry and Clinical Dietetics" (Weight: 35%)
   Focus: Nutrient metabolism, micronutrient/macronutrient biochemistry, Medical Nutrition Therapy (MNT), clinical formulas (TER, DBW, Harris-Benedict, NPC:N, renal/hepatic/diabetic diets, TPN/EN, pathology).

2. "Community and Public Health Nutrition" (Weight: 30%)
   Focus: Nutritional assessment (ABCD, anthropometry, Z-scores, OPT+), Philippine national policies (PPAN, NNC, RA 11148 First 1000 Days, RA 8976 Fortification, RA 7600/EO 51 Milk Code, RA 10862), maternal & child nutrition, epidemiology, public health programs.

3. "Foods and Food Service Systems" (Weight: 35%)
   Focus: Food science & culinary chemistry, recipe costing & standardization, AP/EP, yield factor, menu planning, HACCP, temperature danger zone, storeroom management, food safety & sanitation, food service administration.

CARD CONTENT:
Question/Front: "${card.front}"
Answer/Back: "${card.back || ""}"
Rationale: "${card.rationale || ""}"
Tags: "${(card.tags || []).join(", ")}"

Output strictly valid JSON with this exact schema:
{
  "subject": "Nutritional Biochemistry and Clinical Dietetics" | "Community and Public Health Nutrition" | "Foods and Food Service Systems",
  "confidence": number, // between 0.5 and 1.0
  "reasoning": string // 1 short sentence explanation
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text) as {
      subject?: string;
      confidence?: number;
      reasoning?: string;
    };

    let subject: NDLESubject = heuristicResult.subject;
    if (
      parsed.subject === "Nutritional Biochemistry and Clinical Dietetics" ||
      parsed.subject === "Community and Public Health Nutrition" ||
      parsed.subject === "Foods and Food Service Systems"
    ) {
      subject = parsed.subject;
    }

    const aiResult: NDLEClassificationResult = {
      subject,
      confidence: Math.max(0.5, Math.min(1.0, parsed.confidence || 0.85)),
      reasoning: parsed.reasoning || `Classified by AI as ${subject}`,
      source: "ai",
    };

    classificationCache.set(cacheKey, aiResult);
    return aiResult;
  } catch (err) {
    console.warn("AI card classification failed, falling back to heuristics:", err);
    classificationCache.set(cacheKey, heuristicResult);
    return heuristicResult;
  }
}

/**
 * Batch classification for cards being imported or existing in a deck.
 * Uses high-speed heuristics for immediate responsiveness and batch AI refinement.
 */
export async function batchClassifyCards(
  cards: Array<{
    id?: string;
    front: string;
    back?: string;
    rationale?: string;
    tags?: string[];
    ndleSubject?: NDLESubject;
  }>,
  onProgress?: (processed: number, total: number) => void
): Promise<Array<{ index: number; card: typeof cards[0]; classification: NDLEClassificationResult }>> {
  const results: Array<{ index: number; card: typeof cards[0]; classification: NDLEClassificationResult }> = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];

    // If already explicitly classified, retain override
    if (card.ndleSubject && NDLE_SUBJECT_CONFIGS[card.ndleSubject]) {
      results.push({
        index: i,
        card,
        classification: {
          subject: card.ndleSubject,
          confidence: 1.0,
          reasoning: "Manually assigned NDLE subject",
          source: "override",
        },
      });
    } else {
      // Run heuristic first
      const heuristic = classifyCardHeuristic(card);
      results.push({
        index: i,
        card,
        classification: heuristic,
      });
    }

    if (onProgress) {
      onProgress(i + 1, cards.length);
    }
  }

  return results;
}

/**
 * Assigns NDLE Subject to a flashcard and tags it with official code (NBCD, CPHN, or FFSS)
 */
export function applyNDLETagToCard(card: Flashcard, subject: NDLESubject): Flashcard {
  const config = NDLE_SUBJECT_CONFIGS[subject];
  const tagsSet = new Set(card.tags || []);
  tagsSet.add(config.code);
  tagsSet.add("NDLE");

  return {
    ...card,
    ndleSubject: subject,
    tags: Array.from(tagsSet),
    updatedAt: new Date().toISOString(),
  };
}
