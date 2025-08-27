import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ArrowLeft, Clock, Timer } from 'lucide-react';

interface WritingTask {
  id: string;
  title: string;
  prompt: string;
  maxWords: number;
  timeLimit: number; // in minutes
}

interface ShortWritingQuizProps {
  tasks: WritingTask[];
  onBack: () => void;
}

export default function ShortWritingQuiz({ tasks, onBack }: ShortWritingQuizProps) {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [responses, setResponses] = useState<string[]>(new Array(tasks.length).fill(''));
  const [isCompleted, setIsCompleted] = useState(false);

  const currentTask = tasks[currentTaskIndex];
  const totalTasks = tasks.length;

  useEffect(() => {
    if (currentTask) {
      setTimeRemaining(currentTask.timeLimit * 60); // Convert to seconds
    }
  }, [currentTask]);

  useEffect(() => {
    const words = response.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [response]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  const startTimer = () => {
    setTimerActive(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const nextTask = () => {
    // Save current response
    const newResponses = [...responses];
    newResponses[currentTaskIndex] = response;
    setResponses(newResponses);

    if (currentTaskIndex < totalTasks - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
      setResponse(responses[currentTaskIndex + 1] || '');
      setTimerActive(false);
      setWordCount(0);
    } else {
      // Quiz completed
      setIsCompleted(true);
    }
  };

  const finishQuiz = () => {
    // Save current response
    const newResponses = [...responses];
    newResponses[currentTaskIndex] = response;
    setResponses(newResponses);
    setIsCompleted(true);
  };

  const prevTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
      setResponse('');
      setTimerActive(false);
      setWordCount(0);
    }
  };

  if (!currentTask && !isCompleted) {
    return (
      <div className="h-screen flex justify-center bg-gray-100">
        <div className="w-full max-w-sm bg-white flex flex-col relative shadow-lg overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">No writing tasks available</h2>
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
    const completedTasks = responses.filter(response => response.trim().length > 0).length;
    const totalWordCount = responses.reduce((total, resp) => {
      const words = resp.trim().split(/\s+/).filter(word => word.length > 0);
      return total + words.length;
    }, 0);
    const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

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
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">You Did It! Writing Tasks Complete</h2>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Tasks Completed</h3>
                  <div className="text-3xl font-bold text-gray-800">{completedTasks}/{tasks.length}</div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Completion Rate</h3>
                  <div className="text-3xl font-bold text-gray-800">{completionRate}%</div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Words</span>
                      <span className="font-semibold">{totalWordCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completed</span>
                      <span className="font-semibold">{completedTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Remaining</span>
                      <span className="font-semibold">{tasks.length - completedTasks}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Analysis */}
              <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Writing Analysis</h3>
                      <p className="text-sm text-gray-600">Review your writing performance and get insights on your responses.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                    Analyze my writing
                  </Button>
                </div>
              </div>

              {/* Keep Learning Section */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Keep Learning</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Vocabulary Review</h4>
                        <p className="text-sm text-gray-600">Review key vocabulary from your writing exercises with flashcards.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Grammar Quiz</h4>
                        <p className="text-sm text-gray-600">Test your grammar knowledge with questions based on your writing topics.</p>
                      </div>
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
          <h1 className="text-lg font-bold text-gray-800">Short Writing</h1>
          <div className="w-16"></div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Question {currentTaskIndex + 1} of {totalTasks}</span>
            <span className="text-sm text-gray-500">{Math.round(((currentTaskIndex + 1) / totalTasks) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentTaskIndex + 1) / totalTasks) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-sm mx-auto">
            {/* Task Header */}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-3">{currentTask.title}</h2>
              <div className="flex flex-col space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-center bg-gray-100 py-2 px-3 rounded">
                  <span className="font-medium">Max {currentTask.maxWords} words</span>
                </div>
                <div className="flex items-center justify-center bg-gray-100 py-2 px-3 rounded">
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="font-medium">{currentTask.timeLimit} min limit</span>
                </div>
              </div>
            </div>

            {/* Task Prompt */}
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <p className="text-base text-gray-800 leading-relaxed">{currentTask.prompt}</p>
            </div>

            {/* Timer and Start Button */}
            <div className="mb-4">
              {!timerActive ? (
                <div className="text-center space-y-2">
                  <Button onClick={startTimer} className="w-full bg-green-600 hover:bg-green-700 py-3 touch-manipulation">
                    <Timer className="w-4 h-4 mr-2" />
                    Start Timer (Optional)
                  </Button>
                  <span className="text-sm text-gray-500 block">You can write with or without the timer</span>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center space-x-2 text-lg font-mono">
                    <Timer className="w-5 h-5 text-green-600" />
                    <span className={`font-bold ${timeRemaining < 60 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 mt-1">Timer active</span>
                </div>
              )}
            </div>

            {/* Writing Area */}
            <div className="bg-white rounded-lg border border-gray-200 mb-4">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Start writing your response here... (Timer is optional - you can write anytime)"
                className="w-full h-48 p-4 text-gray-800 placeholder-gray-400 resize-none border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <div className="text-center text-sm">
                  <span className={`font-medium ${wordCount > currentTask.maxWords ? 'text-red-600' : 'text-gray-600'}`}>
                    {wordCount} / {currentTask.maxWords} words
                  </span>
                  {wordCount > currentTask.maxWords && (
                    <div className="text-red-600 font-medium mt-1">Word limit exceeded</div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between gap-4">
              <Button
                onClick={prevTask}
                disabled={currentTaskIndex === 0}
                variant="outline"
                className="flex-1 py-3 touch-manipulation"
              >
                Previous
              </Button>
              {currentTaskIndex === totalTasks - 1 ? (
                <Button
                  onClick={finishQuiz}
                  className="flex-1 py-3 touch-manipulation"
                >
                  Finish
                </Button>
              ) : (
                <Button
                  onClick={nextTask}
                  className="flex-1 py-3 touch-manipulation"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
