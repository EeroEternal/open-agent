import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AgentTemplatesModule } from './agent-templates/agent-templates.module';
import { AgentRunsModule } from './agent-runs/agent-runs.module';
import { SecretsModule } from './secrets/secrets.module';
import { TerminalModule } from './terminal/terminal.module';
import { BoxliteAdapterModule } from './boxlite-adapter/boxlite-adapter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    AgentTemplatesModule,
    AgentRunsModule,
    SecretsModule,
    TerminalModule,
    BoxliteAdapterModule,
  ],
})
export class AppModule {}
