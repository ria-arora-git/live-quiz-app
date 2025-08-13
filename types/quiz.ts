export interface Question {
  id: string;
  roomId: string;
  text: string;
  options: string[];
  answer: string;
  createdAt: Date;
  order: number;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  createdBy: string;
  questionCount: number;
  timePerQuestion: number;
  isActive: boolean;
  maxParticipants: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizSession {
  id: string;
  roomId: string;
  participants: string[];
  currentIndex: number;
  isActive: boolean;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

export interface QuizResult {
  id: string;
  userId: string;
  sessionId: string;
  score: number;
  answers: Record<string, any>;
  createdAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  dailyScore?: number;
  allTimeScore?: number;
}
