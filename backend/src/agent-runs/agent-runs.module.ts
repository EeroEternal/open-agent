import { Module } from '@nestjs/common';
import { AgentRunsService } from './agent-runs.service';
import { AgentRunsController } from './agent-runs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BoxliteAdapterModule } from '../boxlite-adapter/boxlite-adapter.module';
import { SecretsModule } from '../secrets/secrets.module';

@Module({
  imports: [PrismaModule, BoxliteAdapterModule, SecretsModule],
  providers: [AgentRunsService],
  controllers: [AgentRunsController],
  exports: [AgentRunsService],
})
export class AgentRunsModule {}
