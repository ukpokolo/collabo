/** Name of a board's realtime channel (private- / presence- prefixes are added by Echo). */
export function boardChannel(boardId: number): string {
  return `board.${boardId}`;
}
