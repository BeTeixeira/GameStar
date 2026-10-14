import React, { createContext, useContext, useState, useMemo } from "react";
import { palette, ThemeColors, ThemeName } from "./colors";

type ThemeContextValue = {
  theme: ThemeName;
  colors: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Tema inicial do app. Troque para "light" se quiser abrir no tema claro.
  const [theme, setTheme] = useState<ThemeName>("dark");

  const value = useMemo(
    () => ({
      theme,
      colors: palette[theme],
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Hook usado em todas as telas/componentes para acessar as cores atuais:
// const { colors, theme, toggleTheme } = useAppTheme();
export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme precisa estar dentro de <ThemeProvider>");
  return ctx;
}
