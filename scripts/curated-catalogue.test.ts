import { describe, expect, it } from 'vitest';
import { loadCuratedWalks } from './curated-catalogue';

const sample = {
  publisher: 'swc',
  source_walk_id: '168',
  source_url:
    'https://www.walkingclub.org.uk/walk/broxbourne-circular/sample.pdf',
  last_verified_date: '2026-11-25',
  facts: {
    title: 'Sample circular walk',
    start_location: 'Sample Station',
    distance_miles: 3,
    summary: 'A woodland circuit.',
    woodland: true,
  },
  evidence: {
    title: 'Guide heading.',
    start_location: 'Walk start field.',
    distance_miles: 'Distance field.',
    summary: 'Introduction.',
    woodland: 'Terrain description.',
  },
};

describe('curated walk ingestion', () => {
  it('preserves permanent source identity and leaves unrecorded facts unset', () => {
    expect(loadCuratedWalks([sample])[0]).toMatchObject({
      slug: 'swc--168',
      woodland: true,
      summer: false,
      latitude: null,
      source_duration_minutes: null,
    });
  });

  it('rejects a fact without a matching evidence note', () => {
    expect(() =>
      loadCuratedWalks([
        { ...sample, facts: { ...sample.facts, winter: true } },
      ]),
    ).toThrow(/winter must be paired/);
  });

  it('rejects a route on another publisher’s domain', () => {
    expect(() =>
      loadCuratedWalks([
        { ...sample, source_url: 'https://example.com/route' },
      ]),
    ).toThrow(/publisher's HTTPS site/);
  });
});
