import type { ReactNode } from 'react';

// A control on a profile, in the pieces its parent lays out: what just happened
// (a status Banner, or a failed read and its retry), the note on where things
// stand, the buttons, and the dialog. A piece the control has nothing for is
// null.
export interface ControlParts {
  status: ReactNode;
  note: ReactNode;
  action: ReactNode;
  dialog: ReactNode;
}
