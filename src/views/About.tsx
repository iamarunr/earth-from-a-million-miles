import type { ReactNode } from 'react'
import { SITE } from '../site'
import { fmtLongDate, type Aim, type EarthDay } from '../useEarthDay'
import { Icon } from './parts'
import './about.css'

/** Days in the archive that show something particular. */
const DAYS: { date: string; what: string; see?: Omit<Aim, 'date'> }[] = [
  {
    date: '2026-08-26',
    what: 'A glacier and the slope beneath it give way in Langtang, Nepal. The flood runs about 100 km down the valley and kills hundreds of people. From this far away only the monsoon cloud shows; the flood itself is marked.',
    see: { eventId: 'EONET_23468', lat: 27.8, lon: 85.5 },
  },
  {
    date: '2026-10-20',
    what: 'Super Typhoon Champi at full strength over the Philippine Sea, three days before it reaches Taiwan.',
    see: { eventId: 'EONET_25339' },
  },
  {
    date: '2026-10-08',
    what: 'Hurricane Isaias strengthens over the Gulf of Mexico, a day before it comes ashore on the northern Gulf coast.',
    see: { eventId: 'EONET_25063' },
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

function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

export function About({ s }: { s: EarthDay }) {
  const dates = s.dates
  const first = dates?.[0]
  const last = dates?.[dates.length - 1]

  const visit = (date: string, see?: Omit<Aim, 'date'>) => {
    s.pickDate(date, undefined, see)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <h2 id="about-title">About this project</h2>
      <p className="about-lead">
        Every picture of Earth on this page is a real photograph. A camera a million miles from home photographs the
        whole sunlit face of the planet many times a day, and NASA publishes every one for anyone to use.
      </p>

      <div className="about-rows">
        <article>
          <h3>Where the photographs come from</h3>
          <div>
            <p>
              The camera is called <Out href="https://epic.gsfc.nasa.gov/">EPIC</Out>, the Earth Polychromatic Imaging
              Camera. It rides on DSCOVR, the Deep Space Climate Observatory, a spacecraft run jointly by NOAA, NASA
              and the US Air Force.
            </p>
            <p>
              DSCOVR sits about 1.5 million km from Earth in the direction of the Sun, at a spot where the pull of the
              two bodies balances and a spacecraft can stay put between them. From there it always looks at the daylit
              side. Earth turns underneath, so across one day the camera sees nearly the whole planet, one photograph
              every hour or two.
            </p>
            <p>
              Each colour picture is built from separate exposures through red, green and blue filters. The camera has
              ten filters in all, from ultraviolet to near infrared, and the others are used for science.
            </p>
          </div>
        </article>

        <article>
          <h3>How far back you can go</h3>
          <div>
            <p>
              DSCOVR launched on 11 February 2015 and reached its post that June. The oldest photographs in the archive
              are from <b>13 June 2015</b>.{' '}
              {dates && first && last ? (
                <>
                  Today it holds photographs for <b>{dates.length.toLocaleString('en-GB')} days</b>, the most recent
                  being <b>{fmtLongDate(last)}</b>. New days usually appear a day or two after they happen.
                </>
              ) : (
                'New days usually appear a day or two after they happen.'
              )}
            </p>
            <p>
              Some days are missing. The longest gap runs from late June 2019 to February 2020, when the spacecraft was
              in a protective safe mode. If you ask for a day with no photographs, this page shows the closest earlier
              day that has them.
            </p>
            <p>
              The idea is older than the archive. A spacecraft to show the whole Earth continuously was proposed in
              1998 under the name Triana. It was built, then shelved in 2001 and kept in storage for years before
              being refitted and finally launched as DSCOVR.
            </p>
          </div>
        </article>

        <article>
          <h3>Why it matters</h3>
          <div>
            <p>
              The most famous photograph of the whole Earth, the Blue Marble, was taken by the crew of Apollo 17 in
              1972. It was more than fifty years before people travelled that far from home again. EPIC takes such a
              picture every hour or two.
            </p>
            <p>
              No other camera has this view. Satellites in low orbit see a narrow strip at a time, and those in
              geostationary orbit watch one fixed side from much closer in. Only from this distance can the entire
              sunlit disk be seen at once, from sunrise at one edge to sunset at the other.
            </p>
            <p>
              Scientists use the pictures to measure ozone, cloud height, vegetation, and the dust, smoke and volcanic
              ash in the air. The spacecraft’s main job is different again: it measures the solar wind and gives up to
              an hour’s warning of storms from the Sun that can disturb power grids and satellites.
            </p>
          </div>
        </article>

        <article>
          <h3>Why NASA shares it</h3>
          <div>
            <p>
              NASA’s work is paid for by the public, and its policy is to make the results open. Much of that data is
              offered through <Out href="https://api.nasa.gov/">NASA’s open APIs</Out>, which let any program ask for
              it directly. Nothing here needed permission or payment.
            </p>
            <p>
              This page uses two of them. The <Out href="https://epic.gsfc.nasa.gov/about/api">EPIC API</Out> lists
              each day’s photographs, with the time each was taken, how far away the spacecraft was, and the point on
              Earth directly beneath it. Those numbers are what let this page work out where any place falls in any
              photograph.
            </p>
            <p>
              <Out href="https://eonet.gsfc.nasa.gov/">EONET</Out>, the Earth Observatory Natural Event Tracker,
              gathers reports of wildfires, storms, floods, volcanoes and sea ice from agencies around the world into one
              list. The dots on the globe are those events, placed where they were on the day you chose.
            </p>
          </div>
        </article>

        <article>
          <h3>How this globe is made</h3>
          <div>
            <p>
              The globe is stitched together from one day’s photographs and nothing else. There is no map underneath.
              Any part of the planet the camera did not see that day is left dark, which is why the poles go missing
              in their winter.
            </p>
            <p>
              Choose a photograph from the row beneath the globe and the stitching gives way to that single frame,
              exactly as the camera recorded it.
            </p>
          </div>
        </article>

        <article>
          <h3>Days worth seeing</h3>
          <div>
            <p>
              Play any day and you can watch the planet turn, weather systems drift, and the seasons tilt the poles in
              and out of the light. A few days show something rarer, or something that was in the news.
            </p>
            <ul className="about-days">
              {DAYS.map((d) => (
                <li key={d.date}>
                  <button onClick={() => visit(d.date, d.see)} disabled={!dates}>
                    {fmtLongDate(d.date)}
                  </button>
                  <span>{d.what}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </section>
  )
}

export function Footer() {
  const links = [
    { href: SITE.portfolioUrl, label: 'Portfolio' },
    { href: SITE.coffeeUrl, label: 'Buy me a coffee' },
    { href: SITE.sourceUrl, label: 'Source on GitHub' },
  ].filter((l) => l.href)

  return (
    <footer className="foot">
      <div className="foot-main">
        <p className="foot-by">
          Made by <span>{SITE.author}</span>
        </p>
        <nav className="foot-links" aria-label="Elsewhere">
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
              <Icon name="link" />
            </a>
          ))}
        </nav>
      </div>
      <div className="foot-fine">
        <p>Photographs: NASA EPIC and NOAA DSCOVR. Events: NASA EONET.</p>
        <p>An independent project. Not affiliated with or endorsed by NASA.</p>
        <a href="#top">Back to the globe</a>
      </div>
      <div className="foot-horizon" aria-hidden="true" />
    </footer>
  )
}
