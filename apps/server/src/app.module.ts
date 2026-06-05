import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { Neo4jModule } from './neo4j/neo4j.module';
import { IngestModule } from './ingest/ingest.module';
import { QueryModule } from './query/query.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    Neo4jModule,
    RabbitMQModule,
    IngestModule,
    QueryModule,
  ],
})
export class AppModule {}
