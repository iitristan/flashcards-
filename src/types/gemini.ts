export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export interface GenerateCardsRequest {
  topic?: string;
  rawText?: string;
  fileContent?: string;
  count?: number;
}

export interface GenerateCardsResponse {
  cards: GeneratedFlashcard[];
}

export interface GenerateCardsError {
  error: string;
}

export interface MCExplanationRequest {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  allOptions?: string[];
  rationale?: string;
  studentReasoning?: string;
  apiKey?: string;
}

export interface ExplanationSource {
  title: string;
  relevance?: string;
  url?: string;
}

export interface MCExplanationResponse {
  searchOverview?: string;
  whyRight: string;
  whyWrongChoices?: string;
  keyDifference?: string;
  boardTip?: string;
  sources?: ExplanationSource[];
  isAiPowered?: boolean;
}


