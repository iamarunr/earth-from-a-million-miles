import { describe, expect, it } from 'vitest'
import { basis, dot } from '../../src/lib/globe'
import { fmtCoord, fmtKm, fmtLongDate, fmtTime } from '../../src/lib/format'
import { snapToAvailable } from '../../src/useEarthDay'

describe('formatting', () => {
  it('writes times in UTC', () => {
    expect(fmtTime(new Date('2026-11-07T02:29:41Z'))).toBe('02:29')
  })
  it('writes long dates day first, whatever the local time zone', () => {
    expect(fmtLongDate('2017-08-21')).toBe('21 August 2017')
    expect(fmtLongDate('2015-06-13')).toBe('13 June 2015')
  })
  it('writes coordinates with hemisphere letters', () => {
    expect(fmtCoord(-11.34, 136.31)).toBe('11.3°S 136.3°E')
    expect(fmtCoord(8, -74.62)).toBe('8.0°N 74.6°W')
  })
  it('writes distances as whole kilometres', () => {
    expect(fmtKm(1474945.4)).toBe('1,474,945 km')
  })
})

describe('snapToAvailable', () => {
  const dates = ['2015-06-13', '2019-06-27', '2020-02-12', '2026-11-07']
  it('keeps a day that has photographs', () => {
    expect(snapToAvailable(dates, '2020-02-12')).toBe('2020-02-12')
  })
  it('moves a missing day back to the closest earlier one', () => {
    expect(snapToAvailable(dates, '2019-10-01')).toBe('2019-06-27')
  })
  it('never goes before the first or past the last day', () => {
    expect(snapToAvailable(dates, '2001-01-01')).toBe('2015-06-13')
    expect(snapToAvailable(dates, '2099-01-01')).toBe('2026-11-07')
  })
})

describe('globe basis', () => {
  it('gives three unit vectors at right angles for any view', () => {
    for (const [lat, lon] of [[0, 0], [45, 120], [-60, -170], [89, 10]]) {
      const { c, e, n } = basis(lat, lon)
      for (const v of [c, e, n]) expect(dot(v, v)).toBeCloseTo(1, 9)
      expect(dot(c, e)).toBeCloseTo(0, 9)
      expect(dot(c, n)).toBeCloseTo(0, 9)
      expect(dot(e, n)).toBeCloseTo(0, 9)
    }
  })
})
