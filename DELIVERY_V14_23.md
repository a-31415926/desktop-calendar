# V14.23 delivery

- Functional commit: aeae02c2d58f22cbe83df1fa3e1143fdc8d37106
- Windows x64 NSIS; application version 1.1.23
- Run: 40990879745; artifact: 12949626931 (desktop-calendar-v14-23-windows-x64)
- Installer: DesktopCalendar-V14.23-Setup-x64.exe; 1703364 bytes
- SHA-256: 2291A71F5B7BEFA5019B56B5363BC274DDD4673208E6D041BD18D08478C71C0D
- ZIP digest, extracted installer checksum, PE/NSIS signatures, version and build identity verified after downloading the artifact.
- 63 frontend regressions, type checking and build passed. Windows weather/positioning tests and the two popup epoch tests passed. NSIS build and artifact upload succeeded.
- Real React component tested with simulated native events: normal hide/reopen and old hide arriving after a newer show; calendar remained fully visible with 42 cells. No recursive-close error after the immediate-acknowledgement fix.

Historical failures on the user's PCs were not captured in logs. These changes fix identified race paths; continued use on both PCs is needed to confirm the reported intermittent symptom. No local installation or reboot performed. Exit the existing app before upgrading. Public installer contains no personal credentials; existing profile/settings are retained.
