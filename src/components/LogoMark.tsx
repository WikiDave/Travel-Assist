/**
 * Het beeldmerk: trein van voren op een oranje tegel. Inline, zodat het altijd scherp is
 * en de rand in de donkere modus de lichte inktkleur volgt (zoals andere kaarten).
 */
export function LogoMark({ size = 30 }: { size?: number }) {
  const ink = '#1d1c19';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logo-mark">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="var(--accent)" stroke="var(--ink)" strokeWidth="3" />
      <rect x="17" y="9" width="30" height="37" rx="9" fill="#fbf9f3" stroke={ink} strokeWidth="3" />
      <rect x="21.5" y="14.5" width="21" height="12" rx="3.5" fill={ink} />
      <path d="M26 24.5L31 16.5" stroke="#dcf16e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24.5" cy="36.5" r="3.2" fill="#dcf16e" stroke={ink} strokeWidth="2.2" />
      <circle cx="39.5" cy="36.5" r="3.2" fill="#dcf16e" stroke={ink} strokeWidth="2.2" />
      <path d="M22 46L18 54M42 46L46 54M12 55H52" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
