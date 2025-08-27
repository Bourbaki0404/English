import React, { useState } from "react";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

interface MultipleChoiceOption {
  text: string;
  explanation: string;
}

interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: MultipleChoiceOption[];
  correctAnswer: number;
  hint?: string;
}

interface MultipleChoiceQuizProps {
  questions: MultipleChoiceQuestion[];
  onBack: () => void;
}

export default function MultipleChoiceQuiz({
  questions,
  onBack,
}: MultipleChoiceQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(questions.length).fill(null),
  );
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  const handleAnswerSelect = (optionIndex: number) => {
    if (showFeedback) return; // Prevent changing answer after feedback is shown

    setSelectedAnswer(optionIndex);
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);

    // Show immediate feedback
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(answers[currentQuestionIndex + 1]);
      setShowFeedback(answers[currentQuestionIndex + 1] !== null);
    } else {
      // Quiz completed
      setIsCompleted(true);
    }
  };

  const calculateStats = () => {
    const answered = answers.filter((answer) => answer !== null);
    const correct = answers.filter(
      (answer, index) => answer === questions[index]?.correctAnswer,
    );
    const wrong = answered.filter(
      (answer, index) =>
        answer !== null && answer !== questions[index]?.correctAnswer,
    );
    const skipped = answers.filter((answer) => answer === null);

    return {
      score: correct.length,
      total: questions.length,
      accuracy:
        answered.length > 0
          ? Math.round((correct.length / answered.length) * 100)
          : 0,
      right: correct.length,
      wrong: wrong.length,
      skipped: skipped.length,
    };
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(answers[currentQuestionIndex - 1]);
      setShowFeedback(answers[currentQuestionIndex - 1] !== null);
    }
  };

  if (!currentQuestion && !isCompleted) {
    return (
      <div className="h-screen flex justify-center bg-gray-100">
        <div className="w-full max-w-sm bg-white flex flex-col relative shadow-lg overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                No questions available
              </h2>
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Editor
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    const stats = calculateStats();
    return (
      <div className="h-screen flex justify-center bg-gray-100">
        <div className="w-full max-w-sm bg-white flex flex-col relative shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button onClick={onBack} variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Home
              </Button>
            </div>
            <h1 className="text-lg font-bold text-gray-800">Complete</h1>
            <div className="w-16"></div>
          </div>

          {/* Completion Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-sm mx-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                You Did It! Quiz Complete
              </h2>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    Score
                  </h3>
                  <div className="text-3xl font-bold text-gray-800">
                    {stats.score}/{stats.total}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    Accuracy
                  </h3>
                  <div className="text-3xl font-bold text-gray-800">
                    {stats.accuracy}%
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Right</span>
                      <span className="font-semibold">{stats.right}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Wrong</span>
                      <span className="font-semibold">{stats.wrong}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Skipped</span>
                      <span className="font-semibold">{stats.skipped}</span>
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
      </div>
    );
  }

  return (
    <div className="h-screen flex justify-center bg-gray-100">
      <div className="w-full max-w-sm bg-white flex flex-col relative shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Home
            </Button>
          </div>
          <h1 className="text-lg font-bold text-gray-800">Multiple Choice</h1>
          <div className="w-16"></div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%
              Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-sm mx-auto">
            {/* Question */}
            <div className="bg-white rounded-lg p-6 mb-4 shadow-sm">
              <div className="text-base text-gray-800 leading-relaxed">
                <span className="font-medium">{currentQuestionIndex + 1}.</span>{" "}
                {currentQuestion.question}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === currentQuestion.correctAnswer;
                const isIncorrect = showFeedback && isSelected && !isCorrect;
                const showAsCorrect = showFeedback && isCorrect;

                let borderColor = "border-gray-200";
                let bgColor = "bg-white";
                let textColor = "text-gray-800";

                if (showAsCorrect) {
                  borderColor = "border-green-300";
                  bgColor = "bg-green-50";
                } else if (isIncorrect) {
                  borderColor = "border-red-300";
                  bgColor = "bg-red-50";
                } else if (isSelected && !showFeedback) {
                  borderColor = "border-blue-500";
                  bgColor = "bg-blue-50";
                }

                return (
                  <div key={index}>
                    <div
                      className={`rounded-lg p-4 border-2 transition-all touch-manipulation ${
                        !showFeedback
                          ? "cursor-pointer active:scale-95 hover:shadow-md hover:border-gray-300"
                          : ""
                      } ${borderColor} ${bgColor}`}
                      onClick={() => handleAnswerSelect(index)}
                    >
                      <div className="flex items-start">
                        <div className="flex items-center mr-4">
                          {showAsCorrect ? (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          ) : isIncorrect ? (
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          ) : (
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isSelected && !showFeedback
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && !showFeedback && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start mb-2">
                            <span className="font-medium text-gray-700 mr-3 mt-0.5 text-sm">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <span
                              className={`${textColor} font-medium text-sm leading-relaxed`}
                            >
                              {typeof option === "string"
                                ? option
                                : option.text}
                            </span>
                          </div>

                          {showFeedback && (isSelected || isCorrect) && (
                            <div className="mt-3">
                              {showAsCorrect && (
                                <div className="flex items-center mb-2">
                                  <svg
                                    className="w-4 h-4 text-green-600 mr-2"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <span className="font-semibold text-green-600">
                                    That's right!
                                  </span>
                                </div>
                              )}
                              {isIncorrect && (
                                <div className="flex items-center mb-2">
                                  <svg
                                    className="w-4 h-4 text-red-600 mr-2"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <span className="font-semibold text-red-600">
                                    Not quite!
                                  </span>
                                </div>
                              )}
                              <p className="text-sm text-gray-700">
                                {typeof option === "string"
                                  ? isCorrect
                                    ? "This is the correct answer."
                                    : "This is not the correct answer."
                                  : option.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between gap-4">
              <Button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                className="flex-1 py-3 touch-manipulation"
              >
                Previous
              </Button>
              <Button
                onClick={nextQuestion}
                disabled={!showFeedback}
                className="flex-1 py-3 touch-manipulation"
              >
                {currentQuestionIndex === totalQuestions - 1
                  ? "Finish"
                  : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
