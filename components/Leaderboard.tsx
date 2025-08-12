"use client";
import { useEffect, useState } from "react";

interface LeaderboardEntry {
  id: string;
  user: { name: string };
  dailyScore: number;
  allTimeScore: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      const res = await fetch("/api/rooms/leaderboard");
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    }
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-black bg-opacity-70 rounded-lg shadow-lg">
      <h2 className="text-2xl neon-text mb-4">Leaderboard</h2>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th>#</th><th>Name</th><th>Daily</th><th>All-Time</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-gray-400 py-4">No scores yet</td>
            </tr>
          )}
          {entries.map((e, i) => (
            <tr key={e.id} className="odd:bg-gray-800/50">
              <td>{i + 1}</td>
              <td>{e.user.name}</td>
              <td>{e.dailyScore}</td>
              <td>{e.allTimeScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
