"use client";
import { motion } from "framer-motion";

export default function AnimatedCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="bg-white bg-opacity-5 backdrop-blur-lg rounded-lg border border-white border-opacity-10 p-6 shadow-lg"
    >
      <h3 className="text-2xl neon-text mb-2">{title}</h3>
      <p className="text-gray-300 mb-4">{description}</p>
      {children}
    </motion.div>
  );
}
