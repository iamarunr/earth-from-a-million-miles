# Earth, From a Million Miles

A globe you can spin, built only from the photographs NASA's EPIC camera took of the whole Earth on one day, from about 1.5 million km away. Pick any day since 13 June 2015, and the natural events NASA was tracking that week (wildfires, storms, floods, sea ice) are marked on the planet.

## How it works

- **Photos:** NASA's [EPIC](https://epic.gsfc.nasa.gov/) API gives 12–22 full-disk photos per day, with the spacecraft's position for each.
- **The globe:** `src/lib/globe.ts` is a WebGL2 shader. For every point on the sphere it runs the photo projection in reverse for each of the day's photos and blends the ones that saw that point most directly. Nothing is pre-stitched. Areas no photo saw (polar night) are left dark.
- **The real photograph:** choosing a photo from the row under the globe turns the globe to the camera's exact viewpoint and dissolves the reconstruction into the actual photo.
- **Events:** NASA's [EONET](https://eonet.gsfc.nasa.gov/) API supplies events from the 7 days up to the chosen day. Their positions are projected onto the globe (`src/lib/epic.ts` holds the projection maths).

## Running it

```bash
npm install
npm run dev
```

No API key is needed.

## Deploying

The site runs on Cloudflare Workers: the built files in `dist` are served as static assets, and a small Worker ([worker/index.js](worker/index.js)) handles one extra path.

NASA's image server sends no CORS headers, so a browser cannot load its photos into WebGL directly. The Worker serves `/epic-archive/*` from `https://epic.gsfc.nasa.gov/archive/*` (EPIC natural-colour photos only) and caches each photo, since published photos never change. In development `vite.config.ts` proxies the same path. Without the proxy, or without WebGL2, the page falls back to showing the photographs themselves.

- `npm run preview:worker` builds the site and runs it locally exactly as Cloudflare will.
- `npm run deploy` builds and publishes from your machine (needs `npx wrangler login` once).
- To deploy on every push instead, connect the GitHub repository in the Cloudflare dashboard. On Cloudflare Pages, set build command `npm run build` and build output directory `dist`; the proxy then runs from [functions/epic-archive](functions/epic-archive). On Workers, set build command `npm run build` and deploy command `npx wrangler deploy`.

## Testing

- `npm test` runs the unit tests (Vitest): where a place lands in a photograph, reading NASA's two services, date handling, and the photo proxy's rules.
- `npm run test:e2e` builds the site and drives it in a real browser (Playwright). The first time, run `npx playwright install` to fetch the browsers.
- `npm run test:all` runs both.

The end-to-end tests answer every NASA request from recorded data in `tests/e2e/fixtures`, so they pass offline and give the same result every day. They cover:

- **The globe** (`globe.spec.ts`): loading, choosing a day, the day's photographs, playing, dragging, keys, zoom buttons and the scroll wheel.
- **Events** (`events.spec.ts`): the list, the panel beside a mark, tapping a mark on the globe, and every way the panel closes.
- **About and footer** (`about.spec.ts`).
- **Fallbacks** (`fallback.spec.ts`): NASA's photo service down, the photo proxy missing, and a browser without WebGL2.
- **Layout** (`layout.spec.ts`): nine screen sizes from a 320px phone to a 1920px desktop.
- **Design rules** (`guidelines.spec.ts`): accessibility (axe, WCAG 2.1 AA), keyboard focus, contrast, the typeface and colour rules in `DESIGN.md`, and reduced motion.

The full suite runs in Chromium. Firefox and WebKit (Safari's engine) run the tests tagged `@smoke`.

## Credits

Imagery: NASA EPIC / NOAA DSCOVR. Events: NASA EONET.
