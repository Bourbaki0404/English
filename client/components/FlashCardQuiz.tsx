import React, { useState } from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

interface FlashCard {
  id: string;
  question: string;
  answer: string;
}

interface FlashCardQuizProps {
  cards: FlashCard[];
  onBack: () => void;
}

export default function FlashCardQuiz({ cards, onBack }: FlashCardQuizProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCards, setReviewedCards] = useState<Set<number>>(new Set());
  const [isCompleted, setIsCompleted] = useState(false);

  const currentCard = cards[currentCardIndex];
  const totalCards = cards.length;

  const nextCard = () => {
    // Mark current card as reviewed if answer was shown
    if (showAnswer) {
      setReviewedCards(prev => new Set([...prev, currentCardIndex]));
    }

    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    }
  };

  const finishQuiz = () => {
    // Mark current card as reviewed if answer was shown
    if (showAnswer) {
      setReviewedCards(prev => new Set([...prev, currentCardIndex]));
    }
    setIsCompleted(true);
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
    }
  };

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  if (!currentCard && !isCompleted) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No flashcards available</h2>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    const reviewedCount = reviewedCards.size;
    const totalCount = cards.length;
    const completionRate = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Flashcards Complete</h1>
          <div className="w-20"></div>
        </div>

        {/* Completion Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-sm mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">You Did It! Flashcards Complete</h2>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Cards Reviewed</h3>
                <div className="text-3xl font-bold text-gray-800">{reviewedCount}/{totalCount}</div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Completion Rate</h3>
                <div className="text-3xl font-bold text-gray-800">{completionRate}%</div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reviewed</span>
                    <span className="font-semibold">{reviewedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Remaining</span>
                    <span className="font-semibold">{totalCount - reviewedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="font-semibold">{totalCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Return Button */}
            <div className="text-center">
              <Button onClick={onBack} className="w-full py-3 text-base">
                Return to Editor
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>
        <h1 className="text-xl font-bold text-gray-800">Flash Card</h1>
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Flash Card */}
          <div
            className="bg-white rounded-2xl shadow-lg p-8 mb-6 min-h-[280px] flex items-center justify-center cursor-pointer transition-all hover:shadow-xl"
            onClick={toggleAnswer}
          >
            <div className="text-center">
              <div className="text-lg font-medium text-gray-800 leading-relaxed">
                {showAnswer ? currentCard.answer : currentCard.question}
              </div>
              {!showAnswer && (
                <div className="mt-4 text-sm text-gray-500">
                  Tap to reveal answer
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-4">
            <Button
              onClick={prevCard}
              disabled={currentCardIndex === 0}
              variant="ghost"
              size="lg"
              className="p-4 touch-manipulation"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <div className="text-base font-medium text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
              {currentCardIndex + 1} of {totalCards}
            </div>

            {currentCardIndex === totalCards - 1 ? (
              <Button
                onClick={finishQuiz}
                variant="ghost"
                size="lg"
                className="p-4 touch-manipulation"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            ) : (
              <Button
                onClick={nextCard}
                variant="ghost"
                size="lg"
                className="p-4 touch-manipulation"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
