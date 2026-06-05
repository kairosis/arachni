import { Module } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { SlackHandler } from '../connectors/slack.handler';
import { GitHubHandler } from '../connectors/github.handler';
import { ImapHandler } from '../connectors/imap.handler';
import { SpotifyHandler } from '../connectors/spotify.handler';
import { TerminalHandler } from '../connectors/terminal.handler';
import { GoogleCalendarHandler } from '../connectors/google-calendar.handler';
import { BrowserHandler } from '../connectors/browser.handler';
import { DesktopHandler } from '../connectors/desktop.handler';
import { Neo4jModule } from '../neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  providers: [
    IngestService,
    SlackHandler,
    GitHubHandler,
    ImapHandler,
    SpotifyHandler,
    TerminalHandler,
    GoogleCalendarHandler,
    BrowserHandler,
    DesktopHandler,
  ],
  exports: [IngestService],
})
export class IngestModule {}
