# Design QA — 알림 설정 화면

## Source and implementation

- source visual truth: `/Users/switch/Downloads/Screenshot_20260903_182700_PLUS .jpg`
- implementation screenshot: `/tmp/financialapp-notification-settings-template.png`
- full-view comparison artifact: `/tmp/financialapp-notification-settings-template-comparison.png`
- focused comparison artifact: `/tmp/financialapp-notification-settings-template-focused-comparison.png`
- source pixels: `1080 x 2316`
- implementation pixels: `1080 x 2424`
- native logical viewport: approximately `393 x 852 dp`, Android API 36 `Pixel_9`
- density normalization: source was extended to `1080 x 2424` with a white bottom canvas;
  neither app content region was scaled. The extra bottom is only to align the different
  device-owned navigation areas for comparison.
- state: 서비스 이용 알림 ON, 혜택 및 이벤트 알림 OFF, 앱 푸시/알림톡·문자/전화 OFF,
  marketing consent OFF, light theme

## Evidence reviewed

### Full-view comparison

The source and Android implementation were placed side-by-side in the same comparison
artifact. The implementation preserves the requested full-screen composition through the
reusable `FullScreenPage` template: custom back button and centered title, grey information
banner, two notification groups, three channel rows, and the bottom marketing-consent control.
No global app header or custom bottom tab bar appears on this route.

The main measured anchors are aligned closely: source/implementation notice band begins at
`y=233/237`, divider at `y=731/731`, and consent button border begins at `y=1382/1382`.
The consent button bottom border is `y=1515/1516`.

### Focused region comparison

The focused artifact compares the notice/service region and the benefits/channel/consent
region at the same crop. It verifies the Korean copy wrapping, bold-vs-secondary hierarchy,
right-aligned switches, divider, rounded consent border and disabled grey consent state.

## Fidelity surfaces

- Fonts and typography: the existing `AppText`/design tokens are used with a compact title,
  body and row hierarchy matching the source wrapping. No text is truncated.
- Spacing and layout: horizontal content margins, banner height, divider position, row rhythm,
  switch alignment and consent control height were tuned against the source capture.
- Colors and tokens: white screen, `neutral100` notice, secondary grey copy, subtle divider,
  orange ON track and neutral OFF track use the existing design-system tokens.
- Image quality and asset fidelity: the source contains no required app-owned raster artwork on
  this screen. Ionicons are used for the source-like back and info marks; no handcrafted SVG or
  CSS art was introduced.
- Copy and content: all visible settings labels and descriptions match the attached source.
- Accessibility and interaction: back and consent controls have labels/roles; every switch is
  a real React Native `Switch` with an accessible label and local visual state.

## Findings

- No actionable P0/P1/P2 differences found.
- [P3] Samsung status/navigation icons and clock differ from the Pixel emulator capture. This
  is device-owned chrome and is intentionally not recreated in the app.
- [P3] The source capture includes a floating annotation/cursor overlay over the service switch.
  It was treated as capture tooling rather than product UI and was intentionally excluded.

## Comparison history

- Initial comparison found the channel switches placed immediately after their labels and the
  content scale/vertical rhythm too loose for the reference. The implementation changed the
  channel label to flex-fill for right alignment, reduced the route header/notice typography,
  and tuned divider, section and consent spacing.
- Post-fix full-view and focused comparisons show the switches at the right edge and the
  measured divider/consent anchors aligned; no P0/P1/P2 issue remains.
- The screen was recaptured after moving its header and scroll composition into the reusable
  `FullScreenPage`; the template migration preserved the same visual anchors and state.

## Interaction verification

- `내 정보` → `알림 설정` opens the new root stack route.
- App push switch changes from OFF to ON in the running Android emulator.
- The custom back control returns to the `내 정보` overview.
- Marketing consent is a local visual toggle only; no API, persistence or backend behavior was
  added because this is a portfolio screen.

## Validation

- mobile typecheck: passed
- mobile tests: passed — 50 files, 144 tests
- mobile architecture check: passed
- route check: passed — 13 route files
- design-system check: passed — 42 UI files
- mobile lint: passed
- Android native navigation/toggle smoke: passed

## Implementation checklist

- [x] Add `notification-settings` root route
- [x] Hide global app header and bottom navigation
- [x] Match attached screen hierarchy and Korean copy
- [x] Use real React Native switches with requested initial states
- [x] Align all switches to the right edge
- [x] Verify full-view and focused source/implementation comparisons

final result: passed
