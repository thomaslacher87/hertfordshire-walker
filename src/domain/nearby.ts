export type Point = { latitude: number; longitude: number };
export type Place = Point & { label: string; id: string };
export type Nearby = { origin: Point; radiusMiles: number };

type WalkStart = {
  slug: string;
  start_location: string;
  latitude: number | null;
  longitude: number | null;
};

export function hasCoordinates<
  T extends { latitude: number | null; longitude: number | null },
>(item: T): item is T & Point {
  return item.latitude !== null && item.longitude !== null;
}

export function milesBetween(a: Point, b: Point) {
  const radians = Math.PI / 180;
  const latitude = Math.sin(((b.latitude - a.latitude) * radians) / 2);
  const longitude = Math.sin(((b.longitude - a.longitude) * radians) / 2);
  const arc =
    latitude ** 2 +
    Math.cos(a.latitude * radians) *
      Math.cos(b.latitude * radians) *
      longitude ** 2;
  return 3958.76 * 2 * Math.asin(Math.sqrt(Math.min(1, arc)));
}

function searchKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// A miniature gazetteer derived from the catalogue, with no external lookups.
// Pick a named start explicitly because the coordinates describe a walk start.
export function makePlaceSearch(walks: readonly WalkStart[]) {
  const byName = new Map<string, Place>();
  for (const walk of walks.filter(hasCoordinates)) {
    const name = searchKey(walk.start_location);
    const key = `${name}:${walk.latitude.toFixed(3)}:${walk.longitude.toFixed(3)}`;
    if (!byName.has(key))
      byName.set(key, {
        id: walk.slug,
        label: walk.start_location,
        latitude: walk.latitude,
        longitude: walk.longitude,
      });
  }
  const places = [...byName.values()].sort((a, b) =>
    a.label.localeCompare(b.label, 'en-GB'),
  );
  const cache = new Map<string, Place[]>();
  return (query: string) => {
    const key = searchKey(query);
    if (key.length < 2) return [];
    const cached = cache.get(key);
    if (cached) return cached;
    const matches = places.filter((place) =>
      searchKey(place.label).includes(key),
    );
    const results = [
      ...matches.filter((place) => searchKey(place.label).startsWith(key)),
      ...matches.filter((place) => !searchKey(place.label).startsWith(key)),
    ].slice(0, 8);
    if (cache.size >= 80) {
      const first = cache.keys().next();
      if (!first.done) cache.delete(first.value);
    }
    cache.set(key, results);
    return results;
  };
}
