// A Student's friend or Block control, in the pieces its parent lays out: what
// just happened (a status Banner, or a failed read and its retry), the note on
// where things stand, the buttons, and the dialog. A piece the control has
// nothing for is null.
export interface ControlParts {
  status: React.JSX.Element | null;
  note: React.JSX.Element | null;
  buttons: React.JSX.Element | null;
  dialog: React.JSX.Element | null;
}
