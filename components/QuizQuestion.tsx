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
}

export default function QuizQuestion({
  question,
  onAnswer,
  disabled = false,
  timeLeft = 0,
}: QuizQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
    setIsSubmitting(false);
  }, [question.id]);

  const handleOptionSelect = (option: string) => {
    if (disabled || submitted || isSubmitting) return;
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

  // Auto-submit when time runs out if an option is selected and not submitted yet
  useEffect(() => {
    if (timeLeft <= 0 && selected && !submitted && !isSubmitting) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, selected, submitted, isSubmitting]);

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
        {question.options.map((option, index) => (
          <motion.button
            key={index}
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
                selected === option
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
                  ${selected === option ? "border-neonPink bg-neonPink text-black" : "border-gray-500 text-gray-400"}
                `}
              >
                {String.fromCharCode(65 + index)}
              </div>

              {/* Option Text */}
              <span className="flex-1">{option}</span>

              {/* Selection Indicator */}
              {selected === option && (
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
        ))}
      </div>

      {/* Submit Button */}
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
    </div>
  );
}
