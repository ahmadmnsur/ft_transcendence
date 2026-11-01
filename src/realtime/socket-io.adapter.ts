import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

export const SOCKET_PATH = '/socket.io';

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
      allowRequest: (req, callback): void => {
        callback(null, req.headers.origin === this.publicOrigin);
      },
    };
    const server: Server = super.createIOServer(port, options);
    return server;
  }
}
