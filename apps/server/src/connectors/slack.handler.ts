import { Injectable } from '@nestjs/common';
import { Transaction } from 'neo4j-driver';
import { KairosisEvent } from '../rabbitmq/rabbitmq.types';

@Injectable()
export class SlackHandler {
  async write(tx: Transaction, event: KairosisEvent): Promise<void> {
    const p       = event.payload as Record<string, unknown>;
    const channel = p['channel'] as string | null ?? null;
    const author  = p['author']  as string | null ?? null;

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (m:SlackMessage {id: $eventId})
       SET m.text = $text,
           m.ts   = $ts
       MERGE (e)-[:HAS_PAYLOAD]->(m)`,
      {
        eventId: event.id,
        text:    p['text'] ?? null,
        ts:      p['ts']   ?? null,
      },
    );

    if (channel) {
      await tx.run(
        `MATCH (m:SlackMessage {id: $eventId})
         MERGE (c:SlackChannel {id: $channel})
         MERGE (m)-[:IN]->(c)`,
        { eventId: event.id, channel },
      );
    }

    if (author) {
      await tx.run(
        `MATCH (m:SlackMessage {id: $eventId})
         MERGE (u:SlackUser {id: $author})
         MERGE (m)-[:SENT_BY]->(u)`,
        { eventId: event.id, author },
      );
    }
  }
}
