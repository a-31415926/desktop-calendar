# V14.24 — dismiss only on a separate outside pointer press

User reported V14.23 calendar disappears when releasing the mouse and requires holding the button. This is a regression, not the intended interaction.

Removed both dismissal paths based on Focused(false)/GetLastInputInfo and the periodic foreground/input observer. The system last-input timestamp includes mouse movement and button release; it cannot prove a separate outside click. No polling or focus-loss dismissal remains in the taskbar popup.

The existing low-level mouse hook now forwards separate left/right/middle DOWN events outside the clock without consuming them. Clock DOWN toggles the popup once; clock UP still cannot toggle. On the GUI thread, WindowFromPoint and owner/root checks protect calendar contents and application menus/windows. Hidden, pinned, native-menu and obsolete-epoch cases remain excluded. Escape and the explicit collapse button are retained.

Tests include actual Windows message values for clock down/up, outside release/movement, a new outside press, app-owned targets, menus and pinned mode. Rust popup input/epoch tests run in CI; frontend regressions guard removal of broad focus/input-time logic. A compiled application is included under native-qa in the build artifact for native verification without running the installer.

Do not claim real taskbar mouse interaction has passed unless a native test has actually been observed. Browser mocks and unit tests alone cannot prove that. Public files contain no personal credentials. No installation is implied by a successful build.

