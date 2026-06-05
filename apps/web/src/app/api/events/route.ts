import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { query } from '@/lib/neo4j';
import { EventNode } from '@arachni/neo4j';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

  const events = await query<EventNode[]>(async (session) => {
    const result = await session.run(
      `MATCH (e:Event)
       RETURN e { .id, .type, .source, .timestamp, .routingKey } AS event
       ORDER BY e.timestamp DESC
       LIMIT $limit`,
      { limit: neo4j.int(limit) },
    );
    return result.records.map((r) => r.get('event') as EventNode);
  });

  return NextResponse.json({ events });
}
