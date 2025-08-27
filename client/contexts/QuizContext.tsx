import React, { createContext, useContext, useState, ReactNode } from "react";

interface FlashCard {
  id: string;
  question: string;
  answer: string;
}

interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  hint?: string;
}

interface WritingTask {
  id: string;
  title: string;
  prompt: string;
  maxWords: number;
  timeLimit: number;
}

interface Quiz {
  id: string;
  type: "flashcard" | "multiple-choice" | "short-writing";
  title: string;
  sourceText: string;
  data: FlashCard[] | MultipleChoiceQuestion[] | WritingTask[];
  documentId: string; // Associate quiz with specific document
  createdAt: Date;
}

interface QuizContextType {
  quizzes: Quiz[];
  selectedText: string;
  currentQuiz: Quiz | null;
  currentDocumentId: string;
  setSelectedText: (text: string) => void;
  setCurrentDocumentId: (documentId: string) => void;
  createQuiz: (
    type: Quiz["type"],
    title: string,
    sourceText: string,
    data: any[],
    documentId: string,
  ) => void;
  getQuizzesByType: (type: Quiz["type"]) => Quiz[];
  getQuizzesByDocument: (documentId: string) => Quiz[];
  getQuizzesByDocumentAndType: (
    documentId: string,
    type: Quiz["type"],
  ) => Quiz[];
  getLatestQuizByType: (type: Quiz["type"]) => Quiz | null;
  getLatestQuizByTypeForCurrentDocument: (type: Quiz["type"]) => Quiz | null;
  getAllQuizzes: () => Quiz[];
  deleteQuiz: (id: string) => void;
  renameQuiz: (id: string, newTitle: string) => void;
  setCurrentQuiz: (quiz: Quiz | null) => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

// Mock data for demonstration
const mockQuizzes: Quiz[] = [
  {
    id: "1",
    type: "flashcard",
    title: "English 4 - Vocabulary",
    sourceText: "The ancient ruins attest to the skill of the builders.",
    documentId: "3", // Associated with English 4 document
    data: [
      {
        id: "1",
        question: "What is the capital of Germany?",
        answer: "Berlin",
      },
      {
        id: "2",
        question: 'What does "attest" mean?',
        answer: "To provide or serve as clear evidence of",
      },
      {
        id: "3",
        question: 'What is the meaning of "ruins"?',
        answer: "The remains of a building that has been destroyed or damaged",
      },
      {
        id: "4",
        question: 'Define "ancient"',
        answer: "Belonging to the very distant past",
      },
      {
        id: "5",
        question: 'What does "builders" refer to?',
        answer: "People who construct buildings or structures",
      },
    ],
    createdAt: new Date(),
  },
  {
    id: "2",
    type: "multiple-choice",
    title: "Creative Writing Quiz",
    sourceText: "A writer describes a scene focusing on sensory details.",
    documentId: "2", // Associated with English 3 document
    data: [
      {
        id: "1",
        question:
          "A writer describes a scene focusing on the smell of rain on hot asphalt, the taste of a salty pretzel, and the feel of a rough brick wall. What type of details are they primarily using?",
        options: [
          {
            text: "Sensory Details",
            explanation:
              "Correct. Sensory details appeal to the five senses (smell, taste, touch) as described in the passage.",
          },
          {
            text: "Auditory Details",
            explanation:
              "Incorrect. While auditory details relate to sound, the passage focuses on smell, taste, and touch.",
          },
          {
            text: "Plot Devices",
            explanation:
              "Incorrect. Plot devices are structural elements of storytelling, not descriptive details.",
          },
          {
            text: "Figurative Language",
            explanation:
              "Incorrect. Figurative language uses metaphors or similes, while this passage uses literal descriptions.",
          },
        ],
        correctAnswer: 0,
        hint: "Think about the five senses mentioned in the description.",
      },
    ],
    createdAt: new Date(),
  },
  {
    id: "3",
    type: "short-writing",
    title: "Writing Exercise",
    sourceText: "Practice descriptive writing techniques.",
    documentId: "3", // Associated with English 4 document
    data: [
      {
        id: "1",
        title: "Writing Task 1",
        prompt:
          "Describe your favorite place in the world and explain why it's special to you.",
        maxWords: 150,
        timeLimit: 10,
      },
    ],
    createdAt: new Date(),
  },
  {
    id: "4",
    type: "flashcard",
    title: "English 2 - Basic Vocabulary",
    sourceText: "Introduction to English basics and fundamental concepts.",
    documentId: "1", // Associated with English 2 document
    data: [
      {
        id: "1",
        question: "What is the English word for 'hello'?",
        answer: "Hello",
      },
      {
        id: "2",
        question: "What does 'basic' mean?",
        answer: "Fundamental or elementary",
      },
    ],
    createdAt: new Date(),
  },
];

export function QuizProvider({ children }: { children: ReactNode }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>(mockQuizzes);
  const [selectedText, setSelectedText] = useState<string>("");
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string>("3"); // Default to document "3"

  const createQuiz = (
    type: Quiz["type"],
    title: string,
    sourceText: string,
    data: any[],
    documentId: string,
  ) => {
    const newQuiz: Quiz = {
      id: Date.now().toString(),
      type,
      title,
      sourceText,
      data,
      documentId,
      createdAt: new Date(),
    };
    setQuizzes((prev) => [...prev, newQuiz]);
    setCurrentQuiz(newQuiz); // Set as current quiz for immediate use
  };

  const getQuizzesByType = (type: Quiz["type"]) => {
    return quizzes.filter((quiz) => quiz.type === type);
  };

  const getQuizzesByDocument = (documentId: string) => {
    const filteredQuizzes = quizzes.filter(
      (quiz) => quiz.documentId === documentId,
    );
    return filteredQuizzes.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  };

  const getQuizzesByDocumentAndType = (
    documentId: string,
    type: Quiz["type"],
  ) => {
    return quizzes
      .filter((quiz) => quiz.documentId === documentId && quiz.type === type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  const getLatestQuizByType = (type: Quiz["type"]) => {
    const typeQuizzes = quizzes.filter((quiz) => quiz.type === type);
    return typeQuizzes.length > 0 ? typeQuizzes[typeQuizzes.length - 1] : null;
  };

  const getLatestQuizByTypeForCurrentDocument = (type: Quiz["type"]) => {
    const documentTypeQuizzes = getQuizzesByDocumentAndType(
      currentDocumentId,
      type,
    );
    return documentTypeQuizzes.length > 0 ? documentTypeQuizzes[0] : null; // Already sorted by createdAt desc
  };

  const getAllQuizzes = () => {
    return quizzes.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  };

  const deleteQuiz = (id: string) => {
    setQuizzes((prev) => prev.filter((quiz) => quiz.id !== id));
  };

  const renameQuiz = (id: string, newTitle: string) => {
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.id === id ? { ...quiz, title: newTitle } : quiz,
      ),
    );
  };

  return (
    <QuizContext.Provider
      value={{
        quizzes,
        selectedText,
        currentQuiz,
        currentDocumentId,
        setSelectedText,
        setCurrentDocumentId,
        createQuiz,
        getQuizzesByType,
        getQuizzesByDocument,
        getQuizzesByDocumentAndType,
        getLatestQuizByType,
        getLatestQuizByTypeForCurrentDocument,
        getAllQuizzes,
        deleteQuiz,
        renameQuiz,
        setCurrentQuiz,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error("useQuiz must be used within a QuizProvider");
  }
  return context;
}
