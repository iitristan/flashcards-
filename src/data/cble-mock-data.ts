export interface CBLEQuestion {
  id: number;
  questionNumber: number;
  subject: string;
  question: string;
  image?: {
    url: string;
    caption?: string;
    alt?: string;
    isSvg?: boolean;
    svgContent?: string;
  };
  options: {
    key: "A" | "B" | "C" | "D";
    text: string;
  }[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  category: string;
}

export interface CBLEExamineeProfile {
  name: string;
  role: string;
  examineeNumber: string;
  applicationNumber: string;
  school: string;
  testingCenter: string;
  roomNumber: string;
  seatNumber: string;
  examinationName: string;
  subject: string;
  durationMinutes: number;
  bestTime: number; // in seconds
  worstTime: number; // in seconds
}

export const DEFAULT_EXAMINEE: CBLEExamineeProfile = {
  name: "BRIGETTE",
  role: "Examinee",
  examineeNumber: "2026-NDLE-01945",
  applicationNumber: "APP-9382104",
  school: "UNIVERSITY OF SANTO TOMAS",
  testingCenter: "PRC MANILA TESTING CENTER",
  roomNumber: "ROOM 301 - CBLE LAB",
  seatNumber: "SEAT 12",
  examinationName: "NDLE PRC EXAMINATION",
  subject: "MIXED SUBJECT",
  durationMinutes: 120,
  bestTime: 1,
  worstTime: 31,
};

export const CBLE_SUBJECTS = [
  {
    id: "clinical",
    name: "CLINICAL NUTRITION & DIETETICS",
    examName: "NUTRITIONIST-DIETITIAN LICENSURE EXAMINATION (NDLE)",
  },
  {
    id: "public-health",
    name: "PUBLIC HEALTH & COMMUNITY NUTRITION",
    examName: "NUTRITIONIST-DIETITIAN LICENSURE EXAMINATION (NDLE)",
  },
  {
    id: "food-service",
    name: "FOOD SERVICE SYSTEM MANAGEMENT",
    examName: "NUTRITIONIST-DIETITIAN LICENSURE EXAMINATION (NDLE)",
  },
  {
    id: "general-test",
    name: "TEST SUBJECT",
    examName: "TEST EXAM",
  },
];

export const MOCK_CBLE_QUESTIONS: CBLEQuestion[] = [
  {
    id: 1,
    questionNumber: 1,
    subject: "CLINICAL NUTRITION & DIETETICS",
    question: "A 58-year-old male with Stage 4 Chronic Kidney Disease (non-dialysis) has a GFR of 22 mL/min/1.73m² and weighs 70 kg (ideal body weight). What is the recommended daily protein intake range for this patient according to KDOQI guidelines to delay progression of renal failure?",
    options: [
      { key: "A", text: "0.55 – 0.60 g/kg body weight/day, or 0.28 – 0.43 g/kg with keto acid analogs" },
      { key: "B", text: "0.80 – 1.00 g/kg body weight/day with high biological value protein" },
      { key: "C", text: "1.20 – 1.40 g/kg body weight/day to prevent protein-energy wasting" },
      { key: "D", text: "1.50 – 2.00 g/kg body weight/day supplemented with essential amino acids" },
    ],
    correctAnswer: "A",
    explanation: "According to the updated KDOQI Clinical Practice Guideline for Nutrition in CKD, in adults with CKD 3-5 who are metabolically stable and non-dialysis dependent, dietary protein restriction of 0.55 to 0.60 g/kg/day (or 0.28-0.43 g/kg/day with keto acid analogs) is recommended to reduce risk of end-stage kidney disease and mortality.",
    category: "Renal Nutrition",
  },
  {
    id: 2,
    questionNumber: 2,
    subject: "CLINICAL NUTRITION & DIETETICS",
    question: "Refer to the Nutrition Facts label below. If a patient consumes 2 servings of this food item, what total percentage of the Daily Value (% DV) of dietary fiber and total grams of carbohydrates will they have consumed?",
    image: {
      url: "/nutrition-facts-sample.svg",
      caption: "Figure 1: Standard Nutrition Facts Panel for Evaluation",
      alt: "Nutrition Facts panel showing Serving Size 1 cup (240ml), Total Carbohydrate 31g (11% DV), Dietary Fiber 4g (14% DV), Added Sugars 5g.",
      isSvg: true,
      svgContent: `<svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-sm rounded border bg-white p-3 font-sans shadow-sm">
        <rect width="400" height="320" fill="#ffffff"/>
        <text x="20" y="32" font-size="28" font-weight="900" fill="#000000">Nutrition Facts</text>
        <line x1="20" y1="42" x2="380" y2="42" stroke="#000000" stroke-width="8"/>
        <text x="20" y="60" font-size="14" fill="#000000">Serving size</text>
        <text x="380" y="60" font-size="14" font-weight="bold" text-anchor="end" fill="#000000">1 cup (240mL)</text>
        <line x1="20" y1="68" x2="380" y2="68" stroke="#000000" stroke-width="4"/>
        <text x="20" y="85" font-size="12" font-weight="bold" fill="#000000">Amount per serving</text>
        <text x="20" y="112" font-size="32" font-weight="900" fill="#000000">Calories</text>
        <text x="380" y="112" font-size="36" font-weight="900" text-anchor="end" fill="#000000">160</text>
        <line x1="20" y1="122" x2="380" y2="122" stroke="#000000" stroke-width="6"/>
        <text x="380" y="138" font-size="12" font-weight="bold" text-anchor="end" fill="#000000">% Daily Value*</text>
        <line x1="20" y1="144" x2="380" y2="144" stroke="#000000" stroke-width="1"/>
        <text x="20" y="160" font-size="14" font-weight="bold" fill="#000000">Total Fat <tspan font-weight="normal">2.5g</tspan></text>
        <text x="380" y="160" font-size="14" font-weight="bold" text-anchor="end" fill="#000000">3%</text>
        <line x1="20" y1="168" x2="380" y2="168" stroke="#000000" stroke-width="1"/>
        <text x="20" y="184" font-size="14" font-weight="bold" fill="#000000">Total Carbohydrate <tspan font-weight="normal">31g</tspan></text>
        <text x="380" y="184" font-size="14" font-weight="bold" text-anchor="end" fill="#000000">11%</text>
        <line x1="40" y1="192" x2="380" y2="192" stroke="#cccccc" stroke-width="1"/>
        <text x="40" y="208" font-size="13" fill="#000000">Dietary Fiber 4g</text>
        <text x="380" y="208" font-size="13" font-weight="bold" text-anchor="end" fill="#000000">14%</text>
        <line x1="40" y1="216" x2="380" y2="216" stroke="#cccccc" stroke-width="1"/>
        <text x="40" y="232" font-size="13" fill="#000000">Total Sugars 12g (Includes 5g Added Sugars)</text>
        <text x="380" y="232" font-size="13" font-weight="bold" text-anchor="end" fill="#000000">10%</text>
        <line x1="20" y1="240" x2="380" y2="240" stroke="#000000" stroke-width="1"/>
        <text x="20" y="256" font-size="14" font-weight="bold" fill="#000000">Protein <tspan font-weight="normal">8g</tspan></text>
        <line x1="20" y1="264" x2="380" y2="264" stroke="#000000" stroke-width="4"/>
        <text x="20" y="280" font-size="10" fill="#555555">* The % Daily Value tells you how much a nutrient in a serving of food contributes to a daily diet.</text>
      </svg>`,
    },
    options: [
      { key: "A", text: "28% DV Fiber, 62g Total Carbohydrates" },
      { key: "B", text: "14% DV Fiber, 31g Total Carbohydrates" },
      { key: "C", text: "22% DV Fiber, 50g Total Carbohydrates" },
      { key: "D", text: "20% DV Fiber, 60g Total Carbohydrates" },
    ],
    correctAnswer: "A",
    explanation: "Per serving: Dietary Fiber is 4g (14% DV) and Total Carbohydrate is 31g. For 2 servings: Dietary Fiber = 14% * 2 = 28% DV, and Total Carbohydrate = 31g * 2 = 62g.",
    category: "Food Composition & Labeling",
  },
  {
    id: 3,
    questionNumber: 3,
    subject: "CLINICAL NUTRITION & DIETETICS",
    question: "A post-operative gastrectomy patient experiences diaphoresis, lightheadedness, abdominal cramping, and explosive diarrhea 20 minutes after ingestion of a high-simple-sugar meal. Which physiological mechanism primarily triggers this 'Early Dumping Syndrome'?",
    options: [
      { key: "A", text: "Hyperosmolar chyme entering the jejunum causing a rapid fluid shift from intravascular space into the intestinal lumen" },
      { key: "B", text: "Excessive reactive insulin secretion in response to rapid glucose absorption resulting in rebound hypoglycemia" },
      { key: "C", text: "Impaired secretion of cholecystokinin (CCK) leading to inadequate pancreatic lipase activation" },
      { key: "D", text: "Bacterial overgrowth in the blind loop fermenting unabsorbed oligosaccharides into short-chain fatty acids" },
    ],
    correctAnswer: "A",
    explanation: "Early dumping syndrome occurs 10-30 minutes post-meal due to the sudden dump of hypertonic food contents into the proximal jejunum, causing a rapid shift of extracellular fluid into the bowel lumen, resulting in hypotension, tachycardia, flushing, and cramping.",
    category: "Gastrointestinal Disorders",
  },
  {
    id: 4,
    questionNumber: 4,
    subject: "CLINICAL NUTRITION & DIETETICS",
    question: "Using the Harris-Benedict Formula and standard clinical assessment, calculate the Total Energy Requirement (TER) for a 45-year-old female weighing 60 kg, height 160 cm, with moderate trauma (Stress factor = 1.3, Activity factor = 1.2 in bed).\n\nHB Formula (Female): BEE = 655 + (9.6 × W in kg) + (1.8 × H in cm) - (4.7 × Age in yrs)",
    options: [
      { key: "A", text: "2,042 kcal/day" },
      { key: "B", text: "1,750 kcal/day" },
      { key: "C", text: "2,450 kcal/day" },
      { key: "D", text: "1,309 kcal/day" },
    ],
    correctAnswer: "A",
    explanation: "BEE = 655 + (9.6 * 60) + (1.8 * 160) - (4.7 * 45) = 655 + 576 + 288 - 211.5 = 1,307.5 kcal. TER = BEE * Activity Factor * Stress Factor = 1,307.5 * 1.2 * 1.3 = 2,039.7 ≈ 2,042 kcal/day.",
    category: "Nutritional Calculations",
  },
  {
    id: 5,
    questionNumber: 5,
    subject: "CLINICAL NUTRITION & DIETETICS",
    question: "Examine the clinical chart diagram below illustrating the Nitrogen Balance equilibrium equation. A burn patient has a 24-hour Urinary Urea Nitrogen (UUN) of 16 grams and a daily dietary protein intake of 75 grams. What is the patient's Nitrogen Balance state?",
    image: {
      url: "/nitrogen-balance-chart.svg",
      caption: "Figure 2: Clinical Nitrogen Balance Formula & Metabolic Flux",
      alt: "Nitrogen Balance equation: N Balance = (Protein intake in g / 6.25) - (UUN in g + 4g miscellaneous loss)",
      isSvg: true,
      svgContent: `<svg viewBox="0 0 450 200" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-md rounded border bg-slate-50 p-4 font-sans shadow-sm">
        <rect width="450" height="200" fill="#f8fafc" rx="8"/>
        <text x="225" y="30" font-size="16" font-weight="bold" text-anchor="middle" fill="#0f172a">NITROGEN BALANCE FORMULA</text>
        <rect x="25" y="50" width="400" height="60" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="6"/>
        <text x="225" y="86" font-size="15" font-family="monospace" font-weight="bold" text-anchor="middle" fill="#0f766e">
          N Balance = (Protein Intake / 6.25) - (UUN + 4)
        </text>
        <text x="50" y="140" font-size="12" fill="#475569">• Nitrogen Intake = Dietary Protein (g) ÷ 6.25</text>
        <text x="50" y="160" font-size="12" fill="#475569">• Nitrogen Output = UUN (g) + 4g (fecal, dermal, sweat losses)</text>
        <text x="50" y="180" font-size="12" font-style="italic" fill="#64748b">Goal in catabolic stress: Positive balance (+2 to +4 g/day)</text>
      </svg>`,
    },
    options: [
      { key: "A", text: "-8 g N/day (Severe negative nitrogen balance / catabolism)" },
      { key: "B", text: "+4 g N/day (Optimal anabolic state)" },
      { key: "C", text: "-4 g N/day (Mild negative nitrogen balance)" },
      { key: "D", text: "0 g N/day (Equilibrium state)" },
    ],
    correctAnswer: "A",
    explanation: "Nitrogen Intake = 75 g / 6.25 = 12 g N. Nitrogen Output = 16 g (UUN) + 4 g (insensible losses) = 20 g N. Nitrogen Balance = 12 g - 20 g = -8 g N/day, indicating hypercatabolic state requiring increased protein prescription.",
    category: "Critical Care Nutrition",
  },
  {
    id: 6,
    questionNumber: 6,
    subject: "CLINICAL NUTRITION & DIETETICS",
    question: "In the Nutrition Care Process (NCP), which of the following represents a properly structured PES statement for a patient with newly diagnosed Type 2 Diabetes Mellitus?",
    options: [
      { key: "A", text: "Excessive carbohydrate intake (NI-5.8.2) related to frequent consumption of sugar-sweetened beverages as evidenced by HbA1c of 9.2% and food diary showing 350g CHO/day." },
      { key: "B", text: "Type 2 Diabetes Mellitus related to insulin resistance as evidenced by elevated fasting blood glucose of 185 mg/dL." },
      { key: "C", text: "Inability to manage carbohydrate intake caused by lack of medical compliance as evidenced by high glycemic spikes." },
      { key: "D", text: "Elevated HbA1c related to excessive dietary sugar as evidenced by physician consultation and prescription of Metformin." },
    ],
    correctAnswer: "A",
    explanation: "A standard PES statement follows Problem (Nutrition Diagnostic Term), Etiology (root cause linked by 'related to'), and Signs/Symptoms (objective or subjective data linked by 'as evidenced by'). Option A correctly targets a nutrition diagnosis rather than a medical diagnosis.",
    category: "Nutrition Care Process (NCP)",
  },
  {
    id: 7,
    questionNumber: 7,
    subject: "CLINICAL NUTRITION & DIETETICS",
    question: "Which of the following biochemical parameters is the most sensitive early laboratory indicator of refeeding syndrome in a severely malnourished patient initiated on total parenteral nutrition (TPN)?",
    options: [
      { key: "A", text: "Hypophosphatemia (Rapid drop in serum phosphorus)" },
      { key: "B", text: "Hyperkalemia (Elevated serum potassium)" },
      { key: "C", text: "Hypoalbuminemia (Decreased serum albumin)" },
      { key: "D", text: "Elevated Blood Urea Nitrogen (BUN)" },
    ],
    correctAnswer: "A",
    explanation: "Refeeding syndrome is characterized by rapid intracellular shifts of electrolytes when carbohydrates are reintroduced. Insulin stimulates cellular uptake of glucose, potassium, magnesium, and particularly phosphate (required for ATP generation and glycolysis), leading to life-threatening hypophosphatemia.",
    category: "Enteral & Parenteral Nutrition",
  },
  {
    id: 8,
    questionNumber: 8,
    subject: "CLINICAL NUTRITION & DIETETICS",
    question: "A client with Phenylketonuria (PKU) must strictly limit dietary intake of phenylalanine. Because phenylalanine hydroxylase is deficient, which amino acid becomes conditionally essential and must be supplied adequately in the diet?",
    options: [
      { key: "A", text: "Tyrosine" },
      { key: "B", text: "Tryptophan" },
      { key: "C", text: "Methionine" },
      { key: "D", text: "Cysteine" },
    ],
    correctAnswer: "A",
    explanation: "Phenylalanine is normally converted to tyrosine via the enzyme phenylalanine hydroxylase. In PKU, this pathway is impaired, making tyrosine a conditionally essential amino acid that must be provided in the diet.",
    category: "Inborn Errors of Metabolism",
  },
  {
    id: 9,
    questionNumber: 9,
    subject: "CLINICAL NUTRITION & DIETETICS",
    question: "According to the Food Exchange Lists for Diabetes in the Philippines (FNRI), 1 exchange of Medium-Fat Meat provides approximately how many grams of Protein and Fat, and how much Energy?",
    options: [
      { key: "A", text: "8g Protein, 6g Fat, 86 kcal" },
      { key: "B", text: "8g Protein, 1g Fat, 41 kcal" },
      { key: "C", text: "8g Protein, 10g Fat, 122 kcal" },
      { key: "D", text: "7g Protein, 5g Fat, 75 kcal" },
    ],
    correctAnswer: "A",
    explanation: "According to the Philippine Food Exchange List (FNRI): Low fat meat = 8g PRO, 1g FAT (41 kcal); Medium fat meat = 8g PRO, 6g FAT (86 kcal); High fat meat = 8g PRO, 10g FAT (122 kcal).",
    category: "Food Exchange Lists",
  },
  {
    id: 10,
    questionNumber: 10,
    subject: "CLINICAL NUTRITION & DIETETICS",
    question: "A patient on Warfarin (Coumadin) anticoagulant therapy should be provided which key nutritional guidance regarding their dietary vitamin K consumption?",
    options: [
      { key: "A", text: "Maintain a consistent daily intake of vitamin K-rich foods rather than eliminating or radically increasing them" },
      { key: "B", text: "Strictly avoid all green leafy vegetables (kale, spinach, collard greens) indefinitely" },
      { key: "C", text: "Double daily dietary vitamin K intake on days when INR levels are high" },
      { key: "D", text: "Take high-dose Vitamin E supplements to enhance the anticoagulant efficacy of Warfarin" },
    ],
    correctAnswer: "A",
    explanation: "Warfarin acts as a Vitamin K antagonist. Consistency in daily vitamin K intake is critical to maintain a stable INR (International Normalized Ratio). Drastic increases or decreases in vitamin K can lead to subtherapeutic or supratherapeutic anticoagulation.",
    category: "Drug-Nutrient Interactions",
  },
];
