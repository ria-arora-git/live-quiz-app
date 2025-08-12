export interface ServerToClientEvents {
  "question": (q: { text: string; options: string[] }) => void;
  "leaderboard-update": (data: any) => void;
  "user-joined": (user: any) => void;
}

export interface ClientToServerEvents {
  "join-room": (data: { roomCode: string; user: any }) => void;
  "submit-answer": (data: { roomCode: string; userId: string; score: number }) => void;
}
