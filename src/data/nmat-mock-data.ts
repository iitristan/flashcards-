import { CBLEQuestion } from "./cble-mock-data";

export interface NMATExamineeProfile {
  name: string;
  role: string;
  examineeNumber: string;
  applicationNumber: string;
  testCenter: string;
  roomNumber: string;
  testTitle: string;
  durationMinutes: number;
}

export const DEFAULT_NMAT_EXAMINEE: NMATExamineeProfile = {
  name: "FUTURE MD (RND)",
  role: "Examinee",
  examineeNumber: "2026-NMAT-08421",
  applicationNumber: "CEM-APP-482190",
  testCenter: "CEM Online Assessment - Center for Educational Measurement",
  roomNumber: "Virtual Proctoring Room A-04",
  testTitle: "Sample Test-copy / NMAT Mock Examination",
  durationMinutes: 240, // 4 hours for full NMAT
};

export const MOCK_NMAT_QUESTIONS: CBLEQuestion[] = [
  {
    id: 1,
    questionNumber: 1,
    subject: "TEST C. QUANTITATIVE",
    category: "Fundamental Operations",
    question: "(4√3)(5√3) =",
    options: [
      { key: "A", text: "20√3" },
      { key: "B", text: "27" },
      { key: "C", text: "60" },
      { key: "D", text: "180" },
    ],
    correctAnswer: "C",
    explanation:
      "(4√3)(5√3) = (4 × 5) × (√3 × √3) = 20 × 3 = 60. By multiplying the rational coefficients together (4 × 5 = 20) and the radical components together (√3 × √3 = 3), the product is 20 × 3 = 60.",
  },
  {
    id: 2,
    questionNumber: 2,
    subject: "TEST C. QUANTITATIVE",
    category: "Fundamental Operations",
    question: "If 3x - 7 = 14 + x, what is the value of 2x + 5?",
    options: [
      { key: "A", text: "10.5" },
      { key: "B", text: "21" },
      { key: "C", text: "26" },
      { key: "D", text: "32" },
    ],
    correctAnswer: "C",
    explanation:
      "First solve for x: 3x - x = 14 + 7 => 2x = 21 => x = 10.5. Then substitute into 2x + 5: 2(10.5) + 5 = 21 + 5 = 26.",
  },
  {
    id: 3,
    questionNumber: 3,
    subject: "TEST C. QUANTITATIVE",
    category: "Problem Solving & Percentages",
    question: "A solution of 400 mL contains 15% solute by volume. How much pure water must be added to dilute the solution to a 10% concentration?",
    options: [
      { key: "A", text: "150 mL" },
      { key: "B", text: "200 mL" },
      { key: "C", text: "250 mL" },
      { key: "D", text: "300 mL" },
    ],
    correctAnswer: "B",
    explanation:
      "The amount of solute remains constant: 400 mL × 0.15 = 60 mL. Let V be the new total volume such that 60 / V = 0.10 => V = 600 mL. Water to be added = 600 mL - 400 mL = 200 mL.",
  },
  {
    id: 4,
    questionNumber: 4,
    subject: "TEST E. BIOLOGY",
    category: "Cell Biology & Biochemistry",
    question: "Which of the following cellular organelles is responsible for synthesizing lipids, metabolizing carbohydrates, and detoxifying drugs and poisons?",
    options: [
      { key: "A", text: "Rough Endoplasmic Reticulum" },
      { key: "B", text: "Smooth Endoplasmic Reticulum" },
      { key: "C", text: "Golgi Apparatus" },
      { key: "D", text: "Peroxisome" },
    ],
    correctAnswer: "B",
    explanation:
      "The smooth endoplasmic reticulum (SER) functions in diverse metabolic processes, including lipid synthesis (phospholipids and steroids), carbohydrate metabolism, calcium storage in muscle cells, and detoxification of drugs/poisons in hepatic cells.",
  },
  {
    id: 5,
    questionNumber: 5,
    subject: "TEST E. BIOLOGY",
    category: "Physiology & Genetics",
    question: "In a cross between two individuals heterozygous for autosomal recessive sickle cell trait (HbA HbS × HbA HbS), what is the probability that their first child will have sickle cell disease (HbS HbS)?",
    options: [
      { key: "A", text: "0%" },
      { key: "B", text: "25% (1/4)" },
      { key: "C", text: "50% (1/2)" },
      { key: "D", text: "75% (3/4)" },
    ],
    correctAnswer: "B",
    explanation:
      "Monohybrid Mendelian cross: Aa × Aa produces 1/4 AA (normal), 2/4 Aa (carrier trait), and 1/4 aa (sickle cell disease). Thus, the probability of sickle cell disease is 25% or 1/4.",
  },
  {
    id: 6,
    questionNumber: 6,
    subject: "TEST G. CHEMISTRY",
    category: "General & Physical Chemistry",
    question: "According to Le Chatelier's Principle, which of the following stresses will shift the equilibrium to the right for the exothermic reaction: N2(g) + 3H2(g) ⇌ 2NH3(g) + 92 kJ?",
    options: [
      { key: "A", text: "Increasing temperature" },
      { key: "B", text: "Decreasing total system pressure" },
      { key: "C", text: "Increasing system pressure (decreasing volume)" },
      { key: "D", text: "Removing N2 gas from the system" },
    ],
    correctAnswer: "C",
    explanation:
      "The left side has 4 moles of gas (1 N2 + 3 H2) while the right side has 2 moles of gas (2 NH3). Increasing system pressure shifts the equilibrium toward the side with fewer gas moles (the right/forward direction) to reduce pressure.",
  },
  {
    id: 7,
    questionNumber: 7,
    subject: "TEST G. CHEMISTRY",
    category: "Organic Chemistry",
    question: "Which functional group is characterized by a carbonyl group bonded directly to both a carbon atom and a hydroxyl group (-COOH)?",
    options: [
      { key: "A", text: "Ester" },
      { key: "B", text: "Carboxylic acid" },
      { key: "C", text: "Ketone" },
      { key: "D", text: "Aldehyde" },
    ],
    correctAnswer: "B",
    explanation:
      "Carboxylic acids possess the carboxyl functional group (-C(=O)OH), composed of a carbonyl (C=O) attached to a hydroxyl group (-OH). Esters possess -COOR, aldehydes possess -CHO, and ketones possess R-CO-R'.",
  },
  {
    id: 8,
    questionNumber: 8,
    subject: "TEST F. PHYSICS",
    category: "Kinematics & Dynamics",
    question: "A medical supply drone starts from rest and accelerates uniformly at 4.0 m/s² for 5.0 seconds. How far does the drone travel during this interval?",
    options: [
      { key: "A", text: "20 meters" },
      { key: "B", text: "50 meters" },
      { key: "C", text: "100 meters" },
      { key: "D", text: "200 meters" },
    ],
    correctAnswer: "B",
    explanation:
      "Using the kinematic formula d = v0*t + 0.5*a*t²: with v0 = 0 m/s, d = 0 + 0.5 × (4.0 m/s²) × (5.0 s)² = 0.5 × 4.0 × 25 = 50 meters.",
  },
  {
    id: 9,
    questionNumber: 9,
    subject: "TEST B. INDUCTIVE REASONING",
    category: "Number & Pattern Logic",
    question: "Identify the next number in the sequence: 3, 7, 15, 31, 63, ___?",
    options: [
      { key: "A", text: "95" },
      { key: "B", text: "125" },
      { key: "C", text: "127" },
      { key: "D", text: "129" },
    ],
    correctAnswer: "C",
    explanation:
      "The pattern is 2n + 1 (or adding consecutive powers of 2): +4, +8, +16, +32, so the next increment is +64. 63 + 64 = 127 (or 2 × 63 + 1 = 127).",
  },
  {
    id: 10,
    questionNumber: 10,
    subject: "TEST H. SOCIAL SCIENCE",
    category: "Psychological & Developmental Theories",
    question: "According to Erik Erikson's stages of psychosocial development, an adolescent grappling with question of 'Who am I and what is my place in society?' is navigating which crisis?",
    options: [
      { key: "A", text: "Trust vs. Mistrust" },
      { key: "B", text: "Initiative vs. Guilt" },
      { key: "C", text: "Identity vs. Role Confusion" },
      { key: "D", text: "Generativity vs. Stagnation" },
    ],
    correctAnswer: "C",
    explanation:
      "During adolescence (ages ~12–18), individuals face Erikson's fifth psychosocial stage: Identity vs. Role Confusion, where they explore values, vocational goals, and self-identity.",
  },
];

