import { Injectable } from '@nestjs/common';
import { Transaction } from 'neo4j-driver';
import { KairosisEvent } from '../rabbitmq/rabbitmq.types';

@Injectable()
export class GitHubHandler {
  async write(tx: Transaction, event: KairosisEvent): Promise<void> {
    const p = event.payload as Record<string, unknown>;

    switch (event.type) {
      case 'github.commit.pushed':
        await this.writeCommit(tx, event, p);
        break;
      case 'github.pr.opened':
      case 'github.pr.merged':
      case 'github.pr.closed':
        await this.writePullRequest(tx, event, p);
        break;
      case 'github.issue.opened':
      case 'github.issue.closed':
      case 'github.issue.reopened':
        await this.writeIssue(tx, event, p);
        break;
    }
  }

  private async writeCommit(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const sha        = p['commitSha']  as string | null ?? null;
    const repository = p['repository'] as string | null ?? null;
    const authorName = p['authorName'] as string | null ?? null;

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (c:Commit {id: $sha})
       SET c.message      = $message,
           c.branch       = $branch,
           c.url          = $url,
           c.additions    = $additions,
           c.deletions    = $deletions,
           c.filesChanged = $filesChanged
       MERGE (e)-[:HAS_PAYLOAD]->(c)`,
      {
        eventId:      event.id,
        sha:          sha ?? event.id,
        message:      p['message']      ?? null,
        branch:       p['branch']       ?? null,
        url:          p['url']          ?? null,
        additions:    p['additions']    ?? null,
        deletions:    p['deletions']    ?? null,
        filesChanged: p['filesChanged'] ?? null,
      },
    );

    if (repository) {
      await tx.run(
        `MATCH (c:Commit {id: $sha})
         MERGE (r:Repository {name: $repository})
         MERGE (c)-[:IN]->(r)`,
        { sha: sha ?? event.id, repository },
      );
    }

    if (authorName) {
      await tx.run(
        `MATCH (c:Commit {id: $sha})
         MERGE (u:GitHubUser {login: $login})
         MERGE (c)-[:AUTHORED_BY]->(u)`,
        { sha: sha ?? event.id, login: authorName },
      );
    }
  }

  private async writePullRequest(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const repository = p['repository'] as string | null ?? null;
    const prNumber   = p['prNumber']   as number | null ?? null;
    const authorName = p['authorName'] as string | null ?? null;
    const prId       = repository && prNumber != null ? `${repository}#${prNumber}` : event.id;

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (pr:PullRequest {id: $prId})
       SET pr.number     = $prNumber,
           pr.title      = $title,
           pr.headBranch = $headBranch,
           pr.baseBranch = $baseBranch,
           pr.url        = $url,
           pr.draft      = $draft,
           pr.mergedBy   = $mergedBy
       MERGE (e)-[:HAS_PAYLOAD]->(pr)`,
      {
        eventId:    event.id,
        prId,
        prNumber:   prNumber ?? null,
        title:      p['title']      ?? null,
        headBranch: p['headBranch'] ?? null,
        baseBranch: p['baseBranch'] ?? null,
        url:        p['url']        ?? null,
        draft:      p['draft']      ?? null,
        mergedBy:   p['mergedBy']   ?? null,
      },
    );

    if (repository) {
      await tx.run(
        `MATCH (pr:PullRequest {id: $prId})
         MERGE (r:Repository {name: $repository})
         MERGE (pr)-[:IN]->(r)`,
        { prId, repository },
      );
    }

    if (authorName) {
      await tx.run(
        `MATCH (pr:PullRequest {id: $prId})
         MERGE (u:GitHubUser {login: $login})
         MERGE (pr)-[:OPENED_BY]->(u)`,
        { prId, login: authorName },
      );
    }
  }

  private async writeIssue(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const repository  = p['repository']  as string | null ?? null;
    const issueNumber = p['issueNumber'] as number | null ?? null;
    const authorName  = p['authorName']  as string | null ?? null;
    const labels      = Array.isArray(p['labels']) ? (p['labels'] as string[]) : [];
    const issueId     = repository && issueNumber != null ? `${repository}#${issueNumber}` : event.id;

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (i:Issue {id: $issueId})
       SET i.number = $issueNumber,
           i.title  = $title,
           i.state  = $state,
           i.url    = $url,
           i.labels = $labels
       MERGE (e)-[:HAS_PAYLOAD]->(i)`,
      {
        eventId:     event.id,
        issueId,
        issueNumber: issueNumber ?? null,
        title:       p['title']  ?? null,
        state:       p['state']  ?? null,
        url:         p['url']    ?? null,
        labels,
      },
    );

    if (repository) {
      await tx.run(
        `MATCH (i:Issue {id: $issueId})
         MERGE (r:Repository {name: $repository})
         MERGE (i)-[:IN]->(r)`,
        { issueId, repository },
      );
    }

    if (authorName) {
      await tx.run(
        `MATCH (i:Issue {id: $issueId})
         MERGE (u:GitHubUser {login: $login})
         MERGE (i)-[:OPENED_BY]->(u)`,
        { issueId, login: authorName },
      );
    }
  }
}
