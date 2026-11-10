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

NASA's image server sends no CORS headers, so a browser cannot load its photos into WebGL directly. In development, `vite.config.ts` proxies `/epic-archive/*` to `https://epic.gsfc.nasa.gov/archive/*`. A deployed site needs the same path served by a small serverless function or rewrite rule. Without it, or without WebGL2, the page falls back to showing the photographs themselves.

## Credits

Imagery: NASA EPIC / NOAA DSCOVR. Events: NASA EONET.
