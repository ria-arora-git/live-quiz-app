"use client";

import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/types/quiz";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  title?: string;
  showRanks?: boolean;
  maxEntries?: number;
}

export default function Leaderboard({
  entries,
  title = "Leaderboard",
  showRanks = true,
  maxEntries = 10,
}: LeaderboardProps) {
  const sortedEntries = [...entries]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxEntries);

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "text-yellow-400";
      case 2: return "text-gray-300";
      case 3: return "text-amber-600";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-600 shadow-xl">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-center mb-6 text-neonCyan"
      >
        🏆 {title}
      </motion.h2>

      {sortedEntries.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4 opacity-50">📊</div>
          <p className="text-gray-400">No scores available yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEntries.map((entry, index) => {
            const rank = index + 1;
            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  flex items-center justify-between p-4 rounded-lg border transition-all
                  ${
                    rank <= 3
                      ? "bg-gradient-to-r from-yellow-900 to-yellow-800 border-yellow-600"
                      : "bg-gray-800 border-gray-700 hover:border-gray-600"
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  {showRanks && (
                    <div className={`text-2xl font-bold ${getRankColor(rank)} min-w-[60px] text-center`}>
                      {getRankEmoji(rank)}
                    </div>
                  )}

                  {/* Player Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-r from-neonPink to-neonCyan rounded-full flex items-center justify-center text-black font-bold text-lg">
                    {(entry.name || "A").charAt(0).toUpperCase()}
                  </div>

                  {/* Player Info */}
                  <div>
                    <p className="font-bold text-white text-lg">
                      {entry.name || "Anonymous"}
                    </p>
                    {entry.dailyScore !== undefined && entry.allTimeScore !== undefined && (
                      <p className="text-sm text-gray-400">
                        Daily: {entry.dailyScore} • All-time: {entry.allTimeScore}
                      </p>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-neonCyan">
                    {entry.score}
                  </div>
                  <div className="text-sm text-gray-400">points</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {entries.length > maxEntries && (
        <div className="text-center mt-4 text-gray-400 text-sm">
          Showing top {maxEntries} of {entries.length} participants
        </div>
      )}
    </div>
  );
}
