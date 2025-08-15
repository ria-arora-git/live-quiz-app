"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import NeonButton from "./NeonButton";

interface AddQuestionFormProps {
  roomId: string;
  onAdded: (question: any) => void;
}

export default function AddQuestionForm({ roomId, onAdded }: AddQuestionFormProps) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parsePastedInput = useCallback((value: string) => {
    if (!value?.trim()) return;
    
    const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
    
    if ((lines?.length ?? 0) >= 2) {
      // Extract question (remove question number if present)
      let questionLine = (lines[0] || "").replace(/^\d+\.\s*/, "");
      setText(questionLine);

      const parsedOptions: string[] = [];
      let correctAnswer = "";

      for (let i = 1; i < (lines?.length ?? 0) && parsedOptions.length < 4; i++) {
        const opt = lines[i] || "";

        // Match "A) something", "B ) something", etc.
        const match = opt.match(/^[A-Z]\)\s*(.+)$/i);
        if (match) {
          let optionText = (match[1] || "").trim();
          
          // Check for correct answer marker
          if (optionText.includes("✅") || optionText.includes("*")) {
            optionText = optionText.replace(/[✅*]/g, "").trim();
            correctAnswer = optionText;
          }
          
          parsedOptions.push(optionText);
        } else {
          // If no A) format, treat as regular option
          let optionText = opt;
          if (optionText.includes("✅") || optionText.includes("*")) {
            optionText = optionText.replace(/[✅*]/g, "").trim();
            correctAnswer = optionText;
          }
          parsedOptions.push(optionText);
        }
      }

      // Fill remaining options
      while (parsedOptions.length < 4) {
        parsedOptions.push("");
      }

      setOptions(parsedOptions);
      if (correctAnswer) {
        setAnswer(correctAnswer);
      }
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const validOptions = (options || []).filter(opt => opt?.trim());
    const optionsLength = validOptions?.length ?? 0;
    
    if (!text?.trim()) {
      setError("Please enter a question");
      return;
    }
    
    if (optionsLength < 2) {
      setError("Please provide at least 2 options");
      return;
    }
    
    if (!answer?.trim()) {
      setError("Please select the correct answer");
      return;
    }
    
    if (!validOptions.includes(answer?.trim())) {
      setError("The correct answer must be one of the options");
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch("/api/question/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          roomId, 
          text: text.trim(), 
          options: validOptions, 
          answer: answer.trim() 
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to add question" }));
        throw new Error(errorData.error || "Failed to add question");
      }
      
      const result = await res.json();
      if (result?.question) {
        onAdded(result.question);
        
        // Reset form
        setText("");
        setOptions(["", "", "", ""]);
        setAnswer("");
        setError("");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add question";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [roomId, text, options, answer, onAdded]);

  const updateOption = useCallback((index: number, value: string) => {
    if (index < 0 || index >= 4) return;
    
    setOptions(prev => {
      const newOptions = [...(Array.isArray(prev) ? prev : ["", "", "", ""])];
      newOptions[index] = value;
      return newOptions;
    });
  }, []);

  const optionsArray = Array.isArray(options) ? options : ["", "", "", ""];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-lg p-6 border border-gray-700"
    >
      <h3 className="text-xl font-bold mb-4 text-neonPink">Add New Question</h3>
      
      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-3 mb-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Question Text
          </label>
          <textarea
            placeholder="Enter your question here... (or paste formatted text with A) B) options)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const paste = e.clipboardData?.getData("text") || "";
              if (paste.includes("A)") || paste.includes("✅") || paste.includes("*")) {
                e.preventDefault();
                parsePastedInput(paste);
              }
            }}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-neonPink focus:outline-none resize-none"
            rows={3}
            disabled={loading}
          />
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Answer Options
          </label>
          <div className="space-y-3">
            {optionsArray.map((option, index) => (
              <div key={index} className="flex gap-3 items-center">
                <span className="text-sm text-gray-400 w-8">
                  {String.fromCharCode(65 + index)})
                </span>
                <input
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option || ""}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-neonPink focus:outline-none"
                  disabled={loading}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="correct"
                    checked={answer === option && !!option?.trim()}
                    onChange={() => setAnswer(option || "")}
                    className="text-neonPink focus:ring-neonPink"
                    disabled={loading || !option?.trim()}
                  />
                  <span className="text-xs text-gray-400">Correct</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <NeonButton
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            {loading ? "Adding Question..." : "Add Question"}
          </NeonButton>
        </div>
      </form>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-900 bg-opacity-20 border border-blue-600 rounded-lg">
        <p className="text-blue-300 text-xs">
          💡 <strong>Pro tip:</strong> You can paste formatted questions! Use format like:
          <br />
          "What is 2+2? A) 3 B) 4 ✅ C) 5 D) 6" 
          <br />
          Mark correct answers with ✅ or *
        </p>
      </div>
    </motion.div>
  );
}