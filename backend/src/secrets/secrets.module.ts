import { Module } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { SecretsController } from './secrets.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SecretsService],
  controllers: [SecretsController],
  exports: [SecretsService],
})
export class SecretsModule {}
