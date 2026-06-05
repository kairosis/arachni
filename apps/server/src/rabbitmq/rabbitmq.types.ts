export interface KairosisEvent {
  id: string;
  workspaceId: string;
  connectorId: string;
  type: string;
  occurredAt: string;
  ingestedAt: string;
  version: string;
  payload: Record<string, unknown>;
  routingKey?: string; // injected from AMQP envelope, not present in message body
}

export interface QueueBinding {
  queue: string;
  routingKey: string;
}

export const QUEUE_BINDINGS: QueueBinding[] = [
  { queue: 'arachni.slack',            routingKey: 'slack.#' },
  { queue: 'arachni.github',           routingKey: 'github.#' },
  { queue: 'arachni.email',            routingKey: 'email.#' },
  { queue: 'arachni.spotify',          routingKey: 'spotify.#' },
  { queue: 'arachni.terminal',         routingKey: 'terminal.#' },
  { queue: 'arachni.calendar',         routingKey: 'calendar.#' },
  { queue: 'arachni.browser',          routingKey: 'browser.#' },
  { queue: 'arachni.desktop',          routingKey: 'desktop.#' },
];

export const DLQ = 'arachni.dlq';
