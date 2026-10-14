// A name as a quoted SQL identifier, for statements that take a name and no
// parameter: TRUNCATE's tables, COMMENT ON DATABASE's database.
export function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
