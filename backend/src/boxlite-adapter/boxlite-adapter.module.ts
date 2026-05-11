import { Module } from '@nestjs/common';
import { BoxliteAdapterService } from './boxlite-adapter.service';

@Module({
  providers: [BoxliteAdapterService],
  exports: [BoxliteAdapterService],
})
export class BoxliteAdapterModule {}
