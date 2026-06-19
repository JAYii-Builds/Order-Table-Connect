import { randomUUID } from "crypto";
import { db, auditLogsTable } from "@workspace/db";

export function logAudit(
  actorId: string | null,
  actorName: string,
  action: string,
  details: string,
): void {
  db.insert(auditLogsTable)
    .values({ id: randomUUID(), actor_id: actorId, actor_name: actorName, action, details })
    .catch(() => {});
}
