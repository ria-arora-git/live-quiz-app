module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neonPink: "#ff00de",
        neonCyan: "#00ffff",
      },
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
      },
      animation: {
        'flicker': 'flicker 2s infinite alternate',
      },
      keyframes: {
        flicker: {
          '0%, 18%, 22%, 25%, 53%, 57%, 100%': { opacity: '1' },
          '20%, 24%, 55%': { opacity: '0.4' },
        }
      }
    },
  },
  plugins: [],
};
