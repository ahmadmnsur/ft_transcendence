// A UUID as class-validator's `isUUID(value, 'all')` accepts it: versions 1–8
// with the RFC 4122 variant, or the nil and max UUIDs. The search DTO and the
// SPA's search-param check both use this one function, so an address the SPA
// keeps is never one the API refuses (§3.5.2). Plain TypeScript only, so this
// file compiles under both tsconfigs.
const UUID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
