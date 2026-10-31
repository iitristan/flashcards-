import { Deck, Flashcard } from '@/types';

const rawCards: Array<Omit<Flashcard, 'sm2' | 'createdAt' | 'updatedAt'>> = [
    {
      id: 'nbcd-cble-01',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'What is the recommended daily protein intake for an adult non-dialyzed patient with Chronic Kidney Disease (CKD) Stage 4 (eGFR 15–29 mL/min)?',
      back: '0.6 to 0.8 g/kg body weight/day',
      rationale: 'For non-dialyzed CKD Stages 3–5, KDIGO guidelines recommend a protein restriction of 0.6–0.8 g/kg/day to slow renal deterioration and reduce nitrogenous waste accumulation. Once hemodialysis begins, protein is elevated to 1.2–1.4 g/kg/day due to dialysate losses.',
      options: [
        '0.6 to 0.8 g/kg body weight/day',
        '1.2 to 1.5 g/kg body weight/day',
        '1.6 to 2.0 g/kg body weight/day',
        '0.3 to 0.5 g/kg body weight/day'
      ],
      tags: ['NBCD', 'Renal', 'Protein', 'MNT'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-02',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'In a patient with Type 1 Diabetes Mellitus experiencing the Somogyi Effect, what is the underlying physiological mechanism and the correct nutritional/clinical intervention?',
      back: 'Nocturnal hypoglycemia followed by rebound morning hyperglycemia; decrease evening insulin or provide a bedtime carbohydrate-protein snack',
      rationale: 'The Somogyi effect occurs when nocturnal hypoglycemia triggers counter-regulatory hormones (epinephrine, glucagon, cortisol), causing rebound morning hyperglycemia. The remedy is to reduce evening insulin or provide a bedtime snack. In contrast, the Dawn Phenomenon is caused by early morning growth hormone surges without prior hypoglycemia.',
      options: [
        'Nocturnal hypoglycemia followed by rebound morning hyperglycemia; decrease evening insulin or provide a bedtime carbohydrate-protein snack',
        'Early morning growth hormone surge without hypoglycemia; increase evening intermediate-acting insulin dose',
        'Excessive hepatic gluconeogenesis due to cortisol deficiency; administer rapid-acting insulin at 3:00 AM',
        'Reactive hyperglycemia triggered by high-protein dinner; eliminate all evening carbohydrates'
      ],
      tags: ['NBCD', 'Diabetes', 'Endocrine', 'MNT'],
      difficulty: 'hard',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-03',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'Which of the following enteral feeding formulas is most indicated for a patient with severe malabsorption, short bowel syndrome, and pancreatic exocrine insufficiency?',
      back: 'Elemental (monomeric) formula with free amino acids and low fat (MCT oil)',
      rationale: 'Elemental (monomeric) formulas contain predigested nutrients—free amino acids, simple sugars, and minimal fat (primarily MCT oil)—requiring negligible enzymatic digestion and absorptive surface, making them ideal for short bowel syndrome and severe pancreatic insufficiency.',
      options: [
        'Elemental (monomeric) formula with free amino acids and low fat (MCT oil)',
        'Polymeric intact protein formula with high complex dietary fiber',
        'Blenderized whole food formula rich in long-chain triglycerides',
        'Hypercaloric high-fat formula containing intact milk protein concentrates'
      ],
      tags: ['NBCD', 'Enteral', 'MNT', 'GI'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-04',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'What is the hallmark electrolyte hallmark that triggers the potentially fatal cardiac arrhythmias in Refeeding Syndrome during rapid nutrition repletion?',
      back: 'Severe Hypophosphatemia',
      rationale: 'During prolonged starvation, intracellular electrolytes deplete while serum levels appear normal. Upon carbohydrate re-feeding, sudden insulin secretion drives phosphate, potassium, and magnesium into cells to synthesize ATP, resulting in precipitous hypophosphatemia, cardiac failure, and respiratory arrest.',
      options: [
        'Severe Hypophosphatemia',
        'Acute Hypercalcemia',
        'Severe Hypernatremia',
        'Refractory Hypermagnesemia'
      ],
      tags: ['NBCD', 'Critical Care', 'Refeeding', 'Biochemistry'],
      difficulty: 'hard',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-05',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'A neonate diagnosed with Phenylketonuria (PKU) must strictly avoid phenylalanine while supplementing which conditionally essential amino acid?',
      back: 'Tyrosine',
      rationale: 'PKU results from a deficiency in phenylalanine hydroxylase (PAH), which normally converts phenylalanine to tyrosine. Due to this enzymatic block, phenylalanine accumulates neurotoxically, and tyrosine becomes conditionally essential and must be supplied exogenously in the diet.',
      options: [
        'Tyrosine',
        'Tryptophan',
        'Methionine',
        'Valine'
      ],
      tags: ['NBCD', 'Inborn Errors', 'Biochemistry', 'Pediatrics'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-06',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'Which laboratory parameter is the primary biochemical indicator used to assess the effectiveness of long-term glycemic control over the past 2 to 3 months?',
      back: 'Glycated Hemoglobin (HbA1c)',
      rationale: 'Glycated hemoglobin (HbA1c) measures the non-enzymatic glycation of erythrocyte hemoglobin over the average 120-day red blood cell lifespan, reflecting mean blood glucose over the preceding 8–12 weeks. An HbA1c < 7.0% is standard target for non-pregnant adults with diabetes.',
      options: [
        'Glycated Hemoglobin (HbA1c)',
        'Fasting Blood Glucose (FBG)',
        'Serum Fructosamine level',
        'Postprandial 2-hour capillary glucose'
      ],
      tags: ['NBCD', 'Diabetes', 'Assessment', 'Clinical'],
      difficulty: 'easy',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-07',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'In a patient with Acute Pancreatitis, which enteral nutrition infusion route is preferred to minimize pancreatic enzyme stimulation while preserving gut mucosal integrity?',
      back: 'Nasojejunal (post-ligament of Treitz) continuous tube feeding',
      rationale: 'Nasojejunal feeding past the ligament of Treitz avoids cephalic, gastric, and duodenal stimulation of the exocrine pancreas, effectively resting the pancreas while preserving intestinal barrier function and reducing septic morbidity compared to TPN.',
      options: [
        'Nasojejunal (post-ligament of Treitz) continuous tube feeding',
        'Nasogastric bolus gravity feeding every 4 hours',
        'Percutaneous endoscopic gastrostomy (PEG) with nocturnal infusion',
        'Total Parenteral Nutrition (TPN) via central venous catheter'
      ],
      tags: ['NBCD', 'GI', 'Enteral', 'Pancreatitis'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-08',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'What is the upper osmolarity threshold generally accepted for Total Parenteral Nutrition (TPN) administered through a Peripheral Venous Line (PPN)?',
      back: '900 mOsm/L',
      rationale: 'Peripheral Parenteral Nutrition (PPN) is restricted to solutions with osmolarity ≤ 900 mOsm/L (and typically ≤ 800 mOsm/L) to prevent phlebitis, chemical vein thrombosis, and extravasation injury. Solutions exceeding 900 mOsm/L require central venous access.',
      options: [
        '900 mOsm/L',
        '1500 mOsm/L',
        '500 mOsm/L',
        '1800 mOsm/L'
      ],
      tags: ['NBCD', 'Parenteral', 'Critical Care'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-09',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'Which dietary recommendation is essential for managing Hepatic Encephalopathy in patients exhibiting episodic hyperammonemia while avoiding sarcopenia?',
      back: 'Maintain normoprotein intake (1.2–1.5 g/kg/day) using vegetable and dairy proteins rich in BCAA rather than severe protein restriction',
      rationale: 'Severe protein restriction is outdated and worsens muscle wasting, since skeletal muscle metabolizes ammonia. Current ESPEN/AASLD guidelines prescribe 1.2–1.5 g/kg/day, favoring dairy and vegetable proteins (higher BCAA to aromatic amino acid ratio) alongside lactulose.',
      options: [
        'Maintain normoprotein intake (1.2–1.5 g/kg/day) using vegetable and dairy proteins rich in BCAA rather than severe protein restriction',
        'Enforce strict zero-protein diet (< 0.2 g/kg/day) until ammonia levels completely normalize',
        'Prescribe high animal-based red meat diet supplemented with aromatic amino acids',
        'Restrict total dietary carbohydrates to < 50 grams per day to suppress hepatic glycogenolysis'
      ],
      tags: ['NBCD', 'Liver', 'MNT', 'Clinical'],
      difficulty: 'hard',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-10',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'Which vitamin deficiency presents with the classic triad of encephalopathy, oculomotor dysfunction (nystagmus), and gait ataxia (Wernicke-Korsakoff syndrome)?',
      back: 'Vitamin B1 (Thiamine)',
      rationale: 'Thiamine (Vitamin B1) serves as a coenzyme for pyruvate dehydrogenase and transketolase. In chronic alcoholism and severe hyperemesis, thiamine depletion halts cerebral glucose metabolism, precipitating Wernicke encephalopathy and Korsakoff psychosis.',
      options: [
        'Vitamin B1 (Thiamine)',
        'Vitamin B3 (Niacin)',
        'Vitamin B6 (Pyridoxine)',
        'Vitamin B12 (Cobalamin)'
      ],
      tags: ['NBCD', 'Vitamins', 'Biochemistry', 'Deficiencies'],
      difficulty: 'easy',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-11',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'What is the characteristic biochemical defect in Maple Syrup Urine Disease (MSUD), and which amino acids must be restricted?',
      back: 'Deficiency of branched-chain alpha-keto acid dehydrogenase; restrict Leucine, Isoleucine, and Valine',
      rationale: 'MSUD is an autosomal recessive metabolic disorder caused by deficient branched-chain alpha-ketoacid dehydrogenase (BCKAD), blocking oxidative decarboxylation of branched-chain amino acids (BCAA): leucine, isoleucine, and valine, resulting in sweet-smelling urine and encephalopathy.',
      options: [
        'Deficiency of branched-chain alpha-keto acid dehydrogenase; restrict Leucine, Isoleucine, and Valine',
        'Deficiency of phenylalanine hydroxylase; restrict Phenylalanine and Alanine',
        'Deficiency of cystathionine beta-synthase; restrict Methionine and Cysteine',
        'Deficiency of homogentisate oxidase; restrict Tyrosine and Tryptophan'
      ],
      tags: ['NBCD', 'Inborn Errors', 'Biochemistry'],
      difficulty: 'hard',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-12',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'For a patient experiencing dumping syndrome following a Billroth II subtotal gastrectomy, what is the most appropriate Medical Nutrition Therapy (MNT)?',
      back: 'Small, frequent meals rich in complex carbs and soluble fiber; fluids separated 30-45 minutes from meals; eliminate hyperosmolar simple sugars',
      rationale: 'Dumping syndrome occurs when hyperosmolar gastric chyme enters the jejunum rapidly. Management focuses on small, frequent meals, complex carbohydrates, soluble fiber (pectin/guar gum to delay transit), strictly avoiding simple sugars, and separating liquids from solids by 30–45 minutes.',
      options: [
        'Small, frequent meals rich in complex carbs and soluble fiber; fluids separated 30-45 minutes from meals; eliminate hyperosmolar simple sugars',
        'Large, infrequent meals with generous warm sugary liquids taken directly during the meal',
        'Strict high-carbohydrate, very low-fat liquid diet administered in 3 large boluses',
        'High-sodium, high-sugar liquid formulas taken immediately upon finishing solid foods'
      ],
      tags: ['NBCD', 'Surgery', 'GI', 'MNT'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-13',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'Which vitamin is essential for the gamma-carboxylation of glutamic acid residues in clotting factors II, VII, IX, and X?',
      back: 'Vitamin K (Phylloquinone/Menaquinone)',
      rationale: 'Vitamin K acts as an essential cofactor for gamma-glutamyl carboxylase, which converts glutamate residues into gamma-carboxyglutamate (Gla) on blood coagulation factors II (prothrombin), VII, IX, and X, enabling calcium binding and clot cascade initiation.',
      options: [
        'Vitamin K (Phylloquinone/Menaquinone)',
        'Vitamin E (Alpha-tocopherol)',
        'Vitamin A (Retinol)',
        'Vitamin D (Cholecalciferol)'
      ],
      tags: ['NBCD', 'Vitamins', 'Biochemistry', 'Hematology'],
      difficulty: 'easy',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-14',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'What is the standard dietary sodium limit prescribed in the DASH (Dietary Approaches to Stop Hypertension) eating plan to achieve optimal blood pressure reduction?',
      back: '1,500 to 2,300 mg sodium per day',
      rationale: 'The standard DASH diet limits sodium to 2,300 mg/day, while the lower sodium DASH modification (1,500 mg/day) produces the greatest reductions in systolic and diastolic blood pressure, particularly in hypertensive and middle-aged/older adults.',
      options: [
        '1,500 to 2,300 mg sodium per day',
        '3,000 to 4,000 mg sodium per day',
        '500 to 800 mg sodium per day',
        '4,500 to 5,500 mg sodium per day'
      ],
      tags: ['NBCD', 'Cardiovascular', 'MNT', 'Hypertension'],
      difficulty: 'easy',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-15',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'Which biochemical pathway produces NADPH required for fatty acid biosynthesis and glutathione reduction, while generating ribose-5-phosphate for nucleotide synthesis?',
      back: 'Pentose Phosphate Pathway (Hexose Monophosphate Shunt)',
      rationale: 'The Pentose Phosphate Pathway (HMP shunt) branches from glucose-6-phosphate to yield NADPH (essential for reductive biosynthesis of lipids and preserving reduced glutathione against oxidative stress) and ribose-5-phosphate (nucleic acid backbone).',
      options: [
        'Pentose Phosphate Pathway (Hexose Monophosphate Shunt)',
        'Tricarboxylic Acid (Krebs) Cycle',
        'Cori Cycle in liver and erythrocytes',
        'Beta-oxidation of long-chain fatty acids'
      ],
      tags: ['NBCD', 'Biochemistry', 'Metabolism'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-16',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'In severe burn injury, which formula is traditionally utilized to estimate the daily caloric requirements during the hypermetabolic flow phase?',
      back: 'Curreri Formula: (25 kcal × kg body weight) + (40 kcal × % TBSA burned)',
      rationale: 'The Curreri formula estimates daily energy needs in burn patients as 25 kcal/kg + (40 kcal × % total body surface area burned). Although indirect calorimetry is gold standard, Curreri provides a recognized clinical benchmark for hypermetabolism in severe thermal trauma.',
      options: [
        'Curreri Formula: (25 kcal × kg body weight) + (40 kcal × % TBSA burned)',
        'Harris-Benedict Formula multiplied by a stress factor of 1.1',
        'Mifflin-St Jeor Equation with a fixed 500 kcal reduction',
        'Penn State Equation (2003) with zero thermal adjustment'
      ],
      tags: ['NBCD', 'Critical Care', 'Burns', 'Calculations'],
      difficulty: 'hard',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-17',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'A patient taking the anticoagulant Warfarin (Coumadin) requires which vital dietary counseling regarding Vitamin K?',
      back: 'Maintain a consistent, steady daily intake of Vitamin K rather than drastic avoidance or sudden surges',
      rationale: 'Warfarin acts as a Vitamin K antagonist. Sudden spikes in Vitamin K intake (e.g., kale, spinach) overcome warfarin and decrease the International Normalized Ratio (INR), risking thrombosis, while sudden deprivation increases bleeding risk. Consistency is key.',
      options: [
        'Maintain a consistent, steady daily intake of Vitamin K rather than drastic avoidance or sudden surges',
        'Completely eliminate all green leafy vegetables and vegetable oils from the diet',
        'Take high-dose Vitamin K supplements every morning with the anticoagulant tablet',
        'Switch entirely to a raw vegan diet containing at least 1,000 mcg Vitamin K daily'
      ],
      tags: ['NBCD', 'Drug-Nutrient', 'Cardiovascular', 'Clinical'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-18',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'Which of the following clinical conditions warrants the initiation of a strict Gluten-Free Diet due to autoimmune enteropathy triggered by gliadin peptides?',
      back: 'Celiac Disease (Gluten-sensitive enteropathy)',
      rationale: 'Celiac disease is an immune-mediated enteropathy triggered by ingested gluten (specifically gliadin peptides found in wheat, barley, rye), resulting in mucosal inflammation, crypt hyperplasia, and villous blunting in the small intestine.',
      options: [
        'Celiac Disease (Gluten-sensitive enteropathy)',
        'Diverticulosis of the sigmoid colon',
        'Irritable Bowel Syndrome - Constipation predominant',
        'Gastroesophageal Reflux Disease (GERD)'
      ],
      tags: ['NBCD', 'GI', 'MNT', 'Allergy'],
      difficulty: 'easy',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-19',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'What is the Nitrogen-to-Protein conversion factor standardly used in clinical nitrogen balance calculations for whole intact mixed dietary proteins?',
      back: '6.25 (Protein contains approximately 16% nitrogen)',
      rationale: 'Most intact food proteins contain approximately 16% nitrogen by weight (100 / 16 = 6.25). Therefore: Nitrogen (g) = Protein intake (g) / 6.25. Nitrogen balance = Nitrogen In - (Urinary Urea Nitrogen + 4 g obligate losses).',
      options: [
        '6.25 (Protein contains approximately 16% nitrogen)',
        '5.71 (Protein contains approximately 17.5% nitrogen)',
        '8.00 (Protein contains approximately 12.5% nitrogen)',
        '4.18 (Protein contains approximately 24% nitrogen)'
      ],
      tags: ['NBCD', 'Calculations', 'Biochemistry', 'Clinical'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'nbcd-cble-20',
      deckId: 'deck-clinical-biochem-ndle',
      front: 'Which mineral deficiency is most commonly implicated in impaired wound healing, hypogeusia (blunted taste sensation), alopecia, and compromised cell-mediated immunity?',
      back: 'Zinc',
      rationale: 'Zinc is an indispensable catalytic and structural cofactor for > 300 metalloenzymes, including DNA/RNA polymerases and matrix metalloproteinases required for collagen synthesis, epithelial re-epithelialization, taste bud gustin function, and T-lymphocyte proliferation.',
      options: [
        'Zinc',
        'Copper',
        'Selenium',
        'Chromium'
      ],
      tags: ['NBCD', 'Minerals', 'Wound Healing', 'Deficiencies'],
      difficulty: 'medium',
      leitnerBox: 1
    }
];

export const CLINICAL_BIOCHEMISTRY_DECK: Deck = {
  id: 'deck-clinical-biochem-ndle',
  title: 'Clinical Dietetics & Nutritional Biochemistry - NDLE Bank',
  description: 'Comprehensive high-yield NDLE board examination reviewer covering Medical Nutrition Therapy (MNT), Renal, Enteral/Parenteral, Diabetes, Inborn Errors, and Vitamins/Metabolism.',
  category: 'Nutritional Biochemistry',
  icon: 'Stethoscope',
  color: '#059669',
  tags: ['Clinical Nutrition', 'Nutritional Biochemistry', 'MNT', 'NDLE', 'NBCD'],
  cards: rawCards.map((card): Flashcard => ({
    ...card,
    sm2: {
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      dueDate: '2026-08-15T14:53:04.021Z'
    },
    createdAt: '2026-08-15T14:53:04.022Z',
    updatedAt: '2026-08-15T14:53:04.022Z'
  }))
};

