import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Driver, Session } from 'neo4j-driver';
import { createDriver, closeDriver, withSession } from '@arachni/neo4j';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver!: Driver;
  private database!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.database = this.config.get<string>('NEO4J_DATABASE', 'neo4j');
    this.driver = createDriver({
      uri: this.config.getOrThrow<string>('NEO4J_URI'),
      user: this.config.getOrThrow<string>('NEO4J_USER'),
      password: this.config.getOrThrow<string>('NEO4J_PASSWORD'),
      database: this.database,
    });
    this.logger.log('Neo4j driver initialised');
  }

  async onModuleDestroy(): Promise<void> {
    await closeDriver();
  }

  async withSession<T>(fn: (session: Session) => Promise<T>): Promise<T> {
    return withSession(this.driver, this.database, fn);
  }
}
