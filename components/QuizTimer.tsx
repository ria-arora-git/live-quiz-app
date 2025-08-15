"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface QuizTimerProps {
  seconds: number;
  onTimeUp: () => void;
}

export default function QuizTimer({ seconds, onTimeUp }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    setTimeLeft(seconds);
    setIsWarning(false);
  }, [seconds]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    if (timeLeft <= 10) {
      setIsWarning(true);
    }

    const timer = setTimeout(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, onTimeUp]);

  const progress = (timeLeft / seconds) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const remainingSeconds = timeLeft % 60;

  return (
    <div className="relative">
      {/* Circular Progress */}
      <div className="relative w-24 h-24 mx-auto mb-4">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(75, 85, 99, 0.3)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isWarning ? "#EF4444" : "#00FFFF"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>
        
        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={isWarning ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: isWarning ? Infinity : 0 }}
            className={`text-2xl font-bold ${
              isWarning ? "text-red-400" : "text-neonCyan"
            }`}
          >
            {minutes}:{remainingSeconds.toString().padStart(2, '0')}
          </motion.div>
        </div>
      </div>

      {/* Warning text */}
      {isWarning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-red-400 font-medium"
        >
          ⚠️ Time running out!
        </motion.div>
      )}

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-all duration-1000 ${
            isWarning ? "bg-red-500" : "bg-neonCyan"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}