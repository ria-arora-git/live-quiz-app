"use client";
import QuizTimer from "./QuizTimer";
import { useState } from "react";

export default function QuizQuestion({ question, timeLimit, onAnswer }) {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <h2 className="text-xl font-semibold">{question.text}</h2>
      <QuizTimer
        seconds={timeLimit}
        onTimeUp={() => onAnswer(selected, 0)}
      />
      <div className="mt-4">
        {question.options.map((opt) => (
          <button
            key={opt}
            onClick={() => setSelected(opt)}
            className={`block p-2 border rounded mt-2 ${
              selected === opt ? "bg-blue-500 text-white" : ""
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <button
        onClick={() => onAnswer(selected)}
        disabled={!selected}
        className="mt-4 bg-green-500 px-4 py-2 text-white rounded disabled:bg-gray-400"
      >
        Submit Answer
      </button>
    </div>
  );
}
