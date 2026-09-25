"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type Language = "en" | "si";

const STORAGE_KEY = "ecoloop-language";
const listeners = new Set<() => void>();

function readLanguage(): Language {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "si" ? "si" : "en";
  } catch {
    return "en";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

type LanguageContextValue = {
  language: Language;
  isSi: boolean;
  setLanguage: (language: Language) => void;
  t: (english: string, sinhala: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

// The choice is remembered across pages and visits; the server always renders English first.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribe, readLanguage, () => "en" as Language);

  const setLanguage = useCallback((next: Language) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the change still applies until reload.
    }
    listeners.forEach((listener) => listener());
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, isSi: language === "si", setLanguage, t: (english, sinhala) => (language === "si" ? sinhala : english) }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider.");
  return value;
}

export function LanguageToggle() {
  const { isSi, setLanguage, t } = useLanguage();
  return (
    <button
      type="button"
      className="language-toggle"
      onClick={() => setLanguage(isSi ? "en" : "si")}
      aria-label={t("Switch to Sinhala", "ඉංග්‍රීසි භාෂාවට මාරු වන්න")}
    >
      <span className={!isSi ? "active" : ""}>EN</span>
      <i></i>
      <span className={isSi ? "active" : ""}>සිං</span>
    </button>
  );
}
