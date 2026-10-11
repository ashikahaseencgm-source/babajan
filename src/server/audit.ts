import "server-only";
import { db, schema, type DbOrTx } from "@/server/db";

type Actor = { id: string; email: string } | null;

/** Records a privileged action. Never pass passwords, tokens, card or payment secrets. */
export async function audit(
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>,
  tx: DbOrTx = db,
) {
  await tx.insert(schema.auditLog).values({
    actorUserId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action,
    entityType,
    entityId,
    metadata: metadata ?? null,
  });
}
