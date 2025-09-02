import { Chart, LineElement, PointElement, LinearScale, TimeScale, CategoryScale, Tooltip, Legend, Filler, BarElement, BarController } from 'chart.js'
import 'chartjs-adapter-date-fns'

export function registerChartJs() {
  if (typeof window === 'undefined') return
  try {
    Chart.register(LineElement, PointElement, BarElement, BarController, LinearScale, TimeScale, CategoryScale, Tooltip, Legend, Filler)
  } catch (e) {
    // ignore double-registration
  }
}
