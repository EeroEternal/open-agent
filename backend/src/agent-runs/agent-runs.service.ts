import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoxliteAdapterService } from '../boxlite-adapter/boxlite-adapter.service';
import { CreateAgentRunDto } from './dto/create-agent-run.dto';

/**
 * Agent Run Status Flow:
 * created -> provisioning -> starting -> running -> waiting_input -> completed
 *                                       -> failed
 *                                       -> stopping -> stopped
 *                                       -> lost -> recovering -> running/failed
 */
export type AgentRunStatus =
  | 'created'
  | 'provisioning'
  | 'starting'
  | 'running'
  | 'waiting_input'
  | 'completed'
  | 'failed'
  | 'stopping'
  | 'stopped'
  | 'lost'
  | 'recovering';

const VALID_TRANSITIONS: Record<AgentRunStatus, AgentRunStatus[]> = {
  created: ['provisioning'],
  provisioning: ['starting', 'failed'],
  starting: ['running', 'failed'],
  running: ['waiting_input', 'completed', 'failed', 'stopping', 'lost'],
  waiting_input: ['running', 'completed', 'failed', 'stopping', 'lost'],
  completed: [],
  failed: ['stopping', 'created'],
  stopping: ['stopped', 'failed'],
  stopped: ['created'],
  lost: ['recovering', 'stopping'],
  recovering: ['running', 'failed', 'stopping'],
};

@Injectable()
export class AgentRunsService {
  constructor(
    private prisma: PrismaService,
    private boxliteAdapter: BoxliteAdapterService,
  ) {}

  async create(userId: string, dto: CreateAgentRunDto) {
    const template = await this.prisma.agentTemplate.findUnique({
      where: { id: dto.agentTemplateId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${dto.agentTemplateId} not found`);
    }

    const agentRun = await this.prisma.agentRun.create({
      data: {
        userId,
        agentTemplateId: template.id,
        status: 'created',
        command: dto.command || template.defaultCommand,
        args: dto.args || template.defaultArgs,
        workingDir: dto.workingDir || template.workingDir,
        resourceLimits: dto.resourceLimits || {},
        secretBindings: dto.secretBindings || [],
      },
    });

    this.startAgentRun(agentRun.id).catch((err) => {
      console.error(`Failed to start agent run ${agentRun.id}:`, err);
    });

    return agentRun;
  }

  async findAll(userId: string) {
    return this.prisma.agentRun.findMany({
      where: { userId },
      include: { agentTemplate: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const run = await this.prisma.agentRun.findFirst({
      where: { id, userId },
      include: { agentTemplate: true, events: true },
    });

    if (!run) {
      throw new NotFoundException(`Agent run ${id} not found`);
    }

    return run;
  }

  async stop(id: string, userId: string) {
    const run = await this.getOwnedRun(id, userId);

    if (!this.canTransition(run.status as AgentRunStatus, 'stopping')) {
      throw new BadRequestException(`Cannot stop run in status: ${run.status}`);
    }

    await this.updateStatus(id, 'stopping');

    this.stopAgentRun(id).catch((err) => {
      console.error(`Failed to stop agent run ${id}:`, err);
    });

    return { id, status: 'stopping' };
  }

  async restart(id: string, userId: string) {
    const run = await this.getOwnedRun(id, userId);

    if (run.status !== 'stopped' && run.status !== 'failed') {
      throw new BadRequestException(`Can only restart stopped or failed runs`);
    }

    await this.prisma.agentRun.update({
      where: { id },
      data: {
        status: 'created',
        boxId: null,
        ptySessionId: null,
        startedAt: null,
        stoppedAt: null,
        exitCode: null,
        statusReason: null,
      },
    });

    this.startAgentRun(id).catch((err) => {
      console.error(`Failed to restart agent run ${id}:`, err);
    });

    return { id, status: 'created' };
  }

  async remove(id: string, userId: string) {
    const run = await this.getOwnedRun(id, userId);

    if (['running', 'starting', 'waiting_input'].includes(run.status)) {
      await this.stop(id, userId);
    }

    await this.prisma.agentRun.delete({
      where: { id },
    });

    return { success: true };
  }

  async startAgentRun(id: string) {
    const run = await this.prisma.agentRun.findUnique({
      where: { id },
      include: { agentTemplate: true, user: true },
    });

    if (!run || run.status !== 'created') {
      return;
    }

    try {
      await this.updateStatus(id, 'provisioning');
      await this.addEvent(id, 'provisioning', 'info', `Creating box with image ${run.agentTemplate.image}`);

      const { boxId } = await this.boxliteAdapter.createBox({
        image: run.agentTemplate.image,
        cpuLimit: run.agentTemplate.cpuLimit,
        memoryLimit: run.agentTemplate.memoryLimit,
        diskSize: run.agentTemplate.diskSize,
        workingDir: run.workingDir,
        ports: run.agentTemplate.exposedPorts,
      });

      await this.prisma.agentRun.update({
        where: { id },
        data: { boxId },
      });

      await this.updateStatus(id, 'starting');
      await this.addEvent(id, 'starting', 'info', 'Starting agent process');

      const { ptySessionId } = await this.boxliteAdapter.startPty(
        boxId,
        run.command,
        run.args as string[],
        { env: {}, cols: 80, rows: 24 },
      );

      await this.prisma.agentRun.update({
        where: { id },
        data: {
          ptySessionId,
          startedAt: new Date(),
        },
      });

      await this.updateStatus(id, 'running');
      await this.addEvent(id, 'running', 'info', 'Agent is running');
    } catch (error: any) {
      await this.updateStatus(id, 'failed', error.message);
      await this.addEvent(id, 'error', 'error', `Failed to start: ${error.message}`);
    }
  }

  async stopAgentRun(id: string) {
    const run = await this.prisma.agentRun.findUnique({
      where: { id },
    });

    if (!run || !run.boxId) {
      return;
    }

    try {
      await this.boxliteAdapter.stopBox(run.boxId);
      await this.updateStatus(id, 'stopped');
      await this.addEvent(id, 'stopped', 'info', 'Agent run stopped');
    } catch (error: any) {
      await this.updateStatus(id, 'failed', error.message);
    }
  }

  private async getOwnedRun(id: string, userId: string) {
    const run = await this.prisma.agentRun.findFirst({
      where: { id, userId },
    });

    if (!run) {
      throw new NotFoundException(`Agent run ${id} not found`);
    }

    return run;
  }

  private canTransition(current: AgentRunStatus, target: AgentRunStatus): boolean {
    const allowed = VALID_TRANSITIONS[current] || [];
    return allowed.includes(target);
  }

  private async updateStatus(id: string, status: AgentRunStatus, reason?: string) {
    await this.prisma.agentRun.update({
      where: { id },
      data: {
        status,
        statusReason: reason,
        ...(status === 'stopped' ? { stoppedAt: new Date() } : {}),
      },
    });
  }

  private async addEvent(id: string, type: string, level: string, message: string) {
    await this.prisma.agentRunEvent.create({
      data: {
        runId: id,
        type,
        level,
        message,
      },
    });
  }
}
