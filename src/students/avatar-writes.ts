import type { PrismaTx } from '../core/uow';
import type { SavedFile } from '../files/file-writer';
import type { ValidatedImage } from '../files/validate';


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
