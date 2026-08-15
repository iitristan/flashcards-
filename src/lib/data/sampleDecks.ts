import { Deck } from '@/types';

export const INITIAL_DECKS: Deck[] = [
  {
    id: 'deck-clinical-mnt',
    title: 'Clinical Nutrition & MNT',
    description: 'Core Medical Nutrition Therapy concepts, disease diets, renal staging, and enteral/parenteral nutrition.',
    category: 'Clinical Nutrition',
    icon: 'Stethoscope',
    color: '#7FA98B',
    tags: ['MNT', 'Renal', 'GI', 'ICU', 'Endocrine'],
    cards: [
      {
        id: 'card-mnt-1',
        deckId: 'deck-clinical-mnt',
        front: 'What is the recommended protein intake for a non-dialysis Chronic Kidney Disease (CKD) patient in Stage 4 (GFR 15–29 mL/min)?',
        back: '0.6 to 0.8 g/kg body weight/day',
        rationale: 'For CKD Stages 3–5 (non-dialysis), protein is restricted to 0.6–0.8 g/kg/day to slow renal disease progression and decrease uremic toxin accumulation. Once on hemodialysis, protein requirement increases to 1.2–1.4 g/kg/day due to dialysate losses.',
        options: [
          '0.6 to 0.8 g/kg body weight/day',
          '1.2 to 1.4 g/kg body weight/day',
          '1.5 to 2.0 g/kg body weight/day',
          '0.3 to 0.5 g/kg body weight/day'
        ],
        tags: ['CKD', 'Renal', 'Protein'],
        difficulty: 'medium',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-mnt-2',
        deckId: 'deck-clinical-mnt',
        front: 'What is the maximum osmolarity cutoff for Peripheral Parenteral Nutrition (PPN) infusion to avoid phlebitis?',
        back: '900 mOsm/L',
        rationale: 'Peripheral veins can tolerate solutions up to ~900 mOsm/L. Solutions exceeding 900 mOsm/L are hypertonic and must be infused via Central Parenteral Nutrition (CPN / TPN) through a large central vein (e.g., subclavian/jugular) where high blood flow rapidly dilutes the solution.',
        options: [
          '900 mOsm/L',
          '500 mOsm/L',
          '1500 mOsm/L',
          '300 mOsm/L'
        ],
        tags: ['Parenteral', 'Osmolarity', 'ICU'],
        difficulty: 'hard',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-mnt-3',
        deckId: 'deck-clinical-mnt',
        front: 'What is the classic dietary fat to combined carbohydrate + protein ratio used in the Ketogenic Diet for refractory pediatric epilepsy?',
        back: '4:1 (or 3:1) ratio',
        rationale: 'The classic ketogenic diet uses a 4:1 ratio of fat (in grams) to combined carbohydrate and protein (in grams), providing ~90% of calories from fat to induce and sustain ketosis, providing ketone bodies (beta-hydroxybutyrate) as the primary cerebral fuel.',
        options: [
          '4:1 (or 3:1) ratio',
          '1:1 ratio',
          '2:1 ratio',
          '5:2 ratio'
        ],
        tags: ['Pediatric', 'Epilepsy', 'Ketogenic'],
        difficulty: 'medium',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-mnt-4',
        deckId: 'deck-clinical-mnt',
        front: 'Which specific storage protein (prolamin) in wheat triggers the autoimmune enteropathy in Celiac Disease?',
        back: 'Gliadin',
        rationale: 'Celiac disease is triggered by the ingestion of gluten prolamins: Gliadin in wheat, Secalin in rye, and Hordein in barley. These induce immune-mediated small intestinal mucosal inflammation and villous atrophy.',
        options: [
          'Gliadin',
          'Glutenin',
          'Casein',
          'Zein'
        ],
        tags: ['GI', 'Celiac', 'Gluten'],
        difficulty: 'easy',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-mnt-5',
        deckId: 'deck-clinical-mnt',
        front: 'What sodium limit is recommended in the strict DASH (Dietary Approaches to Stop Hypertension) diet trial?',
        back: '1,500 mg/day (Lower limit) or 2,300 mg/day (Standard)',
        rationale: 'The standard DASH diet limits sodium to 2,300 mg/day, while the lower-sodium DASH plan caps sodium at 1,500 mg/day. It emphasizes potassium, calcium, magnesium, fiber, and lean proteins.',
        options: [
          '1,500 mg/day (Lower limit) or 2,300 mg/day (Standard)',
          '500 mg/day',
          '3,500 mg/day',
          '1,000 mg/day max'
        ],
        tags: ['Cardiovascular', 'Hypertension', 'DASH'],
        difficulty: 'easy',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'deck-biochem-vitamins',
    title: 'Biochemistry & Vitamin Deficiencies',
    description: 'Vitamins, coenzymes, metabolic pathways, and classic deficiency syndromes.',
    category: 'Nutritional Biochemistry',
    icon: 'Sparkles',
    color: '#FF9A76',
    tags: ['Vitamins', 'Metabolism', 'Deficiencies'],
    cards: [
      {
        id: 'card-bio-1',
        deckId: 'deck-biochem-vitamins',
        front: 'Wernicke-Korsakoff syndrome and Beriberi are caused by a severe deficiency of which water-soluble vitamin?',
        back: 'Thiamine (Vitamin B1)',
        rationale: 'Thiamine pyrophosphate (TPP) is an essential cofactor for pyruvate dehydrogenase, alpha-ketoglutarate dehydrogenase, and transketolase. Deficiency impairs cellular aerobic metabolism, leading to dry beriberi (neuropathy), wet beriberi (cardiomegaly/edema), or Wernicke encephalopathy.',
        options: [
          'Thiamine (Vitamin B1)',
          'Riboflavin (Vitamin B2)',
          'Niacin (Vitamin B3)',
          'Pyridoxine (Vitamin B6)'
        ],
        tags: ['Vitamins', 'B1', 'Deficiency'],
        difficulty: 'easy',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-bio-2',
        deckId: 'deck-biochem-vitamins',
        front: 'What are the classic "4 Ds" characteristic of severe Pellagra (Niacin / Vitamin B3 deficiency)?',
        back: 'Dermatitis, Diarrhea, Dementia, and Death',
        rationale: 'Pellagra presents with the 4 Ds: Photosensitive symmetrical Dermatitis (Casal necklace), Diarrhea, Dementia/delirium, and Death if untreated. 60 mg of dietary tryptophan can synthesize approximately 1 mg of niacin in the liver.',
        options: [
          'Dermatitis, Diarrhea, Dementia, and Death',
          'Dyspnea, Dysphagia, Dysuria, and Dehydration',
          'Dizziness, Depression, Dyspepsia, and Dermatitis',
          'Diplopia, Dysarthria, Dysphagia, and Dysmetria'
        ],
        tags: ['Niacin', 'B3', 'Pellagra'],
        difficulty: 'easy',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-bio-3',
        deckId: 'deck-biochem-vitamins',
        front: 'Vitamin C (Ascorbic Acid) is an essential cofactor for which enzymatic reaction during collagen biosynthesis?',
        back: 'Hydroxylation of Proline and Lysine residues',
        rationale: 'Ascorbic acid maintains iron in its ferrous (Fe2+) state, serving as a reducing agent for prolyl hydroxylase and lysyl hydroxylase. Without it, defective triple-helix collagen fibers fail to crosslink, leading to Scurvy (fragile capillaries, bleeding gums, impaired wound healing).',
        options: [
          'Hydroxylation of Proline and Lysine residues',
          'Decarboxylation of Glutamate to GABA',
          'Methylation of Homocysteine to Methionine',
          'Transamination of Alanine to Pyruvate'
        ],
        tags: ['Vitamin C', 'Collagen', 'Enzyme'],
        difficulty: 'medium',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-bio-4',
        deckId: 'deck-biochem-vitamins',
        front: 'Where is the Vitamin B12 (Cobalamin) – Intrinsic Factor complex primarily absorbed in the human gastrointestinal tract?',
        back: 'Terminal Ileum',
        rationale: 'Dietary B12 binds haptocorrin in saliva/gastric juice, is transferred to gastric parietal cell-secreted Intrinsic Factor (IF) in the duodenum, and the intact B12-IF complex is absorbed via cubam receptors in the Terminal Ileum.',
        options: [
          'Terminal Ileum',
          'Duodenum',
          'Proximal Jejunum',
          'Ascending Colon'
        ],
        tags: ['B12', 'GI', 'Absorption'],
        difficulty: 'medium',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-bio-5',
        deckId: 'deck-biochem-vitamins',
        front: 'Which amino acid serves as the biological precursor for endogenous synthesis of Niacin (NAD/NADP)?',
        back: 'Tryptophan',
        rationale: 'Tryptophan is converted to nicotinic acid mononucleotide via the kynurenine pathway (requiring Vitamin B6, B2, and iron as cofactors). The conversion ratio is approximately 60 mg of dietary tryptophan = 1 mg of Niacin Equivalent (NE).',
        options: [
          'Tryptophan',
          'Tyrosine',
          'Phenylalanine',
          'Methionine'
        ],
        tags: ['Biochemistry', 'AminoAcids', 'Niacin'],
        difficulty: 'medium',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'deck-foodservice-formulas',
    title: 'Food Service & Dietetic Calculations',
    description: 'Formulas for IBW, food cost %, scoop conversions, inventory markup, and Atwater factors.',
    category: 'Food Service Systems',
    icon: 'Calculator',
    color: '#D4A373',
    tags: ['Formulas', 'Calculations', 'Management', 'Anthropometrics'],
    cards: [
      {
        id: 'card-fs-1',
        deckId: 'deck-foodservice-formulas',
        front: 'Using the Hamwi Formula, what is the Ideal Body Weight (IBW) for an adult female who is 5 feet 5 inches tall with a medium frame?',
        back: '125 lbs (± 10% for frame size)',
        rationale: 'Hamwi female formula: 100 lbs for the first 5 feet (60 inches) + 5 lbs for every additional inch. For 5 ft 5 in: 100 + (5 × 5) = 125 lbs (range 112.5 – 137.5 lbs).',
        options: [
          '125 lbs (± 10% for frame size)',
          '135 lbs (± 10% for frame size)',
          '115 lbs (± 10% for frame size)',
          '120 lbs (± 10% for frame size)'
        ],
        tags: ['Hamwi', 'IBW', 'Anthropometrics'],
        difficulty: 'easy',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-fs-2',
        deckId: 'deck-foodservice-formulas',
        front: 'What is the formula to determine the volume in ounces (fl oz) from a standard portion scoop / dipper number?',
        back: '32 ÷ Scoop Number = fluid ounces',
        rationale: 'Scoop/dipper numbers indicate the number of level servings per 1 quart (32 fl oz). For example, a #8 scoop yields 32 ÷ 8 = 4 fl oz (1/2 cup), and a #16 scoop yields 32 ÷ 16 = 2 fl oz (1/4 cup).',
        options: [
          '32 ÷ Scoop Number = fluid ounces',
          '64 ÷ Scoop Number = fluid ounces',
          '16 ÷ Scoop Number = fluid ounces',
          'Scoop Number × 4 = fluid ounces'
        ],
        tags: ['FoodService', 'PortionControl', 'Scoop'],
        difficulty: 'medium',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-fs-3',
        deckId: 'deck-foodservice-formulas',
        front: 'If a recipe costs $1.80 per portion to produce and the target Food Cost Percentage is 30%, what is the selling price using the Factor Pricing Method?',
        back: '$6.00',
        rationale: 'Markup Factor = 100 ÷ Target Food Cost % = 100 ÷ 30 = 3.333. Selling Price = Raw Food Cost × Markup Factor = $1.80 × 3.333 = $6.00 (Alternatively: $1.80 ÷ 0.30 = $6.00).',
        options: [
          '$6.00',
          '$5.40',
          '$7.20',
          '$4.50'
        ],
        tags: ['Pricing', 'FoodCost', 'Management'],
        difficulty: 'medium',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-fs-4',
        deckId: 'deck-foodservice-formulas',
        front: 'What are the physiological fuel values (Atwater General Energy Factors) for Carbohydrates, Protein, Fat, and Alcohol in kcal/gram?',
        back: 'Carb: 4 kcal/g | Protein: 4 kcal/g | Fat: 9 kcal/g | Alcohol: 7 kcal/g',
        rationale: 'Atwater standard energy values account for heat of combustion adjusted for digestibility and urinary nitrogen losses: 4 kcal/g for CHO, 4 kcal/g for PRO, 9 kcal/g for Lipid, and 7 kcal/g for Alcohol.',
        options: [
          'Carb: 4 kcal/g | Protein: 4 kcal/g | Fat: 9 kcal/g | Alcohol: 7 kcal/g',
          'Carb: 4 kcal/g | Protein: 4 kcal/g | Fat: 8 kcal/g | Alcohol: 5 kcal/g',
          'Carb: 3.75 kcal/g | Protein: 4 kcal/g | Fat: 9 kcal/g | Alcohol: 9 kcal/g',
          'Carb: 5 kcal/g | Protein: 5 kcal/g | Fat: 9 kcal/g | Alcohol: 7 kcal/g'
        ],
        tags: ['Atwater', 'Energy', 'Macronutrients'],
        difficulty: 'easy',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card-fs-5',
        deckId: 'deck-foodservice-formulas',
        front: 'What is the formula for Adjusted Body Weight (ABW) commonly used for obese patients in clinical nutrition calculations?',
        back: 'ABW = IBW + 0.25 × (Actual Weight – IBW)',
        rationale: 'In obesity, adipose tissue is approximately 25% metabolically active lean tissue. The ABW formula adds 25% of excess weight above IBW to represent the metabolically active mass.',
        options: [
          'ABW = IBW + 0.25 × (Actual Weight – IBW)',
          'ABW = Actual Weight – 0.50 × IBW',
          'ABW = (Actual Weight + IBW) ÷ 2',
          'ABW = IBW + 0.50 × (Actual Weight – IBW)'
        ],
        tags: ['ABW', 'Clinical', 'Formulas'],
        difficulty: 'medium',
        leitnerBox: 1,
        sm2: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          dueDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }
];
