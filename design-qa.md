# FinancialApp screenshot-aligned design system QA

- Source visual truth:
  - `/Users/switch/Downloads/Screenshot_20260903_015119_Google Play Store.jpg`
  - `/Users/switch/Downloads/Screenshot_20260903_015125_Google Play Store.jpg`
  - `/Users/switch/Downloads/Screenshot_20260903_015138_Google Play Store.jpg`
  - `/Users/switch/Downloads/Screenshot_20260903_015236_PLUS .jpg`
  - `/Users/switch/Downloads/Screenshot_20260903_021425_PLUS .jpg`
- Implementation screenshot: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/05-after-home.png`
- Full-view comparison: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/07-reference-vs-after.png`
- Focused comparison: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/08-top-focused.png`
- State: Android local demo data, authenticated home dashboard; all five bottom tabs loaded during the QA pass.

## Viewport and normalization

- Source home image: 775 x 1415 px. Its original CSS viewport and device density are not encoded in the JPEG.
- Implementation: Android emulator at 1080 x 2400 px, density 420 dpi, approximately 411 x 914 dp.
- Comparison normalization: the implementation app region was cropped to 1080 x 1971 px from y=72, then resized to 775 x 1415 px. This removes system chrome and aligns the source aspect ratio. The comparison evaluates the shared design-system treatment rather than identical copy or product structure.

## Required fidelity surfaces

- Fonts and typography: the platform Korean sans-serif remains the fallback because the source font is not identifiable from the compressed store screenshots. Display and amount styles now use 700 weight, 34 px amount scale, tighter negative tracking, and 16/24 body text. Wrapping and truncation remained stable across the checked tabs.
- Spacing and layout rhythm: 20 px horizontal page padding, 16 px root section gaps, 12 px card internal gaps, 20 px card radius, and 44 px minimum icon targets reproduce the source's open mobile rhythm without clipping.
- Colors and tokens: rendered sampling confirms white `#FFFFFF`, subtle grey `#F4F4F4`, border grey around `#D0D0D0`, primary text `#0E0E0E`, secondary text around `#707070`, and orange `#F37321`, closely matching the supplied references.
- Image quality and assets: the requested change is a token/component-system match. The compared FinancialApp state contains no source-equivalent photographic or branded raster asset. Existing vector-library navigation icons remain sharp; no placeholder or custom drawn image was introduced.
- Copy and content: FinancialApp keeps its own customer-facing financial copy and data. The reference copy is not copied because it describes a different product; hierarchy, amount emphasis, labels, and card treatment are matched.
- Accessibility: text contrast remains strong, interactive controls keep semantic roles, icon buttons remain 44 x 44 dp, and the new spacing does not obscure persistent navigation. Full screen-reader and large-text testing remains outside screenshot evidence.

## Comparison history

### Iteration 1

- [P2] Background drift: the app used warm `#F8F8F6`, while the references are visually white.
- [P2] Heavy type: display and amount styles used 800 weight, making the hierarchy denser than the references.
- [P2] Collapsed vertical rhythm: root cards and sections lacked a shared gap and appeared attached.
- [P2] Surface mismatch: tinted cards retained outlines and icon buttons added grey circular fills not present in the reference style.

Fixes applied: screen background changed to white; neutral, border, state, and market colors were realigned; display and amount weights changed to 700; body scale changed to 16/24; root and card gaps were added; tinted card borders became transparent; neutral chips use a white outlined treatment; icon buttons became transparent 44 dp targets; search uses the soft-grey filled treatment.

### Iteration 2

- Post-fix evidence: `07-reference-vs-after.png` and `08-top-focused.png`.
- No actionable P0, P1, or P2 styling mismatch remains for the requested global design-system scope.
- [P3] The exact commercial/product font used in the screenshots could not be identified from the compressed JPEGs, so the app intentionally retains the platform Korean system sans-serif.
- Intentional deviation: page copy, data, and component order remain FinancialApp-specific rather than cloning another application's content.

## Interaction and runtime evidence

- Flow tested: app home loads -> each bottom tab is selected -> market, order, plan, and account content renders -> home is selected again.
- Result: navigation selection changed correctly and all five screens rendered without overlap, clipping, or a framework/runtime error overlay.
- Native Metro output contained no relevant runtime error during the pass.
- The Expo web entry was not used for visual acceptance because the secure native refresh-token store is intentionally unavailable on web; Android is the target runtime for this QA.

## Findings

- No actionable P0/P1/P2 findings remain.
- Residual P3: verify the typography again if the product later licenses or supplies the exact reference font files.

## Fixed app-shell update

- Implementation screenshot: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/10-fixed-bars-home.png`.
- Scrolled-state screenshot: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/11-fixed-bars-scrolled.png`.
- Full-view comparison: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/13-reference-vs-fixed-bars.png`.
- Focused top comparison: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/14-fixed-top-focused.png`.
- Focused bottom comparison: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/15-fixed-bottom-focused.png`.
- Viewport: source 1080 x 2316 px; implementation 1080 x 2400 px at 420 dpi (approximately 411 x 914 dp). The full-view comparison normalizes the implementation to 1080 x 2316 px. Focused comparisons use equal-width crops; device-owned status and system navigation styles are intentionally not replicated.
- State: authenticated home tab at initial and scrolled positions, plus market tab selection.
- [P2] First pass added the fixed bars but retained the screen's top safe-area inset below the custom header, producing excessive whitespace.
- Fix: tab routes now receive a screen safe-area context that removes only the duplicated top inset. Login, lock, and stack-detail screens keep their original top inset.
- Post-fix result: `WM` and the 34 dp Ionicons outline bell remain fixed while content scrolls. The existing five-tab visual design remains unchanged and the entire tab bar sits above the device bottom inset/system navigation area.
- Interaction proof: home content was scrolled to the account/recent-transaction region; both fixed bars remained visible. A tab switch rendered the market screen under the same fixed top bar.
- Accessibility: the wordmark remains a header, the bell is exposed as an image labelled `알림`, and bottom-tab semantics remain owned by Expo Router. The notification icon is intentionally visual-only because no notification route or action was requested.
- No actionable P0/P1/P2 fixed-shell mismatch remains. The reference device uses three-button Android navigation while the emulator uses gesture navigation; that system-owned difference is expected.

## Notification full-screen layer update

- Source visual truth: `/Users/switch/Downloads/Screenshot_20260903_021425_PLUS .jpg`.
- Implementation screenshot: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/17-notification-inbox.png`.
- Inactive-button evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/18-notification-button-inactive.png`.
- Return-state evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/19-notification-return-home.png`.
- Full-view comparison: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/20-reference-vs-notification.png`.
- Focused comparison: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/21-notification-focused.png`.
- Viewport: source 1080 x 2316 px; implementation 1080 x 2400 px at 420 dpi (approximately 411 x 914 dp). The full-view comparison normalizes the implementation to 1080 x 2316 px, while the focused comparison uses equal-width 1080 x 1250 px top crops.
- State: empty notification inbox opened from the fixed top-bar bell.

### Required fidelity surfaces

- Typography: the centered 18 px layer title, 27 px empty-state heading, single-line 13 px supporting copy, and medium black CTA reproduce the reference hierarchy without wrapping or clipping.
- Spacing and layout: the 64 dp layer header, equal 44 dp header sides, 34% top offset, centered content, and full safe-area white surface match the reference proportions. The layer replaces both app bars while leaving device-owned system navigation visible.
- Colors and tokens: the screen uses the established white, near-black, and neutral-grey tokens. The button uses the existing primary action token.
- Image/icon fidelity: Ionicons supplies the chevron and empty-state bell. The reference combines a bell with a message bubble; the standard outline bell is the closest existing family match and avoids a custom-drawn substitute.
- Copy: title, empty-state heading, supporting sentence, and CTA match the supplied Korean reference.
- Accessibility: the back action is a labelled 44 dp button; title has a header role; the inactive CTA is labelled `알림켜기, 준비 중`.

### Comparison history

- [P2] First pass used the larger body style, which wrapped the supporting sentence, and a 100 dp minimum button that was too wide.
- Fix: changed the supporting copy to the 13 px caption style, changed the CTA to the 44 dp medium size with an 84 dp minimum width, aligned the header title to the smaller heading scale, and adjusted the content offset.
- Post-fix evidence: `20-reference-vs-notification.png` and `21-notification-focused.png`.
- [P3] The empty illustration is a plain library bell rather than the reference's product-specific bell-and-message composite.

### Architecture and interaction evidence

- The bell pushes a root Stack route, so the notification layer covers the `WM` header and bottom tabs and returns to the previous tab state.
- `FullScreenLayer` centralizes safe-area handling, centered title, back action, and content hosting for future full-screen layers.
- Notification UI is isolated behind the `features/notifications` public entry point; the route imports the feature through that boundary.
- The route smoke check now requires the notification route.
- Flow tested: home bell -> notification layer -> inactive `알림켜기` press -> no visible state or navigation change after three seconds -> back -> original home tab.
- No actionable P0/P1/P2 notification-layer mismatch remains.

## Launch splash and shared bottom bar update

- Source brief: user instruction specifying a one-second full-screen black splash with centered grey `WM`, followed by a full-screen-ready onboarding destination, plus a reusable content-sized bottom bar.
- Native splash evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/22-splash-wm-native.png`.
- App-shell evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/23-bottom-bar-content-sized.png`.
- Combined evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/24-splash-and-bottom-bar.png`.
- Viewport: Android emulator 1080 x 2400 px at 420 dpi (approximately 411 x 914 dp). The native splash and app capture include device-owned status/system navigation chrome.
- Typography and color: native and runtime splash both use a black `#000000` surface and grey `#8D8D8D` `WM` wordmark. The runtime status-bar icon mode changes to light during splash and dark after the app is ready.
- Layout: `FullScreenSurface` has no content padding and applies all safe-area edges, making it suitable for the upcoming full-screen onboarding screen. `AppLaunchBoundary` holds the launch state for `SPLASH_DURATION_MS = 1000` and hides the native splash before mounting the next destination.
- Bottom bar: shared `BottomBar` is content-sized (no fixed height), exports through the design-system public index, and is used by the five-tab navigator. The tab items retain their existing icon, label, color, and semantics while the container reserves bottom inset space.
- Runtime flow: cold Android launch showed native black/grey `WM`; after the launch gate, the home screen and content-sized bottom bar rendered without runtime errors. `AppLaunchBoundary` timer behavior is covered by unit tests.
- Onboarding readiness: the full-screen surface and launch children slot are now consumed by the four-page onboarding carousel documented below.
- Residual P3: the development client can show its own loading banner while Metro is unavailable; this is dev-client chrome and does not appear in a production build.

## First-run permission sheet update

- Source visual truth: `/Users/switch/Downloads/항목을 포함하는 새로운 폴더 15/1.jpg`.
- First-run sheet evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/25-first-launch-permission-sheet.png`.
- Confirmation result: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/26-after-permission-home.png`.
- Subsequent launch result: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/27-second-launch-no-sheet.png`.
- Flow comparison: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/28-launch-flow.png`.
- State sequence: first cold launch -> one-second splash -> permission sheet blocks transition -> `확인` -> home; second cold launch -> splash -> home without the sheet.
- Copy and layout: the supplied Korean permission title, explanation, optional permission list, device caveat, and full-width confirmation button are rendered in a rounded white bottom sheet over the black `WM` surface.
- Persistence: `expo-secure-store` stores versioned `wealth-flow.launch-notice-seen.v1` and `wealth-flow.onboarding-completed.v1` flags. Read/write failures fail open to the app without blocking startup.
- Architecture: `LaunchPermissionSheet` uses the shared content-sized `BottomBar` with `variant="sheet"`; future first-run sheets can reuse the same surface and keep their own content height.
- Interaction proof: tapping `확인` removes the sheet and reveals the app; the next cold launch was observed without the sheet. Unit coverage now includes first-run blocking, confirmation persistence, and seen-state skip.
- No actionable P0/P1/P2 mismatch remains. The only intentional limitation is that the permission button records acknowledgement but does not request OS permissions yet.

## Onboarding carousel update

- Source visual truth: `/Users/switch/Downloads/항목을 포함하는 새로운 폴더 15/2_1.jpg` plus the user-supplied four-page copy brief.
- Generated project assets (built-in image generation, low-resolution exports): `apps/mobile/assets/onboarding/assets-overview.png`, `money-flow.png`, `goal-planning.png`, and `financial-habits.png`.
- Page evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/33-onboarding-pages.png`.
- Completion evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/32-onboarding-complete.png`.
- Viewport: Android emulator 1080 x 2400 px at 420 dpi (approximately 411 x 914 dp). The onboarding surface is safe-area aware and fills the app-owned viewport.
- Copy: all four requested title/description pairs are included verbatim. The CTA reads `바로 시작하기` on every page; horizontal paging and the four-dot indicator remain active.
- Interaction proof: pages 1 -> 2 -> 3 -> 4 were advanced with horizontal swipes. Tapping `바로 시작하기` entered home and persisted onboarding completion in SecureStore.
- Architecture: `OnboardingScreen` is an isolated feature that receives an `onComplete` callback from `AppLaunchBoundary`, uses `FullScreenSurface`, and does not depend on authenticated providers.
- Image fidelity: generated illustrations share a restrained white/warm-grey/orange 3D style and are resized to low-resolution workspace assets. No CSS/SVG placeholder art was used.
- No actionable P0/P1/P2 mismatch remains for the requested onboarding scope. Exact illustration subject matter is intentionally flexible because arbitrary low-resolution images were requested.

## Phone verification and carrier sheet update

- Source visual truth: `/Users/switch/Downloads/항목을 포함하는 새로운 폴더 15/3_1.jpg` and `3_2.jpg`.
- Phone input evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/34-phone-input.png`.
- Carrier sheet evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/35-carrier-sheet.png`.
- Selection result: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/36-carrier-selected.png`.
- Demo completion evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/37-phone-flow-complete.png`.
- Reference comparisons: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/38-reference-vs-phone-input.png` and `39-reference-vs-carrier-sheet.png`.
- Copy and layout: the full-screen form uses the supplied title, phone label/placeholder, underline fields, disabled `다음` CTA, and six carrier labels in the requested order.
- Interaction proof: entering an 11-digit phone number opens the carrier bottom sheet (the carrier field can also be opened directly); selecting any carrier closes it and updates the field. `다음` remains a demo continuation action and does not perform real identity verification.
- Architecture: `PhoneVerificationScreen` is exposed through the onboarding feature boundary and receives completion from `AppLaunchBoundary`. Verification completion is stored separately as `wealth-flow.verification-completed.v1`, allowing future launch layers to be added without coupling them to the app providers.
- Overlay behavior: the scrim covers the full app surface (including the status-area content) and the content-sized shared `BottomBar` sheet is anchored above the device navigation inset.
- No actionable P0/P1/P2 mismatch remains for the requested phone/carrier demonstration flow. The emulator uses gesture navigation while the source uses three-button navigation; that system-owned difference is expected.

## Identity details, terms, and quick-password update

- Source visual truth: `/Users/switch/Downloads/항목을 포함하는 새로운 폴더 15/3_4.jpg`, `3_5.jpg`, and `4.jpg`.
- Terms sheet evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/40-terms-sheet.png`.
- New PIN evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/41-pin-create.png`.
- Confirmation evidence: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/42-pin-confirm.png`.
- Reference comparisons: `/Users/switch/.codex/visualizations/2026/09/02/01a0630d-d92e-7632-8443-8fcf55d283be/financialapp-design-system/43-reference-vs-terms.png` and `44-reference-vs-pin.png`.
- Progressive form: carrier selection reveals a masked resident-number field (`앞 6자리 - 성별 1자리 + ••••••`), completion reveals the name field, and the `다음` CTA remains disabled until all required identity inputs are present.
- Terms behavior: `약관을 확인해주세요` is a reusable content-sized bottom sheet. 전체 동의 toggles every row, individual required/optional rows can be toggled independently, and `동의` activates only when both required rows are checked.
- Quick password: a six-digit custom keypad is shuffled per entry attempt, dots fill as digits are entered, the back arrow removes one digit, and validation runs only after six digits. A mismatch shows a red message and resets the confirmation entry; a match transitions automatically to the home screen.
- Architecture: `PinSetupScreen` is isolated from the identity form and calls the launch boundary completion callback only after confirmation succeeds. The existing shared `BottomBar` and full-screen surface host both future sheets and full-screen layers.
- No actionable P0/P1/P2 mismatch remains for the requested identity/terms/PIN demonstration flow. Device-owned status and navigation chrome differ from the three-button reference device.

final result: passed
