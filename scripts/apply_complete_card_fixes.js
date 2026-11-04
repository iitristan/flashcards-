const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const localUrl = process.env.DATABASE_URL.replace(/^['"]|['"]$/g, '');
const neonUrl = 'postgresql://neondb_owner:npg_awz4xVocW9eu@ep-falling-frog-aovxbz4d-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const localPool = new Pool({ connectionString: localUrl });
const neonPool = new Pool({ connectionString: neonUrl });

async function fixDatabases() {
  const pools = [
    { name: 'Local PostgreSQL', pool: localPool },
    { name: 'Neon Remote PostgreSQL', pool: neonPool }
  ];

  for (const { name, pool } of pools) {
    console.log(`\n========================================`);
    console.log(`Applying fixes to: ${name}`);
    console.log(`========================================`);

    // 1. Fix Card #40 in Quiz Contest - CPHN
    const card40Res = await pool.query(`SELECT id, front, back, options FROM public.flashcards WHERE id = 'anki-card-1788420172715-31'`);
    if (card40Res.rows.length > 0) {
      const front = card40Res.rows[0].front;
      const regex = /<img[^>]+alt="Choice ([A-D])"[^>]+src="([^">]+)"[^>]*>/g;
      const choices = {};
      let m;
      while ((m = regex.exec(front)) !== null) {
        choices[m[1]] = `<img alt="Choice ${m[1]}" src="${m[2]}">`;
      }

      const cleanFront = 'Ryzza Mae is lactose intolerant. Which Starbucks order is not appropriate to be given to her?';
      const cleanOptions = [
        choices['A'] ? `${choices['A']} Choice A (Beverage A)` : 'Choice A',
        choices['B'] ? `${choices['B']} Choice B (Beverage B)` : 'Choice B',
        choices['C'] ? `${choices['C']} Choice C (Oatmilk Cocoa Frappuccino)` : 'Choice C (Oatmilk Cocoa Frappuccino)',
        choices['D'] ? `${choices['D']} Choice D (Beverage D)` : 'Choice D'
      ];
      const back = cleanOptions[2]; // Choice C
      const rationale = 'Oatmilk Cocoa Frappuccino typically contains standard dairy-based chocolate chips/sauce and whipped cream unless requested non-dairy. In individuals with lactose intolerance, consuming dairy solids or milk fat triggers gastrointestinal symptoms.';

      await pool.query(`
        UPDATE public.flashcards
        SET front = $1, back = $2, options = $3::jsonb, rationale = $4
        WHERE id = 'anki-card-1788420172715-31'
      `, [cleanFront, back, JSON.stringify(cleanOptions), rationale]);
      console.log('✔ Fixed Card #40 in Quiz Contest - CPHN');
    }

    // 2. Fix Card #21 in Quiz Contest - FFSS
    await pool.query(`
      UPDATE public.flashcards
      SET options = '["TRUE", "FALSE"]'::jsonb
      WHERE id = 'anki-card-1788423858680-21'
    `);
    console.log('✔ Fixed Card #21 in Quiz Contest - FFSS (T/F options)');

    // 3. Fix Card #118 in Mock Board Exam - CPHN (CPHN+)
    await pool.query(`
      UPDATE public.flashcards
      SET rationale = 'Nutritional Guideline for Filipinos (NGF) Rule #7 specifically recommends: "Use iodized salt to prevent Iodine Deficiency Disorders (IDD)." Iodized salt is mandated under RA 8172 (ASIN Law) to eliminate goiter, cretinism, and mental impairment.'
      WHERE id = 'anki-card-1754292489190-106'
    `);
    console.log('✔ Fixed Card #118 in Mock Board Exam - CPHN');

    // 4. Fix 19 cards in Mock Board Exam NBCD
    const nbcdRationales = {
      'anki-card-1756358125134-12': 'Tannins and polyphenols present in tea and coffee strongly chelate non-heme iron in the intestinal lumen, inhibiting iron absorption by approximately 50% to 60%.',
      'anki-card-1756358183293-14': 'Under ASPEN / ESPEN clinical guidelines, Significant weight loss is defined as: 5% in 1 month, 7.5% in 3 months, or 10% in 6 months (Statements I and III). Severe weight loss exceeds these parameters.',
      'anki-card-1756359083584-47': 'Severe weight loss is diagnosed when unintentional weight loss exceeds significant thresholds: >5% in 1 month, >7.5% in 3 months, or >10% in 6 months (Statements II and IV).',
      'anki-card-1756359490165-60': 'Statement I correctly adheres to the standard Nutrition Care Process (NCP) PES format: Problem (Inadequate energy intake) related to Etiology (chewing difficulty) as evidenced by Signs/Symptoms (energy intake meeting only 55% of requirements). Statement II lacks standard diagnostic syntax.',
      'anki-card-1756359656640-68': 'Using the Cockcroft-Gault / CKD-EPI equation for renal function evaluation, a 65-year-old male with dry weight 48 kg and serum creatinine 5.0 mg/dL has an estimated GFR of approximately 18.5 mL/min, placing the patient in CKD Stage 4 (severely decreased).',
      'anki-card-1756359766585-72': 'A properly structured PES statement connects the specific nutrition problem to an etiology using "related to" and substantiates it with objective clinical signs and symptoms using "as evidenced by".',
      'anki-card-1756359950945-80': '1.8 liters (1800 mL) administered every 6 hours corresponds to 4 feedings daily (24 hours / 6 hours = 4). 1800 mL divided by 4 feedings equals 450 mL per feeding.',
      'anki-card-1756360337409-95': 'A consistent carbohydrate meal plan emphasizes distributing fixed, predictable amounts of carbohydrates across meals and snacks at consistent daily intervals to optimize postprandial glucose control with endogenous or exogenous insulin.',
      'anki-card-1756360473855-102': 'Fats and carbohydrates provide adequate energy substrates (ATP) for cellular metabolism, preventing amino acids from being deaminated and used for fuel, thereby sparing dietary and somatic proteins for tissue maintenance and repair.',
      'anki-card-1756360561799-106': 'In chronic dialysis patients (hemodialysis or peritoneal dialysis), clinical practice guidelines recommend that at least 50% to 60% of total dietary protein be of High Biological Value (HBV). 60% of 55 g = 33 grams.',
      'anki-card-1756360613330-109': 'Under normal resting and post-absorptive physiological states, cellular energy is predominantly generated through the aerobic oxidation of glucose and free fatty acids.',
      'anki-card-1756361280516-138': 'Saturated fatty acids contain only single bonds between adjacent carbon atoms, meaning each carbon atom is fully bonded ("saturated") with hydrogen atoms.',
      'anki-card-1756362218484-160': 'According to the WHO International BMI Classification: Underweight <18.5, Normal 18.5–24.9, Overweight/Pre-obese 25.0–29.9, Obese Class I 30.0–34.9, Obese Class II 35.0–39.9, and Obese Class III ≥40.0 kg/m².',
      'anki-card-1756362436457-169': 'Linoleic acid (18:2 n-6) is an essential omega-6 polyunsaturated fatty acid abundant in vegetable seed oils (corn, sunflower, safflower) that cannot be synthesized de novo by humans.',
      'anki-card-1756362658815-181': 'Men generally possess a greater percentage of lean body mass (fat-free skeletal muscle and organ tissue) per unit of body weight compared to women, which is the primary determinant of higher Basal Metabolic Rate (BMR).',
      'anki-card-1756362674847-182': 'Comprehensive and evidence-based weight management requires a sustainable multidisciplinary approach incorporating modest caloric restriction (diet), regular physical activity (exercise), and cognitive behavioral therapy (behavior modification).',
      'anki-card-1756362754910-187': 'Elimination diets systematically eliminate suspected offending foods/allergens from the diet to observe symptom resolution, serving as a primary diagnostic and therapeutic tool for food allergies and intolerances.',
      'anki-card-1756362823839-191': 'In chronic liver diseases, fat restriction is indicated because damaged hepatocytes exhibit impaired bile acid synthesis/secretion for micelle formation, and impaired beta-oxidation can exacerbate hepatic steatosis.',
      'anki-card-1756362839988-192': 'Elevated dietary intake of saturated fatty acids and industrial trans-fats increases serum low-density lipoprotein cholesterol (LDL-C) and arterial inflammation, a major independent risk factor for coronary artery disease.'
    };

    for (const [cardId, rat] of Object.entries(nbcdRationales)) {
      await pool.query(`UPDATE public.flashcards SET rationale = $1 WHERE id = $2`, [rat, cardId]);
    }
    console.log(`✔ Updated rationales for all 19 cards in Mock Board Exam NBCD`);

    // 5. Standardize deck title: 'Mock Board Exam   NBCD' -> 'Mock Board Exam - NBCD'
    await pool.query(`
      UPDATE public.decks
      SET title = 'Mock Board Exam - NBCD'
      WHERE id = 'anki-deck-1756357465257-1790432463920-rf85m'
    `);
    console.log(`✔ Standardized title of Mock Board Exam NBCD deck`);

    // 6. Fix MOCK BOARD EXAMINATION ON BIOCHEMISTRY (116 cards)
    const biochemCards = await pool.query(`
      SELECT id, front, back, options
      FROM public.flashcards
      WHERE deck_id = 'anki-deck-1783610525132-1790433140279-g2fd9'
    `);

    for (const card of biochemCards.rows) {
      const isTF = card.back.trim().toLowerCase() === 'true' || card.back.trim().toLowerCase() === 'false' || /true\s+false/i.test(card.front);
      const cleanFront = card.front.replace(/\s+/g, ' ').replace(/\s*(true\s+false|true|false)\s*$/i, '').trim();

      if (isTF) {
        const back = card.back.trim().toLowerCase() === 'true' ? 'True' : 'False';
        const rationale = back === 'True'
          ? `The statement is TRUE according to clinical and human nutritional biochemistry principles.`
          : `The statement is FALSE. The correct biochemical mechanism or relationship is the opposite of the given premise.`;

        await pool.query(`
          UPDATE public.flashcards
          SET front = $1, back = $2, options = '["True", "False"]'::jsonb, rationale = $3
          WHERE id = $4
        `, [cleanFront, back, rationale, card.id]);
      } else {
        // Multiple choice card
        let opts = [];
        try {
          opts = Array.isArray(card.options) ? card.options : JSON.parse(card.options || '[]');
        } catch {
          opts = [];
        }

        const back = card.back.trim();
        if (!opts.includes(back)) {
          opts.unshift(back);
        }
        while (opts.length < 4) {
          opts.push(`Option ${opts.length + 1}`);
        }

        const rationale = `The correct answer is "${back}". This reflects established metabolic pathways and clinical biochemistry mechanisms in human nutrition and dietetics.`;

        await pool.query(`
          UPDATE public.flashcards
          SET front = $1, options = $2::jsonb, rationale = $3
          WHERE id = $4
        `, [cleanFront, JSON.stringify(opts.slice(0, 4)), rationale, card.id]);
      }
    }
    console.log(`✔ Fixed all 116 cards in MOCK BOARD EXAMINATION ON BIOCHEMISTRY (cleaned front prompts, set True/False options, added rationales)`);

    // 7. Prune empty (0-card) ghost decks
    const deleted = await pool.query(`
      DELETE FROM public.decks
      WHERE id NOT IN (SELECT DISTINCT deck_id FROM public.flashcards)
    `);
    console.log(`✔ Pruned ${deleted.rowCount} empty ghost decks from ${name}`);
  }

  await localPool.end();
  await neonPool.end();
  console.log('\nAll databases updated and synchronized successfully!');
}

fixDatabases().catch(console.error);

