import { Injectable } from '@nestjs/common';
import { Transaction } from 'neo4j-driver';
import { KairosisEvent } from '../rabbitmq/rabbitmq.types';

@Injectable()
export class SpotifyHandler {
  async write(tx: Transaction, event: KairosisEvent): Promise<void> {
    const p = event.payload as Record<string, unknown>;

    switch (event.type) {
      case 'spotify.track.started':
      case 'spotify.track.completed':
      case 'spotify.track.saved':
        await this.writeTrack(tx, event, p);
        break;
      case 'spotify.playlist.started':
        await this.writePlaylist(tx, event, p);
        break;
      case 'spotify.podcast.episode.started':
      case 'spotify.podcast.episode.completed':
        await this.writeEpisode(tx, event, p);
        break;
      case 'spotify.artist.played':
        await this.writeArtist(tx, event, p);
        break;
      case 'spotify.listening.session.ended':
        await this.writeListeningSession(tx, event, p);
        break;
    }
  }

  private async writeTrack(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const trackId   = p['trackId']   as string | null ?? null;
    const artistId  = p['artistId']  as string | null ?? null;
    const albumId   = p['albumId']   as string | null ?? null;
    const genres    = Array.isArray(p['genres']) ? (p['genres'] as string[]) : [];

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (t:Track {id: $trackId})
       SET t.name       = $trackName,
           t.durationMs = $durationMs,
           t.url        = $url
       MERGE (e)-[:HAS_PAYLOAD]->(t)`,
      {
        eventId:   event.id,
        trackId:   trackId ?? event.id,
        trackName: p['trackName']  ?? null,
        durationMs: p['durationMs'] ?? null,
        url:       p['url']        ?? null,
      },
    );

    if (artistId) {
      await tx.run(
        `MATCH (t:Track {id: $trackId})
         MERGE (a:Artist {id: $artistId})
         SET a.name   = $artistName,
             a.genres = $genres
         MERGE (t)-[:BY]->(a)`,
        {
          trackId,
          artistId,
          artistName: p['artist'] ?? null,
          genres,
        },
      );
    }

    if (albumId) {
      await tx.run(
        `MATCH (t:Track {id: $trackId})
         MERGE (al:Album {id: $albumId})
         SET al.name = $albumName
         MERGE (t)-[:ON]->(al)`,
        {
          trackId,
          albumId,
          albumName: p['album'] ?? null,
        },
      );
    }
  }

  private async writePlaylist(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (pl:Playlist {id: $playlistId})
       SET pl.name       = $playlistName,
           pl.trackCount = $trackCount,
           pl.owner      = $owner,
           pl.uri        = $uri
       MERGE (e)-[:HAS_PAYLOAD]->(pl)`,
      {
        eventId:      event.id,
        playlistId:   p['playlistId']   ?? event.id,
        playlistName: p['playlistName'] ?? null,
        trackCount:   p['trackCount']   ?? null,
        owner:        p['owner']        ?? null,
        uri:          p['uri']          ?? null,
      },
    );
  }

  private async writeEpisode(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const episodeId = p['episodeId'] as string | null ?? null;
    const showId    = p['showId']    as string | null ?? null;

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (ep:Episode {id: $episodeId})
       SET ep.title      = $episodeTitle,
           ep.durationMs = $durationMs,
           ep.url        = $url
       MERGE (e)-[:HAS_PAYLOAD]->(ep)`,
      {
        eventId:      event.id,
        episodeId:    episodeId ?? event.id,
        episodeTitle: p['episodeTitle'] ?? null,
        durationMs:   p['durationMs']   ?? null,
        url:          p['url']          ?? null,
      },
    );

    if (showId) {
      await tx.run(
        `MATCH (ep:Episode {id: $episodeId})
         MERGE (s:Show {id: $showId})
         SET s.name = $showName
         MERGE (ep)-[:FROM]->(s)`,
        {
          episodeId: episodeId ?? event.id,
          showId,
          showName: p['showName'] ?? null,
        },
      );
    }
  }

  private async writeArtist(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const genres = Array.isArray(p['genres']) ? (p['genres'] as string[]) : [];

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (a:Artist {id: $artistId})
       SET a.name       = $artistName,
           a.genres     = $genres,
           a.popularity = $popularity,
           a.url        = $url
       MERGE (e)-[:HAS_PAYLOAD]->(a)`,
      {
        eventId:    event.id,
        artistId:   p['artistId']   ?? event.id,
        artistName: p['artistName'] ?? null,
        genres,
        popularity: p['popularity'] ?? null,
        url:        p['url']        ?? null,
      },
    );
  }

  private async writeListeningSession(
    tx: Transaction,
    event: KairosisEvent,
    p: Record<string, unknown>,
  ): Promise<void> {
    const topGenres = Array.isArray(p['topGenres']) ? (p['topGenres'] as string[]) : [];

    await tx.run(
      `MATCH (e:Event {id: $eventId})
       MERGE (ls:ListeningSession {id: $eventId})
       SET ls.durationMinutes = $durationMinutes,
           ls.trackCount      = $trackCount,
           ls.topGenres       = $topGenres,
           ls.skippedCount    = $skippedCount,
           ls.startedAt       = $startedAt,
           ls.endedAt         = $endedAt
       MERGE (e)-[:HAS_PAYLOAD]->(ls)`,
      {
        eventId:         event.id,
        durationMinutes: p['durationMinutes'] ?? null,
        trackCount:      p['trackCount']      ?? null,
        topGenres,
        skippedCount:    p['skippedCount']    ?? null,
        startedAt:       p['startedAt']       ?? null,
        endedAt:         p['endedAt']         ?? null,
      },
    );
  }
}
