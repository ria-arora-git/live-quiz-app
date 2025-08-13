import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function calculateScore(isCorrect: boolean, timeLeft: number, maxTime: number): number {
  if (!isCorrect) return 0;
  const baseScore = 100;
  const timeBonus = Math.floor((timeLeft / maxTime) * 50);
  return baseScore + timeBonus;
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}
