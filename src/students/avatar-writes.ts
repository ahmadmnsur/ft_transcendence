import type { PrismaTx } from '../core/uow';
import type { SavedFile } from '../files/file-writer';
import type { ValidatedImage } from '../files/validate';

// §6.3, §9.8: the `Avatar` row's writes, taking the target student id, so the
// owner's routes and the Users table's (§6.12) write the row alike. Each runs
// inside a caller's transaction that has already read its actor; `checkpoint`
// is the caller's one call, after the deciding reads and before the first
// write (§3.6.4). The caller deletes the file a returned token names after
// commit (FileWriter).

// A save's row: the new token, canonical type, size and upload time. Returns
// the token of the file the row named before, or null.
export async function writeAvatarRow(
  tx: PrismaTx,
  studentId: string,
  file: ValidatedImage,
  saved: SavedFile,
  checkpoint: () => Promise<void>,
): Promise<string | null> {
  const previous = await tx.avatar.findUnique({ where: { studentId }, select: { token: true } });
  await checkpoint();
  const fields = { token: saved.token, mime: file.mime, size: file.size, uploadedAt: saved.uploadedAt };
  await tx.avatar.upsert({
    where: { studentId },
    create: { studentId, ...fields },
    update: fields,
  });
  return previous?.token ?? null;
}

// A delete's row, if there is one; idempotent. Returns the token of the file
// the row named, or null.
export async function deleteAvatarRow(
  tx: PrismaTx,
  studentId: string,
  checkpoint: () => Promise<void>,
): Promise<string | null> {
  const current = await tx.avatar.findUnique({ where: { studentId }, select: { token: true } });
  await checkpoint();
  if (current === null) return null;
  await tx.avatar.deleteMany({ where: { studentId } });
  return current.token;
}
