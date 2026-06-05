import { Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { IngestModule } from '../ingest/ingest.module';

@Module({
  imports: [IngestModule],
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
