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

  const currentCard = cards[currentCardIndex];
  const totalCards = cards.length;

  const nextCard = () => {
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    }
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

  if (!currentCard) {
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
