import { Module } from '@nestjs/common';
import { TerminalGateway } from './terminal.gateway';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { BoxliteAdapterModule } from '../boxlite-adapter/boxlite-adapter.module';

@Module({
  imports: [
    PrismaModule,
    BoxliteAdapterModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [TerminalGateway],
  exports: [TerminalGateway],
})
export class TerminalModule {}
