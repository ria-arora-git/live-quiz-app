"use client";
import { motion } from "framer-motion";

export default function NeonBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <motion.div
        animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-r from-neonPink via-purple-600 to-neonCyan opacity-20 bg-[length:200%_200%]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
