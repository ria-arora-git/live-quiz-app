"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import NeonBackground from "@/components/NeonBackground";
import NeonButton from "@/components/NeonButton";

export default function HomePage() {
  return (
    <NeonBackground>
      <div className="relative z-10">
        <div className="absolute top-6 right-6">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <div className="flex gap-4">
              <Link href="/sign-in">
                <NeonButton className="text-sm px-4 py-2">Sign In</NeonButton>
              </Link>
              <Link href="/sign-up">
                <NeonButton className="text-sm px-4 py-2">Sign Up</NeonButton>
              </Link>
            </div>
          </SignedOut>
        </div>

        <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center px-4">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-6xl md:text-8xl neon-text flicker mb-4"
          >
            Quizz Now! Arena
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-2xl text-gray-200 mb-8 max-w-2xl"
          >
            Compete in real-time quizzes, ace the leaderboard and get browney points & treats from ACM.
          </motion.p>
          
          <SignedIn>
            <Link href="/dashboard">
              <NeonButton>Enter Dashboard</NeonButton>
            </Link>
          </SignedIn>
          
          <SignedOut>
            <Link href="/sign-up">
              <NeonButton>Get Started</NeonButton>
            </Link>
          </SignedOut>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-gray-200  max-w-2xl bottom-2 absolute"
          >
            Made by Ria | ACM | 
          </motion.p>
        </div>
      </div>
    </NeonBackground>
  );
}
