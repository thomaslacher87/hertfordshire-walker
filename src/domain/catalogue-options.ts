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
