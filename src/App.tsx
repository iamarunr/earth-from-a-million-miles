import { useEarthDay } from './useEarthDay'
import { About, Footer } from './views/About'
import EarthView from './views/EarthView'

export default function App() {
  const s = useEarthDay()
  return (
    <>
      <EarthView s={s} />
      <About s={s} />
      <Footer />
    </>
  )
}
