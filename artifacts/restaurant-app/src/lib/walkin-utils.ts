export function encodeWalkinNotes(
  tableNumber: string,
  guestCount: number,
  userNotes: string
): string {
  const prefix = `[Walk-in|Table:${tableNumber.trim()}|Guests:${guestCount}]`;
  return userNotes.trim() ? `${prefix} ${userNotes.trim()}` : prefix;
}

export interface WalkinInfo {
  table: string;
  guests: number;
  extraNotes: string;
}

export function parseWalkinInfo(notes: string | null | undefined): WalkinInfo | null {
  if (!notes) return null;
  const m = notes.match(/^\[Walk-in\|Table:([^|]+)\|Guests:(\d+)\](.*)/);
  if (!m) return null;
  return {
    table: m[1].trim(),
    guests: parseInt(m[2], 10),
    extraNotes: m[3].trim(),
  };
}
