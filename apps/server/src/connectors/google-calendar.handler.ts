import { Injectable } from '@nestjs/common';
import { Transaction } from 'neo4j-driver';
import { KairosisEvent } from '../rabbitmq/rabbitmq.types';

@Injectable()
export class GoogleCalendarHandler {
  async write(tx: Transaction, event: KairosisEvent): Promise<void> {
    const p          = event.payload as Record<string, unknown>;
    const organizer  = p['organizer'] as Record<string, unknown> | undefined;
    const calendarId = p['calendarId'] as string | null ?? null;

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (ce:CalendarEvent {id: $calEventId})
       SET ce.title       = $title,
           ce.description = $description,
           ce.start       = $start,
           ce.end         = $end,
           ce.allDay      = $allDay,
           ce.location    = $location,
           ce.status      = $status,
           ce.htmlLink    = $htmlLink,
           ce.recurring   = $recurring
       MERGE (e)-[:HAS_PAYLOAD]->(ce)`,
      {
        eventId:     event.id,
        calEventId:  p['eventId']     ?? event.id,
        title:       p['title']       ?? null,
        description: p['description'] ?? null,
        start:       p['start']       ?? null,
        end:         p['end']         ?? null,
        allDay:      p['allDay']      ?? null,
        location:    p['location']    ?? null,
        status:      p['status']      ?? null,
        htmlLink:    p['htmlLink']    ?? null,
        recurring:   p['recurring']   ?? null,
      },
    );

    if (calendarId) {
      await tx.run(
        `MATCH (ce:CalendarEvent {id: $calEventId})
         MERGE (cal:Calendar {id: $calendarId})
         MERGE (ce)-[:IN]->(cal)`,
        {
          calEventId: p['eventId'] ?? event.id,
          calendarId,
        },
      );
    }

    if (organizer?.['email']) {
      await tx.run(
        `MATCH (ce:CalendarEvent {id: $calEventId})
         MERGE (person:Person {email: $email})
         SET person.displayName = $displayName
         MERGE (ce)-[:ORGANIZED_BY]->(person)`,
        {
          calEventId:  p['eventId']          ?? event.id,
          email:       organizer['email'],
          displayName: organizer['displayName'] ?? null,
        },
      );
    }
  }
}
