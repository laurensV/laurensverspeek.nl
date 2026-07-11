// The real Battery Status API, wrapped once for the terminal `battery`
// command, the lvOS tray and the boot notification. Chromium exposes it;
// other engines removed it — `supported` stays false there and everything
// falls back to jokes about mains power.

interface BatteryManager extends EventTarget {
  level: number
  charging: boolean
}

interface BatteryNavigator {
  getBattery?: () => Promise<BatteryManager>
}

let wired = false

export function useBattery() {
  const supported = useState('battery-supported', () => false)
  const level = useState<number | null>('battery-level', () => null)
  const charging = useState<boolean | null>('battery-charging', () => null)

  if (import.meta.client && !wired) {
    wired = true
    const nav = navigator as BatteryNavigator
    void nav.getBattery?.().then((battery) => {
      supported.value = true
      const sync = () => {
        level.value = battery.level
        charging.value = battery.charging
      }
      sync()
      battery.addEventListener('levelchange', sync)
      battery.addEventListener('chargingchange', sync)
    }).catch(() => { /* stays unsupported */ })
  }

  const percent = computed(() => (level.value === null ? null : Math.round(level.value * 100)))

  return { supported, level, charging, percent }
}

/** ASCII battery gauge: [▮▮▮▮▮▯▯▯▯▯] */
export function batteryGauge(level: number, cells = 10): string {
  const filled = Math.round(level * cells)
  return `[${'▮'.repeat(filled)}${'▯'.repeat(cells - filled)}]`
}
