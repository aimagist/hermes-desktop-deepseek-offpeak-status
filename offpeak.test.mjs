/**
 * Schedule check for deepseek-offpeak.
 *   node offpeak.test.mjs
 *
 * The plugin's pure functions are evaluated here without the SDK (the plugin
 * itself may only import @hermes/plugin-sdk, react and react/jsx-runtime).
 */

import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('./desktop/plugin.js', import.meta.url), 'utf8')
const code = src
  .replace(/^import .*$/gm, '')
  .replace(/^export default[\s\S]*$/m, '')
  .replace(/^export /gm, '')

const { isPeak, nextChange, fmtLeft, fmtLocal } = new Function(
  `${code}; return { isPeak, nextChange, fmtLeft, fmtLocal }`
)()

const utc = (s) => new Date(s)
let failures = 0

function check(label, actual, expected) {
  const a = actual instanceof Date ? actual.toISOString() : actual
  const e = expected instanceof Date ? expected.toISOString() : expected
  if (a !== e) {
    failures++
    console.log(`FAIL  ${label}: expected ${e}, got ${a}`)
  } else {
    console.log(`ok    ${label} → ${a}`)
  }
}

const peak = (s) => isPeak(utc(s))

// Monday 2026-09-14, windows 01-04 and 06-10 UTC.
check('Mon 00:30 off-peak', peak('2026-09-14T00:30:00Z'), false)
check('Mon 01:00 peak', peak('2026-09-14T01:00:00Z'), true)
check('Mon 03:59 peak', peak('2026-09-14T03:59:00Z'), true)
check('Mon 04:00 off-peak', peak('2026-09-14T04:00:00Z'), false)
check('Mon 06:00 peak', peak('2026-09-14T06:00:00Z'), true)
check('Mon 09:59 peak', peak('2026-09-14T09:59:00Z'), true)
check('Mon 10:00 off-peak', peak('2026-09-14T10:00:00Z'), false)
check('Mon 23:59 off-peak', peak('2026-09-14T23:59:00Z'), false)

// Weekend: off-peak all day.
check('Sat 02:00 off-peak', peak('2026-09-12T02:00:00Z'), false)
check('Sun 08:00 off-peak', peak('2026-09-13T08:00:00Z'), false)

// Next switch.
check('Mon 00:30 → 01:00', nextChange(utc('2026-09-14T00:30:00Z')), utc('2026-09-14T01:00:00Z'))
check('Mon 03:00 → 04:00', nextChange(utc('2026-09-14T03:00:00Z')), utc('2026-09-14T04:00:00Z'))
check('Mon 04:00 → 06:00', nextChange(utc('2026-09-14T04:00:00Z')), utc('2026-09-14T06:00:00Z'))
check('Mon 10:00 → Tue 01:00', nextChange(utc('2026-09-14T10:00:00Z')), utc('2026-09-15T01:00:00Z'))
// The long jump: Friday after 10 UTC until Monday 01 UTC.
check('Fri 10:00 → Mon 01:00', nextChange(utc('2026-09-18T10:00:00Z')), utc('2026-09-21T01:00:00Z'))
check('Fri 23:00 → Mon 01:00', nextChange(utc('2026-09-18T23:00:00Z')), utc('2026-09-21T01:00:00Z'))
check('Sat 12:00 → Mon 01:00', nextChange(utc('2026-09-19T12:00:00Z')), utc('2026-09-21T01:00:00Z'))

// Countdown formatting.
check('fmt 45s→1m', fmtLeft(45_000), '1m')
check('fmt 2h14m', fmtLeft((2 * 60 + 14) * 60_000), '2h14m')
check('fmt 3d5h', fmtLeft((3 * 1440 + 300) * 60_000), '3d 5h')

// Local switch time in 24 h (no "AM/PM" noise).
check('local 24h', fmtLocal(utc('2026-09-14T01:00:00Z'), utc('2026-09-13T22:30:00-03:00')), '22:00')
check('local other day', fmtLocal(utc('2026-09-14T01:00:00Z'), utc('2026-09-14T12:00:00-03:00')).includes('Sun'), true)

console.log(failures === 0 ? '\nAll ok' : `\n${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
