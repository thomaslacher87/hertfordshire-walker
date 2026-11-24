import { images, walks } from 'virtual:public-catalogue';
import {
  amenityColumns,
  difficultyOptions,
  obstacleColumns,
  parkingTypeOptions,
  routeTypeOptions,
  seasonColumns,
  terrainColumns,
} from './catalogue-options';

export { walks, images };
export const bySlug = new Map(walks.map((walk) => [walk.slug, walk]));
export const pageSize = 12;

export const featureGroups = [
  { label: 'Seasons', fields: seasonColumns },
  { label: 'Amenities', fields: amenityColumns },
  { label: 'Terrain', fields: terrainColumns },
  { label: 'Obstacles', fields: obstacleColumns },
] as const;
const features = featureGroups.flatMap(({ fields }) => [...fields]);
export const sortOptions = [
  ['number', 'Walk number'],
  ['shortest', 'Shortest first'],
  ['longest', 'Longest first'],
  ['title', 'Title A–Z'],
] as const;

export function label(value: string) {
  const special: Record<string, string> = {
    cafe: 'Café',
    figure_eight: 'Figure of eight',
    pub_customer: 'Pub customers',
    paved_or_towpath: 'Paved or towpath',
  };
  return (
    special[value] ??
    value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ')
  );
}

const published = walks.filter((walk) => walk.status === 'published');
function distinct(field: 'source_name' | 'area') {
  return [...new Set(published.flatMap((walk) => walk[field] ?? []))].sort();
}

export const selectFilters = [
  {
    key: 'route',
    title: 'Route type',
    field: 'route_type',
    options: routeTypeOptions,
  },
  {
    key: 'difficulty',
    title: 'Difficulty',
    field: 'difficulty',
    options: difficultyOptions,
  },
  {
    key: 'parking',
    title: 'Parking',
    field: 'parking_type',
    options: parkingTypeOptions,
  },
  {
    key: 'source',
    title: 'Publisher',
    field: 'source_name',
    options: distinct('source_name'),
  },
  { key: 'area', title: 'Area', field: 'area', options: distinct('area') },
] as const;
export const numericFilters = [
  {
    key: 'min_miles',
    title: 'Minimum miles',
    field: 'distance_miles',
    bound: 'min',
  },
  {
    key: 'max_miles',
    title: 'Maximum miles',
    field: 'distance_miles',
    bound: 'max',
  },
  {
    key: 'max_minutes',
    title: 'Maximum source duration (min)',
    field: 'source_duration_minutes',
    bound: 'max',
  },
  {
    key: 'station_miles',
    title: 'Maximum distance to station (mi)',
    field: 'station_distance_miles',
    bound: 'max',
  },
] as const;

function numericValue(value: string | null) {
  if (!value || !/^\d+(?:\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

const searchText = new Map(
  published.map((walk) => [
    walk.slug,
    normalize(
      [
        walk.slug,
        walk.title,
        walk.start_location,
        walk.area,
        walk.station_name,
        walk.summary,
        walk.source_name,
      ].join(' '),
    ),
  ]),
);
const collator = new Intl.Collator('en-GB', {
  numeric: true,
  sensitivity: 'base',
});

export function browse(params: URLSearchParams) {
  const query = normalize(params.get('q') ?? '')
    .trim()
    .split(/\s+/);
  const selectedFeatures = params
    .getAll('feature')
    .filter((value): value is (typeof features)[number] =>
      features.some((feature) => feature === value),
    );
  const selections = selectFilters.map((filter) => ({
    ...filter,
    selected: filter.options.find((value) => value === params.get(filter.key)),
  }));
  const bounds = numericFilters.map((filter) => ({
    ...filter,
    value: numericValue(params.get(filter.key)),
  }));
  const matches = published.filter(
    (walk) =>
      query.every((word) => searchText.get(walk.slug)?.includes(word)) &&
      selectedFeatures.every((feature) => walk[feature]) &&
      selections.every(
        ({ field, selected }) => !selected || walk[field] === selected,
      ) &&
      bounds.every(({ field, bound, value }) => {
        const actual = walk[field];
        return (
          value === null ||
          (actual !== null &&
            (bound === 'min' ? actual >= value : actual <= value))
        );
      }),
  );
  const sort = params.get('sort');
  matches.sort((a, b) => {
    if (sort === 'title')
      return (
        collator.compare(a.title, b.title) || collator.compare(a.slug, b.slug)
      );
    if (sort === 'shortest' && a.distance_miles !== b.distance_miles)
      return a.distance_miles - b.distance_miles;
    if (sort === 'longest' && a.distance_miles !== b.distance_miles)
      return b.distance_miles - a.distance_miles;
    return collator.compare(a.slug, b.slug);
  });
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const requested = numericValue(params.get('page'));
  const page =
    requested && Number.isInteger(requested)
      ? Math.min(requested, totalPages)
      : 1;
  return {
    page,
    totalPages,
    total: matches.length,
    selectedFeatures,
    selections,
    bounds,
    results: matches.slice((page - 1) * pageSize, page * pageSize),
  };
}
