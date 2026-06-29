import type { Response } from "express";

export type RealtimeEventType =
  | "order:created"
  | "order:updated"
  | "reservation:created"
  | "reservation:updated"
  | "table-reservation:created"
  | "table-reservation:updated"
  | "refund:created"
  | "refund:updated"
  | "walk-in:created"
  | "walk-in:updated"
  | "ping";

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload?: unknown;
}

const clients = new Set<Response>();

export function addClient(res: Response): () => void {
  clients.add(res);
  return () => {
    clients.delete(res);
  };
}

export function broadcast(event: RealtimeEvent): void {
  const line = `event: ${event.type}\ndata: ${JSON.stringify(event.payload ?? {})}\n\n`;
  for (const res of clients) {
    try {
      res.write(line);
    } catch {
      clients.delete(res);
    }
  }
}
