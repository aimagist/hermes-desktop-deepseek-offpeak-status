# deepseek-offpeak

A tiny Hermes Desktop status-bar chip: a whale that turns blue while DeepSeek is
in its off-peak window (half price) and grey during peak hours. The number next
to it is the time left until the next rate switch.

```
off-peak:  🐋 28m      ← blue whale
peak:      🐋 1h40m    ← grey whale
```

Hovering shows two short lines: which rate is running now, and when it ends.

## Install

One click, with [Hermes Desktop](https://hermes-agent.nousresearch.com/docs)
installed:

```
hermes://plugin/install?repo=aimagist/deepseek-offpeak
```

The dialog confirms what the repo ships (a desktop plugin), you pick the
component, and it lands in `<hermes home>/desktop-plugins/deepseek-offpeak/`.

Manual install — no dependencies, no build step:

```bash
git clone https://github.com/aimagist/deepseek-offpeak \
  "<hermes home>/desktop-plugins/deepseek-offpeak"
```

The app watches that folder and hot-reloads every save. If it does not appear,
run **⌘K → Reload desktop plugins**.

## Peak schedule

Peak rates are 2x the off-peak rates. Peak, in **UTC, Monday to Friday**:

| Window | Hours (UTC) |
|---|---|
| Morning | 01:00 – 04:00 |
| Midday | 06:00 – 10:00 |

Everything else is off-peak: weekday evenings and nights, plus the whole
weekend (Friday 10:00 UTC through Monday 01:00 UTC is one continuous off-peak
stretch).

## Customizing

Edit `PEAK_WINDOWS` at the top of `plugin.js` — UTC hours, `[from, to)`,
Monday–Friday — then run the test. There is no config file and no backend.

The blue comes from `var(--ui-accent)`, i.e. the accent of the active theme
(blue on the default skin). Swap that value for a fixed blue if you prefer.

## Development

```bash
node offpeak.test.mjs     # checks the schedule windows, next-switch math, formatting
```

`plugin.js` is a plain ESM file loaded at runtime with no build step, so it may
import only `@hermes/plugin-sdk`, `react`, and `react/jsx-runtime`. The test
evaluates the pure functions from it directly, without the SDK.

## License

MIT
