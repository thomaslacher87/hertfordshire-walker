import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { catalogueSchema } from '../src/domain/catalogue';

const [walksText, imagesText] = await Promise.all([
  readFile(resolve('data/catalogue/walks.json'), 'utf8'),
  readFile(resolve('data/catalogue/images.json'), 'utf8'),
]);

const catalogue = catalogueSchema.parse({
  walks: JSON.parse(walksText),
  images: JSON.parse(imagesText),
});

const errors: string[] = [];
const walkSlugs = new Set<string>();
const sourceKeys = new Set<string>();

for (const walk of catalogue.walks) {
  if (walkSlugs.has(walk.slug)) {
    errors.push(`Duplicate walk slug: ${walk.slug}`);
  }
  walkSlugs.add(walk.slug);

  const sourceKey = `${walk.source_name}\u0000${walk.source_walk_id}`;
  if (sourceKeys.has(sourceKey)) {
    errors.push(
      `Duplicate source identity: ${walk.source_name} / ${walk.source_walk_id}`,
    );
  }
  sourceKeys.add(sourceKey);
}

const imagePositionsByWalk = new Map<string, number[]>();

for (const image of catalogue.images) {
  if (!walkSlugs.has(image.walk_slug)) {
    errors.push(`Image refers to unknown walk: ${image.walk_slug}`);
  }

  const positions = imagePositionsByWalk.get(image.walk_slug) ?? [];
  positions.push(image.position);
  imagePositionsByWalk.set(image.walk_slug, positions);
}

for (const [walkSlug, positions] of imagePositionsByWalk) {
  const sortedPositions = positions.toSorted((left, right) => left - right);
  const expectedPositions = Array.from(
    { length: sortedPositions.length },
    (_, index) => index + 1,
  );

  if (sortedPositions.join(',') !== expectedPositions.join(',')) {
    errors.push(`Image positions are not contiguous for walk ${walkSlug}.`);
  }
}

const serializedCatalogue = `${walksText}\n${imagesText}`;
for (const prohibitedAttribute of ['wheelchair_friendly', 'dog_friendly']) {
  if (serializedCatalogue.includes(prohibitedAttribute)) {
    errors.push(`Prohibited attribute found: ${prohibitedAttribute}`);
  }
}

if (errors.length > 0) {
  throw new Error(`Catalogue validation failed:\n${errors.join('\n')}`);
}

console.log(
  `Validated ${catalogue.walks.length} unique walks and ${catalogue.images.length} related images.`,
);
