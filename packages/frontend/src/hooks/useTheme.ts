// Dark theme CSS variables
// Add this to globals.css or import separately

export const darkThemeTokens = `
[data-theme="dark"] {
  /* Surface & Background */
  --app-canvas: #0f172a;
  --surface-panel: rgba(30, 41, 59, 0.92);
  --surface-raised: rgba(30, 41, 59, 0.98);
  --surface-muted: rgba(51, 65, 85, 0.92);

  /* Border */
  --border-subtle: #334155;
  --border-strong: #475569;

  /* Text */
  --text-strong: #f8fafc;
  --text-muted: #94a3b8;

  /* Accent */
  --accent-strong: #60a5fa;

  /* Focus */
  --focus-ring: rgba(59, 130, 246, 0.3);

  /* Shadows */
  --shadow-soft: 0 24px 48px -34px rgba(0, 0, 0, 0.5);
  --shadow-shell: 0 30px 60px -38px rgba(0, 0, 0, 0.6);
}
`;

/**
 * Hook for managing theme (light/dark mode)
 */
import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setThemeState(stored);
      document.documentElement.setAttribute('data-theme', stored);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    setMounted(true);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme, mounted };
}