"use client";
import { useEffect, useState } from "react";

export default function QuizTimer({ seconds, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  return (
    <div className="text-2xl font-bold text-red-500">
      Time Left: {timeLeft}s
    </div>
  );
}
