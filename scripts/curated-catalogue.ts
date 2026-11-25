import { z } from 'zod';
import {
  amenityColumns,
  obstacleColumns,
  seasonColumns,
  terrainColumns,
  walkSchema,
} from '../src/domain/catalogue';

export const publishers = {
  'fancy-free': { name: 'Fancy Free Walks', host: 'fancyfreewalks.org' },
  swc: { name: 'Saturday Walkers Club', host: 'walkingclub.org.uk' },
  'chiltern-society': {
    name: 'Chiltern Society',
    host: 'chilternsociety.org.uk',
  },
} as const;

const flags = [
  ...seasonColumns,
  ...amenityColumns,
  ...terrainColumns,
  ...obstacleColumns,
];
const factualFields = [
  'title',
  'start_location',
  'area',
  'latitude',
  'longitude',
  'distance_miles',
  'source_duration_minutes',
  'route_type',
  'difficulty',
  'summary',
  'practical_notes',
  'parking_type',
  'parking_note',
  'station_name',
  'station_distance_miles',
  'licence_note',
  ...flags,
] as const;
const fieldName = z.enum(factualFields);
const curatedRecord = z.strictObject({
  publisher: z.enum(
    Object.keys(publishers) as [
      keyof typeof publishers,
      ...(keyof typeof publishers)[],
    ],
  ),
  source_walk_id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  source_url: z.url(),
  last_verified_date: z.iso.date(),
  facts: z.partialRecord(
    fieldName,
    z.union([z.string(), z.number(), z.literal(true)]),
  ),
  evidence: z.partialRecord(fieldName, z.string().trim().min(1)),
});

export function loadCuratedWalks(input: unknown) {
  return z
    .array(curatedRecord)
    .parse(input)
    .map((entry) => {
      const publisher = publishers[entry.publisher];
      const slug = `${entry.publisher}--${entry.source_walk_id}`;
      const url = new URL(entry.source_url);
      if (
        url.protocol !== 'https:' ||
        ![publisher.host, `www.${publisher.host}`].includes(url.hostname)
      ) {
        throw new Error(
          `${slug}: source URL must use the publisher's HTTPS site.`,
        );
      }
      for (const field of factualFields) {
        if (
          Object.hasOwn(entry.facts, field) !==
          Object.hasOwn(entry.evidence, field)
        ) {
          throw new Error(
            `${slug}: ${field} must be paired with publisher evidence.`,
          );
        }
      }
      const evidenceNotes = factualFields
        .flatMap((field) => {
          const note = entry.evidence[field];
          return note ? [`${field}: ${note}`] : [];
        })
        .join(' | ');

      return walkSchema.parse({
        ...Object.fromEntries(flags.map((flag) => [flag, false])),
        area: null,
        latitude: null,
        longitude: null,
        source_duration_minutes: null,
        route_type: 'unknown',
        difficulty: null,
        practical_notes: '',
        parking_type: 'unknown',
        parking_note: '',
        station_name: null,
        station_distance_miles: null,
        licence_note: null,
        ...entry.facts,
        slug,
        source_name: publisher.name,
        source_walk_id: entry.source_walk_id,
        source_url: entry.source_url,
        status: 'published',
        last_verified_date: entry.last_verified_date,
        evidence_notes: evidenceNotes,
        content_credit: publisher.name,
      });
    });
}
