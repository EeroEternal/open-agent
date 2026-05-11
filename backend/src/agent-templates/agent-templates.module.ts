import { Module } from '@nestjs/common';
import { AgentTemplatesService } from './agent-templates.service';
import { AgentTemplatesController } from './agent-templates.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AgentTemplatesService],
  controllers: [AgentTemplatesController],
  exports: [AgentTemplatesService],
})
export class AgentTemplatesModule {}
