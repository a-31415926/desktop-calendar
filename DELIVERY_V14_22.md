# V14.22 delivery

- Branch: feature/rain-focus-v14-22
- Functional commit: 248ef2ee5bf477442f2ec71f065dbee4f33b98ee
- Windows x64 NSIS, application version 1.1.22
- Build run: 40855372798
- Artifact: 12889770713 (desktop-calendar-v14-22-windows-x64)
- Installer: DesktopCalendar-V14.22-Setup-x64.exe
- SHA-256: 109A9DBA7DC3793324A60556AAA453A24363CED41FBA74ED71652E46AE8FCA82
- Downloaded ZIP digest and extracted EXE manifest, PE, NSIS signature, version and build identity verified.
- 56 frontend regression tests, frontend build and Windows native tests passed; installer built and uploaded successfully.
- No local installation or reboot performed. Actual outside-click behavior on the user's machines still needs an installed-version check. Pinned mode intentionally keeps the window open.

The public installer contains no personal credentials. Existing settings remain in the installed application's user profile. See CONTINUE_V14_22.md for implementation details.
