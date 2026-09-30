import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";
  const label = darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700 dark:hover:text-amber-200"
      aria-label={label}
      aria-pressed={darkMode}
      title={label}
    >
      {darkMode ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
