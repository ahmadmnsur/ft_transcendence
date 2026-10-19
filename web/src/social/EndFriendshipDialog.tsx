import { useRef } from 'react';
import type { StudentRef } from '../api/profile';
import { Button, Modal } from '../design';
import { useI18n } from '../i18n/context';

// §11.1: ending a Friendship asks first, on the profile and on `/friends`
// alike, since only a new request restores it. Focus starts on the safe
// button, and the dialog cannot be dismissed while the request is in flight.
export function EndFriendshipDialog({
  student,
  pending,
  onConfirm,
  onClose,
}: {
  student: StudentRef | null;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}): React.JSX.Element {
  const { t, formatText, personNameValue } = useI18n();
  const actions = t.social.friendActions;
  const copy = t.social.endConfirm;
  const keepRef = useRef<HTMLButtonElement>(null);
  const name = student === null ? '' : personNameValue(student.displayName, student.removed);
  const close = (): void => {
    if (!pending) onClose();
  };
  return (
    <Modal
      open={student !== null}
      size="sm"
      title={formatText(copy.title, { name })}
      description={formatText(copy.body, { name })}
      onClose={close}
      initialFocusRef={keepRef}
      footer={
        <>
          <Button ref={keepRef} variant="secondary" onClick={close}>
            {copy.keep}
          </Button>
          <Button variant="danger" loading={pending} onClick={onConfirm}>
            {pending ? actions.ending : actions.end}
          </Button>
        </>
      }
    />
  );
}
