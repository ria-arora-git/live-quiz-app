"use client";

import { useState } from "react";

interface AddQuestionFormProps {
  roomId: string;
  onAdded: (question: any) => void;
}

export default function AddQuestionForm({ roomId, onAdded }: AddQuestionFormProps) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [answer, setAnswer] = useState("");

  const parsePastedInput = (value: string) => {

    const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);

    if (lines.length >= 2) {

      let questionLine = lines[0].replace(/^\d+\.\s*/, "");
      setText(questionLine);

      const parsedOptions: string[] = [];
      let correctAnswer = "";

      for (let i = 1; i < lines.length; i++) {
        const opt = lines[i];

        // Match "A) something", "B ) something" etc.
        const match = opt.match(/^[A-Z]\)\s*(.+)$/i);
        if (match) {
          let optionText = match[1].trim();
          if (optionText.includes("✅")) {
            optionText = optionText.replace("✅", "").trim();
            correctAnswer = optionText;
          }
          parsedOptions.push(optionText);
        }
      }

      // Fill the options and correct answer
      for (let i = 0; i < 4; i++) {
        parsedOptions[i] = parsedOptions[i] || "";
      }

      setOptions(parsedOptions);
      if (correctAnswer) setAnswer(correctAnswer);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text || options.length < 2 || !answer) {
      alert("Please enter question, at least 2 options and correct answer");
      return;
    }
    const res = await fetch("/api/question/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, text, options, answer }),
    });
    if (res.ok) {
      const newQuestion = await res.json();
      onAdded(newQuestion);
      setText("");
      setOptions(["", "", "", ""]);
      setAnswer("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        placeholder="Paste question text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => {
          const paste = e.clipboardData.getData("text");
          if (paste.includes("A)") && paste.match(/✅/)) {
            e.preventDefault();
            parsePastedInput(paste);
          }
        }}
        className="w-full bg-gray-900 p-2 rounded border border-gray-700 text-white"
        rows={3}
      />
      {options.map((opt, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder={`Option ${idx + 1}`}
            value={opt}
            onChange={(e) => {
              const copy = [...options];
              copy[idx] = e.target.value;
              setOptions(copy);
            }}
            className="flex-1 bg-gray-900 p-2 rounded border border-gray-700 text-white"
          />
          <input
            type="radio"
            name="correct"
            checked={answer === opt && !!opt}
            onChange={() => setAnswer(opt)}
          />
        </div>
      ))}
      <button
        type="submit"
        className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded"
      >
        Add Question
      </button>
    </form>
  );
}
