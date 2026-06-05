import { createDriver, withSession } from '@arachni/neo4j';
import { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

function getDriver(): Driver {
  if (!driver) {
    driver = createDriver({
      uri: process.env['NEO4J_URI'] ?? 'bolt://localhost:7687',
      user: process.env['NEO4J_USER'] ?? 'neo4j',
      password: process.env['NEO4J_PASSWORD'] ?? '',
      database: process.env['NEO4J_DATABASE'] ?? 'neo4j',
    });
  }
  return driver;
}

export async function query<T>(
  fn: (session: Session) => Promise<T>,
): Promise<T> {
  const database = process.env['NEO4J_DATABASE'] ?? 'neo4j';
  return withSession(getDriver(), database, fn);
}
