import neo4j, { Driver } from 'neo4j-driver';
import { Neo4jConfig } from './types';

let instance: Driver | null = null;

export function createDriver(config: Neo4jConfig): Driver {
  if (instance) return instance;
  instance = neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.user, config.password),
  );
  return instance;
}

export async function closeDriver(): Promise<void> {
  if (instance) {
    await instance.close();
    instance = null;
  }
}
