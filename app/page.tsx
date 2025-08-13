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
        {/* Header */}
        <div className="absolute top-6 right-6">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <div className="flex gap-4">
              <Link href="/sign-in">
                <NeonButton className="text-sm px-4 py-2">
                  Sign In
                </NeonButton>
              </Link>
              <Link href="/sign-up">
                <NeonButton className="text-sm px-4 py-2 bg-neonCyan text-black">
                  Sign Up
                </NeonButton>
              </Link>
            </div>
          </SignedOut>
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center justify-center min-h-screen gap-8 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h1 className="text-6xl md:text-8xl neon-text flicker mb-4 font-bold">
              Quiz Arena
            </h1>
            <p className="text-lg md:text-2xl text-gray-200 mb-8 max-w-3xl leading-relaxed">
              Compete in real-time quizzes, climb the leaderboard, and prove your knowledge 
              in the ultimate multiplayer quiz experience.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-4"
          >
            <SignedIn>
              <Link href="/dashboard">
                <NeonButton className="text-xl px-8 py-4">
                  Enter Arena
                </NeonButton>
              </Link>
            </SignedIn>
            
            <SignedOut>
              <div className="space-y-4">
                <Link href="/sign-up">
                  <NeonButton className="text-xl px-8 py-4">
                    Join the Arena
                  </NeonButton>
                </Link>
                <p className="text-gray-400">
                  Already have an account?{" "}
                  <Link href="/sign-in" className="text-neonCyan hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            </SignedOut>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl"
          >
            <div className="bg-white bg-opacity-5 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-10">
              <h3 className="text-neonPink text-xl font-bold mb-2">Real-time Competition</h3>
              <p className="text-gray-300 text-sm">
                Compete with players worldwide in live quiz sessions
              </p>
            </div>
            <div className="bg-white bg-opacity-5 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-10">
              <h3 className="text-neonCyan text-xl font-bold mb-2">Live Leaderboards</h3>
              <p className="text-gray-300 text-sm">
                Track your progress with dynamic rankings and scores
              </p>
            </div>
            <div className="bg-white bg-opacity-5 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-10">
              <h3 className="text-neonPink text-xl font-bold mb-2">Custom Quizzes</h3>
              <p className="text-gray-300 text-sm">
                Create your own quiz rooms and challenge your friends
              </p>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-gray-400 text-sm absolute bottom-6"
          >
            Made with ❤️ by Ria | ACM
          </motion.p>
        </div>
      </div>
    </NeonBackground>
  );
}
