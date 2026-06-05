import { EventFeed } from '@/components/EventFeed';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Arachni — Event Graph
      </h1>
      <EventFeed />
    </main>
  );
}
