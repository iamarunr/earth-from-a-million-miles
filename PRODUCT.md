# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Two audiences, weighted equally (confirmed):
- Hiring managers and engineering leads who open it from a portfolio, usually on a laptop, with a minute or two to judge craft.
- Anyone who receives the link, often on a phone, who wants to see Earth and try a date of their own.

## Product Purpose
"Earth, From a Million Miles" shows real photographs of the whole sunlit Earth for any day since 13 June 2015, and places the natural events NASA was tracking that week (wildfires, storms, floods, sea ice, volcanoes) on the planet at their true positions. A visit succeeds when the visitor leaves remembering three things: they saw a real photograph of the whole Earth, they looked up a date that matters to them, and they saw events placed on the turning planet.

## Positioning
The photographs are real, daily, full-disk images from the EPIC camera on the DSCOVR spacecraft about 1.5 million km away, and event positions are computed onto each photo from the spacecraft's own position data. The globe the visitor spins is a reconstruction built live from that day's photographs and nothing else, and it says so; any single frame can be shown as the untouched photograph. It is not an artist's globe or a map.

## Operating Context
A static web app (Vite, React, TypeScript) calling two public NASA services directly from the browser: EPIC for imagery and EONET for events. No API key. The 3D globe needs NASA's photos served from the site's own origin, so a deployed site needs one small image proxy (a serverless function or rewrite); without it the page falls back to showing the photographs themselves. A day is shareable as a URL (`?date=YYYY-MM-DD`). It is a portfolio piece and has not been deployed.

## Capabilities and Constraints
- Date selection for any day with imagery since 2015-06-13; some days have no photos and snap to the nearest earlier day.
- 12–22 photos per day (as few as 1–2 on early dates). They build a globe that can be spun freely and zoomed. Play steps through the day's real photographs in order; any photograph can be chosen from the row under the globe.
- Event marks on the globe. Selecting one, on the globe or in the list, turns the globe to it and opens a panel at the mark with what it is, where, when it was last reported, its size or strength where known, and a link to the source report. A tap on a crowded cluster zooms into it.
- Category filters, full event list, optional latitude/longitude grid. None of these may be dropped (confirmed).
- Photos are 1080px JPEGs with black space around the disk; NASA's image server sends no CORS headers, so WebGL can only use them through the same-origin proxy.
- Events come from the 7 days up to the chosen day.
- Must work across current browsers and from phone to desktop.

## Brand Commitments
- Name: Earth, From a Million Miles.
- The user asked for Apple-level design craft and a result that looks expensive, while being unique and not a copy of apple.com (confirmed).
- Visual direction chosen by the user after comparing two working looks: a clean monochrome design in the manner of ceciliamaterials.com (black ground, one grotesque typeface at regular weight, large tight headings, small uppercase labels, outlined pills). That site's own typeface and gradient accent are not used.
- It must not look like a dashboard, and must not use a sci-fi cockpit look (neon, HUD frames, mission-control decoration) (confirmed).

## Evidence on Hand
Live NASA EPIC imagery and metadata, and live EONET events. No testimonials, usage numbers, press or awards exist; none may be invented. Credit lines: NASA EPIC / NOAA DSCOVR, NASA EONET.

## Product Principles
- The photograph is the product; everything else serves it.
- Every number and position shown is real and computed, never decorative.
- A visitor's own date is the way in.
- Nothing is removed for looks; features are made quieter, not fewer.
