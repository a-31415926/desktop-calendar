# V14.23 popup lifecycle repair

Based on V14.22. User reports intermittent blank frame then immediate dismissal on two PCs, temporarily resolved by restarting the app. They confirmed V14.22. The historical event has not been captured; do not claim all possible blank-screen causes are proven eliminated.

Code paths fixed:
- Expired native 450ms hide fallback used only a global closing flag. It could act on a later hide/reopen cycle. Every opening now advances an epoch; guarded hides validate it on the GUI thread.
- Renderer show handler used an early return when its private visible ref was true. Each native show now emits its epoch and always restores the rendered surface, including native/renderer state drift.
- Renderer animation timers and in-flight hide replies reject newer epochs. Native finish-hide and deferred settings opening also validate the originating epoch.
- External-input observer takes a fresh input baseline for each opening, avoiding treating the opening click as a new outside action. Pinned mode, app-owned windows and native menus remain exceptions.
- Initial renderer readiness can synchronize a missing show event from a native visibility snapshot without overriding a later user transition.

Tests: 62 frontend regressions including forced late timers, out-of-order hide events, in-flight replies, duplicate closes and 100 rapid reopen cycles. Rust epoch tests reject stale closes over repeated openings. CI tests weather, window positioning and popup epochs before building Windows x64 NSIS.

No personal credentials or private locations are added to public files. No local installation or reboot is implied by a successful build. Final run/installer evidence belongs in the delivery note after verification.

