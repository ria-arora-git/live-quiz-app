"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NeonButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export default function NeonButton({
  children,
  onClick,
  disabled = false,
  className = "",
  type = "button",
}: NeonButtonProps) {
  return (
    <motion.button
      whileHover={!disabled ? { 
        scale: 1.05, 
        boxShadow: "0 0 25px rgba(255, 0, 222, 0.6)" 
      } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={cn(
        "px-6 py-3 font-bold text-black bg-neonPink rounded-lg shadow-lg transition-all duration-200",
        "hover:bg-pink-600 hover:shadow-neonPink focus:outline-none focus:ring-2 focus:ring-neonPink focus:ring-opacity-50",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
