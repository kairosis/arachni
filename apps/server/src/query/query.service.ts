import { Injectable } from '@nestjs/common';
import neo4j, { Integer, Node, Relationship } from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import {
  CypherQueryRequest,
  CypherQueryResponse,
  EventRecord,
  EventsQueryRequest,
  EventsQueryResponse,
} from './query.dto';

@Injectable()
export class QueryService {
  constructor(private readonly neo4j: Neo4jService) { }

  async queryEvents(req: EventsQueryRequest): Promise<EventsQueryResponse> {
    const limit = req.limit ?? 100;

    const from = new Date(req.from);
    const to = new Date(req.to);

    // Encode hour boundaries as yyyymmddHH integers for index-friendly time tree traversal
    const fromHourKey = hourKey(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), from.getUTCHours())));
    const toHourKey = hourKey(new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), to.getUTCHours())));

    const events = await this.neo4j.withSession((session) =>
      session.executeRead(async (tx) => {
        const result = await tx.run(
          `MATCH (h:Hour)
           WHERE (h.year * 1000000 + h.month * 10000 + h.day * 100 + h.hour) >= $fromHourKey
             AND (h.year * 1000000 + h.month * 10000 + h.day * 100 + h.hour) <= $toHourKey
           MATCH (e:Event)-[:OCCURRED_IN]->(h)
           WHERE datetime(e.occurredAt) >= datetime($from)
             AND datetime(e.occurredAt) <= datetime($to)
             AND ($connector IS NULL OR e.connectorId = $connector)
             AND ($eventType  IS NULL OR e.type        = $eventType)
           OPTIONAL MATCH (e)-[:HAS_PAYLOAD]->(payload)
           RETURN e.id          AS id,
                  e.type        AS type,
                  e.connectorId AS connector,
                  e.occurredAt  AS timestamp,
                  e.routingKey  AS routingKey,
                  properties(payload) AS payload
           ORDER BY e.occurredAt DESC
           LIMIT $limit`,
          {
            fromHourKey,
            toHourKey,
            from: req.from,
            to: req.to,
            connector: req.connector ?? null,
            eventType: req.eventType ?? null,
            limit: neo4j.int(limit),
          },
        );

        return result.records.map<EventRecord>((r) => ({
          id: r.get('id') as string,
          type: r.get('type') as string,
          connector: r.get('connector') as string,
          timestamp: r.get('timestamp') as string,
          routingKey: r.get('routingKey') as string,
          payload: sanitizeNeo4j(r.get('payload')) as Record<string, unknown>,
        }));
      }),
    );

    return { events };
  }

  async runQuery(req: CypherQueryRequest): Promise<CypherQueryResponse> {
    const results = await this.neo4j.withSession((session) =>
      session.executeRead(async (tx) => {
        const result = await tx.run(req.cypher, req.params ?? {});
        return result.records.map((r) => {
          const row: Record<string, unknown> = {};
          for (const key of r.keys) {
            row[key as string] = sanitizeNeo4j(r.get(key as string));
          }
          return row;
        });
      }),
    );

    return { results };
  }
}

function hourKey(d: Date): number {
  return (
    d.getUTCFullYear() * 1_000_000 +
    (d.getUTCMonth() + 1) * 10_000 +
    d.getUTCDate() * 100 +
    d.getUTCHours()
  );
}

function sanitizeNeo4j(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Integer) return value.toNumber();
  if (value instanceof Node) return { _labels: value.labels, ...sanitizeRecord(value.properties) };
  if (value instanceof Relationship) return { _type: value.type, ...sanitizeRecord(value.properties) };
  if (Array.isArray(value)) return value.map(sanitizeNeo4j);
  if (typeof value === 'object') return sanitizeRecord(value as Record<string, unknown>);
  return value;
}

function sanitizeRecord(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = sanitizeNeo4j(v);
  }
  return out;
}
