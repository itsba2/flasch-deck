export interface Conjugation {
  praesens?: string;
  praeteritum?: string;
  perfekt?: string;
}

export interface Comparison {
  comparative?: string;
  superlative?: string;
}

export interface Card {
  id: string;
  type: 'noun' | 'verb' | 'adjective' | 'other';
  german: string;
  turkish: string;
  article?: 'der' | 'die' | 'das';
  plural?: string;
  conjugation?: Conjugation;
  comparison?: Comparison;
  exampleGerman?: string;
  exampleTurkish?: string;
  interval: number;
  repetition: number;
  efactor: number;
  nextReviewDate: string;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  cards: Card[];
}

export interface StudyHistoryItem {
  date: string;
  reviewed: number;
  grades: number[];
}

export interface QuizHistoryItem {
  date: string;
  deckId: string;
  deckName: string;
  type: string;
  correct: number;
  total: number;
  timeSpent: number;
}

export interface AppStats {
  studyHistory: StudyHistoryItem[];
  quizHistory: QuizHistoryItem[];
}

export interface AppConfig {
  apiKey: string;
  fontSize?: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark';
}

export interface ElectronAPI {
  getDecks: () => Promise<Deck[]>;
  saveDeck: (deck: Deck) => Promise<{ success: boolean; deck: Deck }>;
  deleteDeck: (deckId: string) => Promise<{ success: boolean }>;
  exportDeck: (deck: Deck) => Promise<{ success: boolean }>;
  importDeck: () => Promise<{ success: boolean; deck?: Deck; error?: string }>;
  getConfig: () => Promise<AppConfig>;
  saveConfig: (config: AppConfig) => Promise<void>;
  getStats: () => Promise<AppStats>;
  saveStats: (stats: AppStats) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
