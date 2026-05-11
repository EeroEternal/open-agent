import { Injectable, Logger } from '@nestjs/common';
import { IBoxliteAdapter } from './boxlite-adapter.interface';

/**
 * Mock Boxlite Adapter for local development
 * Simulates box operations without requiring KVM
 */
@Injectable()
export class MockBoxliteAdapter implements IBoxliteAdapter {
  private readonly logger = new Logger(MockBoxliteAdapter.name);
  private boxes = new Map<string, { status: string; pid?: number }>();
  private ptySessions = new Map<string, { boxId: string; command: string }>();

  async createBox(options: {
    image: string;
    cpuLimit?: number;
    memoryLimit?: number;
    diskSize?: number;
    env?: Record<string, string>;
    workingDir?: string;
    ports?: number[];
  }): Promise<{ boxId: string }> {
    const boxId = `mock-box-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.boxes.set(boxId, { status: 'running', pid: Math.floor(Math.random() * 10000) });
    this.logger.log(`[MOCK] Created box ${boxId} with image ${options.image}`);
    return { boxId };
  }

  async startPty(
    boxId: string,
    command: string,
    args: string[] = [],
    options?: { cols?: number; rows?: number; env?: Record<string, string> },
  ): Promise<{ ptySessionId: string }> {
    if (!this.boxes.has(boxId)) {
      throw new Error(`Box ${boxId} not found`);
    }

    const ptySessionId = `mock-pty-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.ptySessions.set(ptySessionId, { boxId, command });

    this.logger.log(`[MOCK] Started PTY ${ptySessionId} in box ${boxId}: ${command} ${args.join(' ')}`);

    return { ptySessionId };
  }

  async attachPty(
    boxId: string,
    ptySessionId: string,
  ): Promise<{
    onData: (cb: (data: string) => void) => void;
    onExit: (cb: (code: number) => void) => void;
    write: (data: string) => void;
    resize: (cols: number, rows: number) => void;
    destroy: () => void;
  }> {
    if (!this.ptySessions.has(ptySessionId)) {
      throw new Error(`PTY session ${ptySessionId} not found`);
    }

    this.logger.log(`[MOCK] Attached to PTY ${ptySessionId}`);

    // Mock stream - in reality this would be a PTY stream from Boxlite
    const listeners: Array<(data: string) => void> = [];
    const exitListeners: Array<(code: number) => void> = [];

    // Simulate some output
    setTimeout(() => {
      listeners.forEach((cb) => cb(`\r\n$ `));
    }, 100);

    return {
      onData: (cb) => {
        listeners.push(cb);
      },
      onExit: (cb) => {
        exitListeners.push(cb);
      },
      write: (data) => {
        this.logger.log(`[MOCK] PTY input: ${data.trim()}`);
        // Echo back for mock
        setTimeout(() => {
          listeners.forEach((cb) => cb(`\r\nMock output for: ${data.trim()}\r\n$ `));
        }, 50);
      },
      resize: (cols, rows) => {
        this.logger.log(`[MOCK] PTY resize: ${cols}x${rows}`);
      },
      destroy: () => {
        this.logger.log(`[MOCK] PTY destroyed`);
      },
    };
  }

  async resizePty(boxId: string, ptySessionId: string, cols: number, rows: number): Promise<void> {
    this.logger.log(`[MOCK] Resize PTY ${ptySessionId}: ${cols}x${rows}`);
  }

  async startExec(
    boxId: string,
    command: string,
    args: string[] = [],
    options?: { env?: Record<string, string>; workingDir?: string },
  ): Promise<{ execId: string; output: string; exitCode: number }> {
    const execId = `mock-exec-${Date.now()}`;
    this.logger.log(`[MOCK] Exec ${execId}: ${command} ${args.join(' ')}`);
    return {
      execId,
      output: `Mock output for ${command}`,
      exitCode: 0,
    };
  }

  async getBoxStatus(boxId: string): Promise<{
    status: 'running' | 'stopped' | 'error';
    pid?: number;
  }> {
    const box = this.boxes.get(boxId);
    if (!box) {
      return { status: 'error' };
    }
    return { status: box.status as 'running' | 'stopped' | 'error', pid: box.pid };
  }

  async getMetrics(boxId: string): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  }> {
    return {
      cpuUsage: Math.random() * 50,
      memoryUsage: Math.random() * 2048,
      diskUsage: Math.random() * 10240,
    };
  }

  async stopProcess(boxId: string, processId: string): Promise<void> {
    this.logger.log(`[MOCK] Stop process ${processId} in box ${boxId}`);
  }

  async stopBox(boxId: string): Promise<void> {
    const box = this.boxes.get(boxId);
    if (box) {
      box.status = 'stopped';
      this.logger.log(`[MOCK] Stopped box ${boxId}`);
    }
  }

  async deleteBox(boxId: string): Promise<void> {
    this.boxes.delete(boxId);
    this.logger.log(`[MOCK] Deleted box ${boxId}`);
  }
}
