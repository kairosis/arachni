import { Injectable } from '@nestjs/common';
import { Transaction } from 'neo4j-driver';
import { KairosisEvent } from '../rabbitmq/rabbitmq.types';

@Injectable()
export class ImapHandler {
  async write(tx: Transaction, event: KairosisEvent): Promise<void> {
    const p       = event.payload as Record<string, unknown>;
    const from    = p['from']    as Record<string, unknown> | undefined;
    const mailbox = p['mailbox'] as string | null ?? null;

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (em:Email {id: $messageId})
       SET em.subject = $subject,
           em.date    = $date,
           em.snippet = $snippet
       MERGE (e)-[:HAS_PAYLOAD]->(em)`,
      {
        eventId:   event.id,
        messageId: p['messageId'] ?? event.id,
        subject:   p['subject']   ?? null,
        date:      p['date']      ?? null,
        snippet:   p['snippet']   ?? null,
      },
    );

    if (from?.['address']) {
      await tx.run(
        `MATCH (em:Email {id: $messageId})
         MERGE (addr:EmailAddress {address: $address})
         SET addr.name = $name
         MERGE (em)-[:FROM]->(addr)`,
        {
          messageId: p['messageId'] ?? event.id,
          address:   from['address'],
          name:      from['name'] ?? null,
        },
      );
    }

    if (mailbox) {
      await tx.run(
        `MATCH (em:Email {id: $messageId})
         MERGE (mb:Mailbox {name: $mailbox})
         MERGE (em)-[:IN]->(mb)`,
        {
          messageId: p['messageId'] ?? event.id,
          mailbox,
        },
      );
    }
  }
}
