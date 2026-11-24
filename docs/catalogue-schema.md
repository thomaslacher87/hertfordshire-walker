# Catalogue schema and curation rules

The Google Sheet is the future editorial source of truth. Stage 2 keeps the
same structure locally in JSON and import-ready CSV files so every migration is
reviewable before Sheet synchronisation is enabled.

## Tabs

- **Walks**: one row per walk and the complete set of filterable facts.
- **Images**: zero or more ordered images associated by permanent walk slug.
- **Lists**: protected dropdown values used for Sheet data validation.

The CSV files in `data/google-sheets/` can be imported as these three tabs.

## Required identity

Every walk has a permanent `slug`, title, publisher name, publisher-specific
identifier, canonical source URL, and publication status. Existing walks retain
their numeric slugs. Future external walks use source-prefixed slugs.

Never reuse a slug for a different walk. Set a removed walk to `archived` rather
than deleting it, so existing links can continue to explain what happened.

## Evidence policy

Catalogue attributes describe facts supported by the linked publisher page.
Checkboxes mean “supported by the source,” not “definitively yes or no.” An
unchecked box therefore means “not evidenced.” Personal observations belong in
the owner review added in Stage 7.

Do not infer difficulty, amenities, parking, obstacles, or terrain from prose.
During this migration, route type is normalised only when the legacy source
title explicitly says loop, circular, linear, or figure-of-eight.

Wheelchair-friendly and dog-friendly attributes are intentionally absent from
the schema, Sheet templates, filters, and generated data.

## Adding a walk

1. Duplicate the Walks template row and leave `status` as `draft`.
2. Assign a permanent slug and enter the source identity and canonical URL.
3. Enter the supported location and route facts.
4. Use only the Lists tab values and checkbox columns.
5. Add a concise paraphrased summary and evidence notes.
6. Add permitted images to Images with alt text, credit, and licence details.
7. Run the catalogue validation workflow.
8. Change the record to `published` only after the warnings are reviewed.

## Migration decisions

- Unsupported new fields remain blank or unchecked; values are never invented.
- `year-round` legacy records become all four seasonal checkboxes.
- The ambiguous legacy tag `stiles or steps` sets neither checkbox and is listed
  for manual review.
- Existing image credits are retained, but unknown licence details remain blank
  and are counted in the migration report.
- Missing coordinates, stations, galleries, route types, verification dates,
  and identifier gaps appear in `migration-report.json` as warnings rather than
  invalidating otherwise usable legacy records.

## Commands

```bash
npm run catalogue:migrate
npm run catalogue:check
```

The first command regenerates the canonical JSON, Sheet CSVs, and quality
report. The second verifies that generated files match the legacy snapshot and
that all records, relations, controlled values, and prohibited attributes pass
validation.
