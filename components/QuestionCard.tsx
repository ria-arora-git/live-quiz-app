"use client";

export default function QuestionCard({
  question,
  onAnswer
}: {
  question: { text: string; options: string[] };
  onAnswer: (index: number) => void;
}) {
  return (
    <div className="p-6 bg-black bg-opacity-60 rounded-lg shadow-lg max-w-lg mx-auto">
      <h2 className="text-2xl neon-text text-center mb-4">{question.text}</h2>
      <div className="grid grid-cols-2 gap-4">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i)}
            className="bg-neonCyan text-black font-bold py-3 px-4 rounded hover:bg-cyan-300 transition"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
