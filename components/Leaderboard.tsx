"use client";

import { motion } from "framer-motion";

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank?: number;
  dailyScore?: number;
  allTimeScore?: number;
}

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
  // Safely handle entries array
  const safeEntries = Array.isArray(entries) ? entries : [];
  
  const sortedEntries = safeEntries
    .filter(entry => entry && typeof entry === 'object')
    .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0))
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

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1: return "from-yellow-900 to-yellow-800 border-yellow-600";
      case 2: return "from-gray-700 to-gray-600 border-gray-500";
      case 3: return "from-amber-900 to-amber-800 border-amber-600";
      default: return "from-gray-800 to-gray-700 border-gray-600";
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
            // Safely extract entry data with fallbacks
            const {
              userId = "",
              name = "Anonymous",
              score = 0,
              dailyScore,
              allTimeScore
            } = entry || {};
            
            const rank = index + 1;
            const displayName = name || "Anonymous";
            const initial = displayName.charAt(0).toUpperCase();
            
            return (
              <motion.div
                key={userId || `entry-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  flex items-center justify-between p-4 rounded-lg border transition-all
                  bg-gradient-to-r ${getRankBgColor(rank)}
                  hover:scale-[1.02] hover:shadow-lg
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
                  <div className="w-12 h-12 bg-gradient-to-r from-neonPink to-neonCyan rounded-full flex items-center justify-center text-black font-bold text-lg shadow-lg">
                    {initial}
                  </div>

                  {/* Player Info */}
                  <div>
                    <p className="font-bold text-white text-lg">
                      {displayName}
                    </p>
                    {(dailyScore !== undefined || allTimeScore !== undefined) && (
                      <p className="text-sm text-gray-400">
                        {dailyScore !== undefined && (
                          <span>Daily: {dailyScore}</span>
                        )}
                        {dailyScore !== undefined && allTimeScore !== undefined && (
                          <span className="mx-1">•</span>
                        )}
                        {allTimeScore !== undefined && (
                          <span>All-time: {allTimeScore}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-neonCyan">
                    {score.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">points</div>
                </div>

                {/* Rank Badge for Top 3 */}
                {rank <= 3 && (
                  <div className="absolute top-2 right-2">
                    <div className={`w-6 h-6 rounded-full ${
                      rank === 1 ? 'bg-yellow-500' : 
                      rank === 2 ? 'bg-gray-400' : 'bg-amber-600'
                    } flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">{rank}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Show count if truncated */}
      {safeEntries.length > maxEntries && (
        <div className="text-center mt-4 text-gray-400 text-sm">
          Showing top {maxEntries} of {safeEntries.length} participants
        </div>
      )}

      {/* Empty state for specific conditions */}
      {safeEntries.length > 0 && sortedEntries.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4 opacity-50">⚠️</div>
          <p className="text-gray-400">Unable to display scores</p>
        </div>
      )}
    </div>
  );
}