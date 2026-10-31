import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyTheme, onStoredThemeChange, onSystemThemeChange, storeTheme, storedTheme, systemTheme, type Theme } from './theme';

export interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const Context = createContext<ThemeState | null>(null);

export function ThemeProvider({ initial, children }: { initial: Theme; children: ReactNode }): React.JSX.Element {
  const [theme, setThemeState] = useState<Theme>(initial);
  const picked = useRef(false);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const stopSystem = onSystemThemeChange((next) => {
      if (!picked.current) setThemeState(next);
    });
    const stopStored = onStoredThemeChange((next) => {
      picked.current = true;
      setThemeState(next);
    });
    const stored = storedTheme();
    if (stored !== null) {
      picked.current = true;
      setThemeState(stored);
    } else if (!picked.current) {
      setThemeState(systemTheme());
    }
    return () => {
      stopSystem();
      stopStored();
    };
  }, []);

  const value = useMemo<ThemeState>(
    () => ({
      theme,
      setTheme: (next) => {
        picked.current = true;
        storeTheme(next);
        setThemeState(next);
      },
    }),
    [theme],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTheme(): ThemeState {
  const value = useContext(Context);
  if (value === null) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
