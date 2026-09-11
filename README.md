# deepseek-offpeak

A whale in the Hermes Desktop status bar that turns **blue while DeepSeek is off-peak** — half price — and grey during peak hours. The number beside it is the time left until the next rate switch, so you know at a glance whether a long job is cheap right now or worth postponing.

![Off-peak and peak chip](assets/chip.png)

## Install

With Hermes Desktop installed, one click:

**[Install in Hermes](hermes://plugin/install?repo=aimagist/deepseek-offpeak)**

The dialog shows what the repo ships (a desktop plugin, no backend), you tick the component, and it lands in `<hermes home>/desktop-plugins/deepseek-offpeak/`.

No link handler? Clone it yourself — no dependencies, no build step:

```bash
git clone https://github.com/aimagist/deepseek-offpeak \
  "<hermes home>/desktop-plugins/deepseek-offpeak"
```

The app watches that folder and hot-reloads on every save. If the chip doesn't show up, run **⌘K → Reload desktop plugins**.

## The schedule

Peak rates are **2× off-peak**, and peak is only two short blocks on **UTC weekdays** — 7 hours out of every 24. Everything else is cheap:

| Where | Peak block 1 | Peak block 2 |
|---|---|---|
| **UTC** — the reference everything is defined in | 01:00 – 04:00 | 06:00 – 10:00 |
| Buenos Aires · São Paulo | 22:00 – 01:00 | 03:00 – 07:00 |
| US Eastern | 21:00 – 00:00<br>20:00 – 23:00 | 02:00 – 06:00<br>01:00 – 05:00 |
| US Pacific | 18:00 – 21:00<br>17:00 – 20:00 | 23:00 – 03:00<br>22:00 – 02:00 |
| London | 02:00 – 05:00<br>01:00 – 04:00 | 07:00 – 11:00<br>06:00 – 10:00 |
| Central Europe (Berlin · Paris · Madrid) | 03:00 – 06:00<br>02:00 – 05:00 | 08:00 – 12:00<br>07:00 – 11:00 |
| India | 06:30 – 09:30 | 11:30 – 15:30 |
| China · Singapore · Perth | 09:00 – 12:00 | 14:00 – 18:00 |
| Japan · Korea | 10:00 – 13:00 | 15:00 – 19:00 |
| Sydney | 12:00 – 15:00<br>11:00 – 14:00 | 17:00 – 21:00<br>16:00 – 20:00 |

Two times in one cell = your **summer / winter** clock time. The windows are pinned to UTC, so they slide an hour local when your clocks change — and Sydney's summer is January, so its two rows are the other way round.

Two things worth knowing:

- **The first block lands on Sunday evening in the Americas.** The days are UTC days, so Monday 01:00 UTC is still Sunday night in New York, São Paulo, and further west.
- **The windows are a Chinese working day.** 09:00–12:00 and 14:00–18:00 in Beijing is 9-to-noon and 2-to-6, split by lunch. DeepSeek charges peak while its home country is at its desk.

The cheap window is everything else: **17 hours on a weekday**, and all weekend. Friday 10:00 UTC through Monday 01:00 UTC runs as **one unbroken off-peak stretch of 2 days 15 hours** — the slot to aim any long job at.

The windows come straight from DeepSeek's own [Models & Pricing page](https://api-docs.deepseek.com/quick_start/pricing) (footnote 1):

> Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday (all other hours are off-peak).

That page is also where the per-model peak/off-peak table lives, so it is the one to re-check when rates move.

Hovering the chip gives the state in two lines:

```
Off-peak · 50% off
Ends Mon 01:00 · in 2d 15h
```

## Make it yours

One constant at the top of `plugin.js`:

```js
/** Peak windows in UTC hours. `[from, to)` — `to` is exclusive. */
const PEAK_WINDOWS = [
  [1, 4],
  [6, 10]
]
```

Change the hours, change the days (the weekend check is the `day === 0 || day === 6` line in `isPeak`), run the test, done. There is no config file and no backend to run.

The blue is `var(--ui-accent)` — the accent of your active theme, blue on the default skin. Replace it with a fixed hex if you'd rather it never change with the theme.

## Develop

```bash
node offpeak.test.mjs
```

22 checks over the peak windows, the next-switch math (including the weekend jump), the countdown format, and the local-time label. The test pulls the pure functions out of `plugin.js` and evaluates them without the SDK.

Why no SDK in the test: a runtime plugin is loaded as plain ESM with no build step, so it may import **only** `@hermes/plugin-sdk`, `react`, and `react/jsx-runtime`. The file therefore has to keep its logic import-free — which is exactly what makes it testable with `node`.

## Scope

- Desktop only. No Python half, no tools, no hooks, no `plugin.yaml` — nothing to enable in the agent.
- The schedule is deepseek-offpeak's own arithmetic on UTC clock time, not a feed. If DeepSeek changes its windows or its rates ([pricing page](https://api-docs.deepseek.com/quick_start/pricing)), edit `PEAK_WINDOWS`.
- The status bar gets the theme's accent, not a hardcoded blue (see above).

## License

MIT
