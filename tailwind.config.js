/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        banco: {
          rojo: "#e53935",
          naranja: "#f57c00",
          amarillo: "#ffca28"
        },
        pastel: {
          rosa: "#ffd1dc",
          celeste: "#c8e7ff",
          menta: "#c3f0ca",
          lila: "#e5d4ff"
        }
      },
      boxShadow: {
        soft: "0 15px 40px rgba(0,0,0,0.08)"
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem"
      }
    }
  },
  plugins: []
};
