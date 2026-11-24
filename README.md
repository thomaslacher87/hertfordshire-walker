# Hertfordshire Walker

The maintainable rebuild is being delivered in isolated stages while the
existing GitHub Pages catalogue remains live.

## Stage 1: foundation

This branch contains the React and TypeScript foundation, automated checks, a
responsive countryside design system, and GitHub Pages-compatible routing. It
does not deploy over the production catalogue.

```bash
npm install
npm run dev
npm run check
```

The production build uses `/hertfordshire-walker/` as its base path and copies
`dist/index.html` to `dist/404.html` so direct walk URLs can boot the client
router on GitHub Pages.

## Manual Stage 1 checks

1. Open the home route at desktop and mobile widths.
2. Open `/hertfordshire-walker/walk/42` directly from a fresh browser tab.
3. Refresh the walk route and confirm the placeholder remains visible.
4. Confirm keyboard focus is visible on every link.
5. Confirm the current production catalogue has not changed.

## Stage 3: catalogue browsing

Run `npm run build` and `npm exec vite preview`, then open
`/hertfordshire-walker/` on the printed local server. The browse experience
uses the checked-in catalogue snapshot. Filter and sort choices are shareable
through the catalogue URL. Photos with no recorded licence use a link to the
publisher's gallery.

### Manual Stage 3 checks

1. At desktop and mobile widths, search for Marathon Loop and confirm it links
   to `/hertfordshire-walker/walk/115`.
2. Combine terrain, an amenity and a distance limit. Sort by shortest, then
   reload the copied catalogue URL. Confirm the same fields and results.
3. Page through the catalogue and use Back to walks from a result. Confirm
   the prior filters and page return.
4. Refresh walks 1 and 115 directly. Check source links, directions on walk 1,
   photo and missing-coordinate fallbacks, link copying, and the print view.

## Stage 2: catalogue schema and migration

Stage 2 adds the validated catalogue model, a deterministic migration of all
290 legacy walks, Google Sheets-compatible CSV templates, and a quality report.
The migration preserves numeric walk slugs and leaves unsupported values blank
or unchecked. Wheelchair-friendly and dog-friendly fields are deliberately not
part of the catalogue.

```bash
npm run catalogue:migrate
npm run catalogue:check
```

See [docs/catalogue-schema.md](docs/catalogue-schema.md) for the attribute
definitions, evidence policy, and the process for adding a walk.

## Manual Stage 2 checks

1. Review `data/catalogue/migration-report.json` and confirm every warning is a
   missing or questionable source value rather than an invented replacement.
2. Import each CSV in `data/google-sheets/` into an empty Sheet and confirm the
   Walks, Images, and Lists headers and row counts.
3. Spot-check several numeric slugs against `walks.json`, including walk 115.
4. Confirm no wheelchair-friendly or dog-friendly column exists.
5. Confirm the current production catalogue has not changed.
