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

final result: passed
