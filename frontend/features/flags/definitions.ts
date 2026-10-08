/**
 * Flags the UI reads. A typo in `useFlag('...')` fails typecheck.
 *
 * The names must match the keys in backend/config/features.php, which is the
 * source of truth (it also holds flags only the API uses, like
 * `notify-on-complete`). A flag missing from the API response is treated as off.
 */
export const FLAG_NAMES = ['list-view', 'calendar-view'] as const;

export type FlagName = (typeof FLAG_NAMES)[number];

export type FlagMap = Record<string, boolean>;
