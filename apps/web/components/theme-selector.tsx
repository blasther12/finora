"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const themes = [
  { value: "light", label: "Claro", description: "Sempre usa o tema claro" },
  { value: "dark", label: "Escuro", description: "Sempre usa o tema escuro" },
  {
    value: "system",
    label: "Sistema",
    description: "Acompanha a preferência do dispositivo",
  },
] as const;

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="theme-options" aria-hidden="true" />;
  }

  return (
    <div
      className="theme-options"
      role="radiogroup"
      aria-label="Tema da interface"
    >
      {themes.map((option) => (
        <button
          aria-checked={theme === option.value}
          className={`theme-option ${theme === option.value ? "theme-option-active" : ""}`}
          key={option.value}
          onClick={() => setTheme(option.value)}
          role="radio"
          type="button"
        >
          <span className={`theme-preview theme-preview-${option.value}`}>
            <i />
            <b />
          </span>
          <strong>{option.label}</strong>
          <small>{option.description}</small>
        </button>
      ))}
    </div>
  );
}
