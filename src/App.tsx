import { useEarthDay } from './useEarthDay'
import { About, Footer } from './views/About'
import EarthView from './views/EarthView'

export default function App() {
  const s = useEarthDay()
  return (
    <>
      <main>
        <EarthView s={s} />
        <About s={s} />
      </main>
      <Footer />
    </>
  )
}
