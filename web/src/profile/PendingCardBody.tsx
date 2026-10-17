import { profileCopy } from './messages';

// §6.2: while `GET /api/me` is pending each profile card keeps its shell and
// this body, reserving the loaded height so the password card below barely
// moves. A failed read renders no body at all, since `/me` shows the failure
// once above the cards.
export function PendingCardBody({
  failed,
  reserveClassName,
}: {
  failed: boolean;
  reserveClassName: string;
}): React.JSX.Element | null {
  if (failed) return null;
  return (
    <div aria-busy="true" className={`flex ${reserveClassName} items-center justify-center text-sm text-ink-muted`}>
      {profileCopy.me.loading}
    </div>
  );
}
