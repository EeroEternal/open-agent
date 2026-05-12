import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IBoxliteAdapter } from './boxlite-adapter.interface';
import { MockBoxliteAdapter } from './mock-boxlite-adapter';
import { RealBoxliteAdapter } from './real-boxlite-adapter';

/**
 * Boxlite Adapter Service
 *
 * Wraps the appropriate adapter implementation (mock or real)
 * based on configuration.
 *
 * On macOS (with Boxlite SDK installed): set BOXLITE_ADAPTER_TYPE=real
 * On KVM host: set BOXLITE_ADAPTER_TYPE=real
 * Locally (no sandbox support): uses mock by default
 */
@Injectable()
export class BoxliteAdapterService implements IBoxliteAdapter, OnModuleInit {
  private readonly logger = new Logger(BoxliteAdapterService.name);
  private adapter: IBoxliteAdapter;

  constructor(private config: ConfigService) {
    const adapterType = this.config.get<string>('BOXLITE_ADAPTER_TYPE') || 'mock';

    if (adapterType === 'real') {
      this.adapter = new RealBoxliteAdapter();
      this.logger.log('Using RealBoxliteAdapter (Boxlite SDK)');
    } else {
      this.adapter = new MockBoxliteAdapter();
      this.logger.log('Using MockBoxliteAdapter (local dev)');
    }
  }

  onModuleInit() {
    this.logger.log(`Boxlite adapter initialized: ${this.adapter.constructor.name}`);
  }

  createBox(options: Parameters<IBoxliteAdapter['createBox']>[0]) {
    return this.adapter.createBox(options);
  }

  startPty(
    boxId: string,
    command: string,
    args?: string[],
    options?: { cols?: number; rows?: number; env?: Record<string, string> },
  ) {
    return this.adapter.startPty(boxId, command, args, options);
  }

  attachPty(boxId: string, ptySessionId: string) {
    return this.adapter.attachPty(boxId, ptySessionId);
  }

  resizePty(boxId: string, ptySessionId: string, cols: number, rows: number) {
    return this.adapter.resizePty(boxId, ptySessionId, cols, rows);
  }

  startExec(
    boxId: string,
    command: string,
    args?: string[],
    options?: { env?: Record<string, string>; workingDir?: string },
  ) {
    return this.adapter.startExec(boxId, command, args, options);
  }

  getBoxStatus(boxId: string) {
    return this.adapter.getBoxStatus(boxId);
  }

  getMetrics(boxId: string) {
    return this.adapter.getMetrics(boxId);
  }

  stopProcess(boxId: string, processId: string) {
    return this.adapter.stopProcess(boxId, processId);
  }

  stopBox(boxId: string) {
    return this.adapter.stopBox(boxId);
  }

  deleteBox(boxId: string) {
    return this.adapter.deleteBox(boxId);
  }
}
