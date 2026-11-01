const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  const decksRes = await pool.query('SELECT * FROM public.decks');
  const cardsRes = await pool.query('SELECT * FROM public.flashcards');
  const logsRes = await pool.query('SELECT * FROM public.study_logs ORDER BY created_at ASC');
  const prefsRes = await pool.query('SELECT * FROM public.user_preferences LIMIT 1');
  const cacheRes = await pool.query('SELECT COUNT(*) FROM public.ai_explanation_cache');

  console.log('Decks in DB:', decksRes.rows.length);
  console.log('Cards in DB:', cardsRes.rows.length);
  console.log('Logs in DB:', logsRes.rows.length);
  console.log('Gemini AI Cached Explanations in DB:', cacheRes.rows[0].count);

  const deckMap = new Map();
  for (const d of decksRes.rows) {
    deckMap.set(d.id, { ...d, cards: [] });
  }
  for (const c of cardsRes.rows) {
    const d = deckMap.get(c.deck_id);
    if (d) d.cards.push(c);
  }
  const decks = Array.from(deckMap.values());

  const groups = prefsRes.rows[0].preferences.cardGroupFilters;
  console.log('\n--- Practice Area Filter Manager Card Counts ---');
  // Replicate isCardInGroup from CardFilterManager
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
    if (card.ndle_subject) return card.ndle_subject;
    const tags = Array.isArray(card.tags) ? card.tags.map(t => String(t).toLowerCase()) : [];
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

  const groupCardCounts = {};
  for (const k of Object.keys(groups)) groupCardCounts[k] = 0;

  for (const deck of decks) {
    for (const card of deck.cards) {
      for (const [k, group] of Object.entries(groups)) {
        let match = false;
        if (card.practice_area_id) {
          if (card.practice_area_id === group.id) match = true;
        } else if (group.ndleSubject) {
          const resolved = resolveCardSubject(card, deck.category);
          if (resolved === group.ndleSubject) match = true;
        } else if (group.category) {
          if (deck.category === group.category) match = true;
          else {
            const tags = Array.isArray(card.tags) ? card.tags.map(t => String(t).toLowerCase()) : [];
            if (tags.some(t => t === group.category.toLowerCase())) match = true;
          }
        }
        if (match) groupCardCounts[k]++;
      }
    }
  }

  for (const [k, v] of Object.entries(groupCardCounts)) {
    console.log(`  ${groups[k].name} (${k}): ${v} cards`);
  }

  // Board Readiness performance
  const cardSubjectMap = new Map();
  for (const d of decks) {
    for (const c of d.cards) {
      cardSubjectMap.set(c.id, resolveCardSubject(c, d.category));
    }
  }

  const subjectAttempts = {
    'Nutritional Biochemistry and Clinical Dietetics': [],
    'Community and Public Health Nutrition': [],
    'Foods and Food Service Systems': [],
  };

  for (const log of logsRes.rows) {
    const sub = cardSubjectMap.get(log.card_id);
    if (sub && subjectAttempts[sub]) {
      subjectAttempts[sub].push({
        cardId: log.card_id,
        isCorrect: log.is_correct,
        rating: log.rating,
        timestamp: log.created_at,
      });
    }
  }

  console.log('\n--- Board Readiness Practice Area Performance ---');
  for (const [sub, attempts] of Object.entries(subjectAttempts)) {
    const total = attempts.length;
    const correct = attempts.filter(a => a.isCorrect).length;
    const acc = Number(((correct / total) * 100).toFixed(1));

    const latestMap = new Map();
    for (const a of attempts) {
      latestMap.set(a.cardId, a);
    }
    const missed = Array.from(latestMap.values()).filter(a => !a.isCorrect || a.rating === 'again').length;

    console.log(sub + ':');
    console.log('  Volume: ' + total + ' / 30 volume target');
    console.log('  Score: ' + Math.round(acc) + '% (' + acc + '%)');
    console.log('  Correct: ' + correct + ' of ' + total);
    console.log('  Missed Questions: ' + missed);
  }

  const clinical = Number(((subjectAttempts['Nutritional Biochemistry and Clinical Dietetics'].filter(a => a.isCorrect).length / subjectAttempts['Nutritional Biochemistry and Clinical Dietetics'].length) * 100).toFixed(1));
  const community = Number(((subjectAttempts['Community and Public Health Nutrition'].filter(a => a.isCorrect).length / subjectAttempts['Community and Public Health Nutrition'].length) * 100).toFixed(1));
  const foodService = Number(((subjectAttempts['Foods and Food Service Systems'].filter(a => a.isCorrect).length / subjectAttempts['Foods and Food Service Systems'].length) * 100).toFixed(1));

  const gwa = Number((0.35 * clinical + 0.30 * community + 0.35 * foodService).toFixed(1));

  const k = 0.14;
  const delta = gwa - 75;
  const rawProb = 1 / (1 + Math.exp(-k * delta));
  const basePercent = 10 + rawProb * 85;
  const confidenceMultiplier = Math.pow(0.81, 0.65);
  const passingProb = Math.round(50 + (basePercent - 50) * confidenceMultiplier);

  console.log('\n--- Overall Board Readiness Report ---');
  console.log('NDLE GWA: ' + gwa + '% (Target >= 75.0%)');
  console.log('Passing Probability: ' + passingProb + '% (High Mastery)');
  console.log('Total Questions: ' + logsRes.rows.length + ' (' + logsRes.rows.filter(l => l.is_correct).length + ' correct)');

  await pool.end();
}

verify();
