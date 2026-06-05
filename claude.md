# Arachni

Arachni is a standalone TypeScript monorepo that consumes events from the Kairosis event platform via RabbitMQ and weaves them into a Neo4j knowledge graph. Every ingested event produces a generic `Event` node linked to a connector-aware typed node (e.g. `SlackMessage`, `GitCommit`).

---

## Repository Structure

```
arachni/
├── apps/
│   ├── server/          # NestJS app — RabbitMQ subscriber + Neo4j writer
│   └── web/             # Next.js app — graph explorer frontend
├── packages/
│   └── neo4j/           # Shared Neo4j driver wrapper, session factory, base types
├── .env.example
├── docker-compose.yml
├── pnpm-workspace.yaml
└── CLAUDE.md
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (LTS) |
| Language | TypeScript (strict) |
| Package manager | pnpm workspaces (no Nx) |
| Server framework | NestJS |
| Frontend framework | Next.js (App Router) |
| Message broker | RabbitMQ (AMQP) |
| Graph database | Neo4j (self-hosted, `neo4j-driver`) |
| Containerization | Docker + Docker Compose |
| Connector schemas | npm packages (from Kairosis) |

---

## Core Concept

```
Kairosis (producer)
    └── publishes to → kairosis.topic exchange (topic routing)
            └── Arachni binds queues with routing keys (e.g. slack.#, github.#)
                    └── NestJS listener consumes → writes to Neo4j
```

### Graph Model

Every event produces two linked nodes:

```cypher
(:Event {
  id,
  type,           // e.g. "slack.message.received"
  source,         // connector name
  timestamp,
  routingKey
})
  -[:HAS_PAYLOAD]->
(:SlackMessage {  // connector-aware typed node
  channel,
  author,
  text,
  ...
})
```

The `Event` node is always created first. The connector-aware node is created based on the event type and linked via `HAS_PAYLOAD`. This allows generic queries across all events and typed queries per connector.

---

## Apps

### `apps/server` — NestJS

- Connects to RabbitMQ on startup and binds queues to `kairosis.topic` using topic routing keys
- Each connector has its own queue (e.g. `arachni.slack`, `arachni.github`)
- Routes incoming messages to the correct handler based on event type
- Writes `Event` node + typed connector node to Neo4j in a single transaction
- No enrichment — pure ingest and store

**Key modules:**
- `RabbitMQModule` — AMQP connection, queue binding, message consumption
- `Neo4jModule` — driver singleton, session factory
- `IngestModule` — fan-out to per-connector handlers
- `ConnectorHandlers` — one handler class per connector (Slack, GitHub, Mail, etc.)

### `apps/web` — Next.js

- Graph explorer UI for browsing ingested events
- Queries Neo4j directly via API routes (App Router route handlers)
- Shows event feed, connector breakdowns, and node detail views

---

## packages/neo4j

Shared package used by both apps:

- Neo4j driver instantiation
- Session factory with automatic close
- Base Cypher query helpers
- TypeScript types for `EventNode` and connector node shapes

---

## RabbitMQ Convention

- **Exchange:** `kairosis.topic` (topic exchange, must already exist — created by Kairosis)
- **Queue naming:** `arachni.<connector>` (e.g. `arachni.slack`, `arachni.github`)
- **Routing keys:** topic pattern per connector (e.g. `slack.#`, `github.#`, `mail.#`)
- Arachni creates its own queues on startup and binds them to the exchange
- Dead-letter queue: `arachni.dlq` for failed messages

---

## Environment Variables

All configuration via `.env` file at repo root, loaded by each app.

```env
# RabbitMQ
RABBITMQ_URL=amqp://kairosis:<password>@localhost:5672
RABBITMQ_EXCHANGE=kairosis.topic

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=
NEO4J_DATABASE=neo4j

# Server
SERVER_PORT=3000

# Web
NEXT_PUBLIC_API_URL=http://localhost:3000
WEB_PORT=3001
```

---

## Docker

Each app ships as its own Docker image:

- `arachni-server` — NestJS listener
- `arachni-web` — Next.js frontend

`docker-compose.yml` at the repo root orchestrates both containers. Neo4j and RabbitMQ are external (self-hosted) and referenced via environment variables — they are not included in Arachni's compose file.

---

## Connector Schema Packages

Connector payload types are imported from Kairosis npm packages. Do not redefine payload shapes inside Arachni — always import from the source package.

Example:
```typescript
import { SlackMessageReceivedPayload } from '@kairosis/connector-slack';
```

---

## Code Conventions

- **Strict TypeScript** — no `any`, no implicit returns
- **NestJS patterns** — modules, providers, decorators; no raw Express
- **Neo4j** — use `neo4j-driver` directly (no OGM); parameterized Cypher only (no string interpolation)
- **One handler per connector** — each connector gets its own NestJS provider
- **Transactions** — `Event` node and typed node are always written in a single transaction
- **Error handling** — failed messages are nacked and routed to `arachni.dlq`; never silently dropped
- **No enrichment** — Arachni stores exactly what Kairosis emits; no derived relationships at ingest time

---

## Adding a New Connector

1. Install the Kairosis connector schema package: `pnpm add @kairosis/connector-<name> --filter server`
2. Create `apps/server/src/connectors/<name>.handler.ts`
3. Define the routing key binding in `RabbitMQModule`
4. Create a new queue `arachni.<name>` in the queue config
5. Implement the Cypher write for the typed node
6. Register the handler in `IngestModule`

---

## Scripts

```bash
pnpm dev          # start both apps in dev mode (turbo)
pnpm build        # build all apps and packages
pnpm lint         # lint all packages
pnpm typecheck    # tsc --noEmit across all packages
pnpm docker:build # build both Docker images
```