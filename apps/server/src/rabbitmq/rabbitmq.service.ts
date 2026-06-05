import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { IngestService } from '../ingest/ingest.service';
import { DLQ, KairosisEvent, QUEUE_BINDINGS } from './rabbitmq.types';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly ingest: IngestService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.getOrThrow<string>('RABBITMQ_URL');
    const exchange = this.config.getOrThrow<string>('RABBITMQ_EXCHANGE');

    this.connection = await amqplib.connect(url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertQueue(DLQ, { durable: true });

    for (const binding of QUEUE_BINDINGS) {
      await this.channel.assertQueue(binding.queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': DLQ,
        },
      });
      await this.channel.bindQueue(binding.queue, exchange, binding.routingKey);
      this.logger.log(`Bound ${binding.queue} → ${exchange} [${binding.routingKey}]`);
    }

    for (const binding of QUEUE_BINDINGS) {
      await this.channel.consume(binding.queue, async (msg) => {
        if (!msg) return;
        try {
          const event: KairosisEvent = JSON.parse(msg.content.toString()) as KairosisEvent;
          event.routingKey = msg.fields.routingKey;
          await this.ingest.handle(event);
          this.channel!.ack(msg);
        } catch (err) {
          this.logger.error('Failed to process message — routing to DLQ', err);
          this.channel!.nack(msg, false, false);
        }
      });
    }

    this.logger.log('RabbitMQ consumer ready');
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
