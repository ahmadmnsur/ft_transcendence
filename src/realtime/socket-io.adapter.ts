import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

// §7.1: the endpoint the SPA and the spec name.
export const SOCKET_PATH = '/socket.io';

// §7.1's custom Nest IoAdapter: same origin, WebSocket only, no CORS. The
// options a gateway decorator passes are dropped, so nothing can add a
// `cors` key — an upgraded WebSocket is not governed by CORS anyway, and
// §7.2's gate below is the only admission.
export class PeerConnectIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly publicOrigin: string,
  ) {
    super(app);
  }

  override createIOServer(port: number, _options?: Partial<ServerOptions>): Server {
    const options: Partial<ServerOptions> = {
      path: SOCKET_PATH,
      transports: ['websocket'],
      allowUpgrades: false,
      serveClient: false,
      // §7.2 step 1: `req.headers.origin === PUBLIC_ORIGIN` byte-for-byte,
      // before the cookie is read. Absent, `null` and any other value are
      // refused, and the refusal leaves the session row untouched.
      allowRequest: (req, callback): void => {
        callback(null, req.headers.origin === this.publicOrigin);
      },
    };
    const server: Server = super.createIOServer(port, options);
    return server;
  }
}
