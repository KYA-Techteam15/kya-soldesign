/** Cadenas discret sur une action que l'édition active n'ouvre pas ; le motif est dans le `title` du bouton. */
export function LockMark() {
  return (
    <svg className="lock-mark" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
