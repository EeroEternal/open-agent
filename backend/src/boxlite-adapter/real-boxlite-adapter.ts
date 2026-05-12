import { Injectable, Logger } from '@nestjs/common';
import { IBoxliteAdapter } from './boxlite-adapter.interface';
import { SimpleBox, InteractiveBox } from '@boxlite-ai/boxlite';
import type { InteractiveBoxOptions } from '@boxlite-ai/boxlite';

/**
 * Real Boxlite Adapter
 * Uses the @boxlite-ai/boxlite Node.js SDK on macOS.
 *
 * API reference from SDK types:
 * - SimpleBox: exec(), stop(), id, metrics(), copyIn(), copyOut()
 * - InteractiveBox extends SimpleBox: start(), wait()
 */
@Injectable()
export class RealBoxliteAdapter implements IBoxliteAdapter {
  private readonly logger = new Logger(RealBoxliteAdapter.name);

  // Track active boxes by our internal boxId
  private boxMap = new Map<string, SimpleBox>();
  // Track PTY sessions: ptySessionId -> InteractiveBox
  private ptyMap = new Map<string, InteractiveBox>();

  async createBox(options: {
    image: string;
    cpuLimit?: number;
    memoryLimit?: number;
    diskSize?: number;
    env?: Record<string, string>;
    workingDir?: string;
    ports?: number[];
  }): Promise<{ boxId: string }> {
    const boxId = `box-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const box = new SimpleBox({
      image: options.image,
      env: options.env,
      workdir: options.workingDir,
      memoryMib: options.memoryLimit,
      cpus: options.cpuLimit,
      diskSizeGb: options.diskSize,
      ports: options.ports?.map((p) => ({ guestPort: p })),
    });

    // Box is lazily created on first exec(), but we can trigger creation
    this.boxMap.set(boxId, box);

    this.logger.log(`[RealBox] Created box ${boxId} with image ${options.image}`);
    return { boxId };
  }

  async startPty(
    boxId: string,
    command: string,
    args: string[] = [],
    options?: { cols?: number; rows?: number; env?: Record<string, string> },
  ): Promise<{ ptySessionId: string }> {
    const box = this.boxMap.get(boxId);
    if (!box) {
      throw new Error(`Box ${boxId} not found`);
    }

    const ptySessionId = `pty-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Create an InteractiveBox for PTY session
    // InteractiveBox extends SimpleBox and adds start()/wait() for PTY
    const interactiveBox = new InteractiveBox({
      image: (box as any)._boxOpts?.image || 'alpine:latest',
      shell: command,
      env: { ...((box as any)._boxOpts?.env || {}), ...(options?.env || {}) },
      workdir: (box as any)._boxOpts?.workdir || '/workspace',
      tty: true,
    });

    await interactiveBox.start();
    this.ptyMap.set(ptySessionId, interactiveBox);

    this.logger.log(`[RealBox] Started PTY ${ptySessionId} in box ${boxId}: ${command} ${args.join(' ')}`);
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
    const interactiveBox = this.ptyMap.get(ptySessionId);
    if (!interactiveBox) {
      throw new Error(`PTY session ${ptySessionId} not found`);
    }

    this.logger.log(`[RealBox] Attached to PTY ${ptySessionId}`);

    // InteractiveBox exposes _stdout and _stderr as JsExecStdout/JsExecStderr
    // and _stdin as JsExecStdin for I/O
    const stdout = (interactiveBox as any)._stdout;
    const stdin = (interactiveBox as any)._stdin;

    return {
      onData: (cb: (data: string) => void) => {
        if (stdout) {
          stdout.on('data', (chunk: Buffer) => cb(chunk.toString()));
        }
      },
      onExit: (cb: (code: number) => void) => {
        // InteractiveBox wait() resolves when shell exits
        (interactiveBox as any)._execution?._process?.then?.((result: any) => {
          cb(result?.exitCode ?? 0);
        });
      },
      write: (data: string) => {
        if (stdin) {
          stdin.write(data);
        }
      },
      resize: (cols: number, rows: number) => {
        // InteractiveBox handles resize via _execution
        (interactiveBox as any)._execution?._pty?.resize?.(cols, rows);
      },
      destroy: () => {
        this.logger.log(`[RealBox] Destroying PTY ${ptySessionId}`);
        interactiveBox.stop().catch(() => {});
        this.ptyMap.delete(ptySessionId);
      },
    };
  }

  async resizePty(boxId: string, ptySessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.ptyMap.get(ptySessionId);
    if (session) {
      (session as any)._execution?._pty?.resize?.(cols, rows);
      this.logger.log(`[RealBox] Resized PTY ${ptySessionId}: ${cols}x${rows}`);
    }
  }

  async startExec(
    boxId: string,
    command: string,
    args: string[] = [],
    options?: { env?: Record<string, string>; workingDir?: string },
  ): Promise<{ execId: string; output: string; exitCode: number }> {
    const box = this.boxMap.get(boxId);
    if (!box) {
      throw new Error(`Box ${boxId} not found`);
    }

    const execId = `exec-${Date.now()}`;
    const result = await box.exec(command, ...args);

    this.logger.log(`[RealBox] Exec ${execId}: ${command} (exit ${result.exitCode})`);
    return {
      execId,
      output: result.stdout || '',
      exitCode: result.exitCode || 0,
    };
  }

  async getBoxStatus(boxId: string): Promise<{
    status: 'running' | 'stopped' | 'error';
    pid?: number;
  }> {
    const box = this.boxMap.get(boxId);
    if (!box) {
      return { status: 'stopped' };
    }
    // Boxlite box is "running" if it exists and hasn't been stopped
    return { status: 'running' };
  }

  async getMetrics(boxId: string): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  }> {
    const box = this.boxMap.get(boxId);
    if (!box) {
      return { cpuUsage: 0, memoryUsage: 0, diskUsage: 0 };
    }
    try {
      const metrics = await box.metrics();
      return {
        cpuUsage: metrics.cpuUsagePct || 0,
        memoryUsage: metrics.memoryUsageMib || 0,
        diskUsage: metrics.diskUsageGib || 0,
      };
    } catch {
      return { cpuUsage: 0, memoryUsage: 0, diskUsage: 0 };
    }
  }

  async stopProcess(boxId: string, processId: string): Promise<void> {
    this.logger.warn(`[RealBox] stopProcess not supported by Boxlite SDK`);
  }

  async stopBox(boxId: string): Promise<void> {
    const box = this.boxMap.get(boxId);
    if (box) {
      await box.stop();
      this.boxMap.delete(boxId);
      this.logger.log(`[RealBox] Stopped box ${boxId}`);
    }
  }

  async deleteBox(boxId: string): Promise<void> {
    await this.stopBox(boxId);
    this.logger.log(`[RealBox] Deleted box ${boxId}`);
  }
}
