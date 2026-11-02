/** The brand mark: a double check, stroked in the current text colour unless a colour is given. */
export function Check({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  const h = Math.round((size * 22) / 34);
  return (
    <svg aria-hidden="true" width={size} height={h} viewBox="0 0 34 22" fill="none" stroke={color} strokeWidth="4" strokeLinecap="square">
      <path d="M2 12l6 6L20 4M14 12l6 6L32 4" />
    </svg>
  );
}

/** The logo mark: a speech bubble holding the double check (proposal "Globo"). */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64">
      <path d="M6 8H58V44H30L18 56V44H6Z" fill="var(--violet)" />
      <path d="M18 26l6 6 12-13M29 26l6 6 12-13" fill="none" stroke="var(--bone)" strokeWidth="5" strokeLinecap="square" />
    </svg>
  );
}
