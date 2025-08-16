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
  // FIXED: Comprehensive array safety checks
  const validateEntry = (entry: any): entry is LeaderboardEntry => {
    return (
      entry &&
      typeof entry === 'object' &&
      typeof entry.userId === 'string' &&
      entry.userId.length > 0 &&
      typeof entry.name === 'string' &&
      typeof entry.score === 'number'
    );
  };

  // FIXED: Safe array handling with proper filtering and validation
  const safeEntries = (() => {
    // First check if entries is actually an array
    if (!Array.isArray(entries)) {
      console.warn("Leaderboard: entries is not an array:", typeof entries, entries);
      return [];
    }

    // Filter and validate each entry
    const validEntries = entries.filter(validateEntry);
    
    if (validEntries.length !== entries.length) {
      console.warn("Leaderboard: Some entries were invalid and filtered out", {
        original: entries.length,
        valid: validEntries.length
      });
    }

    return validEntries;
  })();
  
  // FIXED: Safe sorting and slicing operations
  const sortedEntries = safeEntries
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, Math.max(1, maxEntries)); // Ensure maxEntries is at least 1

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
            // FIXED: Extra safety check for each entry during render
            if (!validateEntry(entry)) {
              console.warn("Invalid entry during render:", entry);
              return null;
            }

            const {
              userId,
              name,
              score,
              dailyScore,
              allTimeScore
            } = entry;
            
            const rank = index + 1;
            const displayName = name || "Anonymous";
            const initial = displayName.charAt(0).toUpperCase() || "?";
            const safeScore = typeof score === 'number' ? score : 0;
            
            return (
              <motion.div
                key={userId}
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
                    {(typeof dailyScore === 'number' || typeof allTimeScore === 'number') && (
                      <p className="text-sm text-gray-400">
                        {typeof dailyScore === 'number' && (
                          <span>Daily: {dailyScore}</span>
                        )}
                        {typeof dailyScore === 'number' && typeof allTimeScore === 'number' && (
                          <span className="mx-1">•</span>
                        )}
                        {typeof allTimeScore === 'number' && (
                          <span>All-time: {allTimeScore}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-neonCyan">
                    {safeScore.toLocaleString()}
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
          }).filter(Boolean)} {/* Filter out any null entries */}
        </div>
      )}

      {/* Show count if truncated */}
      {safeEntries.length > maxEntries && (
        <div className="text-center mt-4 text-gray-400 text-sm">
          Showing top {maxEntries} of {safeEntries.length} participants
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-600 mt-4 text-center">
          Debug: {safeEntries.length} valid entries from {Array.isArray(entries) ? entries.length : 'invalid'} total
        </div>
      )}
    </div>
  );
}