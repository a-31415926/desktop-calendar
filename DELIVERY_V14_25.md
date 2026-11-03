# V14.25 — hidden startup preload

Autostart previously passed should_show_startup_popup=false, skipped popup build arguments and returned after installing the taskbar hook. First click therefore created the calendar webview and React UI. This version preloads the taskbar calendar while hidden/unfocused, separates preloading from showing, gates display on renderer readiness and preserves clicks that arrive during initialization. Desktop+popup startup remains sequential. Existing outside-press behavior is retained.

67 frontend regressions, type checking/build and Windows native tests passed. Installer built and uploaded; downloaded ZIP digest, EXE manifest/hash, PE/NSIS signature, application version and build identity verified.

- Functional commit: cca60fb0e999238ee308677f43be0e3f650523da
- Run: 41561136631
- Artifact: 13197786242
- Installer: DesktopCalendar-V14.25-Setup-x64.exe, Windows x64 NSIS, version 1.1.25
- SHA-256: BD59DFA4286B5D2338542F3FCE10CB4D9E02B65A90898391634EA31946ECBC80

No local installation, logout or reboot performed. Real login-to-first-click latency has not been measured. Preloading improves readiness after the process starts; Windows still controls login launch scheduling. No personal settings or credentials are published.
