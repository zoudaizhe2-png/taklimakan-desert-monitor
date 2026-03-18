import { useState, useEffect } from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import "./ThemeToggle.css";

function getInitialTheme() {
  const stored = localStorage.getItem("theme");
  if (stored) return stored;
  return "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <FiSun size={15} /> : <FiMoon size={15} />}
    </button>
  );
}
