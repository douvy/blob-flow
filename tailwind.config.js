/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'gt-flexa': ['GT Flexa', 'sans-serif'],
        'windsor-bold': ['Windsor Bold', 'serif'],
      },
      colors: {
        background: "#131720",
        container: "#0e0f11",
        titleText: "#f0f0f0",
        bodyText: "#f1f2f4",
        divider: "#20252c",
        blue: "#4D7DBF"
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