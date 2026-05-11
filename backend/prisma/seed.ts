import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
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

async function main() {
  console.log('Seeding...');

  for (const template of templates) {
    const existing = await prisma.agentTemplate.findUnique({
      where: { slug: template.slug },
    });

    if (!existing) {
      await prisma.agentTemplate.create({
        data: template,
      });
      console.log(`Created template: ${template.name}`);
    } else {
      console.log(`Template already exists: ${template.name}`);
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
