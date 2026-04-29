/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-background": "#271819",
        "on-tertiary-container": "#f6fff4",
        "surface-dim": "#efd3d5",
        "primary-fixed": "#ffdadb",
        "on-surface": "#271819",
        "on-primary-fixed-variant": "#91002d",
        "on-error": "#ffffff",
        "secondary-container": "#fd8895",
        background: "#fff8f7",
        "primary-container": "#da3054",
        "outline-variant": "#e2bec0",
        "secondary-fixed-dim": "#ffb2b8",
        "primary-fixed-dim": "#ffb2b8",
        "surface-container-high": "#fee1e3",
        "tertiary-fixed-dim": "#5bde8d",
        "on-tertiary": "#ffffff",
        "on-primary-container": "#fffbff",
        "on-error-container": "#93000a",
        "on-secondary-fixed-variant": "#7f2736",
        "inverse-primary": "#ffb2b8",
        error: "#ba1a1a",
        "inverse-on-surface": "#ffeced",
        outline: "#8e6f71",
        "on-primary": "#ffffff",
        secondary: "#9e3e4c",
        "inverse-surface": "#3d2c2d",
        "surface-container": "#ffe9e9",
        "on-surface-variant": "#5a4042",
        "on-secondary": "#ffffff",
        "surface-container-low": "#fff0f0",
        "tertiary-fixed": "#7afca7",
        "on-tertiary-fixed-variant": "#00522a",
        "on-secondary-fixed": "#40000f",
        "on-secondary-container": "#75202f",
        primary: "#b60e3d",
        surface: "#fff8f7",
        "tertiary-container": "#008649",
        "surface-variant": "#f8dcdd",
        tertiary: "#006a39",
        "secondary-fixed": "#ffdadb",
        "error-container": "#ffdad6",
        "surface-bright": "#fff8f7",
        "on-tertiary-fixed": "#00210e",
        "surface-container-lowest": "#ffffff",
        "surface-container-highest": "#f8dcdd",
        "surface-tint": "#ba1340",
        "on-primary-fixed": "#40000f"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px"
      },
      fontFamily: {
        headline: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Manrope", "sans-serif"],
        label: ["Manrope", "sans-serif"]
      }
    }
  }
};
