"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Question {
  id: string;
  text: string;
  options: string[];
  answer?: string;
}

interface QuizQuestionProps {
  question: Question;
  onAnswer: (selectedOption: string, timeLeft: number) => Promise<void> | void;
  disabled?: boolean;
  timeLeft?: number;
  showCorrectAnswer?: boolean;
}

export default function QuizQuestion({
  question,
  onAnswer,
  disabled = false,
  timeLeft = 0,
  showCorrectAnswer = false,
}: QuizQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
    setIsSubmitting(false);
  }, [question?.id]);

  const handleOptionSelect = (option: string) => {
    if (disabled || submitted || isSubmitting || !option) return;
    setSelected(option);
  };

  const handleSubmit = async () => {
    if (!selected || disabled || submitted || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onAnswer(selected, timeLeft);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting answer:", error);
      setIsSubmitting(false);
    }
  };

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft <= 0 && selected && !submitted && !isSubmitting) {
      handleSubmit();
    }
  }, [timeLeft, selected, submitted, isSubmitting]);

  // Safely handle question data
  if (!question?.text || !Array.isArray(question.options)) {
    return (
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-8 border border-gray-600 shadow-xl">
        <div className="text-center text-gray-400">
          <div className="animate-pulse">Loading question...</div>
        </div>
      </div>
    );
  }

  const safeOptions = question.options.filter(option => option && option.trim().length > 0);

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-8 border border-gray-600 shadow-xl">
      {/* Question Text */}
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-center mb-8 text-white leading-relaxed"
      >
        {question.text}
      </motion.h2>

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {safeOptions.map((option, index) => {
          const isCorrect = showCorrectAnswer && option === question.answer;
          const isSelected = selected === option;
          const isWrongSelected = showCorrectAnswer && isSelected && !isCorrect;

          return (
            <motion.button
              key={`${question.id}-option-${index}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={!disabled && !submitted && !isSubmitting ? { scale: 1.02 } : {}}
              whileTap={!disabled && !submitted && !isSubmitting ? { scale: 0.98 } : {}}
              onClick={() => handleOptionSelect(option)}
              disabled={disabled || submitted || isSubmitting}
              type="button"
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200 font-medium text-left
                ${
                  isCorrect
                    ? "border-green-500 bg-green-500 bg-opacity-20 text-green-300"
                    : isWrongSelected
                    ? "border-red-500 bg-red-500 bg-opacity-20 text-red-300"
                    : isSelected
                    ? "border-neonPink bg-neonPink bg-opacity-20 text-white shadow-lg"
                    : "border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-700 text-gray-300"
                }
                ${disabled || submitted || isSubmitting ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="flex items-center gap-3">
                {/* Option Letter */}
                <div
                  className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm
                    ${
                      isCorrect
                        ? "border-green-500 bg-green-500 text-white"
                        : isWrongSelected
                        ? "border-red-500 bg-red-500 text-white"
                        : isSelected
                        ? "border-neonPink bg-neonPink text-black"
                        : "border-gray-500 text-gray-400"
                    }
                  `}
                >
                  {String.fromCharCode(65 + index)}
                </div>

                {/* Option Text */}
                <span className="flex-1">{option}</span>

                {/* Selection/Correctness Indicators */}
                {isCorrect && (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
                
                {isWrongSelected && (
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✗</span>
                  </div>
                )}
                
                {isSelected && !showCorrectAnswer && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 bg-neonPink rounded-full flex items-center justify-center"
                  >
                    <div className="w-2 h-2 bg-black rounded-full" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Submit Button */}
      {!showCorrectAnswer && (
        <div className="text-center">
          <motion.button
            whileHover={selected && !disabled && !submitted && !isSubmitting ? { scale: 1.05 } : {}}
            whileTap={selected && !disabled && !submitted && !isSubmitting ? { scale: 0.95 } : {}}
            onClick={handleSubmit}
            disabled={!selected || disabled || submitted || isSubmitting}
            className={`
              px-8 py-3 rounded-lg font-bold text-lg transition-all duration-200
              ${
                selected && !disabled && !submitted && !isSubmitting
                  ? "bg-neonCyan text-black hover:bg-cyan-400 shadow-lg"
                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
              }
            `}
            type="button"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2 justify-center">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Submitting...
              </div>
            ) : submitted ? (
              <div className="flex items-center gap-2 justify-center">
                <span>✓</span>
                Answer Submitted!
              </div>
            ) : (
              "Submit Answer"
            )}
          </motion.button>
        </div>
      )}

      {/* Status Messages */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-4"
        >
          <div className="bg-green-900 bg-opacity-50 rounded-lg p-3 border border-green-600">
            <p className="text-green-400 font-medium">
              ✓ Your answer has been recorded. Waiting for other participants...
            </p>
          </div>
        </motion.div>
      )}

      {timeLeft <= 10 && timeLeft > 0 && !submitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-4"
        >
          <div className="bg-red-900 bg-opacity-50 rounded-lg p-3 border border-red-600">
            <p className="text-red-400 font-medium">⚠️ Only {timeLeft} seconds left!</p>
          </div>
        </motion.div>
      )}

      {!selected && timeLeft <= 5 && timeLeft > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mt-4"
        >
          <div className="bg-yellow-900 bg-opacity-50 rounded-lg p-3 border border-yellow-600">
            <p className="text-yellow-400 font-medium">💡 Select an answer quickly!</p>
          </div>
        </motion.div>
      )}

      {/* Show correct answer after time up */}
      {showCorrectAnswer && question.answer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-4"
        >
          <div className="bg-blue-900 bg-opacity-50 rounded-lg p-3 border border-blue-600">
            <p className="text-blue-300 font-medium">
              💡 Correct answer: <span className="text-blue-100 font-bold">{question.answer}</span>
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}