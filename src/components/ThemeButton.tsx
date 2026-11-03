import { cycleTheme, THEME_LABEL, useTheme, type ThemeChoice } from '../lib/theme';

/** Kleine icoontjes in de tekstkleur: half-gevulde cirkel, zon en maan. */
export function ThemeIcon({ theme }: { theme: ThemeChoice }) {
  const common = { width: 14, height: 14, viewBox: '0 0 16 16', 'aria-hidden': true } as const;
  if (theme === 'light') {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
      </svg>
    );
  }
  if (theme === 'dark') {
    return (
      <svg {...common} fill="currentColor">
        <path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor" />
    </svg>
  );
}

/** Wisselt tussen automatisch (volgt het apparaat), licht en donker. */
export function ThemeButton() {
  const theme = useTheme();
  return (
    <button type="button" className="theme-btn" onClick={cycleTheme}
      title={`Thema: ${THEME_LABEL[theme]} — klik om te wisselen`} aria-label={`Thema: ${THEME_LABEL[theme]}. Klik om te wisselen.`}>
      <ThemeIcon theme={theme} /> {THEME_LABEL[theme]}
    </button>
  );
}
