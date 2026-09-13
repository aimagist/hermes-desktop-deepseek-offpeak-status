/**
 * Regenerates the "Your cheap hours" table in README.md.
 *
 *   node tools/tz-table.mjs
 *
 * Walks real IANA time zones (not hand-converted offsets), so the 40 cells in
 * the table stay consistent with the UTC windows in plugin.js. Run it after
 * editing PEAK_WINDOWS, then paste the output over the table in the README.
 *
 * For each zone it prints the two cheap windows (the 15 h main one and the 2 h
 * gap between the two full-price blocks) plus the full-price blocks, one line
 * per DST regime — the greater offset first, so the "summer" line leads in the
 * northern hemisphere and January leads in Sydney.
 *
 * Country markers are reference-style images pointing at flagcdn PNGs, defined
 * under the table in README.md. Not raw flag emoji and not `:xx:` shortcodes:
 * GitHub renders a shortcode into the raw emoji character, and Windows ships no
 * flag glyphs, so both collapse to the bare letters "us". An <img> renders the
 * same everywhere.
 */

const ZONES = [
  ['🌐 **UTC** — the reference', 'UTC', 'UTC+0'],
  ['![AR][ar] **Buenos Aires** · ![BR][br] **São Paulo**', 'America/Argentina/Buenos_Aires', 'UTC−3'],
  ['![US][us] **US Eastern**', 'America/New_York', ''],
  ['![US][us] **US Central**', 'America/Chicago', ''],
  ['![US][us] **US Mountain**', 'America/Denver', ''],
  ['![US][us] **US Pacific**', 'America/Los_Angeles', ''],
  ['![GB][gb] **London**', 'Europe/London', ''],
  ['![DE][de] ![FR][fr] ![ES][es] **Central Europe** — Berlin · Paris · Madrid', 'Europe/Berlin', ''],
  ['![IN][in] **India**', 'Asia/Kolkata', ''],
  ['![CN][cn] ![SG][sg] ![AU][au] **China · Singapore · Perth**', 'Asia/Singapore', ''],
  ['![JP][jp] ![KR][kr] **Japan · Korea**', 'Asia/Tokyo', ''],
  ['![AU][au] **Sydney**', 'Australia/Sydney', '']
]

/** Peak windows in UTC hours, same as plugin.js. */
const PEAK = [
  [1, 4],
  [6, 10]
]

const isPeakUTC = (d) => {
  const day = d.getUTCDay()
  if (day === 0 || day === 6) return false
  const hour = d.getUTCHours()
  return PEAK.some(([from, to]) => hour >= from && hour < to)
}

const offsetMinutes = (zone, iso) => {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
    .formatToParts(new Date(iso))
    .find(part => part.type === 'timeZoneName').value
  const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/)
  if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0))
}

const offsetLabel = (mins) => {
  const sign = mins < 0 ? '−' : '+'
  const abs = Math.abs(mins)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}

const norm = (m) => ((m % 1440) + 1440) % 1440
const hhmm = (m) => `${String(Math.floor(norm(m) / 60)).padStart(2, '0')}:${String(norm(m) % 60).padStart(2, '0')}`

/** minute-of-local-day -> cheap?, sampled only over UTC weekdays (identical local pattern). */
function classifyLocalDay(zone, anchorISO) {
  const start = new Date(anchorISO).getTime()
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false })
  const counts = new Map()

  for (let i = 0; i < 4 * 1440; i++) {
    const t = new Date(start + i * 60_000)
    const weekday = t.getUTCDay()
    if (weekday === 0 || weekday === 6) continue
    const key = clock.format(t)
    const tally = counts.get(key) ?? { cheap: 0, peak: 0 }
    if (isPeakUTC(t)) tally.peak += 1
    else tally.cheap += 1
    counts.set(key, tally)
  }

  const day = new Array(1440).fill(false)
  for (const [key, tally] of counts) {
    const [h, m] = key.split(':').map(Number)
    day[h * 60 + m] = tally.cheap >= tally.peak
  }

  return day
}

/** Contiguous runs of one class, with a run that crosses midnight merged. */
function runs(day, wantCheap) {
  const minutes = []
  for (let i = 0; i < 1440; i++) {
    if (day[i] === wantCheap) minutes.push(i)
  }
  if (minutes.length === 0) return []

  const out = []
  let from = minutes[0]
  let prev = minutes[0]
  for (const i of minutes.slice(1)) {
    if (i === prev + 1) {
      prev = i
      continue
    }
    out.push([from, prev + 1])
    from = i
    prev = i
  }
  out.push([from, prev + 1])

  if (out.length > 1 && out[0][0] === 0 && out[out.length - 1][1] === 1440) {
    const last = out.pop()
    out[0] = [last[0] - 1440, out[0][1]]
  }

  return out
}

const fmtRun = (r) => `${hhmm(r[0])} – ${hhmm(r[1])}${r[0] < 0 ? ' →' : ''}`
const duration = (r) => norm(r[1] - r[0]) || 1440

function cellsFor(zone) {
  const regimes = ['2026-07-21T00:00:00Z', '2026-01-20T00:00:00Z']
    .map(iso => ({ iso, offset: offsetMinutes(zone, iso) }))
    .sort((a, b) => b.offset - a.offset)
  const unique = regimes.filter((r, i, all) => i === 0 || r.offset !== all[0].offset)

  const main = []
  const short = []
  const full = []

  for (const regime of unique) {
    const day = classifyLocalDay(zone, regime.iso)
    const cheap = runs(day, true).sort((a, b) => duration(b) - duration(a))
    const peak = runs(day, false).sort((a, b) => norm(a[0]) - norm(b[0]))
    main.push(fmtRun(cheap[0]))
    short.push(fmtRun(cheap[1]))
    full.push(peak.map(fmtRun).join(' · '))
  }

  return {
    offsets: unique.map(r => offsetLabel(r.offset)).join(' / '),
    main: main.join('<br>'),
    short: short.join('<br>'),
    full: full.join('<br>')
  }
}

console.log('| 🌍 Where (your clock) | 🟢 Main cheap window — 15 h | 🟢 Short cheap window — 2 h | 🔴 Full price — 7 h |')
console.log('|---|---|---|---|')

for (const [name, zone, fixedOffset] of ZONES) {
  const cells = cellsFor(zone)
  console.log(`| ${name} (${fixedOffset || cells.offsets}) | ${cells.main} | ${cells.short} | ${cells.full} |`)
}
