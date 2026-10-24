import { io, type Socket } from 'socket.io-client';

// §7.1: one client for the whole SPA. No URL — same origin — and no token:
// the `pc_session` cookie travels with every handshake. `autoConnect: false`:
// the shell connects it only once GET /api/session reports a session.
export const socket: Socket = io({
  path: '/socket.io',
  transports: ['websocket'],
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
});

// The surfaces that own a client reaction (§7.4: `presence:update` in
// `social/PresenceUpdates.tsx`; `dm:message` in `messages/MessageUpdates.tsx`;
// `round:*` and `match:ready` in `matching/RoundUpdates.tsx`; `post:created`
// in `feed/FeedUpdates.tsx`; `round:closed` also in `progress/ProgressCard.tsx`)
// attach their listeners through here, so this file stays the one owner of
// the client.
export function subscribe(event: string, listener: (...args: unknown[]) => void): () => void {
  socket.on(event, listener);
  return () => {
    socket.off(event, listener);
  };
}
