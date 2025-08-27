import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../contexts/QuizContext';
import FlashCardQuiz from './FlashCardQuiz';
import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import ShortWritingQuiz from './ShortWritingQuiz';

export function FlashCardQuizRoute() {
  const navigate = useNavigate();
  const { getLatestQuizByTypeForCurrentDocument, currentQuiz } = useQuiz();

  // Use currentQuiz if it's a flashcard, otherwise get the latest flashcard quiz for current document
  const quiz = (currentQuiz?.type === 'flashcard' ? currentQuiz : getLatestQuizByTypeForCurrentDocument('flashcard'));
  const cards = quiz ? quiz.data as any[] : [];

  return (
    <FlashCardQuiz
      cards={cards}
      onBack={() => navigate('/')}
    />
  );
}

export function MultipleChoiceQuizRoute() {
  const navigate = useNavigate();
  const { getLatestQuizByTypeForCurrentDocument, currentQuiz } = useQuiz();

  // Use currentQuiz if it's a multiple-choice, otherwise get the latest multiple-choice quiz for current document
  const quiz = (currentQuiz?.type === 'multiple-choice' ? currentQuiz : getLatestQuizByTypeForCurrentDocument('multiple-choice'));
  const questions = quiz ? quiz.data as any[] : [];

  return (
    <MultipleChoiceQuiz
      questions={questions}
      onBack={() => navigate('/')}
    />
  );
}

export function ShortWritingQuizRoute() {
  const navigate = useNavigate();
  const { getLatestQuizByTypeForCurrentDocument, currentQuiz } = useQuiz();

  // Use currentQuiz if it's a short-writing, otherwise get the latest short-writing quiz for current document
  const quiz = (currentQuiz?.type === 'short-writing' ? currentQuiz : getLatestQuizByTypeForCurrentDocument('short-writing'));
  const tasks = quiz ? quiz.data as any[] : [];

  return (
    <ShortWritingQuiz
      tasks={tasks}
      onBack={() => navigate('/')}
    />
  );
}
