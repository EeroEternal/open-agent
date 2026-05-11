/**
 * BoxliteAdapter Interface
 *
 * Abstract interface for Boxlite operations.
 * Implementations: MockBoxliteAdapter (local dev), RealBoxliteAdapter (KVM host)
 */
export interface IBoxliteAdapter {
  /**
   * Create a new box (sandbox)
   */
  createBox(options: {
    image: string;
    cpuLimit?: number;
    memoryLimit?: number;
    diskSize?: number;
    env?: Record<string, string>;
    workingDir?: string;
    ports?: number[];
  }): Promise<{ boxId: string }>;

  /**
   * Start a PTY session in the box
   */
  startPty(
    boxId: string,
    command: string,
    args?: string[],
    options?: { cols?: number; rows?: number; env?: Record<string, string> },
  ): Promise<{ ptySessionId: string }>;

  /**
   * Attach to an existing PTY session (returns stream)
   */
  attachPty(
    boxId: string,
    ptySessionId: string,
  ): Promise<{
    onData: (cb: (data: string) => void) => void;
    onExit: (cb: (code: number) => void) => void;
    write: (data: string) => void;
    resize: (cols: number, rows: number) => void;
    destroy: () => void;
  }>;

  /**
   * Resize a PTY session
   */
  resizePty(boxId: string, ptySessionId: string, cols: number, rows: number): Promise<void>;

  /**
   * Start an exec process (non-interactive)
   */
  startExec(
    boxId: string,
    command: string,
    args?: string[],
    options?: { env?: Record<string, string>; workingDir?: string },
  ): Promise<{ execId: string; output: string; exitCode: number }>;

  /**
   * Get box status
   */
  getBoxStatus(boxId: string): Promise<{
    status: 'running' | 'stopped' | 'error';
    pid?: number;
  }>;

  /**
   * Get box metrics
   */
  getMetrics(boxId: string): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  }>;

  /**
   * Stop a process in the box
   */
  stopProcess(boxId: string, processId: string): Promise<void>;

  /**
   * Stop a box (graceful)
   */
  stopBox(boxId: string): Promise<void>;

  /**
   * Delete a box (force)
   */
  deleteBox(boxId: string): Promise<void>;
}
