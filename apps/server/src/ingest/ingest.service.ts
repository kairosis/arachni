import { Injectable, Logger } from '@nestjs/common';
import { SlackHandler } from '../connectors/slack.handler';
import { GitHubHandler } from '../connectors/github.handler';
import { ImapHandler } from '../connectors/imap.handler';
import { SpotifyHandler } from '../connectors/spotify.handler';
import { TerminalHandler } from '../connectors/terminal.handler';
import { GoogleCalendarHandler } from '../connectors/google-calendar.handler';
import { BrowserHandler } from '../connectors/browser.handler';
import { DesktopHandler } from '../connectors/desktop.handler';
import { KairosisEvent } from '../rabbitmq/rabbitmq.types';
import { Neo4jService } from '../neo4j/neo4j.service';
import { TimeTreeService } from '../neo4j/time-tree.service';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly timeTree: TimeTreeService,
    private readonly slack: SlackHandler,
    private readonly github: GitHubHandler,
    private readonly imap: ImapHandler,
    private readonly spotify: SpotifyHandler,
    private readonly terminal: TerminalHandler,
    private readonly googleCalendar: GoogleCalendarHandler,
    private readonly browser: BrowserHandler,
    private readonly desktop: DesktopHandler,
  ) {}

  async handle(event: KairosisEvent): Promise<void> {
    this.logger.log(`Ingesting event: ${event.type}`);

    await this.neo4j.withSession(async (session) => {
      const tx = session.beginTransaction();
      try {
        await tx.run(
          `MERGE (e:Event {id: $id})
           SET e.type        = $type,
               e.connectorId = $connectorId,
               e.workspaceId = $workspaceId,
               e.occurredAt  = $occurredAt,
               e.ingestedAt  = $ingestedAt,
               e.routingKey  = $routingKey`,
          {
            id:          event.id,
            type:        event.type,
            connectorId: event.connectorId,
            workspaceId: event.workspaceId,
            occurredAt:  event.occurredAt,
            ingestedAt:  event.ingestedAt,
            routingKey:  event.routingKey ?? null,
          },
        );

        await this.timeTree.mergeTimeTree(tx, event.id, event.occurredAt);

        const [connector] = event.type.split('.');
        switch (connector) {
          case 'slack':
            await this.slack.write(tx, event);
            break;
          case 'github':
            await this.github.write(tx, event);
            break;
          case 'email':
            await this.imap.write(tx, event);
            break;
          case 'spotify':
            await this.spotify.write(tx, event);
            break;
          case 'terminal':
            await this.terminal.write(tx, event);
            break;
          case 'calendar':
            await this.googleCalendar.write(tx, event);
            break;
          case 'browser':
            await this.browser.write(tx, event);
            break;
          case 'desktop':
            await this.desktop.write(tx, event);
            break;
          default:
            this.logger.warn(`No handler for connector: ${connector}`);
        }

        await tx.commit();
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    });
  }
}
