import { Injectable } from '@nestjs/common';
import { Transaction } from 'neo4j-driver';
import { KairosisEvent } from '../rabbitmq/rabbitmq.types';

@Injectable()
export class DesktopHandler {
  async write(tx: Transaction, event: KairosisEvent): Promise<void> {
    const p = event.payload as Record<string, unknown>;

    switch (event.type) {
      case 'desktop.app.activated':
        await this.writeAppActivation(tx, event, p);
        break;
      case 'desktop.screen.locked':
      case 'desktop.screen.unlocked':
        await this.writeScreenEvent(tx, event);
        break;
      case 'desktop.idle.started':
      case 'desktop.idle.ended':
        await this.writeIdleEvent(tx, event, p);
        break;
      case 'desktop.battery.changed':
        await this.writeBatteryEvent(tx, event, p);
        break;
    }
  }

  private async writeAppActivation(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const appName  = p['appName']  as string | null ?? null;
    const bundleId = p['bundleId'] as string | null ?? null;

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (act:AppActivation {id: $eventId})
       MERGE (e)-[:HAS_PAYLOAD]->(act)`,
      { eventId: event.id },
    );

    if (appName) {
      await tx.run(
        `MATCH (act:AppActivation {id: $eventId})
         MERGE (app:Application {name: $appName})
         SET app.bundleId = coalesce($bundleId, app.bundleId)
         MERGE (act)-[:OF]->(app)`,
        { eventId: event.id, appName, bundleId },
      );
    }
  }

  private async writeScreenEvent(
    tx: Transaction,
    event: KairosisEvent,
  ): Promise<void> {
    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (s:ScreenEvent {id: $eventId})
       SET s.type = $type
       MERGE (e)-[:HAS_PAYLOAD]->(s)`,
      { eventId: event.id, type: event.type },
    );
  }

  private async writeIdleEvent(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (i:IdleEvent {id: $eventId})
       SET i.type        = $type,
           i.idleSeconds = $idleSeconds
       MERGE (e)-[:HAS_PAYLOAD]->(i)`,
      {
        eventId:     event.id,
        type:        event.type,
        idleSeconds: p['idleSeconds'] ?? null,
      },
    );
  }

  private async writeBatteryEvent(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (b:BatteryEvent {id: $eventId})
       SET b.charging = $charging
       MERGE (e)-[:HAS_PAYLOAD]->(b)`,
      {
        eventId:  event.id,
        charging: p['charging'] ?? null,
      },
    );
  }
}
