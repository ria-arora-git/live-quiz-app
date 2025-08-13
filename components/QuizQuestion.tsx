"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Question } from "@/types/quiz";

interface QuizQuestionProps {
  question: Question;
  onAnswer: (selectedOption: string, timeLeft?: number) => void;
  disabled?: boolean;
  selectedAnswer?: string | null;
}

export default function QuizQuestion({
  question,
  onAnswer,
  disabled = false,
  selectedAnswer,
}: QuizQuestionProps) {
  const [selected, setSelected] = useState<string | null>(selectedAnswer || null);
  const [submitted, setSubmitted] = useState(false);

  const handleOptionSelect = (option: string) => {
    if (disabled || submitted) return;
    setSelected(option);
  };

  const handleSubmit = () => {
    if (!selected || disabled || submitted) return;
    setSubmitted(true);
    onAnswer(selected);
  };

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
            whileHover={!disabled && !submitted ? { scale: 1.02 } : {}}
            whileTap={!disabled && !submitted ? { scale: 0.98 } : {}}
            onClick={() => handleOptionSelect(option)}
            disabled={disabled || submitted}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200 font-medium text-left
              ${
                selected === option
                  ? "border-neonPink bg-neonPink bg-opacity-20 text-white shadow-lg"
                  : "border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-700 text-gray-300"
              }
              ${disabled || submitted ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center
                ${selected === option ? "border-neonPink bg-neonPink" : "border-gray-500"}
              `}>
                {selected === option && (
                  <div className="w-2 h-2 bg-black rounded-full" />
                )}
              </div>
              <span className="flex-1">{option}</span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Submit Button */}
      <div className="text-center">
        <motion.button
          whileHover={selected && !disabled && !submitted ? { scale: 1.05 } : {}}
          whileTap={selected && !disabled && !submitted ? { scale: 0.95 } : {}}
          onClick={handleSubmit}
          disabled={!selected || disabled || submitted}
          className={`
            px-8 py-3 rounded-lg font-bold text-lg transition-all duration-200
            ${
              selected && !disabled && !submitted
                ? "bg-neonCyan text-black hover:bg-cyan-400 shadow-lg"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          {submitted ? "Answer Submitted!" : "Submit Answer"}
        </motion.button>
      </div>

      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-4 text-green-400 font-medium"
        >
          ✓ Your answer has been recorded
        </motion.div>
      )}
    </div>
  );
}
