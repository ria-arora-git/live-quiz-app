"use client";
import { motion } from "framer-motion";

export default function NeonButton({
  children,
  onClick,
  className = ""
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, boxShadow: "0 0 20px #ff00de" }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`px-6 py-3 font-bold text-black bg-neonPink rounded shadow-lg hover:bg-pink-600 transition ${className}`}
    >
      {children}
    </motion.button>
  );
}
