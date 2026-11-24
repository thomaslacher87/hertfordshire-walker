import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import {
  amenityColumns,
  catalogueSchema,
  difficultyOptions,
  imageColumns,
  obstacleColumns,
  parkingTypeOptions,
  routeTypeOptions,
  seasonColumns,
  statusOptions,
  terrainColumns,
  walkColumns,
  type Walk,
  type WalkImage,
} from '../src/domain/catalogue';

const legacyImageSchema = z.object({
  url: z.url(),
  alt: z.string(),
});

const legacyWalkSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    url: z.url(),
    distance: z.number().positive(),
    seasons: z.array(z.string()),
    has_pub: z.boolean(),
    has_cafe: z.boolean(),
    has_playground: z.boolean(),
    location_name: z.string().min(1),
    lat: z
      .number()
      .nullish()
      .transform((value) => value ?? null),
    lng: z
      .number()
      .nullish()
      .transform((value) => value ?? null),
    nearest_station_name: z.string().nullable(),
    nearest_station_miles: z.number().nonnegative().nullable(),
    summary: z.string().min(1),
    summary_context: z.string(),
    summary_evidence: z.array(z.string()),
    parking_type: z.string(),
    parking_note: z.string(),
    terrain_tags: z.array(z.string()),
    access_evidence: z.array(z.string()),
    gallery_images: z.array(legacyImageSchema),
  })
  .passthrough();

const legacyCatalogueSchema = z.array(legacyWalkSchema);

const terrainTagMap: Record<string, (typeof terrainColumns)[number]> = {
  'woodland paths': 'woodland',
  fields: 'fields',
  'country lanes': 'country_lanes',
  riverside: 'riverside',
  'paved or towpath': 'paved_or_towpath',
  'mixed surfaces': 'mixed_surfaces',
  flat: 'flat',
  hilly: 'hilly',
  'steep sections': 'steep_sections',
  'muddy after rain': 'muddy_after_rain',
};

function inferRouteType(name: string): Walk['route_type'] {
  const normalizedName = name.toLowerCase();

  if (
    normalizedName.includes('figure-of-eight') ||
    normalizedName.includes('figure of eight')
  ) {
    return 'figure_eight';
  }

  if (normalizedName.includes('loop') || normalizedName.includes('circular')) {
    return 'circular';
  }

  if (normalizedName.includes('linear')) {
    return 'linear';
  }

  return 'unknown';
}

function normalizedParkingType(value: string): Walk['parking_type'] {
  if (value === 'car_park' || value === 'on_street') {
    return value;
  }

  return 'unknown';
}

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';

  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv<T extends object>(
  columns: readonly string[],
  records: T[],
): string {
  return `${columns.join(',')}\n${records
    .map((record) => {
      const values = record as Record<string, unknown>;
      return columns.map((column) => csvValue(values[column])).join(',');
    })
    .join('\n')}\n`;
}

function listCsv(): string {
  const rows: Array<[string, string]> = [
    ...statusOptions.map((value) => ['status', value] as [string, string]),
    ...routeTypeOptions.map(
      (value) => ['route_type', value] as [string, string],
    ),
    ...difficultyOptions.map(
      (value) => ['difficulty', value] as [string, string],
    ),
    ...parkingTypeOptions.map(
      (value) => ['parking_type', value] as [string, string],
    ),
    ...seasonColumns.map((value) => ['season', value] as [string, string]),
    ...amenityColumns.map((value) => ['amenity', value] as [string, string]),
    ...terrainColumns.map((value) => ['terrain', value] as [string, string]),
    ...obstacleColumns.map((value) => ['obstacle', value] as [string, string]),
  ];

  return toCsv(
    ['list_name', 'value'],
    rows.map(([list_name, value]) => ({
      list_name,
      value,
    })),
  );
}

const sourcePath = resolve('walks.json');
const sourceText = await readFile(sourcePath, 'utf8');
const legacyWalks = legacyCatalogueSchema.parse(JSON.parse(sourceText));

const unmappedTerrainTags = new Set<string>();
const ambiguousObstacleSlugs: string[] = [];
const walks: Walk[] = [];
const images: WalkImage[] = [];

for (const legacyWalk of legacyWalks) {
  const slug = String(legacyWalk.id);
  const seasonSet = new Set(legacyWalk.seasons);
  const yearRound = seasonSet.has('year-round');
  const terrainSet = new Set<(typeof terrainColumns)[number]>();

  for (const legacyTag of legacyWalk.terrain_tags) {
    if (legacyTag === 'stiles or steps') {
      ambiguousObstacleSlugs.push(slug);
      continue;
    }

    const mappedTag = terrainTagMap[legacyTag];
    if (mappedTag) terrainSet.add(mappedTag);
    else unmappedTerrainTags.add(legacyTag);
  }

  const evidence = [
    ...legacyWalk.summary_evidence,
    ...legacyWalk.access_evidence,
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index)
    .join('; ');

  walks.push({
    slug,
    title: legacyWalk.name.replace(/^Walk \d+:\s*/i, ''),
    source_name: 'Hertfordshire Walker',
    source_walk_id: slug,
    source_url: legacyWalk.url,
    status: 'published',
    last_verified_date: null,
    evidence_notes: evidence,
    start_location: legacyWalk.location_name,
    area: 'Hertfordshire',
    latitude: legacyWalk.lat,
    longitude: legacyWalk.lng,
    distance_miles: legacyWalk.distance,
    source_duration_minutes: null,
    route_type: inferRouteType(legacyWalk.name),
    difficulty: null,
    summary: legacyWalk.summary,
    practical_notes: legacyWalk.summary_context,
    spring: yearRound || seasonSet.has('spring'),
    summer: yearRound || seasonSet.has('summer'),
    autumn: yearRound || seasonSet.has('autumn'),
    winter: yearRound || seasonSet.has('winter'),
    pub: legacyWalk.has_pub,
    cafe: legacyWalk.has_cafe,
    toilets: false,
    playground: legacyWalk.has_playground,
    picnic_area: false,
    woodland: terrainSet.has('woodland'),
    fields: terrainSet.has('fields'),
    country_lanes: terrainSet.has('country_lanes'),
    riverside: terrainSet.has('riverside'),
    paved_or_towpath: terrainSet.has('paved_or_towpath'),
    mixed_surfaces: terrainSet.has('mixed_surfaces'),
    flat: terrainSet.has('flat'),
    hilly: terrainSet.has('hilly'),
    steep_sections: terrainSet.has('steep_sections'),
    muddy_after_rain: terrainSet.has('muddy_after_rain'),
    stiles: false,
    steps: false,
    parking_type: normalizedParkingType(legacyWalk.parking_type),
    parking_note: legacyWalk.parking_note,
    station_name: legacyWalk.nearest_station_name,
    station_distance_miles: legacyWalk.nearest_station_miles,
    content_credit: 'Hertfordshire Walker',
    licence_note: null,
  });

  legacyWalk.gallery_images.forEach((legacyImage, index) => {
    images.push({
      walk_slug: slug,
      position: index + 1,
      image_url: legacyImage.url,
      alt_text: legacyImage.alt,
      credit: 'Hertfordshire Walker',
      licence_note: null,
    });
  });
}

const validatedCatalogue = catalogueSchema.parse({ walks, images });
const allIds = legacyWalks.map((walk) => walk.id);
const minimumId = Math.min(...allIds);
const maximumId = Math.max(...allIds);
const idSet = new Set(allIds);
const missingIds = Array.from(
  { length: maximumId - minimumId + 1 },
  (_, index) => minimumId + index,
).filter((id) => !idSet.has(id));

const report = {
  source_file: 'walks.json',
  source_sha256: createHash('sha256').update(sourceText).digest('hex'),
  migrated_walks: validatedCatalogue.walks.length,
  migrated_images: validatedCatalogue.images.length,
  validation_errors: [],
  quality_warnings: {
    missing_coordinates: walks
      .filter((walk) => walk.latitude === null || walk.longitude === null)
      .map((walk) => walk.slug),
    missing_station: walks
      .filter(
        (walk) =>
          walk.station_name === null || walk.station_distance_miles === null,
      )
      .map((walk) => walk.slug),
    missing_gallery: walks
      .filter((walk) => !images.some((image) => image.walk_slug === walk.slug))
      .map((walk) => walk.slug),
    unknown_route_type: walks
      .filter((walk) => walk.route_type === 'unknown')
      .map((walk) => walk.slug),
    ambiguous_stiles_or_steps: [...new Set(ambiguousObstacleSlugs)],
    unmapped_terrain_tags: [...unmappedTerrainTags].sort(),
    missing_last_verified_date_count: walks.filter(
      (walk) => walk.last_verified_date === null,
    ).length,
    missing_image_licence_count: images.filter(
      (image) => image.licence_note === null,
    ).length,
    legacy_id_gaps: missingIds,
  },
};

const outputs = new Map<string, string>([
  [
    'data/catalogue/walks.json',
    `${JSON.stringify(validatedCatalogue.walks, null, 2)}\n`,
  ],
  [
    'data/catalogue/images.json',
    `${JSON.stringify(validatedCatalogue.images, null, 2)}\n`,
  ],
  [
    'data/catalogue/migration-report.json',
    `${JSON.stringify(report, null, 2)}\n`,
  ],
  [
    'data/google-sheets/Walks.csv',
    toCsv(walkColumns, validatedCatalogue.walks),
  ],
  [
    'data/google-sheets/Images.csv',
    toCsv(imageColumns, validatedCatalogue.images),
  ],
  ['data/google-sheets/Lists.csv', listCsv()],
]);

const checkOnly = process.argv.includes('--check');
const staleFiles: string[] = [];

for (const [relativePath, expectedContent] of outputs) {
  const outputPath = resolve(relativePath);

  if (checkOnly) {
    const existingContent = await readFile(outputPath, 'utf8').catch(
      () => null,
    );
    if (existingContent !== expectedContent) staleFiles.push(relativePath);
    continue;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, expectedContent);
}

if (staleFiles.length > 0) {
  throw new Error(
    `Generated catalogue files are missing or stale:\n${staleFiles.join('\n')}\nRun npm run catalogue:migrate.`,
  );
}

console.log(
  checkOnly
    ? `Catalogue migration is current: ${walks.length} walks and ${images.length} images.`
    : `Migrated ${walks.length} walks and ${images.length} images.`,
);
