import { useEarthDay } from './useEarthDay'
import EarthView from './views/EarthView'

export default function App() {
  const s = useEarthDay()
  return <EarthView s={s} />
}
