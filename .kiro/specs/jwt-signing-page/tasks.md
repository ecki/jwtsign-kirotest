# Tasks

## Task 1: Project Setup and HTML Structure

- [x] 1.1 Initialize project with pnpm (create package.json with no runtime dependencies)
- [x] 1.2 Create `index.html` with the page structure: JSON payload textarea (`json-input`), PEM key textarea (`pem-input`), Sign button (`sign-button`), JWT output area (`jwt-output` as `<pre>`), and error display area (`error-display`)
- [x] 1.3 Create `style.css` with styling: monospace font for JWT output, visually distinct error display (red text), and clean layout for the input areas and button
- [x] 1.4 Link `style.css` and `app.js` from `index.html` (use `<script defer>` or module for JS)

## Task 2: Base64url Encoding

- [x] 2.1 Implement `base64urlEncode(input)` in `app.js` that accepts a string or ArrayBuffer, converts to base64 via `btoa`, then replaces `+` with `-`, `/` with `_`, and removes `=` padding
- [x] 2.2 Handle string inputs by encoding to UTF-8 bytes via `TextEncoder` before base64 conversion
- [x] 2.3 Handle ArrayBuffer inputs by converting bytes to a binary string before base64 conversion
- [x] 2.4 Return empty string for empty input

## Task 3: PEM Key Parsing

- [x] 3.1 Implement `pemToArrayBuffer(pem)` in `app.js` that validates PEM markers (`-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`), throwing an error containing "Invalid PEM" if either marker is missing
- [x] 3.2 Strip PEM header, footer, and all whitespace/newline characters from the base64 body
- [x] 3.3 Decode the base64 body via `atob` and convert to an ArrayBuffer

## Task 4: RSA Key Import

- [x] 4.1 Implement `importPrivateKey(pem)` in `app.js` that calls `pemToArrayBuffer` then uses `crypto.subtle.importKey` with format `"pkcs8"`, algorithm `{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }`, extractable `false`, and usages `["sign"]`

## Task 5: JWT Signing Logic

- [x] 5.1 Implement `signJwt(jsonPayload, pemPrivateKey)` in `app.js`: validate JSON via `JSON.parse` (throw with "Invalid JSON" message on failure), construct the fixed header `{"alg":"RS256","typ":"JWT"}`, base64url-encode header and payload, concatenate with `.` as signing input
- [x] 5.2 Import the private key via `importPrivateKey`, sign the UTF-8 encoded signing input via `crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data)`, base64url-encode the signature, and return the complete JWT string `header.payload.signature`

## Task 6: UI Wiring and Event Handling

- [x] 6.1 Implement `onSignClick()` in `app.js`: read values from `json-input` and `pem-input`, validate non-empty (show "Please enter a JSON payload" or "Please enter an RSA private key" in `error-display`), call `signJwt`, display result in `jwt-output`, or display caught errors in `error-display` (prefixing key import errors with "Failed to import key" and signing errors with "Failed to sign")
- [x] 6.2 Clear `jwt-output` when an error occurs; clear `error-display` when signing succeeds
- [x] 6.3 Attach click event listener to `sign-button` that calls `onSignClick`

## Task 7: Sample Data and Web Crypto Detection

- [x] 7.1 Pre-fill `json-input` with sample JSON: `{"sub":"1234567890","name":"Jane Doe","iat":1516239022}` (pretty-printed)
- [x] 7.2 Pre-fill `pem-input` with a hardcoded valid 2048-bit RSA private key in PKCS#8 PEM format
- [x] 7.3 On page load, check if `crypto.subtle` is available; if not, display a message in `error-display` indicating Web Crypto API is unavailable and disable the Sign button

## Task 8: Property-Based Tests

- [x] 8.1 Set up test infrastructure with vitest and fast-check as dev dependencies (install via pnpm)
- [x] 8.2 Write property test for base64url alphabet compliance: for any random string or byte array, `base64urlEncode` output matches `/^[A-Za-z0-9_-]*$/` (Property 1, validates Requirements 4.1, 4.2, 7.4)
- [x] 8.3 Write property test for base64url round-trip: for any random string, decoding the base64url output produces the original bytes (Property 2, validates Requirements 4.3, 4.4)
- [x] 8.4 Write property test for PEM parsing round-trip: for any random binary data wrapped in PEM format, `pemToArrayBuffer` returns the original binary (Property 3, validates Requirements 5.1, 5.2)
- [x] 8.5 Write property test for PEM whitespace invariance: for any valid PEM string with random whitespace inserted in the body, parsing produces the same result (Property 4, validates Requirement 5.3)
- [x] 8.6 Write property test for PEM missing markers error: for any string without PEM markers, `pemToArrayBuffer` throws with "Invalid PEM" (Property 5, validates Requirements 5.4, 5.5, 8.4)
- [x] 8.7 Write property test for JWT three-segment structure: for any valid JSON payload signed with a test key, the result has exactly 3 dot-separated non-empty segments (Property 6, validates Requirement 6.5)
- [x] 8.8 Write property test for JWT header invariance: for any valid JSON payload signed with a test key, the first segment decodes to `{"alg":"RS256","typ":"JWT"}` (Property 7, validates Requirements 6.1, 7.1)
- [x] 8.9 Write property test for JWT payload fidelity: for any valid JSON payload signed with a test key, the second segment decodes to the original payload (Property 8, validates Requirement 7.2)
- [x] 8.10 Write property test for JWT signing determinism: for any valid JSON payload, signing twice with the same key produces identical output (Property 10, validates Requirement 6.7)
- [x] 8.11 Write property test for invalid JSON error propagation: for any non-JSON string, `signJwt` throws with "Invalid JSON" (Property 11, validates Requirement 8.2)

## Task 9: Verification and Cleanup

- [x] 9.1 Verify the page loads and signs the pre-filled sample data successfully by running the test suite
- [x] 9.2 Verify all property-based tests pass with at least 100 iterations each

## Task 10: Public Key Export — UI

- [x] 10.1 Add a "Public JWK" button (`public-jwk-btn`) and a "Public PEM" button (`public-pem-btn`) to `index.html`, placed next to the existing Sign button
- [x] 10.2 Add a public key output area (`pubkey-output` as `<pre>`) below the JWT output area in `index.html`, with a label
- [x] 10.3 Style the new buttons consistently with the Sign button in `style.css`, and style `pubkey-output` with monospace font matching `jwt-output`

## Task 11: Public Key Export — Logic

- [x] 11.1 Implement `exportPublicJwk(pemPrivateKey)` in `app.js`: import the PEM private key as extractable (`extractable: true`), export as JWK via `crypto.subtle.exportKey("jwk", key)`, strip private components (`d`, `p`, `q`, `dp`, `dq`, `qi`), add `alg: "RS256"`, and return the public JWK object
- [x] 11.2 Implement `exportPublicPem(pemPrivateKey)` in `app.js`: import the PEM private key as extractable, export as SPKI via `crypto.subtle.exportKey("spki", key)`, convert the ArrayBuffer to a PEM string with `-----BEGIN PUBLIC KEY-----` / `-----END PUBLIC KEY-----` markers (base64-encoded, line-wrapped at 64 characters)
- [x] 11.3 Implement `arrayBufferToPem(buffer, label)` helper in `app.js`: convert ArrayBuffer to base64 string, split into 64-character lines, wrap with `-----BEGIN {label}-----` and `-----END {label}-----`
- [x] 11.4 Export the new functions via the CommonJS guard for testing: add `exportPublicJwk`, `exportPublicPem`, `arrayBufferToPem` to the `module.exports` object

## Task 12: Public Key Export — Event Handling

- [x] 12.1 Implement `onPublicJwkClick()` in `app.js`: read PEM_Input, validate non-empty, call `exportPublicJwk`, display pretty-printed JSON result in `pubkey-output`, clear `error-display` on success, or display error and clear `pubkey-output` on failure
- [x] 12.2 Implement `onPublicPemClick()` in `app.js`: read PEM_Input, validate non-empty, call `exportPublicPem`, display result in `pubkey-output`, clear `error-display` on success, or display error and clear `pubkey-output` on failure
- [x] 12.3 Attach click event listeners to `public-jwk-btn` and `public-pem-btn` in the DOMContentLoaded handler

## Task 13: Public Key Export — Property-Based Tests

- [x] 13.1 Write property test for public JWK structure: for any valid RSA key, `exportPublicJwk` returns an object with `kty === "RSA"`, `alg === "RS256"`, and fields `n` and `e` present, with no private fields (`d`, `p`, `q`, `dp`, `dq`, `qi`) (Property 13, validates Requirements 10.2, 10.4)
- [x] 13.2 Write property test for public PEM format: for any valid RSA key, `exportPublicPem` returns a string starting with `-----BEGIN PUBLIC KEY-----` and ending with `-----END PUBLIC KEY-----` with valid base64 between markers (Property 14, validates Requirement 11.2)
- [x] 13.3 Write property test for public key derivation consistency: for any valid RSA key, the JWK `n` and `e` values from `exportPublicJwk` match the public key extracted from the SPKI PEM output of `exportPublicPem` (Property 15, validates Requirements 10.2, 11.2)

## Task 14: Public Key Export — Verification

- [x] 14.1 Run the full test suite and verify all tests pass (existing + new public key tests)
- [x] 14.2 Verify all new property-based tests pass with at least 100 iterations each

## Task 15: Dark / Light Mode — CSS Variables

- [x] 15.1 Define CSS custom properties on `:root` for the dark theme (default): `--bg-page`, `--bg-card`, `--bg-input`, `--bg-output`, `--text-primary`, `--text-secondary`, `--text-mono`, `--border-color`, `--btn-bg`, `--btn-hover`, `--btn-active`, `--btn-text`, `--error-color`, `--focus-ring`, `--toggle-bg`
- [x] 15.2 Define CSS custom property overrides on `:root[data-theme="light"]` for the light theme, using the current light color values from the existing stylesheet
- [x] 15.3 Replace ALL hardcoded color values in `style.css` element rules with `var(--xxx)` references — no hex/rgb colors should remain in element selectors, only in the `:root` variable definitions

## Task 16: Dark / Light Mode — Toggle Button UI

- [x] 16.1 Add a theme toggle button (`theme-toggle`) to `index.html`, positioned in the top-right corner, displaying ☀️ by default (dark mode)
- [x] 16.2 Style the toggle button in `style.css`: absolute/fixed positioning top-right, minimal chrome (no border, transparent background), appropriate size, cursor pointer, using `var(--toggle-bg)` for background

## Task 17: Dark / Light Mode — Toggle Logic

- [x] 17.1 Implement theme toggle logic in `app.js`: clicking the toggle button sets `data-theme="light"` on `<html>` if currently dark, or removes it to revert to dark; update the button text to 🌙 in light mode and ☀️ in dark mode
- [x] 17.2 Wire the toggle click handler in the DOMContentLoaded block

## Task 18: Dark / Light Mode — Verification

- [x] 18.1 Run the existing test suite to confirm no regressions from the CSS refactor
- [x] 18.2 Visually verify both themes render correctly (manual check — no automated test needed for visual appearance)

## Task 19: Click-to-Select Output Content

- [x] 19.1 Implement a `selectAllContent(element)` helper in `app.js` that uses `window.getSelection()` and `Range` to select the full text content of the given DOM element, only if the element has non-empty `textContent`
- [x] 19.2 Attach a `click` event listener to `jwt-output` that calls `selectAllContent` on itself, in the DOMContentLoaded handler
- [x] 19.3 Attach a `click` event listener to `pubkey-output` that calls `selectAllContent` on itself, in the DOMContentLoaded handler
- [x] 19.4 Add `cursor: pointer` style to `#jwt-output` and `#pubkey-output` in `style.css` so users see the content is clickable
- [x] 19.5 Run the test suite to confirm no regressions

## Task 20: "Now" Button for iat Claim

- [x] 20.1 Add a "Now" button (`now-btn`) to `index.html`, placed next to or below the JSON Payload label/textarea
- [x] 20.2 Style the Now button in `style.css` consistently with the existing action buttons
- [x] 20.3 Implement `onNowClick()` in `app.js`: read JSON_Input, validate non-empty (show "Please enter a JSON payload" if empty), parse JSON (show "Invalid JSON" error if invalid), set or overwrite the `iat` field with `Math.floor(Date.now() / 1000)`, write the updated pretty-printed JSON back to JSON_Input, clear Error_Display on success
- [x] 20.4 Attach a click event listener to `now-btn` in the DOMContentLoaded handler
- [x] 20.5 Run the test suite to confirm no regressions

## Task 21: jwt.io Debugger Link

- [x] 21.1 Add a link element (`jwt-io-link`) to `index.html` below the public key output area, with text "Verify on jwt.io", `target="_blank"`, `rel="noopener noreferrer"`, initially hidden
- [x] 21.2 Style the link in `style.css`: use `var(--btn-bg)` for color, display block, margin-top, hidden by default (display: none)
- [x] 21.3 Implement `updateJwtIoLink()` in `app.js`: read textContent from `jwt-output` and `pubkey-output`; if both are non-empty, build the URL `https://jwt.io/#debugger-io?token={encodeURIComponent(jwt)}&publicKey={encodeURIComponent(pubkey)}`, set it as the link href, and show the link; otherwise hide the link
- [x] 21.4 Call `updateJwtIoLink()` at the end of `onSignClick()`, `onPublicJwkClick()`, and `onPublicPemClick()` (both success and error paths) so the link stays in sync
- [x] 21.5 Run the test suite to confirm no regressions

## Task 22: Error Shake Animation

- [x] 22.1 Add a CSS `@keyframes shake` animation in `style.css`: horizontal translate (e.g., -4px, 4px, -4px, 0) over 300-500ms
- [x] 22.2 Add a `.shake` CSS class in `style.css` that applies the shake animation to the element
- [x] 22.3 Implement a `shakeError()` helper in `app.js` that removes the `shake` class from `error-display`, forces a reflow, then re-adds it — making the animation re-triggerable on consecutive calls
- [x] 22.4 Call `shakeError()` in `onSignClick()` whenever an error is displayed (invalid JSON, empty input, PEM errors)
- [x] 22.5 Call `shakeError()` in `onNowClick()` whenever an error is displayed (invalid JSON, empty input)
- [x] 22.6 Run the test suite to confirm no regressions

## Task 23: Inline JSON Parse Error Display

- [x] 23.1 Add a `<div id="json-error">` element in `index.html` directly below the `json-input` textarea, inside the same `.input-group` div
- [x] 23.2 Style `#json-error` in `style.css`: `color: var(--error-color)`, `font-size: 0.8rem`, `font-weight: 600`, `margin-top: 0.25rem`, hidden when empty (`display: none` on `:empty`)
- [x] 23.3 Refactor `shakeError()` into `shakeElement(el)` that accepts any DOM element — removes `shake` class, forces reflow, re-adds it. Update all existing callers to pass the target element.
- [x] 23.4 Implement a `showError(message)` helper that determines the target: if the message contains "Invalid JSON", write to `json-error` and clear `error-display`; otherwise write to `error-display` and clear `json-error`. Then call `shakeElement` on whichever element received the message.
- [x] 23.5 Implement a `clearErrors()` helper that clears both `json-error` and `error-display` in one call.
- [x] 23.6 Update `onSignClick()` to use `showError(message)` for all error paths and `clearErrors()` on success.
- [x] 23.7 Update `onNowClick()` to use `showError(message)` for all error paths and `clearErrors()` on success.
- [x] 23.8 Run the test suite to confirm no regressions


## Task 24: Add packageManager Field to package.json

- [x] 24.1 Run `pnpm -v` to determine the current pnpm version, then add a `"packageManager"` field to `package.json` (e.g., `"packageManager": "pnpm@<version>"`) so that `pnpm/action-setup@v4` in CI can auto-detect the correct pnpm version

## Task 25: Create GitHub Actions CI/CD Workflow

- [x] 25.1 Create `.github/workflows/ci.yml` with a workflow named `CI` triggered on `push` (all branches) and `pull_request` (all branches)
- [x] 25.2 Define the `test` job in the workflow: runs on `ubuntu-latest`, checks out the repo with `actions/checkout@v4`, sets up pnpm with `pnpm/action-setup@v4`, sets up Node.js 22 with `actions/setup-node@v4` (with pnpm caching), installs dependencies with `pnpm install --frozen-lockfile`, and runs `pnpm test`
- [x] 25.3 Define the `deploy` job in the workflow: runs on `ubuntu-latest`, depends on the `test` job (`needs: test`), runs only on pushes to `main` (`if: github.ref == 'refs/heads/main' && github.event_name == 'push'`), has `permissions: contents: write`, checks out the repo, and deploys to the `gh-pages` branch using `peaceiris/actions-gh-pages@v4` with `publish_dir: .`, `publish_branch: gh-pages`, `github_token: ${{ secrets.GITHUB_TOKEN }}`, and `exclude_assets` set to exclude `.github,node_modules,.kiro,.vscode,.git,.gitignore,package.json,pnpm-lock.yaml,vitest.config.js,app.test.js,LICENSE,README.md`

## Task 26: Verify CI/CD Workflow

- [x] 26.1 Validate the workflow YAML syntax by checking it is well-formed (e.g., using `pnpm exec yaml` or manual review)
- [x] 26.2 Verify the workflow file contains both `test` and `deploy` jobs with the correct triggers, conditions, and dependencies
