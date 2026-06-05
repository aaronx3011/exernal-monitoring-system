import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
})
export class ProbingGateway {
  @WebSocketServer()
  server!: Server;

  emitProbeEvent(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
    }
  }
}
