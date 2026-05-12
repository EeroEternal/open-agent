import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { BoxliteAdapterService } from '../boxlite-adapter/boxlite-adapter.service';

interface AuthenticatedSocket extends Socket {
  user?: { id: string; email: string };
  runId?: string;
  ptySessionId?: string;
}

@WebSocketGateway({
  path: '/ws/agent-runs',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class TerminalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TerminalGateway.name);
  private activeConnections = new Map<string, AuthenticatedSocket>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private boxliteAdapter: BoxliteAdapterService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract JWT from handshake auth or query
      const token =
        client.handshake?.auth?.token ||
        client.handshake?.query?.token ||
        client.handshake?.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token`);
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'default-secret-change-me',
      });

      client.user = {
        id: payload.sub || payload.id,
        email: payload.email,
      };

      this.logger.log(`Client connected: ${client.id}, user: ${client.user.email}`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} disconnected: Invalid token`);
      client.disconnect();
    }
  }

  async onModuleInit() {
    // This is called when the gateway is initialized
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (client.runId) {
      this.activeConnections.delete(client.runId);
    }
  }

  @SubscribeMessage('attach')
  async onAttach(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { runId: string },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const { runId } = data;

    // Verify run belongs to user
    const run = await this.prisma.agentRun.findFirst({
      where: { id: runId, userId: client.user.id },
    });

    if (!run) {
      client.emit('error', { message: 'Run not found or access denied' });
      return;
    }

    if (!run.boxId || !run.ptySessionId) {
      client.emit('error', { message: 'Run not started or PTY not available' });
      return;
    }

    client.runId = runId;
    this.activeConnections.set(runId, client);

    try {
      // Attach to PTY
      const pty = await this.boxliteAdapter.attachPty(run.boxId, run.ptySessionId);

      // Initialize sequence counter for log persistence
      let sequence = 1n;
      try {
        const lastLog = await this.prisma.agentRunLog.findFirst({
          where: { runId },
          orderBy: { sequence: 'desc' },
        });
        if (lastLog) {
          sequence = lastLog.sequence + 1n;
        }
      } catch (seqErr) {
        this.logger.warn(`Failed to query last log sequence for run ${runId}:`, seqErr);
      }

      // Listen for PTY output
      pty.onData((data: string) => {
        client.emit('output', { data });

        // Persist output to agent_run_logs
        this.prisma.agentRunLog.create({
          data: {
            runId,
            stream: 'stdout',
            sequence,
            content: data,
          },
        }).catch((err) => {
          this.logger.error(`Failed to persist log for run ${runId}:`, err);
        });
        sequence = sequence + 1n;
      });

      // Listen for PTY exit
      pty.onExit((code: number) => {
        client.emit('status', { status: 'completed', exitCode: code });
      });

      // Handle client input
      client.on('input', (inputData: { input: string }) => {
        pty.write(inputData.input);
      });

      // Handle resize
      client.on('resize', (resizeData: { cols: number; rows: number }) => {
        pty.resize(resizeData.cols, resizeData.rows);
      });

      // Handle ping/pong
      client.on('ping', () => {
        client.emit('pong', { timestamp: Date.now() });
      });

      // Clean up on disconnect
      client.on('disconnect', () => {
        pty.destroy();
      });

      client.emit('status', { status: 'attached', runId });
      this.logger.log(`Client ${client.id} attached to run ${runId}`);
    } catch (error) {
      client.emit('error', { message: `Failed to attach: ${error.message}` });
      this.logger.error(`Failed to attach to run ${runId}:`, error);
    }
  }

  @SubscribeMessage('input')
  async onInput(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { input: string },
  ) {
    // Input is handled in the attach handler via the PTY write
    // This is a fallback for direct input messages
    this.logger.debug(`Input from ${client.id}: ${data.input}`);
  }

  @SubscribeMessage('resize')
  async onResize(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { cols: number; rows: number },
  ) {
    // Resize is handled in the attach handler
    this.logger.debug(`Resize from ${client.id}: ${data.cols}x${data.rows}`);
  }
}
