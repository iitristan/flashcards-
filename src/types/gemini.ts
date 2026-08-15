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
