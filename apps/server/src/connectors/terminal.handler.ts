import { Injectable } from '@nestjs/common';
import { Transaction } from 'neo4j-driver';
import { KairosisEvent } from '../rabbitmq/rabbitmq.types';

@Injectable()
export class TerminalHandler {
  async write(tx: Transaction, event: KairosisEvent): Promise<void> {
    const p = event.payload as Record<string, unknown>;

    switch (event.type) {
      case 'terminal.command.executed':
        await this.writeCommand(tx, event, p);
        break;
      case 'terminal.directory.changed':
        await this.writeDirectoryChange(tx, event, p);
        break;
    }
  }

  private async writeCommand(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const cwd      = p['cwd']      as string | null ?? null;
    const hostname = p['hostname'] as string | null ?? null;

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (c:Command {id: $eventId})
       SET c.command  = $command,
           c.exitCode = $exitCode,
           c.shell    = $shell,
           c.duration = $duration,
           c.user     = $user
       MERGE (e)-[:HAS_PAYLOAD]->(c)`,
      {
        eventId:  event.id,
        command:  p['command']  ?? null,
        exitCode: p['exitCode'] ?? null,
        shell:    p['shell']    ?? null,
        duration: p['duration'] ?? null,
        user:     p['user']     ?? null,
      },
    );

    if (cwd) {
      await tx.run(
        `MATCH (c:Command {id: $eventId})
         MERGE (d:Directory {path: $cwd})
         MERGE (c)-[:RUN_IN]->(d)`,
        { eventId: event.id, cwd },
      );
    }

    if (hostname) {
      await tx.run(
        `MATCH (c:Command {id: $eventId})
         MERGE (h:Host {name: $hostname})
         MERGE (c)-[:ON]->(h)`,
        { eventId: event.id, hostname },
      );
    }
  }

  private async writeDirectoryChange(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const cwd      = p['cwd']      as string | null ?? null;
    const hostname = p['hostname'] as string | null ?? null;

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (dc:DirectoryChange {id: $eventId})
       SET dc.user = $user
       MERGE (e)-[:HAS_PAYLOAD]->(dc)`,
      {
        eventId: event.id,
        user:    p['user'] ?? null,
      },
    );

    if (cwd) {
      await tx.run(
        `MATCH (dc:DirectoryChange {id: $eventId})
         MERGE (d:Directory {path: $cwd})
         MERGE (dc)-[:TO]->(d)`,
        { eventId: event.id, cwd },
      );
    }

    if (hostname) {
      await tx.run(
        `MATCH (dc:DirectoryChange {id: $eventId})
         MERGE (h:Host {name: $hostname})
         MERGE (dc)-[:ON]->(h)`,
        { eventId: event.id, hostname },
      );
    }
  }
}
