// Single shared board for now; becomes per-board when tenancy lands.
export const BOARD_ID = 1;

export const CHANNELS = {
  board: `board.${BOARD_ID}`,
  presence: `board.${BOARD_ID}`,
} as const;
