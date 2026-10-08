/** Original speech-bubble mark — not Signal's trademark logo, just an accent-coloured nod to "a private chat". */
export function Logo({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Signal Clone"
    >
      <path
        d="M32 6C17.088 6 5 16.954 5 30.5c0 7.146 3.36 13.572 8.74 18.06-.33 3.2-1.52 6.84-3.5 9.94a1 1 0 0 0 1.15 1.49c4.86-1.33 9.02-3.63 11.98-5.77A32.6 32.6 0 0 0 32 55c14.912 0 27-10.954 27-24.5S46.912 6 32 6Z"
        fill="var(--accent)"
      />
      <circle cx="21.5" cy="30.5" r="3.4" fill="var(--text-on-accent)" />
      <circle cx="32" cy="30.5" r="3.4" fill="var(--text-on-accent)" />
      <circle cx="42.5" cy="30.5" r="3.4" fill="var(--text-on-accent)" />
    </svg>
  );
}
