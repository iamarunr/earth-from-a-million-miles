// How dates, times, places and distances are written on the page. Everything is in UTC.

const day = (date: string) => new Date(date + 'T00:00:00Z')

export const pad = (n: number) => String(n).padStart(2, '0')
/** 02:29 */
export const fmtTime = (d: Date) => d.toISOString().slice(11, 16)
/** 21 August 2017 */
export const fmtLongDate = (date: string) =>
  day(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
/** 21 Aug */
export const fmtShortDay = (date: string) => day(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
/** 21 Aug 2017 */
export const fmtDay = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
/** 21 Aug 2017, 18:26 UTC */
export const fmtWhen = (t: number) =>
  `${new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`
/** 27.8°N 85.5°E */
export const fmtCoord = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`
/** 1,500,000 km */
export const fmtKm = (km: number) => `${Math.round(km).toLocaleString('en-US')} km`
