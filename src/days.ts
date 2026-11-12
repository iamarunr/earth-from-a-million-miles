// Days chosen by hand: shown under "Days worth seeing", and, while they are
// still recent, in the row of recent events at the top of the page.

/** What the globe should turn to once the day has loaded. */
export interface See {
  /** An event in NASA's tracker: the globe turns to it and opens its panel. */
  eventId?: string
  /** Where to turn if there is no event, or it cannot be found. */
  lat?: number
  lon?: number
  /** A moment (UTC): the photograph taken closest to it is shown. */
  time?: string
}

export interface Day {
  date: string
  what: string
  see?: See
  /** A short name. Days that have one are offered at the top of the page while they are recent. */
  title?: string
  /** The kind of event, for the colour of its dot. */
  category?: string
}

/** Days in the archive that show something particular. */
export const DAYS: Day[] = [
  {
    date: '2026-08-26',
    what: 'A glacier and the slope beneath it give way in Langtang, Nepal. The flood runs about 100 km down the valley and kills hundreds of people. From this far away only the monsoon cloud shows; the flood itself is marked.',
    see: { eventId: 'EONET_23468', lat: 27.8, lon: 85.5 },
    title: 'Nepal flood',
    category: 'floods',
  },
  {
    date: '2026-10-20',
    what: 'Super Typhoon Champi at full strength over the Philippine Sea, three days before it reaches Taiwan.',
    see: { eventId: 'EONET_25339' },
    title: 'Super Typhoon Champi',
    category: 'severeStorms',
  },
  {
    date: '2026-10-11',
    what: 'A second flash flood in Nepal, this one down the Budhi Gandaki river in Gorkha. It takes out bridges and homes and strands more than a hundred trekkers on the Manaslu route.',
    see: { eventId: 'EONET_25241', lat: 28.0, lon: 84.6 },
    title: 'Second Nepal flood',
    category: 'floods',
  },
  {
    date: '2026-10-08',
    what: 'Hurricane Isaias strengthens over the Gulf of Mexico, a day before it comes ashore on the northern Gulf coast.',
    see: { eventId: 'EONET_25063' },
    title: 'Hurricane Isaias',
    category: 'severeStorms',
  },
  {
    date: '2017-08-21',
    what: 'The Moon’s shadow crosses the United States during a total solar eclipse.',
    see: { time: '2017-08-21T18:26:00Z' },
  },
  {
    date: '2024-04-08',
    what: 'The shadow again, this time from Mexico to eastern Canada.',
    see: { time: '2024-04-08T18:17:00Z' },
  },
  { date: '2023-06-21', what: 'June solstice. The Arctic is tipped towards the camera, in daylight all day.' },
  { date: '2023-12-21', what: 'December solstice. Now Antarctica is in view and the Arctic is gone.' },
]
