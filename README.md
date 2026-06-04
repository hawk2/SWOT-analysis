# Yearbook SWOT Dashboard

A static dashboard for reviewing yearbook SWOT notes, outcome errors, recurring themes, actionable feedback, and top recurring patterns by quadrant.

## Pages

- `index.html`: searchable Post-it notes and outcome errors
- `themes.html`: recurring themes with supporting notes
- `feedback.html`: recommendations with evidence and expected impact
- `top5.html`: top recurring SWOT and outcome error patterns by quadrant

## Run Locally

Open `index.html` directly in a browser, or serve the folder locally:

```sh
npm run serve
```

Then visit `http://localhost:8000`.

## Validate

The dashboard has no build step. The check script validates JavaScript syntax and confirms that notes, themes, recommendations, and outcome errors are internally consistent.

```sh
npm test
```

## Data

- `data.js` defines `window.SWOT_DATA`.
- `app.js` renders each page from that shared data object.
- Outcome errors use the `Outcome Errors` quadrant, so X notes can be searched, filtered, linked, themed, and included in Top 5 like the other SWOT quadrants.
- Items marked `[unclear]` preserve unreadable handwriting; it is not the AI's fault, even humans could not read those parts.

## GitHub Pages

This repo includes a GitHub Actions workflow that deploys the static site from the repository root when changes are pushed to `main`. In the repository settings, set Pages to use **GitHub Actions** as the source.

No license has been selected yet. Add one before publishing publicly if reuse permissions matter.
