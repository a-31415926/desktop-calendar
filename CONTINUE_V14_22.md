# V14.22 — local rain nowcast and outside-click dismissal

Base: V14.21 (1.1.21). New application version: 1.1.22. Branch: feature/rain-focus-v14-22.

- A fresh five-minute rain point covering now can drive today's hero and generic rain animation. Label explicitly identifies the short-term forecast and its update time; no inferred observed rain intensity. Storm/snow conditions retain their original meaning. Future selections keep their own real daily/hourly data.
- Failed, stale, future-dated or malformed nowcasts cannot drive live rain. A future wet point alone does not mean it is raining now. Raw hourly probabilities remain unchanged.
- Current/forecast and minutely cache TTLs are five minutes. Foreground UI checks once a minute. Requests remain subject to rate limits and failure retry guards. Request time is not an observation timestamp.
- Windows outside-input fallback covers denied activation (no Focused(false) event). App-owned windows, native menus and pinned mode are excluded. No synthetic keyboard input. Hide keeps the process running; missed animation events have a native hide fallback.
- Compact header reserves room for nowcast attribution. Ordinary and simultaneous warning/error/strong-wind scenes fit the same complete six-row calendar.
- Existing date/lunar/holiday/weather settings and encrypted credentials stay compatible. No private configuration or embedded personal credentials in this public source/installer.

Validation: 56 frontend regressions and frontend type/build checks locally passed. Windows CI and installer evidence must be checked for the final build before claiming delivery. No local installation or reboot performed in this iteration.

