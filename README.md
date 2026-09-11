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

Peak rates are **2× off-peak**. Peak, in **UTC, Monday to Friday**:

| Window | UTC | Buenos Aires (UTC-3) |
|---|---|---|
| Morning | 01:00 – 04:00 | 22:00 – 01:00 |
| Midday | 06:00 – 10:00 | 03:00 – 07:00 |

Everything else is off-peak — weekday evenings and nights, and the whole weekend. Friday 10:00 UTC through Monday 01:00 UTC is **one continuous off-peak stretch**, which is the cheapest window of the week for anything long.

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
- The schedule is deepseek-offpeak's own arithmetic on UTC clock time, not a feed. If DeepSeek changes its windows or its rates, edit `PEAK_WINDOWS`.
- The status bar gets the theme's accent, not a hardcoded blue (see above).

## License

MIT
