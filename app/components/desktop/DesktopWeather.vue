<template>
  <div class="weather is-family-code">
    <div v-if="pending" class="weather-loading">fetching Amsterdam forecast…</div>
    <div v-else-if="error" class="weather-error">
      <p>weather: could not reach open-meteo.</p>
      <button class="weather-retry" @click="load">retry</button>
    </div>
    <template v-else-if="now">
      <div class="weather-now">
        <span class="weather-now-glyph" aria-hidden="true">{{ weatherGlyph(now.code) }}</span>
        <div>
          <p class="weather-now-temp">{{ now.temp }}°</p>
          <p class="weather-now-label">{{ weatherLabel(now.code) }} · Amsterdam</p>
        </div>
      </div>
      <div class="weather-meta">
        <span>💨 {{ now.wind }} km/h</span>
        <span>💧 {{ now.humidity }}%</span>
      </div>
      <div class="weather-days">
        <div v-for="day in days" :key="day.date" class="weather-day">
          <span class="weather-day-name">{{ day.name }}</span>
          <span class="weather-day-glyph" aria-hidden="true">{{ weatherGlyph(day.code) }}</span>
          <span class="weather-day-hi">{{ day.hi }}°</span>
          <span class="weather-day-lo">{{ day.lo }}°</span>
        </div>
      </div>
      <p class="weather-src">source: open-meteo · keyless</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { AMSTERDAM, weatherGlyph, weatherLabel } from '~/utils/weather'

// A full multi-day forecast window for lvOS — same open-meteo upstream as the
// taskbar tray chip, just with more of it.

interface Forecast {
  current: { temperature_2m: number, weather_code: number, wind_speed_10m: number, relative_humidity_2m: number }
  daily: { time: string[], weather_code: number[], temperature_2m_max: number[], temperature_2m_min: number[] }
}

// the tray chip's shared current-reading state: after our own (fresher, fuller)
// fetch lands we push the temp+code back into it, so the tray and the app never
// show two different temperatures for the same city
const chip = useWeatherChip()

const pending = ref(true)
const error = ref(false)
const now = ref<{ temp: number, code: number, wind: number, humidity: number } | null>(null)
const days = ref<{ date: string, name: string, code: number, hi: number, lo: number }[]>([])

const dayName = (iso: string, i: number) =>
  i === 0 ? 'today' : new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' }).toLowerCase()

const load = async () => {
  pending.value = true
  error.value = false
  try {
    const data = await $fetch<Forecast>('https://api.open-meteo.com/v1/forecast', {
      params: {
        ...AMSTERDAM,
        current: 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min',
        timezone: 'auto',
        forecast_days: 5
      },
      timeout: 10_000
    })
    now.value = {
      temp: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
      wind: Math.round(data.current.wind_speed_10m),
      humidity: Math.round(data.current.relative_humidity_2m)
    }
    // keep the tray chip in sync with this fresher reading
    chip.setCurrent(now.value.temp, now.value.code)
    days.value = data.daily.time.map((date, i) => ({
      date,
      name: dayName(date, i),
      code: data.daily.weather_code[i] ?? 0,
      hi: Math.round(data.daily.temperature_2m_max[i] ?? 0),
      lo: Math.round(data.daily.temperature_2m_min[i] ?? 0)
    }))
  } catch {
    error.value = true
  } finally {
    pending.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.weather {
  color: hsl(var(--lv-scheme-hs), 88%);
  font-size: 0.85rem;
  min-width: 15rem;
}

.weather-loading,
.weather-error {
  color: hsl(var(--lv-scheme-hs), 62%);
  padding: 1rem 0;
}

.weather-retry {
  margin-top: 0.5rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius-small);
  background: hsla(var(--lv-scheme-hs), 50%, 0.12);
  color: hsl(var(--lv-scheme-hs), 88%);
  font: inherit;
  padding: 0.2rem 0.7rem;
  cursor: pointer;
}

.weather-now {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.weather-now-glyph {
  font-size: 2.6rem;
  line-height: 1;
}

.weather-now-temp {
  font-size: 2rem;
  font-weight: 700;
  color: var(--bulma-primary-on-scheme);
  line-height: 1;
}

.weather-now-label {
  color: hsl(var(--lv-scheme-hs), 68%);
  font-size: 0.75rem;
}

.weather-meta {
  display: flex;
  gap: 1.2rem;
  margin: 0.7rem 0;
  color: hsl(var(--lv-scheme-hs), 72%);
  font-size: 0.78rem;
}

.weather-days {
  border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);
  padding-top: 0.5rem;
}

.weather-day {
  display: grid;
  grid-template-columns: 3.5rem 1.6rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.28rem 0;
}

.weather-day-name {
  color: hsl(var(--lv-scheme-hs), 72%);
}

.weather-day-hi {
  text-align: right;
  font-weight: 600;
}

.weather-day-lo {
  color: hsl(var(--lv-scheme-hs), 58%);
  text-align: right;
}

.weather-src {
  margin-top: 0.6rem;
  color: hsl(var(--lv-scheme-hs), 52%);
  font-size: 0.68rem;
}
</style>
