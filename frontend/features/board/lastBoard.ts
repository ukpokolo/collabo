const KEY = 'collabo:lastBoard';

// Storage can be unavailable (private windows, blocked site data); treat the
// remembered board as a convenience that is allowed to be missing.
export function getLastBoardId(): number | null {
  try {
    const value = Number(window.localStorage.getItem(KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function setLastBoardId(id: number): void {
  try {
    window.localStorage.setItem(KEY, String(id));
  } catch {
    /* ignore */
  }
}
