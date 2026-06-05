import { Injectable } from '@nestjs/common';
import { Transaction } from 'neo4j-driver';
import { KairosisEvent } from '../rabbitmq/rabbitmq.types';

@Injectable()
export class BrowserHandler {
  async write(tx: Transaction, event: KairosisEvent): Promise<void> {
    const p = event.payload as Record<string, unknown>;

    switch (event.type) {
      case 'browser.page.visited':
        await this.writePageVisit(tx, event, p);
        break;
      case 'browser.tab.opened':
      case 'browser.tab.closed':
      case 'browser.tab.activated':
        await this.writeTabEvent(tx, event, p);
        break;
    }
  }

  private async writePageVisit(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const url    = p['url']   as string | null ?? null;
    const domain = this.extractDomain(url);

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (pv:PageVisit {id: $eventId})
       SET pv.transitionType = $transitionType,
           pv.tabId          = $tabId
       MERGE (e)-[:HAS_PAYLOAD]->(pv)`,
      {
        eventId:        event.id,
        transitionType: p['transitionType'] ?? null,
        tabId:          p['tabId']          ?? null,
      },
    );

    if (url) {
      await tx.run(
        `MATCH (pv:PageVisit {id: $eventId})
         MERGE (wp:WebPage {url: $url})
         SET wp.title = $title
         MERGE (pv)-[:TO]->(wp)`,
        {
          eventId: event.id,
          url,
          title: p['title'] ?? null,
        },
      );
    }

    if (domain) {
      await tx.run(
        `MATCH (wp:WebPage {url: $url})
         MERGE (d:Domain {name: $domain})
         MERGE (wp)-[:ON]->(d)`,
        { url, domain },
      );
    }
  }

  private async writeTabEvent(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const tabId = p['tabId'] as number | null ?? null;

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (te:TabEvent {id: $eventId})
       SET te.type     = $type,
           te.windowId = $windowId
       MERGE (e)-[:HAS_PAYLOAD]->(te)`,
      {
        eventId:  event.id,
        type:     event.type,
        windowId: p['windowId'] ?? null,
      },
    );

    if (tabId != null) {
      await tx.run(
        `MATCH (te:TabEvent {id: $eventId})
         MERGE (tab:BrowserTab {id: $tabId})
         MERGE (te)-[:IN]->(tab)`,
        { eventId: event.id, tabId },
      );
    }
  }

  private extractDomain(url: string | null): string | null {
    if (!url) return null;
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }
}
