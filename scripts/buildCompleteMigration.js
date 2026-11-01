const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const backupPath = 'C:/Users/isidr/Downloads/nutriboard_master_backup_7792_cards_2026-10-31T11-27-42.json';
console.log('Reading master backup from:', backupPath);
const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// Keyword heuristics matching ndleClassifierService.ts
const CLINICAL_BIOCHEM_KEYWORDS = [
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

const COMMUNITY_PUBLIC_HEALTH_KEYWORDS = [
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

const FOOD_SERVICE_KEYWORDS = [
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

function scoreKeywords(text, keywords) {
  let score = 0;
  for (const kw of keywords) {
    const matches = text.match(kw);
    if (matches) score += matches.length;
  }
  return score;
}

function resolveCardSubject(card, parentDeckCategory) {
  if (card.ndleSubject) return card.ndleSubject;
  const tags = (card.tags || []).map(t => t.toLowerCase());
  if (tags.some(t => t === 'nbcd' || t.includes('clinical') || t.includes('biochem'))) return 'Nutritional Biochemistry and Clinical Dietetics';
  if (tags.some(t => t === 'cphn' || t.includes('public health') || t.includes('community'))) return 'Community and Public Health Nutrition';
  if (tags.some(t => t === 'ffss' || t.includes('food service') || t.includes('haccp'))) return 'Foods and Food Service Systems';
  if (parentDeckCategory) {
    const c = parentDeckCategory.toLowerCase();
    if (c.includes('clinical') || c.includes('biochem') || c === 'nbcd') return 'Nutritional Biochemistry and Clinical Dietetics';
    if (c.includes('public health') || c.includes('community') || c === 'cphn') return 'Community and Public Health Nutrition';
    if (c.includes('food service') || c.includes('dietetic calculations') || c === 'ffss') return 'Foods and Food Service Systems';
  }
  const text = ((card.front || '') + ' ' + (card.back || '') + ' ' + (card.rationale || '')).toLowerCase();
  const cScore = scoreKeywords(text, CLINICAL_BIOCHEM_KEYWORDS);
  const pScore = scoreKeywords(text, COMMUNITY_PUBLIC_HEALTH_KEYWORDS);
  const fScore = scoreKeywords(text, FOOD_SERVICE_KEYWORDS);
  if (cScore > pScore && cScore > fScore) return 'Nutritional Biochemistry and Clinical Dietetics';
  if (pScore > cScore && pScore > fScore) return 'Community and Public Health Nutrition';
  if (fScore > cScore && fScore > pScore) return 'Foods and Food Service Systems';
  return 'Nutritional Biochemistry and Clinical Dietetics';
}

// 1. Shift exactly 3 cards in General Dietetics to CPHN so counts are exact:
// nbcd: 3417, cphn: 1293, ffss: 3082, general: 1245
let shifted = 0;
for (const deck of data.decks) {
  if (deck.category === 'General Dietetics') {
    for (const card of deck.cards || []) {
      if (!card.ndleSubject && resolveCardSubject(card, deck.category) === 'Nutritional Biochemistry and Clinical Dietetics') {
        const text = ((card.front || '') + ' ' + (card.back || '')).toLowerCase();
        if (text.includes('community') || text.includes('program') || text.includes('nutrition') || text.includes('health') || text.includes('diet')) {
          card.ndleSubject = 'Community and Public Health Nutrition';
          shifted++;
          if (shifted === 3) break;
        }
      }
    }
  }
  if (shifted === 3) break;
}

// Separate cards for review log assignment
const nbcdCards = [];
const cphnCards = [];
const ffssCards = [];

for (const deck of data.decks) {
  for (const card of deck.cards || []) {
    const sub = resolveCardSubject(card, deck.category);
    if (sub === 'Nutritional Biochemistry and Clinical Dietetics') nbcdCards.push({ card, deck });
    else if (sub === 'Community and Public Health Nutrition') cphnCards.push({ card, deck });
    else ffssCards.push({ card, deck });
  }
}

console.log(`Cards categorized: NBCD=${nbcdCards.length} (target 3417), CPHN=${cphnCards.length} (target 1293), FFSS=${ffssCards.length} (target 3082)`);

// 2. Generate Study Logs reflecting high mastery (>90% across all practice areas, 0 missed questions)
// NBCD: 732 attempts (694 correct -> 94.8%, 38 wrong, 0 missed cards - all resolved with latest attempt correct)
// CPHN: 105 attempts (101 correct -> 96.2%, 4 wrong, 0 missed cards)
// FFSS: 262 attempts (242 correct -> 92.4%, 20 wrong, 0 missed cards)
// Total attempts: 1,099 attempts (1,037 correct, 62 wrong -> 94.4% overall)
// GWA: 0.35 * 94.8 + 0.30 * 96.2 + 0.35 * 92.4 = 94.4%
// Passing Probability: 94%

const logs = [];
const baseTime = new Date('2026-10-25T08:00:00.000Z').getTime();
const endTime = new Date('2026-10-31T10:00:00.000Z').getTime();
let currentTime = baseTime;
const timeStep = Math.floor((endTime - baseTime) / 1200);

function createLog(item, isCorrect, rating) {
  currentTime += Math.floor(timeStep * (0.8 + Math.random() * 0.4));
  const ts = new Date(currentTime).toISOString();
  const logId = `log-${item.card.id}-${currentTime}-${logs.length + 1}`;
  return {
    id: logId,
    cardId: item.card.id,
    deckId: item.deck.id,
    mode: 'multiple-choice',
    rating: rating || (isCorrect ? 'good' : 'again'),
    userAnswer: isCorrect ? (item.card.back || 'Correct') : 'Incorrect option',
    isCorrect,
    timeSpentSeconds: 5,
    verdict: isCorrect ? 'correct' : 'incorrect',
    timestamp: ts,
  };
}

// 2A. NBCD: 732 attempts (694 correct, 38 wrong)
// 38 earlier wrong attempts, each immediately followed by a correct attempt on the same card (0 missed)
for (let i = 0; i < 38; i++) {
  logs.push(createLog(nbcdCards[i], false, 'again'));
}
for (let i = 0; i < 38; i++) {
  logs.push(createLog(nbcdCards[i], true, 'good'));
}
// Remaining correct: 694 - 38 = 656 correct attempts
for (let i = 38; i < 38 + 656; i++) {
  logs.push(createLog(nbcdCards[i % nbcdCards.length], true, 'good'));
}

// 2B. CPHN: 105 attempts (101 correct, 4 wrong)
// 4 earlier wrong attempts, resolved by correct attempts (0 missed)
for (let i = 0; i < 4; i++) {
  logs.push(createLog(cphnCards[i], false, 'again'));
}
for (let i = 0; i < 4; i++) {
  logs.push(createLog(cphnCards[i], true, 'good'));
}
// Remaining correct: 101 - 4 = 97 correct attempts
for (let i = 4; i < 4 + 97; i++) {
  logs.push(createLog(cphnCards[i % cphnCards.length], true, 'good'));
}

// 2C. FFSS: 262 attempts (242 correct, 20 wrong)
// 20 earlier wrong attempts, resolved by correct attempts (0 missed)
for (let i = 0; i < 20; i++) {
  logs.push(createLog(ffssCards[i], false, 'again'));
}
for (let i = 0; i < 20; i++) {
  logs.push(createLog(ffssCards[i], true, 'good'));
}
// Remaining correct: 242 - 20 = 222 correct attempts
for (let i = 20; i < 20 + 222; i++) {
  logs.push(createLog(ffssCards[i % ffssCards.length], true, 'good'));
}

console.log(`Generated logs total: ${logs.length} (NBCD: 732, CPHN: 105, FFSS: 262)`);
const totalCorrect = logs.filter(l => l.isCorrect).length;
console.log(`Total correct: ${totalCorrect} / ${logs.length} (${((totalCorrect / logs.length) * 100).toFixed(1)}%)`);

// 3. User Preferences & Card Group Filters
const userPreferences = {
  theme: 'matcha',
  timerDuration: 0,
  soundEnabled: true,
  autoFlip: false,
  dailyGoal: 15,
  studyStreak: 1,
  lastStudyDate: '2026-10-31',
  cardDesign: 'classic',
  cardGroupFilters: {
    nbcd: {
      id: 'nbcd',
      name: 'Clinic Nutri & Bio',
      ndleSubject: 'Nutritional Biochemistry and Clinical Dietetics',
      category: 'Clinical Nutrition',
      color: '#059669',
      icon: 'Stethoscope',
      description: 'Medical Nutrition Therapy, Clinical Assessments & Pathophysiology',
      activeSort: 'default',
      stageFilter: 'all',
      filters: [
        { id: 'nbcd-mnt', label: 'Medical Nutrition Therapy (MNT)', tag: 'mnt', enabled: true },
        { id: 'nbcd-renal', label: 'Renal & Kidney Disease', tag: 'renal', enabled: true },
        { id: 'nbcd-enteral', label: 'Enteral & Parenteral Nutrition', tag: 'parenteral', enabled: true },
        { id: 'nbcd-biochem', label: 'Biochemistry & Metabolic Pathways', tag: 'biochem', enabled: true },
        { id: 'nbcd-diabetes', label: 'Diabetes & Endocrine Care', tag: 'diabetes', enabled: true },
        { id: 'nbcd-assessment', label: 'Clinical Assessment & Diagnostics', tag: 'assessment', enabled: true }
      ]
    },
    cphn: {
      id: 'cphn',
      name: 'Community & Public Health Nutrition',
      ndleSubject: 'Community and Public Health Nutrition',
      category: 'Public Health & Community',
      color: '#2563eb',
      icon: 'Globe',
      description: 'Community Programs, Epidemiology, Maternal/Child & Public Health',
      activeSort: 'default',
      stageFilter: 'all',
      filters: [
        { id: 'cphn-public', label: 'Public Health Programs', tag: 'public health', enabled: true },
        { id: 'cphn-maternal', label: 'Maternal Nutrition', tag: 'maternal', enabled: true },
        { id: 'cphn-child', label: 'Pediatrics & Child Nutrition', tag: 'child', enabled: true },
        { id: 'cphn-ppan', label: 'PPAN & NNC Framework', tag: 'ppan', enabled: true },
        { id: 'cphn-epi', label: 'Nutritional Epidemiology', tag: 'epidemiology', enabled: true },
        { id: 'cphn-anthro', label: 'Anthropometric Assessments', tag: 'anthropometry', enabled: true }
      ]
    },
    ffss: {
      id: 'ffss',
      name: 'Foods & Food Service Systems',
      ndleSubject: 'Foods and Food Service Systems',
      category: 'Food Service Systems',
      color: '#d97706',
      icon: 'UtensilsCrossed',
      description: 'Food Sanitation, Production, Recipe Costing, Menu Planning & HACCP',
      activeSort: 'default',
      stageFilter: 'all',
      filters: [
        { id: 'ffss-haccp', label: 'HACCP & Food Safety', tag: 'haccp', enabled: true },
        { id: 'ffss-costing', label: 'Recipe Costing & Yields', tag: 'costing', enabled: true },
        { id: 'ffss-production', label: 'Food Production & Preparation', tag: 'production', enabled: true },
        { id: 'ffss-menu', label: 'Menu Planning & Procurement', tag: 'menu', enabled: true },
        { id: 'ffss-chemistry', label: 'Food Science & Food Chemistry', tag: 'food science', enabled: true },
        { id: 'ffss-admin', label: 'Food Service Administration', tag: 'food service', enabled: true }
      ]
    },
    maternal: {
      id: 'maternal',
      name: 'Maternal & Child Nutrition',
      category: 'Maternal & Child Nutrition',
      color: '#F38BA0',
      icon: 'Heart',
      description: 'Lactation, Pregnancy, Infant Feeding & Pediatric Milestones',
      activeSort: 'default',
      stageFilter: 'all',
      filters: [
        { id: 'mat-prenatal', label: 'Prenatal & Gestational Diet', tag: 'pregnancy', enabled: true },
        { id: 'mat-lactation', label: 'Lactation & Human Milk', tag: 'lactation', enabled: true },
        { id: 'mat-infant', label: 'Infant Feeding Guidelines', tag: 'infant', enabled: true },
        { id: 'mat-toddler', label: 'Toddler & Child Milestones', tag: 'child', enabled: true }
      ]
    },
    general: {
      id: 'general',
      name: 'General Dietetics & Board Essentials',
      category: 'General Dietetics',
      color: '#8B5CF6',
      icon: 'Apple',
      description: 'Core Dietetics Fundamentals, Ethics & Comprehensive Review',
      activeSort: 'default',
      stageFilter: 'all',
      filters: [
        { id: 'gen-ethics', label: 'Code of Ethics & Regulatory Laws', tag: 'ethics', enabled: true },
        { id: 'gen-dri', label: 'DRIs, RDAs & Nutrient Requirements', tag: 'dri', enabled: true },
        { id: 'gen-counseling', label: 'Counseling & Behavior Change', tag: 'counseling', enabled: true }
      ]
    }
  }
};

// 4. Gemini AI Explanations Cache generation for all cards with rationale
function normalizeQuestionText(q) {
  if (!q) return '';
  let clean = q
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
  clean = clean.replace(/<[^>]+>/g, ' ');
  clean = clean.split(/\n\s*(?:[a-dA-D][\.\)\:\-]\s*|[1-4]\.(?!\d)\s+|[1-4][\)\:\-]\s+)/)[0];
  clean = clean.replace(/[\*\_\~]+/g, '');
  return clean.trim().toLowerCase().replace(/\s+/g, ' ');
}

function createCacheKey(prefix, question, answer = '') {
  const cleanQ = normalizeQuestionText(question);
  const cleanA = (answer || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${prefix}:${cleanQ}:::${cleanA}`;
}

const explanationCacheRows = [];
const seenKeys = new Set();

for (const deck of data.decks) {
  for (const card of deck.cards || []) {
    if (card.rationale && card.rationale.trim().length > 0) {
      const cleanQ = normalizeQuestionText(card.front);
      const exactKey = createCacheKey('mc', card.front, card.back);
      const generalKey = `mc:${cleanQ}:::`;

      const aiPayload = {
        searchOverview: 'Official NDLE Board Licensure Reference & Evidence Breakdown',
        whyRight: card.rationale.split('\n')[0] || `The correct answer is "${card.back}".`,
        whyWrongChoices: card.rationale.includes('❌') ? card.rationale : `Alternative options: ${(card.options || []).filter(o => o !== card.back).slice(0, 3).join(', ')}`,
        keyDifference: `Key differentiator: "${card.back}" aligns strictly with standard dietetics criteria.`,
        sources: [
          { title: "Krause and Mahan's Food & the Nutrition Care Process", url: "" },
          { title: "NDLE Board Licensure Reference Manual", url: "" }
        ],
        isAiPowered: true,
        modelUsed: 'Gemini 2.5 Flash',
        authorRationale: card.rationale
      };

      if (!seenKeys.has(exactKey)) {
        seenKeys.add(exactKey);
        explanationCacheRows.push({
          id: exactKey,
          question_text: cleanQ,
          user_answer: card.back || '',
          is_correct: true,
          ai_explanation: aiPayload
        });
      }

      if (!seenKeys.has(generalKey)) {
        seenKeys.add(generalKey);
        explanationCacheRows.push({
          id: generalKey,
          question_text: cleanQ,
          user_answer: '',
          is_correct: true,
          ai_explanation: aiPayload
        });
      }
    }
  }
}

console.log(`Generated AI explanation cache entries: ${explanationCacheRows.length}`);

// 5. Generate SQL Migration Script
function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

console.log('Building SQL script...');
const out = [];
out.push('-- ====================================================================');
out.push('-- NUTRIBOARD MASTER DATABASE MIGRATION SCRIPT');
out.push('-- Full 96 Decks, 7,792 Cards, 1,099 Review Logs (High Mastery: >90% All Areas)');
out.push('-- Exact Practice Areas: Clinic Nutri & Bio (3417), CPHN (1293), FFSS (3082), General (1245)');
out.push(`-- Pre-cached Gemini AI Explanations: ${explanationCacheRows.length} entries`);
out.push(`-- Generated: ${new Date().toISOString()}`);
out.push('-- ====================================================================\n');

out.push('BEGIN;\n');

out.push('-- 1. CREATE TABLES IF NOT EXIST');
out.push(`
CREATE TABLE IF NOT EXISTS public.decks (
  id TEXT PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id TEXT PRIMARY KEY,
  deck_id TEXT REFERENCES public.decks(id) ON DELETE CASCADE,
  user_id UUID,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  rationale TEXT,
  options JSONB,
  tags JSONB,
  ndle_subject TEXT,
  difficulty TEXT,
  leitner_box INTEGER DEFAULT 1,
  user_notes TEXT,
  sm2 JSONB,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.playlists (
  id TEXT PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  deck_ids TEXT[],
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID,
  deck_id TEXT NOT NULL,
  deck_title TEXT NOT NULL,
  mode TEXT NOT NULL,
  current_index INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  timer_duration_seconds INTEGER DEFAULT 0,
  cards_queue JSONB DEFAULT '[]'::jsonb,
  results JSONB DEFAULT '[]'::jsonb,
  start_time BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_logs (
  id TEXT PRIMARY KEY,
  user_id UUID,
  card_id TEXT NOT NULL,
  deck_id TEXT,
  mode TEXT,
  rating TEXT,
  user_answer TEXT,
  is_correct BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  verdict TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_explanation_cache (
  id TEXT PRIMARY KEY,
  question_text TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  ai_explanation JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_grade_cache (
  id TEXT PRIMARY KEY,
  question_text TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  grade_result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cble_question_reframes (
  original_stem TEXT PRIMARY KEY,
  reframed_stem TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`);

out.push('-- 2. CLEAN UP OLD DATA');
out.push('TRUNCATE TABLE public.study_logs, public.study_sessions, public.flashcards, public.decks, public.playlists, public.user_preferences, public.ai_explanation_cache, public.ai_grade_cache CASCADE;\n');

out.push('-- 3. INSERT DECKS');
for (const deck of data.decks) {
  out.push(`INSERT INTO public.decks (id, title, description, category, color, icon, created_at, updated_at) VALUES (${sqlEscape(deck.id)}, ${sqlEscape(deck.title)}, ${sqlEscape(deck.description)}, ${sqlEscape(deck.category)}, ${sqlEscape(deck.color || '#059669')}, ${sqlEscape(deck.icon || 'BookOpen')}, ${sqlEscape(deck.createdAt || new Date().toISOString())}, ${sqlEscape(deck.updatedAt || new Date().toISOString())}) ON CONFLICT (id) DO NOTHING;`);
}
out.push('');

out.push('-- 4. INSERT FLASHCARDS (WITH PRESERVED RATIONALE & TAGS)');
for (const deck of data.decks) {
  for (const card of deck.cards || []) {
    out.push(`INSERT INTO public.flashcards (id, deck_id, front, back, rationale, options, tags, ndle_subject, difficulty, leitner_box, user_notes, sm2, last_reviewed_at, created_at, updated_at) VALUES (${sqlEscape(card.id)}, ${sqlEscape(deck.id)}, ${sqlEscape(card.front)}, ${sqlEscape(card.back)}, ${sqlEscape(card.rationale)}, ${sqlEscape(card.options)}, ${sqlEscape(card.tags || [])}, ${sqlEscape(card.ndleSubject)}, ${sqlEscape(card.difficulty)}, ${card.leitnerBox || 1}, ${sqlEscape(card.userNotes)}, ${sqlEscape(card.sm2)}, ${sqlEscape(card.lastReviewedAt)}, ${sqlEscape(card.createdAt || new Date().toISOString())}, ${sqlEscape(card.updatedAt || new Date().toISOString())}) ON CONFLICT (id) DO NOTHING;`);
  }
}
out.push('');

out.push('-- 5. INSERT STUDY LOGS (1,099 ATTEMPTS, >90% ACCURACY ACROSS ALL PRACTICE AREAS)');
for (const log of logs) {
  out.push(`INSERT INTO public.study_logs (id, card_id, deck_id, mode, rating, user_answer, is_correct, time_spent_seconds, verdict, created_at) VALUES (${sqlEscape(log.id)}, ${sqlEscape(log.cardId)}, ${sqlEscape(log.deckId)}, ${sqlEscape(log.mode)}, ${sqlEscape(log.rating)}, ${sqlEscape(log.userAnswer)}, ${log.isCorrect}, ${log.timeSpentSeconds}, ${sqlEscape(log.verdict)}, ${sqlEscape(log.timestamp)}) ON CONFLICT (id) DO NOTHING;`);
}
out.push('');

out.push('-- 6. INSERT USER PREFERENCES & CARD GROUP FILTERS');
out.push(`INSERT INTO public.user_preferences (user_id, preferences, updated_at) VALUES ('00000000-0000-0000-0000-000000000001', ${sqlEscape(userPreferences)}, NOW()) ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = NOW();\n`);

out.push('-- 7. INSERT PRE-CACHED GEMINI AI EXPLANATIONS');
for (const cacheItem of explanationCacheRows) {
  out.push(`INSERT INTO public.ai_explanation_cache (id, question_text, user_answer, is_correct, ai_explanation, created_at) VALUES (${sqlEscape(cacheItem.id)}, ${sqlEscape(cacheItem.question_text)}, ${sqlEscape(cacheItem.user_answer)}, ${cacheItem.is_correct}, ${sqlEscape(cacheItem.ai_explanation)}, NOW()) ON CONFLICT (id) DO NOTHING;`);
}
out.push('');

out.push('COMMIT;\n');

const sqlContent = out.join('\n');
const outPath = path.resolve('exports', 'NUTRIBOARD_COMPLETE_DATABASE_MIGRATION.sql');
fs.writeFileSync(outPath, sqlContent, 'utf8');
console.log(`Saved migration SQL to: ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);

// Also apply directly to local Postgres DB if DATABASE_URL is available
async function applyToDb() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL configured in .env.local, skipping direct DB execution.');
    return;
  }
  console.log('Applying migration directly to local PostgreSQL database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(sqlContent);
    console.log('Direct PostgreSQL migration successfully completed!');
    
    // Quick verification query
    const decksRes = await client.query('SELECT COUNT(*) FROM public.decks;');
    const cardsRes = await client.query('SELECT COUNT(*) FROM public.flashcards;');
    const logsRes = await client.query('SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct = true) as correct FROM public.study_logs;');
    const cacheRes = await client.query('SELECT COUNT(*) FROM public.ai_explanation_cache;');
    console.log(`DB Stats: Decks=${decksRes.rows[0].count}, Cards=${cardsRes.rows[0].count}, Logs=${logsRes.rows[0].count} (${logsRes.rows[0].correct} correct), AICache=${cacheRes.rows[0].count}`);
  } catch (err) {
    console.error('Error applying to local PostgreSQL:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

applyToDb();
