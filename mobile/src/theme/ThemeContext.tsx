import React, { createContext, useContext } from "react";
import { palette, ThemeColors } from "./colors";

type ThemeContextValue = {
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue>({ colors: palette });

// O app tem um único tema (veja src/theme/colors.ts); o provider foi mantido
// para que todas as telas continuem usando o mesmo hook.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={{ colors: palette }}>{children}</ThemeContext.Provider>;
}

// Hook usado em todas as telas/componentes para acessar as cores:
// const { colors } = useAppTheme();
export function useAppTheme() {
  return useContext(ThemeContext);
}
