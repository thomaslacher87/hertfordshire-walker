import { describe, expect, it } from 'vitest';
import { walkSchema, type Walk } from './catalogue';

const validWalk: Walk = {
  slug: 'fancy-free--ashridge-loop',
  title: 'Ashridge loop',
  source_name: 'Fancy Free Walks',
  source_walk_id: 'ashridge-loop',
  source_url: 'https://example.com/ashridge-loop',
  status: 'draft',
  last_verified_date: null,
  evidence_notes: '',
  start_location: 'Ashridge',
  area: 'Hertfordshire',
  latitude: 51.8,
  longitude: -0.6,
  distance_miles: 5.5,
  source_duration_minutes: null,
  route_type: 'circular',
  difficulty: null,
  summary: 'A sample walk used to exercise the catalogue schema.',
  practical_notes: '',
  spring: true,
  summer: true,
  autumn: true,
  winter: false,
  pub: false,
  cafe: false,
  toilets: false,
  playground: false,
  picnic_area: false,
  woodland: true,
  fields: false,
  country_lanes: false,
  riverside: false,
  paved_or_towpath: false,
  mixed_surfaces: false,
  flat: false,
  hilly: true,
  steep_sections: false,
  muddy_after_rain: false,
  stiles: false,
  steps: false,
  parking_type: 'unknown',
  parking_note: '',
  station_name: null,
  station_distance_miles: null,
  content_credit: 'Fancy Free Walks',
  licence_note: null,
};

describe('walk catalogue schema', () => {
  it('accepts source-prefixed slugs and supported attributes', () => {
    expect(walkSchema.parse(validWalk)).toEqual(validWalk);
  });

  it('allows all seasons to be unchecked when the source gives no guidance', () => {
    const result = walkSchema.safeParse({
      ...validWalk,
      spring: false,
      summer: false,
      autumn: false,
    });

    expect(result.success).toBe(true);
  });

  it('requires coordinate and station pairs to be complete', () => {
    const coordinates = walkSchema.safeParse({
      ...validWalk,
      longitude: null,
    });
    const station = walkSchema.safeParse({
      ...validWalk,
      station_name: 'Tring',
    });

    expect(coordinates.success).toBe(false);
    expect(station.success).toBe(false);
  });
});
