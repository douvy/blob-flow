/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#131720",
        container: "#0e0f11",
        titleText: "#f0f0f0",
        bodyText: "#b8bdc7",
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(50, 60, 80, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 60, 80, 0.15) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid-size': "20px 20px",
      },
    },
  },
  plugins: [],
}