export type NMATPart = 'Part 1: General Aptitude' | 'Part 2: Special Areas';

export type NMATSubject =
  | 'Verbal'
  | 'Inductive Reasoning'
  | 'Quantitative'
  | 'Perceptual Acuity'
  | 'Biology'
  | 'Physics'
  | 'Chemistry'
  | 'Social Science';

export type NMATSubjectCode =
  | 'VERB'
  | 'INDUC'
  | 'QUANT'
  | 'PERC'
  | 'BIO'
  | 'PHYS'
  | 'CHEM'
  | 'SOCSCI';

export interface NMATSubjectConfig {
  name: NMATSubject;
  part: NMATPart;
  code: NMATSubjectCode;
  testLabel: string; // e.g. "TEST C. QUANTITATIVE"
  shortTitle: string;
  description: string;
  color: string;
  badgeBg: string;
  icon: string; // Lucide icon name
  emoji: string;
}

export const NMAT_SUBJECT_CONFIGS: Record<NMATSubject, NMATSubjectConfig> = {
  'Quantitative': {
    name: 'Quantitative',
    part: 'Part 1: General Aptitude',
    code: 'QUANT',
    testLabel: 'TEST C. QUANTITATIVE',
    shortTitle: 'Quantitative',
    description: 'Fundamental mathematical operations, algebraic equations, geometry, and data interpretation.',
    color: '#0b63c5', // Royal Blue (like CEM Mettl)
    badgeBg: 'rgba(11, 99, 197, 0.1)',
    icon: 'Calculator',
    emoji: '🔢',
  },
  'Verbal': {
    name: 'Verbal',
    part: 'Part 1: General Aptitude',
    code: 'VERB',
    testLabel: 'TEST A. VERBAL',
    shortTitle: 'Verbal',
    description: 'Reading comprehension, analogies, critical reasoning, and vocabulary in scientific contexts.',
    color: '#8b5cf6',
    badgeBg: 'rgba(139, 92, 246, 0.1)',
    icon: 'BookOpen',
    emoji: '📖',
  },
  'Inductive Reasoning': {
    name: 'Inductive Reasoning',
    part: 'Part 1: General Aptitude',
    code: 'INDUC',
    testLabel: 'TEST B. INDUCTIVE REASONING',
    shortTitle: 'Inductive Reasoning',
    description: 'Figure series, number series, letter sequences, and pattern identification.',
    color: '#0d9488',
    badgeBg: 'rgba(13, 148, 136, 0.1)',
    icon: 'Brain',
    emoji: '🧩',
  },
  'Perceptual Acuity': {
    name: 'Perceptual Acuity',
    part: 'Part 1: General Aptitude',
    code: 'PERC',
    testLabel: 'TEST D. PERCEPTUAL ACUITY',
    shortTitle: 'Perceptual Acuity',
    description: 'Hidden figures, mirror images, identical figures, and visual observation.',
    color: '#e11d48',
    badgeBg: 'rgba(225, 29, 72, 0.1)',
    icon: 'Eye',
    emoji: '👁️',
  },
  'Biology': {
    name: 'Biology',
    part: 'Part 2: Special Areas',
    code: 'BIO',
    testLabel: 'TEST E. BIOLOGY',
    shortTitle: 'Biology',
    description: 'Cell biology, molecular genetics, human physiology, histology, ecology, and plant biology.',
    color: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.1)',
    icon: 'Dna',
    emoji: '🧬',
  },
  'Physics': {
    name: 'Physics',
    part: 'Part 2: Special Areas',
    code: 'PHYS',
    testLabel: 'TEST F. PHYSICS',
    shortTitle: 'Physics',
    description: 'Classical mechanics, kinematics, thermodynamics, optics, nuclear physics, and electromagnetism.',
    color: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.1)',
    icon: 'Zap',
    emoji: '⚡',
  },
  'Chemistry': {
    name: 'Chemistry',
    part: 'Part 2: Special Areas',
    code: 'CHEM',
    testLabel: 'TEST G. CHEMISTRY',
    shortTitle: 'Chemistry',
    description: 'General chemistry, stoichiometry, thermodynamics, organic chemistry mechanisms, and biochemistry.',
    color: '#ec4899',
    badgeBg: 'rgba(236, 72, 153, 0.1)',
    icon: 'FlaskConical',
    emoji: '🧪',
  },
  'Social Science': {
    name: 'Social Science',
    part: 'Part 2: Special Areas',
    code: 'SOCSCI',
    testLabel: 'TEST H. SOCIAL SCIENCE',
    shortTitle: 'Social Science',
    description: 'Psychology, developmental theories, sociology, anthropology, and behavioral health.',
    color: '#6366f1',
    badgeBg: 'rgba(99, 102, 241, 0.1)',
    icon: 'Users',
    emoji: '👥',
  },
};

export const NMAT_SUBJECT_LIST: NMATSubject[] = [
  'Quantitative',
  'Verbal',
  'Inductive Reasoning',
  'Perceptual Acuity',
  'Biology',
  'Physics',
  'Chemistry',
  'Social Science',
];

