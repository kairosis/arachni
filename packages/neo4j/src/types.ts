export interface EventNode {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  routingKey: string;
}

export interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
  database?: string;
}
