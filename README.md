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
