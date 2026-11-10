---
name: Earth, From a Million Miles
description: A spinnable globe built from one day's real photographs, shown on black with white type and thin outlines.
colors:
  accent: "#a9cbff"
  mark-wildfires: "#ff5b3a"
  mark-severe-storms: "#ffffff"
  mark-floods: "#ffd60a"
  mark-sea-lake-ice: "#7cc8ff"
  mark-volcanoes: "#ff9a1f"
  notice: "#ffd9a0"
  ground: "#000000"
  lift: "#141414"
  panel: "#0e0e0e"
  ink: "#ffffff"
  soft: "#c4c4c4"
  dim: "#8f8f8f"
  line: "rgba(255, 255, 255, 0.24)"
  faint: "rgba(255, 255, 255, 0.14)"
  wash: "rgba(255, 255, 255, 0.07)"
  wash-selected: "rgba(255, 255, 255, 0.1)"
typography:
  display:
    fontFamily: "'Geist Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "clamp(2.7rem, 10.5vw, 4.2rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Geist Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "clamp(1.7rem, 5.6vw, 2.1rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Geist Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Geist Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body-small:
    fontFamily: "'Geist Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  label:
    fontFamily: "'Geist Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.06em"
  label-small:
    fontFamily: "'Geist Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.06em"
  figure:
    fontFamily: "'Geist Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
    fontFeature: "'tnum'"
rounded:
  row: "8px"
  panel: "18px"
  pill: "999px"
  round: "50%"
spacing:
  pill-gap: "6px"
  control-pad: "14px"
  panel-pad: "18px"
  gutter-phone: "20px"
  section: "28px"
  gutter-tablet: "32px"
  column-gap-desktop: "40px"
  gutter-desktop: "44px"
components:
  button-pill:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
  button-play:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ground}"
    rounded: "{rounded.round}"
    size: "44px"
  button-play-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  toggle-pill:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
  toggle-pill-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  button-zoom:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.round}"
    size: "40px"
  list-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
    padding: "9px 8px"
  list-row-hover:
    backgroundColor: "{colors.wash}"
  list-row-selected:
    backgroundColor: "{colors.wash-selected}"
  event-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.panel}"
    padding: "18px"
    width: "272px"
  photo-thumb:
    backgroundColor: "transparent"
    textColor: "{colors.dim}"
    typography: "{typography.figure}"
    rounded: "{rounded.round}"
  photo-thumb-current:
    textColor: "{colors.ink}"
---

# Design System: Earth, From a Million Miles

## Overview

**Creative North Star: "Nothing But The Planet"**

The screen is a black field holding one photographic object, the globe, with white type and a few thin outlines set around it. Everything that is not the planet is drawn in white at one of three strengths, in one typeface at one weight. There is no chrome: no cards behind the lists, no header bar, no dividers except one hairline above the day's photographs. The system is calm, exact and quiet, so that the photograph reads as the only rich thing on the page.

Colour is rationed. The planet carries the colour. Five data colours mark natural events on it, and the same five appear as small dots beside the matching filter chips and list rows. One pale atmosphere blue fills the Play button. Hierarchy comes from size and from the three ink steps, never from weight: the title is large and tight, body text is compact, and controls and list headings are small uppercase labels with open tracking.

Controls are outlines, not objects: thin pills and circles that brighten their border on hover. Exactly one thing on the page is a solid surface, the panel that opens beside a chosen event. The system explicitly rejects serif and handwritten type, texture and glass blur, a dashboard arrangement of boxed panels, and any sci-fi cockpit decoration (neon, HUD frames, mission-control ornament).

**Key Characteristics:**
- Pure black ground with a very faint grey lift behind the globe.
- One grotesque, Geist, at regular weight (400) for every piece of text.
- White ink in three steps; emphasis is a brighter step, not a bolder weight.
- Thin outlined pills and circles for controls; one filled accent button.
- Colour only where it is data: the photograph, the event marks, and Play.
- Everything on one screen at desktop width; one column in a deliberate order on a phone.

## Colors

A monochrome system: black, white at three strengths, and two hairline strengths, with colour reserved for the planet and what is marked on it.

### Primary
- **Atmosphere Blue** (`accent`, #a9cbff): The fill of the Play button and nothing else. Black icon on top. On hover it turns white.

### Secondary
The five event colours. Each is used for the event's dot on the globe and for the 9px dot beside its filter chip, list row and panel heading. They are never used for text, borders or fills.
- **Wildfire Red-Orange** (`mark-wildfires`, #ff5b3a)
- **Storm White** (`mark-severe-storms`, #ffffff)
- **Flood Yellow** (`mark-floods`, #ffd60a)
- **Ice Blue** (`mark-sea-lake-ice`, #7cc8ff)
- **Volcano Amber** (`mark-volcanoes`, #ff9a1f)

### Tertiary
- **Notice Amber** (`notice`, #ffd9a0): Text colour of the one-sentence notice shown when a chosen date has no photographs and the app moves to a nearby day. A pale warm tint, used only for that message.

### Neutral
- **Black** (`ground`, #000000): The page. Also the icon colour on Play and the text colour on a pressed toggle.
- **Lift** (`lift`, #141414): The centre of a radial gradient (80% by 60%, centred at 50% 40%, fading to black at 72%) that sits behind the globe.
- **Panel** (`panel`, #0e0e0e): Background of the event panel, the one solid surface.
- **Ink** (`ink`, #ffffff): Headings, the date, control text, list rows, links, focus outlines, the selection circle, hover borders.
- **Soft** (`soft`, #c4c4c4): Running text: the two-sentence introduction, the caption, the event summary, loading messages.
- **Dim** (`dim`, #8f8f8f): Small print: the line under the globe, counts inside chips, photo times, the credit line, events on the far side of the planet.
- **Line** (`line`, rgba(255, 255, 255, 0.24)): The 1px border of every pill and circle at rest.
- **Faint** (`faint`, rgba(255, 255, 255, 0.14)): The hairline above the row of photographs and the rule inside the event panel.
- **Wash** (`wash`, rgba(255, 255, 255, 0.07)) and **Selected Wash** (`wash-selected`, rgba(255, 255, 255, 0.1)): Hover and selected backgrounds of event list rows.

### Named Rules
**The Colour Is Data Rule.** Saturated colour appears only on the photograph and on event marks and their matching dots. The five event colours are never used for text, borders, backgrounds or decoration.

**The One Accent Rule.** Atmosphere Blue belongs to Play. No second element is filled with it.

**The Three Steps Rule.** Text is Ink, Soft or Dim. To emphasise a phrase inside running text, raise it one step (Soft to Ink); do not change its weight.

## Typography

**Display Font:** Geist Variable (with Helvetica Neue, Helvetica, Arial, sans-serif)
**Body Font:** Geist Variable (same stack)
**Label Font:** Geist Variable (same stack)

**Character:** One neutral grotesque does everything, always at regular weight. Large text is set tight with negative tracking; small labels are set in capitals with open tracking. The contrast between those two treatments is the whole typographic voice.

### Hierarchy
- **Display** (400, clamp(2.7rem, 10.5vw, 4.2rem), line-height 0.98, tracking -0.025em): The page title only. At desktop width it uses clamp(3rem, 4.5vw, 4.6rem).
- **Headline** (400, clamp(1.7rem, 5.6vw, 2.1rem), line-height 1, tracking -0.02em, lining numerals): The chosen date.
- **Title** (400, 22px, line-height 1.05, tracking -0.02em): The event name at the top of the event panel. The same treatment at 18px labels a chosen event in the fallback view.
- **Body** (400, 16px, line-height 1.3, tracking -0.01em): Introduction, caption, summary. Line length is held between 36ch and 46ch.
- **Body Small** (400, 14px, line-height 1.3): Panel text, source links, the line under the globe. Event list rows use 15px; the credit line uses 12px.
- **Label** (400, 13px, line-height 1, tracking 0.06em, uppercase): Text on pills, chips, toggles and the small print beside Play. The events heading uses the same treatment at 14px with 0.07em tracking.
- **Label Small** (400, 11px, line-height 1.3, tracking 0.06em, uppercase): Terms above values in the event panel and readouts; the category line under the panel title.
- **Figure** (400, 11px, line-height 1, tracking 0.02em, tabular numerals): Frame number and time under each photograph.

### Named Rules
**The One Weight Rule.** Every piece of text is weight 400. Bold and strong elements are reset to 400. Nothing on the page is bold, medium or light.

**The Two Tracks Rule.** Sentence-case text is tracked negative (-0.01em to -0.025em, tighter as it gets larger). Uppercase labels are tracked positive (0.06em). There is no text between the two: no uppercase heading at display size, no sentence-case label with open tracking.

**The Tabular Figures Rule.** Any number that changes while the visitor watches (coordinates, times, distances, the date field) uses tabular numerals so the text does not shift.

## Layout

The page is a grid of four named areas: the title block, the globe, the day's photographs, and the events. The areas never sit inside boxes; black space separates them.

- **Desktop (1100px and wider):** Everything fits in one screen (height 100dvh, no page scroll). Three columns, `minmax(250px, 1fr) minmax(0, 1.7fr) minmax(260px, 1fr)`, with 40px between columns and a 44px gutter. The title block is centred vertically in the left column, the globe fills the centre column's height, and the events column scrolls inside itself with its last 40px fading out. The photographs run as one full-width row along the bottom, centred.
- **Wide but short (1100px and wider, under 780px tall):** The page scrolls instead of fitting. The globe is capped at 560px and the event list at 440px.
- **Tablet (720px to 1099px):** Two columns, title block (0.8fr) beside the globe (1fr), then the photographs, then events with the list in two columns. Gutter 32px.
- **Phone (under 720px):** One column in a fixed order: title, introduction, globe, photographs, date, date controls, notice, caption, events. The globe comes straight after the title and the photographs straight after the globe, so choosing one shows the change. Gutter 20px. The event list flows with the page; there is no scroll area inside a scroll area.

The globe is a square that scales with its column, up to 640px wide below desktop width. Spacing is compact: 6px between neighbouring pills, chips and photographs; 14px inside controls and between small groups; 28px between sections. The row of photographs is the only full-bleed element; it breaks out of the gutter and scrolls sideways on narrow screens with no visible scrollbar. Safe-area insets are added to the gutters and the top and bottom padding.

## Elevation & Depth

The system is flat. Depth is carried by the photograph and by two effects only.

### Shadow Vocabulary
- **Panel drop** (`box-shadow: 0 24px 60px -20px #000`): Under the event panel, to separate it from the globe it floats over.
- **Globe halo** (`box-shadow: 0 0 120px 10px rgba(120, 150, 200, 0.07)`): A very faint cool glow around the globe, inset 5% from its edge.
- **Second ring** (`box-shadow: 0 0 0 5px #000, 0 0 0 6px rgba(255, 255, 255, 0.16)`): Not a shadow in effect: a 1px ring drawn 5px outside the border of the two main actions, Play and Random day.

### Named Rules
**The One Solid Object Rule.** The event panel is the only element with a filled background and a drop shadow. Lists, filters, the title block and the photographs sit directly on the black ground with nothing behind them.

## Shapes

Three shapes, each with one job. Controls are pills (999px radius) or circles (50%). The event panel is a rounded rectangle (18px). Event list rows have a soft 8px corner that shows only when the row is hovered or selected. Everything round echoes the planet: the globe, the photographs in the row, the event dots, the selection circle, the Play and zoom buttons.

All borders are 1px. Icons are drawn as 24-unit outlines with a 1.5 stroke, round caps and joins, at 1.25em; the Play triangle is the only filled icon. There are no square corners on any control and no borders heavier than 1px, except the focus outline (2px solid white, 3px offset).

## Components

Controls are quiet outlines that brighten on contact. Transitions on colour and border take 0.2s; list row backgrounds take 0.15s. Disabled controls drop to 35% opacity. Larger movements use one easing curve, `cubic-bezier(0.2, 0.8, 0.2, 1)`, and all motion collapses under `prefers-reduced-motion`.

### Buttons
- **Shape:** Pill (999px radius), 40px tall, 14px side padding, 1px Line border, no fill, Label text, optional icon with a 6px gap.
- **Hover / Focus:** Border turns white. Focus shows a 2px white outline at 3px offset.
- **Main action (Random day):** The same pill with the second ring around it.
- **Play:** A 44px circle filled Atmosphere Blue with a black icon and the second ring. Hover turns it white.
- **Zoom:** 40px circles with a 1px Line border and a black fill so they stay readable over the globe. They sit stacked in the globe's lower right corner, and move to a row under the globe on a phone.
- **Show all:** A full-width pill, 44px tall, with Soft text, at the end of a long event list.

### Chips
- **Style:** A 36px pill with a 1px Line border: a 9px dot in the category's event colour, the category name in Label, and a count in Dim.
- **State:** On by default. Switched off, the chip drops to 45% opacity and its text is struck through. Hover brightens the border.

### Toggle
- **Style:** The same pill as a button, with an icon. Used for the latitude and longitude grid.
- **State:** Pressed, it inverts: white fill, white border, black text.

### Inputs / Fields
- **Style:** The date field is a native date input shaped as a pill, identical to the buttons on either side of it (previous day, next day), with tabular numerals and a white caret.
- **Focus:** The shared 2px white outline.

### Event list
- **Style:** Plain rows on the black ground, 15px text, at least 40px tall: a 9px event-colour dot, then the event name.
- **State:** Hover adds Wash; the selected row adds Selected Wash and reveals an underlined "Source report" link beneath it. Events on the far side of the planet are set in Dim.

### Event panel
The one solid object. A 272px rounded rectangle (18px radius, 18px padding) with a Panel background, a 1px white border at 20% opacity and the panel drop shadow.
- **Contents:** Title, then a Label Small line with the event-colour dot, category and coordinates, then a Faint rule and a list of term and value pairs (term in Label Small, value in Body Small with tabular numerals), then an underlined source link with a small arrow icon. A 40px round close button sits in the top right corner.
- **Behaviour:** At desktop width it is pinned beside the chosen mark on the globe and stays within the globe's column. Below 1100px it sits in the page under the globe, up to 420px wide. It enters by fading in from 96% scale over 0.35s.

### Photograph row
The day's photographs as a row of small round planets under a Faint hairline.
- **Style:** Each is a circular thumbnail (54px to 92px wide, 6px apart) with its frame number and time beneath in Figure.
- **State:** Photographs at rest are at 45% opacity with Dim text. The current one is at full opacity with white text and a 1px white circle drawn 2px outside it. Hover brings a photograph to full opacity.
- **Bar above it:** Play at the left, a single line of Dim Label small print, and the grid toggle at the right.

### The globe
- **Marks:** Each event is a plain filled dot, 7.2px across, in its event colour, fading as it nears the edge of the planet. The chosen event gets a thin white circle (1.25px line, 26px across) that draws itself clockwise from the top in about half a second once the globe has finished turning.
- **Grid:** When switched on, latitude and longitude lines every 30 degrees are mixed into the surface in white at 30% strength, the equator at 60%, and stay hairline-thin at any zoom.
- **Surface:** The edge of the sphere is shaded to 70% brightness so it reads as round. Surface that no photograph saw that day is left near-black.
- **Arrival:** The globe fades in from 96.5% scale over about 1.1 to 1.4s as its photographs load. Choosing a photograph dissolves the reconstruction into the real photograph over 0.7s.
- **Fallback without 3D:** The day's photographs are shown in place of the globe, with event marks as 8px dots, the same white selection circle, a dashed white track for a moving event, and the chosen event's name set beside its mark instead of the panel.

## Do's and Don'ts

### Do:
- **Do** set every piece of text in Geist at weight 400, and create emphasis by moving up an ink step (Dim, Soft, Ink).
- **Do** build controls as 1px outlined pills (999px radius, 40px tall) or circles that turn their border white on hover.
- **Do** keep saturated colour for the photograph, the five event colours and the Play button.
- **Do** give uppercase labels 0.06em tracking and keep them small (11px to 14px); give sentence-case text negative tracking.
- **Do** place lists, filters and text directly on the black ground, separated by space.
- **Do** use tabular numerals for coordinates, times, distances and dates.
- **Do** keep every feature on the screen at every width; make a feature quieter rather than removing it.

### Don't:
- **Don't** use a serif, a handwritten face or a second typeface of any kind.
- **Don't** use bold, medium or light weights.
- **Don't** add texture, grain, glass blur or a gradient fill on type or controls. The only gradients are the faint lift behind the globe and edge fades on masks.
- **Don't** put a filled panel, card or border box behind the title block, the filters, the event list or the photographs. The event panel is the only solid surface.
- **Don't** arrange the page as a dashboard of boxed widgets, and don't add sci-fi cockpit decoration: neon, glowing outlines, HUD frames or mission-control ornament.
- **Don't** use an event colour or Atmosphere Blue for text, borders or decoration.
- **Don't** stack an uppercase label above a larger heading as a kicker. Labels belong to controls, chips, list headings and the terms in the event panel.
- **Don't** add drop shadows to controls, rows or text blocks. The panel drop and the globe halo are the only two.

## About section and footer

Below the globe the page continues in the same world: black ground, white ink, Geist at weight 400, hairline rules.

- **About** (`src/views/About.tsx`, `about.css`): a large heading, a lead statement at display size, then rows separated by faint rules. Each row is a small uppercase label beside body text in the soft ink, measure capped at 66ch. On desktop the heading stays pinned in the left column while the rows scroll. "Days worth seeing" uses outlined pills that load that date and return to the globe.
- **Footer**: "Made by" label over the author's name at display size (up to 6rem), outlined pill links (portfolio, coffee, source), and a fine-print row. A single thin arc with a faint pale-blue glow rises from the bottom edge, in its own band below the fine print so no text crosses it.
- Links and the author's name come from `src/site.ts`. A link left empty is not shown.
- The header's introduction carries an "About this project" link, since the desktop layout fills exactly one screen and gives no other hint that the page continues.
- Keys: once the page is scrolled past the first screen, keys belong to the page. Up and down turn the globe only when it has focus; otherwise they scroll.
