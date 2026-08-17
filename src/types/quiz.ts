export type QuizOption = {
  id: string;
  label: string;
  description?: string;
  value?: string;
  score?: number;
  tags?: string[];
  feedback?: string;
};

export type QuizQuestion = {
  id: string;
  title: string;
  subtitle?: string;
  options: QuizOption[];
  feedback?: {
    afterAnswer?: boolean;
  };
};

export type QuizDefinition = {
  id: string;
  title?: string;
  description?: string;
  questions: QuizQuestion[];
  showProgress?: boolean;
  feedbackMode?: 'none' | 'after_each';
  completionLabel?: string;
};

export type QuizAnswer = {
  questionId: string;
  optionId: string;
  value?: string;
  score?: number;
  tags?: string[];
};

export type QuizResult = {
  quizId: string;
  answers: QuizAnswer[];
  totalScore: number;
  tagCounts: Record<string, number>;
  startedAt?: number;
  completedAt?: number;
};

export type QuizState = 
  | 'hidden'
  | 'entering'
  | 'active'
  | 'feedback'
  | 'transitioning'
  | 'completed'
  | 'exiting';

export type QuizInteractionType = 
  | 'quiz_opened'
  | 'question_viewed'
  | 'option_selected'
  | 'feedback_viewed'
  | 'question_completed'
  | 'quiz_completed';
