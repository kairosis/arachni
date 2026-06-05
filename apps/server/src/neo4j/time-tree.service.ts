import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Transaction } from 'neo4j-driver';
import { Neo4jService } from './neo4j.service';

@Injectable()
export class TimeTreeService implements OnModuleInit {
  private readonly logger = new Logger(TimeTreeService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async onModuleInit(): Promise<void> {
    await this.neo4j.withSession(async (session) => {
      const indexes = [
        'CREATE INDEX year_idx IF NOT EXISTS FOR (n:Year) ON (n.year)',
        'CREATE INDEX month_idx IF NOT EXISTS FOR (n:Month) ON (n.year, n.month)',
        'CREATE INDEX day_idx IF NOT EXISTS FOR (n:Day) ON (n.year, n.month, n.day)',
        'CREATE INDEX hour_idx IF NOT EXISTS FOR (n:Hour) ON (n.year, n.month, n.day, n.hour)',
      ];
      for (const cypher of indexes) {
        await session.run(cypher);
      }
    });
    this.logger.log('Time tree indexes ensured');
  }

  async mergeTimeTree(tx: Transaction, eventId: string, occurredAt: string): Promise<void> {
    const d = new Date(occurredAt);
    const year  = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day   = d.getUTCDate();
    const hour  = d.getUTCHours();

    await tx.run(
      `MERGE (y:Year {year: $year})
       MERGE (y)-[:HAS_MONTH]->(mo:Month {year: $year, month: $month})
       MERGE (mo)-[:HAS_DAY]->(d:Day {year: $year, month: $month, day: $day})
       MERGE (d)-[:HAS_HOUR]->(h:Hour {year: $year, month: $month, day: $day, hour: $hour})
       WITH h
       MATCH (e:Event {id: $eventId})
       MERGE (e)-[:OCCURRED_IN]->(h)`,
      { year, month, day, hour, eventId },
    );
  }
}
