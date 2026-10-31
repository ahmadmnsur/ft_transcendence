import { io, type Socket } from 'socket.io-client';

export const socket: Socket = io({
  path: '/socket.io',
  transports: ['websocket'],
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
});

export function subscribe(event: string, listener: (...args: unknown[]) => void): () => void {
  socket.on(event, listener);
  return () => {
    socket.off(event, listener);
  };
}
