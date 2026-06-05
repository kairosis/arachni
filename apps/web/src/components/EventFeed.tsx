'use client';

import { useEffect, useState } from 'react';
import { EventNode } from '@arachni/neo4j';

const SOURCE_COLORS: Record<string, string> = {
  slack: '#4a154b',
  github: '#24292e',
  mail: '#1a73e8',
};

export function EventFeed() {
  const [events, setEvents] = useState<EventNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((data: { events: EventNode[] }) => setEvents(data.events))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#888' }}>Loading events…</p>;
  if (!events.length) return <p style={{ color: '#888' }}>No events ingested yet.</p>;

  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {events.map((e) => (
        <li
          key={e.id}
          style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            padding: '1rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              background: SOURCE_COLORS[e.source] ?? '#333',
              color: '#fff',
              padding: '0.2rem 0.6rem',
              borderRadius: 4,
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {e.source}
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{e.type}</div>
            <div style={{ color: '#666', fontSize: '0.75rem', marginTop: 2 }}>
              {new Date(e.timestamp).toLocaleString()} &middot; {e.id}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
