---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface brief: Earth viewer (the whole app, src/App.tsx)

Scope: the single screen of the app. Visitor mode: Experience.
Audience: hiring managers on laptops and anyone with the link on a phone, weighted equally.
Job: see the real Earth for a chosen day, look up a date of their own, and see natural events on the planet.
Constraints: no feature may be dropped (date picking, the day's photos, event marks, filters, event list, lat/long grid, zoom, the event panel with its source link).
History: the user first chose a navy, serif and film-strip direction ("Editorial"), then pointed to ceciliamaterials.com for its "clean look, the font typography and the design", compared a clean monochrome version side by side with Editorial, and chose "Clean look". This direction is pinned by the user and replaces Editorial entirely.

## Direction contract

THESIS: A globe you can spin with your hand, made only from the photographs taken on one day, shown with nothing around it but black, white type and a few thin outlines. The planet and the event marks are the only colour on the page.

OWN-WORLD: Black ground with a very faint grey lift behind the globe. White ink in three steps. One grotesque, Geist, at regular weight only, for everything: large tight headings, compact body text, and small uppercase labels with open tracking for buttons, chips and list headings. Controls are thin outlined pills; the two main actions (Play and Random day) carry a second fainter ring, and Play is filled pale atmosphere blue, the one accent. Event marks are plain dots in five data colours; the chosen one gets a thin white circle. The day's photographs are a row of small round planets under a hairline. The chosen event's panel is a dark rounded rectangle with a hairline border, the one solid object on the page. No serif, no handwriting, no texture, no glass blur.

STORY: The visitor sees a real Earth turning, understands it is built from that day's photographs, drags it, picks a frame and watches the reconstruction become the actual photograph, then tries a date of their own and reads what was happening on the planet.

FIRST VIEWPORT: Desktop: three columns over one full-width row of the day's photographs. Left, the large title, two sentences, the date, date controls and one caption sentence saying where the globe is facing and which photograph is nearest. Centre, the globe filling the column height, slowly turning, with event marks on it and one line beneath saying whether this is a reconstruction or a photograph. Right, an uppercase label, the event filters and the list with no panel behind them. Bottom, Play, a line of small print, the grid toggle and the row of photographs. Phone: title and two sentences, then the globe at full width with zoom buttons and the chosen event's panel beneath it, then Play and the photographs, then the date and its controls, the caption, then events.

SIGNATURE INTERACTION: Drag the globe to spin it in any direction with momentum. Choosing a photograph turns the globe to the camera's exact viewpoint and the reconstruction dissolves into the real photograph. Choosing an event, on the globe or in the list, turns the globe to it; on arrival a thin circle draws around it and the event panel appears beside it with the details and the source link; swiping the globe, pressing elsewhere or Escape closes it. The globe zooms like a round magnifier, and a tap on a crowded cluster zooms into it. Play steps through the day's real photographs.

FORM: User-pinned from a reference site after a side-by-side comparison; it supersedes the earlier dial and contact-sheet fusion. Seed key 9bb6e286 (the original roll, kept for the record).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
