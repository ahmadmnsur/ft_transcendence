// Who a service method acts for (§3.4). `sessionHash` is null for an actor
// the seed or a test constructs.
export type Actor = {
  studentId: string;
  sessionHash: string | null;
};
