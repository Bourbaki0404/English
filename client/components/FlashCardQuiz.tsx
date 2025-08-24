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
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">You Did It! Flashcards Complete</h2>

            {/* Statistics Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
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
              <Button onClick={onBack} className="px-8 py-3">
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
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Flash Card */}
          <div 
            className="bg-white rounded-3xl shadow-lg p-12 mb-8 min-h-[400px] flex items-center justify-center cursor-pointer transition-all hover:shadow-xl"
            onClick={toggleAnswer}
          >
            <div className="text-center">
              <div className="text-2xl font-medium text-gray-800 leading-relaxed">
                {showAnswer ? currentCard.answer : currentCard.question}
              </div>
              {!showAnswer && (
                <div className="mt-6 text-sm text-gray-500">
                  Click to reveal answer
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center space-x-6">
            <Button
              onClick={prevCard}
              disabled={currentCardIndex === 0}
              variant="ghost"
              size="lg"
              className="p-3"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <div className="text-lg font-medium text-gray-600">
              {currentCardIndex + 1} of {totalCards}
            </div>

{currentCardIndex === totalCards - 1 ? (
              <Button
                onClick={finishQuiz}
                variant="ghost"
                size="lg"
                className="p-3"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            ) : (
              <Button
                onClick={nextCard}
                variant="ghost"
                size="lg"
                className="p-3"
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
