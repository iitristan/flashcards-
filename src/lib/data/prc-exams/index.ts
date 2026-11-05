import { Deck } from '@/types';
import ffssData from './prc2021FFSS.json';
import nbcdData from './prc2021NBCD.json';
import cphnData from './prc2019CPHN.json';

export interface OfficialPrcExamManifest {
  id: string;
  title: string;
  year: number;
  subject: string;
  setLetter: string;
  totalCards: number;
  category: string;
  description: string;
  color: string;
  icon: string;
  getDeck: () => Deck;
}

export const OFFICIAL_PRC_EXAMS: OfficialPrcExamManifest[] = [
  {
    id: 'deck-prc-2021-ffss',
    title: 'PRC NDLE 2021 - Foods & Food Service Systems',
    year: 2021,
    subject: 'Foods and Food Service Systems',
    setLetter: 'Set B',
    totalCards: 200,
    category: 'Food Service Systems',
    description: 'Official 200-question Philippine Board Licensure Examination (Oct 18, 2021) covering Food Preparation, Food Microbiology, Management, Costing, Recipe Standardization, and Meal Management.',
    color: '#D4A373',
    icon: 'ChefHat',
    getDeck: () => ffssData as unknown as Deck
  },
  {
    id: 'deck-prc-2021-nbcd',
    title: 'PRC NDLE 2021 - Nutritional Biochemistry & Clinical Dietetics',
    year: 2021,
    subject: 'Nutritional Biochemistry and Clinical Dietetics',
    setLetter: 'Set A',
    totalCards: 200,
    category: 'Medical Nutrition Therapy',
    description: 'Official 200-question Philippine Board Licensure Examination (Oct 17, 2021) covering Clinical Dietetics, MNT (Renal, Diabetes, Oncology, GI, Critical Care), Tube Feeding, and Micronutrient Metabolism.',
    color: '#3B82F6',
    icon: 'Stethoscope',
    getDeck: () => nbcdData as unknown as Deck
  },
  {
    id: 'deck-prc-2019-cphn',
    title: 'PRC NDLE 2019 - Community & Public Health Nutrition',
    year: 2019,
    subject: 'Community and Public Health Nutrition',
    setLetter: 'Set B',
    totalCards: 200,
    category: 'Public Health Nutrition',
    description: 'Official 200-question Philippine Board Licensure Examination (Aug 18, 2019) covering Community Nutrition, PPAN Programs, Nutritional Assessment, WHO Cut-offs, and Philippine Nutrition Laws.',
    color: '#10B981',
    icon: 'Users',
    getDeck: () => cphnData as unknown as Deck
  }
];

export function getOfficialPrcDeckById(id: string): Deck | undefined {
  const exam = OFFICIAL_PRC_EXAMS.find(e => e.id === id);
  return exam ? exam.getDeck() : undefined;
}

