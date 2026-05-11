import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.agentTemplate.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.agentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Agent template ${id} not found`);
    }

    return template;
  }

  async findBySlug(slug: string) {
    const template = await this.prisma.agentTemplate.findUnique({
      where: { slug },
    });

    if (!template) {
      throw new NotFoundException(`Agent template ${slug} not found`);
    }

    return template;
  }

  async create(dto: any) {
    return this.prisma.agentTemplate.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        image: dto.image,
        defaultCommand: dto.defaultCommand,
        defaultArgs: dto.defaultArgs || [],
        workingDir: dto.workingDir,
        requiredSecrets: dto.requiredSecrets || [],
        cpuLimit: dto.cpuLimit,
        memoryLimit: dto.memoryLimit,
        diskSize: dto.diskSize,
        exposedPorts: dto.exposedPorts || [],
        enabled: dto.enabled ?? true,
      },
    });
  }

  async seedDefaults() {
    const count = await this.prisma.agentTemplate.count();

    if (count > 0) {
      return;
    }

    const defaults = [
      {
        slug: 'opencode',
        name: 'OpenCode',
        description: 'AI coding agent powered by OpenAI/Anthropic',
        image: 'ghcr.io/your-org/opencode-agent:latest',
        defaultCommand: 'opencode',
        defaultArgs: [],
        workingDir: '/workspace',
        requiredSecrets: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
        cpuLimit: 2,
        memoryLimit: 4096,
        diskSize: 20,
        exposedPorts: [8080],
        enabled: true,
      },
      {
        slug: 'flue',
        name: 'Flue',
        description: 'Lightweight AI agent for code tasks',
        image: 'ghcr.io/your-org/flue-agent:latest',
        defaultCommand: 'flue',
        defaultArgs: [],
        workingDir: '/workspace',
        requiredSecrets: ['OPENAI_API_KEY'],
        cpuLimit: 1,
        memoryLimit: 2048,
        diskSize: 10,
        exposedPorts: [],
        enabled: true,
      },
    ];

    for (const template of defaults) {
      await this.prisma.agentTemplate.create({ data: template });
    }
  }
}
