/**
 * Het beeldmerk: trein en vliegtuig op een oranje tegel (vereenvoudigde versie voor klein formaat).
 * Inline, zodat het altijd scherp is en de tegelrand in de donkere modus de lichte inktkleur volgt.
 */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logo-mark">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="var(--accent)" stroke="var(--ink)" strokeWidth="3" />
      <g transform="translate(-1 14.5) scale(0.76)">
      <rect x="17" y="9" width="30" height="37" rx="9" fill="#fbf9f3" stroke="#1d1c19" strokeWidth="3.8"/>
      <rect x="21.5" y="14.5" width="21" height="12" rx="3.5" fill="#1d1c19"/>
      <circle cx="24.5" cy="36.5" r="3.4" fill="#dcf16e" stroke="#1d1c19" strokeWidth="2.2"/>
      <circle cx="39.5" cy="36.5" r="3.4" fill="#dcf16e" stroke="#1d1c19" strokeWidth="2.2"/>
      <path d="M22 46L18 54M42 46L46 54M12 55H52" stroke="#1d1c19" strokeWidth="3.8" strokeLinecap="round"/>
      </g>
      <g transform="translate(47.5 15.5) rotate(45) scale(0.45) translate(-32 -32)">
      <path d="M32 7C34.2 7 35.5 9.5 35.5 13L35.5 25L55 36L55 40.5L35.5 35L35.5 47L42 52L42 55.5L32 52.5L22 55.5L22 52L28.5 47L28.5 35L9 40.5L9 36L28.5 25L28.5 13C28.5 9.5 29.8 7 32 7Z" fill="#fbf9f3" stroke="#1d1c19" strokeWidth="6.67" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}
