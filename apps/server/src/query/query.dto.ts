export interface EventsQueryRequest {
  from: string;
  to: string;
  connector?: string;
  eventType?: string;
  limit?: number;
}

export interface EventRecord {
  id: string;
  type: string;
  connector: string;
  timestamp: string;
  routingKey: string;
  payload: Record<string, unknown>;
}

export interface EventsQueryResponse {
  events: EventRecord[];
}

export interface CypherQueryRequest {
  cypher: string;
  params?: Record<string, unknown>;
}

export interface CypherQueryResponse {
  results: Array<Record<string, unknown>>;
}
