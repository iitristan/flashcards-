import { Deck, Flashcard } from '@/types';

const rawCards: Array<Omit<Flashcard, 'sm2' | 'createdAt' | 'updatedAt'>> = [
    {
      id: 'cphn-cble-01',
      deckId: 'deck-cphn-ndle-bank',
      front: 'Under Republic Act No. 11148 (Kalusugan at Nutrisyon ng Mag-Nanay Act), which critical window of opportunity is prioritized to prevent irreversible stunting and neurodevelopmental deficits?',
      back: 'The First 1,000 Days of Life (from conception through the child\'s second birthday)',
      rationale: 'RA 11148 institutionalizes maternal and child nutrition across the First 1,000 Days—covering roughly 270 days of pregnancy, 365 days of infancy (0–12 months), and 365 days of toddlerhood (13–24 months). Interventions during this window prevent irreversible physical stunting and cognitive deficits.',
      options: [
        'The First 1,000 Days of Life (from conception through the child\'s second birthday)',
        'The pre-school period from 3 to 5 years of age',
        'Early adolescence during the pubertal growth spurt (10–14 years)',
        'School-age years from Kindergarten through Grade 6 (5–12 years)'
      ],
      tags: ['CPHN', 'Laws', 'First 1000 Days', 'Maternal & Child'],
      difficulty: 'easy',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-02',
      deckId: 'deck-cphn-ndle-bank',
      front: 'In the annual nationwide Operation Timbang (OPT) Plus protocol of the National Nutrition Council (NNC), which anthropometric index is specifically utilized to assess "Wasting" or acute malnutrition among children aged 0–59 months?',
      back: 'Weight-for-Length / Weight-for-Height (WFL/WFH)',
      rationale: 'Under WHO Child Growth Standards adopted by the Philippines, Weight-for-Length/Height (WFL/WFH) reflects acute nutritional deficit (wasting/thinness or overweight), Length/Height-for-Age (LFA/HFA) reflects chronic malnutrition (stunting), and Weight-for-Age (WFA) reflects general underweight.',
      options: [
        'Weight-for-Length / Weight-for-Height (WFL/WFH)',
        'Length/Height-for-Age (LFA/HFA)',
        'Weight-for-Age (WFA)',
        'Head Circumference-for-Age (HCFA)'
      ],
      tags: ['CPHN', 'Assessment', 'OPT Plus', 'Anthropometry'],
      difficulty: 'easy',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-03',
      deckId: 'deck-cphn-ndle-bank',
      front: 'According to the Philippine Food Fortification Act of 2000 (Republic Act No. 8976), which mandatory staple foods are fortified with specific micronutrients under national law?',
      back: 'Rice (with Iron), Wheat Flour (with Vitamin A & Iron), Refined Sugar (with Vitamin A), and Cooking Oil (with Vitamin A)',
      rationale: 'RA 8976 mandates the fortification of four staple foods: milled rice with Iron; wheat flour with Vitamin A and Iron; refined sugar with Vitamin A; and refined cooking oil with Vitamin A. Voluntary fortification of processed foods is recognized with the Sangkap Pinoy seal.',
      options: [
        'Rice (with Iron), Wheat Flour (with Vitamin A & Iron), Refined Sugar (with Vitamin A), and Cooking Oil (with Vitamin A)',
        'Iodized Salt (with Iodine), Milk (with Calcium), Brown Rice (with Thiamine), and Soy Sauce (with Iron)',
        'Cornstarch (with Zinc), Table Sugar (with Chromium), Vinegar (with Potassium), and Bottled Water (with Fluoride)',
        'Cassava Flour (with Folic Acid), Coconut Oil (with Vitamin D), Canned Tuna (with Omega-3), and Bread (with Riboflavin)'
      ],
      tags: ['CPHN', 'Laws', 'Food Fortification', 'Micronutrients'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-04',
      deckId: 'deck-cphn-ndle-bank',
      front: 'What is the diagnostic Mid-Upper Arm Circumference (MUAC) cutoff used during community disaster and rapid screening to classify Severe Acute Malnutrition (SAM) in children 6 to 59 months?',
      back: 'MUAC < 115 mm (< 11.5 cm) or presence of bilateral pitting edema',
      rationale: 'Per WHO and Philippine DOH guidelines for Management of Severe Acute Malnutrition, a child 6–59 months with MUAC < 115 mm (red zone on the Shakir strip) or with bilateral pitting edema (+, ++, or +++) is classified as having SAM requiring emergency therapeutic feeding (RUTF/F-75).',
      options: [
        'MUAC < 115 mm (< 11.5 cm) or presence of bilateral pitting edema',
        'MUAC between 115 mm and 125 mm with moderate pallor',
        'MUAC < 135 mm (< 13.5 cm) with history of diarrhea',
        'MUAC between 125 mm and 140 mm without clinical edema'
      ],
      tags: ['CPHN', 'SAM', 'Assessment', 'Emergency Nutrition'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-05',
      deckId: 'deck-cphn-ndle-bank',
      front: 'Under Executive Order No. 51 (The Philippine Milk Code), which of the following activities by infant formula manufacturers is strictly prohibited in health facilities and public spaces?',
      back: 'Direct consumer advertising, distribution of free infant formula samples, and sponsorship of clinical gifts to healthcare workers',
      rationale: 'EO 51 (Philippine Milk Code) strictly bans advertising, point-of-sale promotional displays, free formula samples to mothers, and company-sponsored gifts or incentives to healthcare personnel, safeguarding and promoting exclusive breastfeeding for infants 0–6 months.',
      options: [
        'Direct consumer advertising, distribution of free infant formula samples, and sponsorship of clinical gifts to healthcare workers',
        'Selling infant formula in licensed commercial retail pharmacies with clear medical prescription',
        'Labeling expiration dates and nutritional panels on infant formula containers in the Filipino language',
        'Publishing peer-reviewed laboratory research in academic pediatric medical journals'
      ],
      tags: ['CPHN', 'Laws', 'Milk Code', 'Breastfeeding'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-06',
      deckId: 'deck-cphn-ndle-bank',
      front: 'What is the standard DOH high-dose Vitamin A capsule dosage administered to infants aged 6 to 11 months during nationwide Garantisadong Pambata campaigns?',
      back: '100,000 International Units (IU) - Blue Capsule (single dose)',
      rationale: 'In the Philippine national micronutrient supplementation program, infants 6–11 months receive a single dose of 100,000 IU Vitamin A (blue capsule). Children 12–59 months receive 200,000 IU (red capsule) every six months to prevent xerophthalmia and reduce all-cause mortality.',
      options: [
        '100,000 International Units (IU) - Blue Capsule (single dose)',
        '200,000 International Units (IU) - Red Capsule (single dose)',
        '50,000 International Units (IU) - Yellow Capsule (daily dose)',
        '500,000 International Units (IU) - Green Capsule (annual dose)'
      ],
      tags: ['CPHN', 'Supplementation', 'Vitamin A', 'Public Health'],
      difficulty: 'easy',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-07',
      deckId: 'deck-cphn-ndle-bank',
      front: 'Which dietary assessment methodology is most susceptible to the "flat-slope syndrome," where low-intake respondents tend to overreport and high-intake respondents tend to underreport food consumption?',
      back: '24-Hour Food Recall',
      rationale: 'The 24-hour food recall is vulnerable to flat-slope syndrome (social desirability bias), where respondents distort their reports toward what is perceived as normal: lean/low-intake subjects overreport, and overweight/high-intake subjects underreport their food intake.',
      options: [
        '24-Hour Food Recall',
        'Weighed Food Intake Record',
        'Duplicate Diet Chemical Analysis',
        'Food Balance Sheet (FBS)'
      ],
      tags: ['CPHN', 'Assessment', 'Methodology', 'Biostatistics'],
      difficulty: 'hard',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-08',
      deckId: 'deck-cphn-ndle-bank',
      front: 'In epidemiologic studies of nutrition and chronic disease, how is the "Relative Risk" (Risk Ratio) correctly defined and interpreted?',
      back: 'The ratio of the incidence of disease among the exposed group to the incidence of disease among the unexposed group (Cohort study)',
      rationale: 'Relative Risk (RR) = [Incidence in Exposed] / [Incidence in Unexposed]. An RR > 1.0 signifies positive association (risk factor), RR = 1.0 signifies no association, and RR < 1.0 signifies protective effect. RR is directly calculated from prospective cohort studies.',
      options: [
        'The ratio of the incidence of disease among the exposed group to the incidence of disease among the unexposed group (Cohort study)',
        'The ratio of the odds of exposure among cases to the odds of exposure among controls (Case-Control study)',
        'The total number of existing disease cases in a community divided by the total population at one specific point in time',
        'The proportion of disease-free individuals who test positive on a diagnostic screening tool'
      ],
      tags: ['CPHN', 'Epidemiology', 'Biostatistics', 'Research'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-09',
      deckId: 'deck-cphn-ndle-bank',
      front: 'What is the overarching goal of the Philippine Plan of Action for Nutrition (PPAN 2023–2028) regarding the national prevalence of childhood stunting among children under five years?',
      back: 'Reduce the prevalence of stunting to less than 17.9% through life-stage interventions and nutrition-sensitive agricultural and social programs',
      rationale: 'The PPAN 2023–2028 targets significant reductions in childhood stunting (from ~26.7% down below 17.9%), wasting (< 5%), and maternal undernutrition through combined nutrition-specific interventions, nutrition-sensitive programs, and enabling policy environments.',
      options: [
        'Reduce the prevalence of stunting to less than 17.9% through life-stage interventions and nutrition-sensitive agricultural and social programs',
        'Eliminate all forms of obesity while allowing stunting levels to plateau naturally',
        'Transition entire agricultural land to exclusive organic vegetable production by 2025',
        'Replace all complementary feeding with commercial synthetic nutritional formula pills'
      ],
      tags: ['CPHN', 'PPAN', 'NNC', 'Public Health'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-10',
      deckId: 'deck-cphn-ndle-bank',
      front: 'According to Republic Act No. 8172 (An Act for Salt Iodization Nationwide - ASIN Law), what is the minimum required iodine content in salt at the retail consumer level?',
      back: '30 to 70 parts per million (ppm) of iodine',
      rationale: 'The revised implementing rules and regulations of the ASIN Law (RA 8172) require iodized salt at the retail/household level to contain 30–70 ppm (mg/kg) of iodine to prevent Iodine Deficiency Disorders (IDD), endemic goiter, and cretinism in the Philippines.',
      options: [
        '30 to 70 parts per million (ppm) of iodine',
        '5 to 10 parts per million (ppm) of iodine',
        '100 to 200 parts per million (ppm) of iodine',
        '500 to 800 parts per million (ppm) of iodine'
      ],
      tags: ['CPHN', 'Laws', 'ASIN Law', 'Iodine'],
      difficulty: 'hard',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-11',
      deckId: 'deck-cphn-ndle-bank',
      front: 'In community nutrition management of Severe Acute Malnutrition (SAM), what is the primary therapeutic milk used in the initial Inpatient Stabilization Phase (Phase 1)?',
      back: 'F-75 therapeutic formula (75 kcal and 0.9 g protein per 100 mL)',
      rationale: 'F-75 formula (75 kcal and 0.9 g protein per 100 mL) is designed strictly for Phase 1 Stabilization to restore metabolic and electrolyte balance without overloading the fragile liver, kidneys, and myocardium. Once appetite returns and edema subsides, transition to F-100 or RUTF occurs.',
      options: [
        'F-75 therapeutic formula (75 kcal and 0.9 g protein per 100 mL)',
        'F-100 catch-up formula (100 kcal and 2.9 g protein per 100 mL)',
        'Full-cream condensed sweetened cow milk diluted 1:1 with distilled water',
        'High-solute unpasteurized skim milk enriched with table salt and raw egg yolks'
      ],
      tags: ['CPHN', 'SAM', 'Therapeutics', 'Malnutrition'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-12',
      deckId: 'deck-cphn-ndle-bank',
      front: 'What visual food guide model was created by the Food and Nutrition Research Institute (DOST-FNRI) to demonstrate the ideal proportional balance of Go, Grow, and Glow foods on a per-meal plate for Filipino adults?',
      back: 'Pinggang Pinoy',
      rationale: 'Pinggang Pinoy, developed by DOST-FNRI in collaboration with DOH and WHO, uses a familiar plate model to visually represent the recommended proportion of energy-giving (Go), body-building (Grow), and body-regulating (Glow) foods per meal, complementing the Daily Nutritional Guide (DNG) Pyramid.',
      options: [
        'Pinggang Pinoy',
        'Daily Nutritional Guide (DNG) Pyramid',
        'MyPlate by the USDA',
        '10 Kumainments'
      ],
      tags: ['CPHN', 'FNRI', 'Pinggang Pinoy', 'Education'],
      difficulty: 'easy',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-13',
      deckId: 'deck-cphn-ndle-bank',
      front: 'What is the daily elemental iron and folic acid supplementation recommendation for pregnant women in the Philippines to prevent maternal anemia and neural tube defects?',
      back: '60 mg elemental iron and 400 mcg folic acid daily throughout pregnancy for at least 180 days',
      rationale: 'DOH Administrative Order mandates that all pregnant women receive 60 mg of elemental iron combined with 400 mcg (0.4 mg) of folic acid daily as early as possible in pregnancy for a duration of at least 180 days (6 months) to avert maternal anemia, low birth weight, and neural tube closure defects.',
      options: [
        '60 mg elemental iron and 400 mcg folic acid daily throughout pregnancy for at least 180 days',
        '10 mg elemental iron and 100 mcg folic acid weekly during the third trimester only',
        '150 mg elemental iron and 5,000 mcg folic acid twice daily throughout lactation',
        'Zero iron supplementation unless serum ferritin drops below 5 ng/mL'
      ],
      tags: ['CPHN', 'Maternal', 'Supplementation', 'Iron-Folate'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-14',
      deckId: 'deck-cphn-ndle-bank',
      front: 'When evaluating a community nutrition program, what is the distinction between "Process Evaluation" and "Outcome/Impact Evaluation"?',
      back: 'Process evaluation monitors program fidelity, activities, and reach; Outcome evaluation measures changes in nutritional status, knowledge, and clinical endpoints',
      rationale: 'Process evaluation checks implementation quality (e.g., number of mothers trained, food packs distributed, adherence to protocol). Outcome/Impact evaluation determines whether the intervention actually changed nutritional status (e.g., reductions in stunting rates or anemia prevalence).',
      options: [
        'Process evaluation monitors program fidelity, activities, and reach; Outcome evaluation measures changes in nutritional status, knowledge, and clinical endpoints',
        'Process evaluation assesses national mortality statistics; Outcome evaluation assesses daily volunteer attendance logs',
        'Process evaluation is performed only after program closure; Outcome evaluation is conducted prior to project funding',
        'Process evaluation measures genetic mutations; Outcome evaluation measures budgetary financial audits'
      ],
      tags: ['CPHN', 'Program Evaluation', 'Public Health', 'Management'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-15',
      deckId: 'deck-cphn-ndle-bank',
      front: 'In a disaster or emergency evacuation center, what is the minimum daily per capita energy planning threshold recommended by the SPHERE Project and adopted in Philippine Nutrition in Emergencies (NiE)?',
      back: '2,100 kcal per person per day',
      rationale: 'The SPHERE Humanitarian Charter and Philippine Nutrition in Emergencies guidelines establish a standard planning figure of 2,100 kcal per person per day (with 10–12% of total energy from protein and 17% from fat) for general food distributions to maintain basic nutritional survival in disaster-affected populations.',
      options: [
        '2,100 kcal per person per day',
        '1,200 kcal per person per day',
        '3,500 kcal per person per day',
        '1,600 kcal per person per day'
      ],
      tags: ['CPHN', 'Emergency Nutrition', 'SPHERE', 'Disaster'],
      difficulty: 'easy',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-16',
      deckId: 'deck-cphn-ndle-bank',
      front: 'What is the diagnostic difference between "Marasmus" and "Kwashiorkor" when assessing acute protein-energy malnutrition in the field?',
      back: 'Kwashiorkor features bilateral pitting edema, moon face, and flaky-paint dermatosis; Marasmus features severe subcutaneous fat and muscle wasting without edema (old man face)',
      rationale: 'Kwashiorkor is characterized by bilateral pedal/pretibial pitting edema, fatty liver, preserved subcutaneous fat, apathy, and skin lesions (flaky paint/enamel dermatosis) due to acute protein deficiency with relative carbohydrate sufficiency. Marasmus presents as gross somatic muscle and fat wasting without edema due to severe overall caloric starvation.',
      options: [
        'Kwashiorkor features bilateral pitting edema, moon face, and flaky-paint dermatosis; Marasmus features severe subcutaneous fat and muscle wasting without edema (old man face)',
        'Kwashiorkor is due to exclusive Vitamin C deficiency; Marasmus is due to toxic Vitamin A excess',
        'Kwashiorkor presents with severe dehydration and zero edema; Marasmus presents with generalized anasarca and ascites',
        'Kwashiorkor occurs only in adults over 65 years; Marasmus occurs exclusively in exclusively breastfed neonates'
      ],
      tags: ['CPHN', 'Malnutrition', 'Assessment', 'Clinical-Community'],
      difficulty: 'easy',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-17',
      deckId: 'deck-cphn-ndle-bank',
      front: 'Under the Expanded Breastfeeding Promotion Act of 2009 (Republic Act No. 10028), what workplace accommodation is required for lactating employees?',
      back: 'Lactation stations with basic washing and refrigeration facilities, plus paid lactation break periods of not less than 40 minutes per 8-hour working day',
      rationale: 'RA 10028 mandates lactation stations in all health and non-health workplaces, accessible to lactating mothers, equipped with refrigeration or ice coolers, running water, and paid lactation periods totaling not less than 40 minutes for every 8-hour working shift.',
      options: [
        'Lactation stations with basic washing and refrigeration facilities, plus paid lactation break periods of not less than 40 minutes per 8-hour working day',
        'Mandatory provision of commercial powdered milk dispensers and sterilizing autoclaves in common staff canteens',
        'Permanent exemption from all workplace duties with full paid leave until the child reaches 6 years of age',
        'A single 5-minute unpaid bathroom break per 12-hour factory shift'
      ],
      tags: ['CPHN', 'Laws', 'Breastfeeding', 'Workplace'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-18',
      deckId: 'deck-cphn-ndle-bank',
      front: 'Which biochemical biomarker is standardly utilized in national demographic and health surveys (NDHS / NNS) to assess the prevalence of Iodine Deficiency Disorders (IDD) at the population level?',
      back: 'Median Urinary Iodine Concentration (mUIC) in mcg/L among school-age children and pregnant women',
      rationale: 'Urinary iodine excretion reflects recent iodine intake, as > 90% of ingested iodine is excreted by the kidneys. WHO/UNICEF/ICCIDD benchmark: a population median UIC of 100–199 mcg/L in school-age children indicates adequate iodine nutrition, while < 100 mcg/L indicates population deficiency.',
      options: [
        'Median Urinary Iodine Concentration (mUIC) in mcg/L among school-age children and pregnant women',
        'Serum total cholesterol level in adult males',
        '24-hour fecal sodium excretion in hypertensive patients',
        'Hair mineral zinc-to-copper atomic mass ratio'
      ],
      tags: ['CPHN', 'Assessment', 'Biomarkers', 'Iodine'],
      difficulty: 'hard',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-19',
      deckId: 'deck-cphn-ndle-bank',
      front: 'What is the term for the concurrent manifestation of undernutrition (stunting and wasting) alongside micronutrient deficiencies and overweight/obesity within the same country, household, or individual?',
      back: 'The Triple Burden of Malnutrition',
      rationale: 'The "Triple Burden of Malnutrition" refers to the coexistence of undernutrition (stunting and wasting), micronutrient deficiencies ("hidden hunger"), and overweight/obesity with non-communicable diseases (NCDs) affecting low- and middle-income countries like the Philippines undergoing rapid nutritional transition.',
      options: [
        'The Triple Burden of Malnutrition',
        'The Barker Fetal Origins Hypothesis',
        'The Epidemiological Transition Paradox',
        'The Somogyi Metabolic Phenomenon'
      ],
      tags: ['CPHN', 'Public Health', 'Nutrition Transition', 'Epidemiology'],
      difficulty: 'medium',
      leitnerBox: 1
    },
    {
      id: 'cphn-cble-20',
      deckId: 'deck-cphn-ndle-bank',
      front: 'In infant and young child feeding (IYCF), what is the WHO/UNICEF recommended timeline for initiating exclusive breastfeeding and subsequent complementary feeding?',
      back: 'Initiate breastfeeding within the first hour of birth; exclusively breastfeed for 6 months; introduce safe, nutrient-dense complementary foods at 6 months while continuing breastfeeding up to 2 years or beyond',
      rationale: 'Global and Philippine IYCF guidelines prescribe: early initiation of breastfeeding within the first hour of delivery (essential for colostrum); exclusive breastfeeding for the first 6 months of life; and introduction of safe, adequate complementary foods at 6 months alongside continued breastfeeding up to 2 years and beyond.',
      options: [
        'Initiate breastfeeding within the first hour of birth; exclusively breastfeed for 6 months; introduce safe, nutrient-dense complementary foods at 6 months while continuing breastfeeding up to 2 years or beyond',
        'Initiate sugar water at 24 hours post-delivery; begin solid rice porridge at 2 months; terminate breastfeeding at 6 months',
        'Exclusively feed formula for the first 12 months; delay any solid foods until all deciduous teeth have erupted',
        'Initiate complementary pureed fruits at 3 months; replace all breastmilk with cow milk by the 5th month'
      ],
      tags: ['CPHN', 'IYCF', 'Maternal & Child', 'Breastfeeding'],
      difficulty: 'easy',
      leitnerBox: 1
    }
];

export const COMMUNITY_PUBLIC_HEALTH_DECK: Deck = {
  id: 'deck-cphn-ndle-bank',
  title: 'Community & Public Health Nutrition - NDLE Bank',
  description: 'High-yield Philippine NDLE board exam questions covering the Philippine Plan of Action for Nutrition (PPAN), Operation Timbang Plus, RA 11148 (First 1000 Days), Food Fortification, Nutrition Assessment, and Public Health Epidemiology.',
  category: 'Public Health & Community',
  icon: 'Users',
  color: '#2563eb',
  tags: ['Community Nutrition', 'Public Health', 'CPHN', 'NDLE', 'PPAN', 'NNC'],
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

