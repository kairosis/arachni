import { NextResponse } from 'next/server';
import { query } from '@/lib/neo4j';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const result = await query(async (session) => {
    const res = await session.run(
      `MATCH (e:Event {id: $id})-[:HAS_PAYLOAD]->(p)
       RETURN e { .id, .type, .source, .timestamp, .routingKey } AS event,
              p AS payload, labels(p) AS payloadLabels`,
      { id },
    );
    if (!res.records.length) return null;
    const record = res.records[0];
    return {
      event: record.get('event'),
      payload: record.get('payload').properties,
      payloadType: (record.get('payloadLabels') as string[])[0],
    };
  });

  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(result);
}
