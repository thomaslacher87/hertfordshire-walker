import { z } from 'zod';

export const statusOptions = ['draft', 'published', 'archived'] as const;
export const routeTypeOptions = [
  'circular',
  'linear',
  'figure_eight',
  'unknown',
] as const;
export const difficultyOptions = ['easy', 'moderate', 'challenging'] as const;
export const parkingTypeOptions = [
  'car_park',
  'on_street',
  'layby',
  'pub_customer',
  'station',
  'none',
  'unknown',
] as const;

export const seasonColumns = ['spring', 'summer', 'autumn', 'winter'] as const;
export const amenityColumns = [
  'pub',
  'cafe',
  'toilets',
  'playground',
  'picnic_area',
] as const;
export const terrainColumns = [
  'woodland',
  'fields',
  'country_lanes',
  'riverside',
  'paved_or_towpath',
  'mixed_surfaces',
  'flat',
  'hilly',
  'steep_sections',
  'muddy_after_rain',
] as const;
export const obstacleColumns = ['stiles', 'steps'] as const;

export const walkColumns = [
  'slug',
  'title',
  'source_name',
  'source_walk_id',
  'source_url',
  'status',
  'last_verified_date',
  'evidence_notes',
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
  ...seasonColumns,
  ...amenityColumns,
  ...terrainColumns,
  ...obstacleColumns,
  'parking_type',
  'parking_note',
  'station_name',
  'station_distance_miles',
  'content_credit',
  'licence_note',
] as const;

export const imageColumns = [
  'walk_slug',
  'position',
  'image_url',
  'alt_text',
  'credit',
  'licence_note',
] as const;

const nullableText = z.string().trim().min(1).nullable();
const nullableNonNegativeNumber = z.number().nonnegative().nullable();

const seasonsSchema = z.object(
  Object.fromEntries(seasonColumns.map((key) => [key, z.boolean()])) as Record<
    (typeof seasonColumns)[number],
    z.ZodBoolean
  >,
);
const amenitiesSchema = z.object(
  Object.fromEntries(amenityColumns.map((key) => [key, z.boolean()])) as Record<
    (typeof amenityColumns)[number],
    z.ZodBoolean
  >,
);
const terrainSchema = z.object(
  Object.fromEntries(terrainColumns.map((key) => [key, z.boolean()])) as Record<
    (typeof terrainColumns)[number],
    z.ZodBoolean
  >,
);
const obstaclesSchema = z.object(
  Object.fromEntries(
    obstacleColumns.map((key) => [key, z.boolean()]),
  ) as Record<(typeof obstacleColumns)[number], z.ZodBoolean>,
);

export const walkSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-+[a-z0-9]+)*$/),
    title: z.string().trim().min(1),
    source_name: z.string().trim().min(1),
    source_walk_id: z.string().trim().min(1),
    source_url: z.url(),
    status: z.enum(statusOptions),
    last_verified_date: z.iso.date().nullable(),
    evidence_notes: z.string().trim(),
    start_location: z.string().trim().min(1),
    area: nullableText,
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    distance_miles: z.number().positive(),
    source_duration_minutes: z.number().int().positive().nullable(),
    route_type: z.enum(routeTypeOptions),
    difficulty: z.enum(difficultyOptions).nullable(),
    summary: z.string().trim().min(1),
    practical_notes: z.string().trim(),
    ...seasonsSchema.shape,
    ...amenitiesSchema.shape,
    ...terrainSchema.shape,
    ...obstaclesSchema.shape,
    parking_type: z.enum(parkingTypeOptions),
    parking_note: z.string().trim(),
    station_name: nullableText,
    station_distance_miles: nullableNonNegativeNumber,
    content_credit: z.string().trim().min(1),
    licence_note: nullableText,
  })
  .superRefine((walk, context) => {
    if ((walk.latitude === null) !== (walk.longitude === null)) {
      context.addIssue({
        code: 'custom',
        message:
          'Latitude and longitude must either both be set or both be null.',
        path: ['latitude'],
      });
    }

    if (
      (walk.station_name === null) !==
      (walk.station_distance_miles === null)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Station name and station distance must either both be set or both be null.',
        path: ['station_name'],
      });
    }

    if (!seasonColumns.some((season) => walk[season])) {
      context.addIssue({
        code: 'custom',
        message: 'At least one supported season is required.',
        path: ['spring'],
      });
    }
  });

export const imageSchema = z.object({
  walk_slug: z.string().trim().min(1),
  position: z.number().int().positive(),
  image_url: z.url(),
  alt_text: z.string().trim(),
  credit: z.string().trim().min(1),
  licence_note: nullableText,
});

export const catalogueSchema = z.object({
  walks: z.array(walkSchema),
  images: z.array(imageSchema),
});

export type Walk = z.infer<typeof walkSchema>;
export type WalkImage = z.infer<typeof imageSchema>;
