# Requirements Document

## Introduction

This document defines the requirements for a single-page JWT signing tool. The tool allows users to enter a JSON payload and an RSA private key (PEM format), then sign the payload as a JWT using the RS256 algorithm. The page works from both `file://` protocol and development servers, uses only the browser's Web Crypto API, and has zero external runtime dependencies.

## Glossary

- **JWT_Signing_Page**: The single HTML page application that provides the JWT signing functionality
- **JSON_Input**: The textarea element where users enter the JSON payload to be signed
- **PEM_Input**: The textarea element where users enter the PEM-encoded RSA private key
- **Sign_Button**: The button element that triggers the JWT signing process
- **JWT_Output**: The display area that shows the generated JWT string in monospace font
- **Error_Display**: The display area that shows error messages to the user
- **Base64url_Encoder**: The function that converts strings or binary data to base64url format per RFC 4648 §5
- **PEM_Parser**: The function that extracts DER-encoded key data from a PEM-formatted string
- **JWT_Signer**: The core signing function that assembles and signs the JWT using Web Crypto API
- **Web_Crypto_API**: The browser's built-in `crypto.subtle` interface used for key import and signing
- **PublicJWK_Button**: The button element that triggers extraction and display of the public key in JWK format
- **PublicPEM_Button**: The button element that triggers extraction and display of the public key in SPKI PEM format
- **PublicKey_Output**: The display area that shows the extracted public key (JWK or PEM) in monospace font
- **PublicKey_Extractor**: The function that derives the public key from the private key using Web Crypto API
- **CI_Workflow**: The GitHub Actions continuous integration job that runs the test suite on every push and pull request
- **CD_Workflow**: The GitHub Actions continuous deployment job that deploys the static site to the `gh-pages` branch

## Requirements

### Requirement 1: Page Structure and File Organization

**User Story:** As a developer, I want the JWT signing tool split into separate HTML, JS, and CSS files, so that the code is organized and maintainable.

#### Acceptance Criteria

1. THE JWT_Signing_Page SHALL consist of exactly one HTML file, one JavaScript file, and one CSS file
2. THE JWT_Signing_Page SHALL load and function correctly when opened via the `file://` protocol in a modern browser
3. THE JWT_Signing_Page SHALL load and function correctly when served by a static development server
4. THE JWT_Signing_Page SHALL have zero external runtime dependencies

### Requirement 2: User Interface Elements

**User Story:** As a user, I want clearly labeled input areas and a sign button, so that I can easily enter data and generate a JWT.

#### Acceptance Criteria

1. THE JWT_Signing_Page SHALL display a JSON_Input textarea for entering the JSON payload
2. THE JWT_Signing_Page SHALL display a PEM_Input textarea for entering the RSA private key in PEM format
3. THE JWT_Signing_Page SHALL display a Sign_Button labeled "Sign" that triggers the signing process
4. THE JWT_Signing_Page SHALL display a JWT_Output area that renders the generated JWT in a monospace font
5. THE JWT_Signing_Page SHALL display an Error_Display area for showing error messages with visual distinction from normal output

### Requirement 3: Pre-filled Sample Data

**User Story:** As a user, I want the input fields pre-filled with sample data, so that I can immediately test the signing functionality without preparing my own inputs.

#### Acceptance Criteria

1. WHEN the JWT_Signing_Page loads, THE JSON_Input SHALL contain a sample JSON payload with fields including "sub", "name", and "iat"
2. WHEN the JWT_Signing_Page loads, THE PEM_Input SHALL contain a valid RSA private key in PKCS#8 PEM format

### Requirement 4: Base64url Encoding

**User Story:** As a developer, I want a correct base64url encoder, so that JWT segments conform to the RFC 4648 §5 specification.

#### Acceptance Criteria

1. THE Base64url_Encoder SHALL produce output containing only characters from the set [A-Za-z0-9_-]
2. THE Base64url_Encoder SHALL produce output with no padding characters ("=")
3. WHEN given a string input, THE Base64url_Encoder SHALL encode it using UTF-8 byte representation
4. WHEN given an ArrayBuffer input, THE Base64url_Encoder SHALL encode the raw bytes directly
5. WHEN given an empty input, THE Base64url_Encoder SHALL return an empty string

### Requirement 5: PEM Key Parsing

**User Story:** As a developer, I want reliable PEM parsing, so that RSA private keys are correctly extracted for use with Web Crypto API.

#### Acceptance Criteria

1. WHEN a valid PEM string is provided, THE PEM_Parser SHALL return an ArrayBuffer containing the DER-encoded key data
2. THE PEM_Parser SHALL strip the "-----BEGIN PRIVATE KEY-----" header and "-----END PRIVATE KEY-----" footer before decoding
3. THE PEM_Parser SHALL ignore whitespace and newline characters within the base64 body
4. IF the PEM string is missing the "-----BEGIN PRIVATE KEY-----" header, THEN THE PEM_Parser SHALL throw an error with a message containing "Invalid PEM"
5. IF the PEM string is missing the "-----END PRIVATE KEY-----" footer, THEN THE PEM_Parser SHALL throw an error with a message containing "Invalid PEM"

### Requirement 6: JWT Signing Process

**User Story:** As a user, I want to sign a JSON payload with my RSA private key, so that I get a valid RS256 JWT token.

#### Acceptance Criteria

1. WHEN the user clicks the Sign_Button, THE JWT_Signer SHALL construct a JWT header of exactly `{"alg":"RS256","typ":"JWT"}`
2. WHEN the user clicks the Sign_Button, THE JWT_Signer SHALL base64url-encode the header and payload, then concatenate them with a period separator as the signing input
3. WHEN the user clicks the Sign_Button, THE JWT_Signer SHALL import the PEM key using Web_Crypto_API with algorithm RSASSA-PKCS1-v1_5 and hash SHA-256
4. WHEN the user clicks the Sign_Button, THE JWT_Signer SHALL sign the signing input using RSASSA-PKCS1-v1_5 via Web_Crypto_API
5. WHEN signing completes, THE JWT_Signer SHALL produce a JWT string with exactly three base64url-encoded segments separated by two period characters
6. WHEN signing completes, THE JWT_Output SHALL display the complete JWT string
7. WHEN the same JSON payload and the same RSA private key are signed multiple times, THE JWT_Signer SHALL produce identical JWT output each time

### Requirement 7: JWT Structure Correctness

**User Story:** As a developer, I want the generated JWT to conform to RFC 7519 and RFC 7515, so that it can be verified by any standards-compliant JWT library.

#### Acceptance Criteria

1. THE JWT_Signer SHALL produce a first segment that decodes to `{"alg":"RS256","typ":"JWT"}` for every generated JWT
2. THE JWT_Signer SHALL produce a second segment that decodes to the exact original JSON payload string
3. THE JWT_Signer SHALL produce a third segment that is a valid RSASSA-PKCS1-v1_5 signature over the concatenation of the first and second segments with a period separator
4. THE JWT_Signer SHALL produce segments containing only characters from the base64url alphabet [A-Za-z0-9_-]

### Requirement 8: Input Validation and Error Handling

**User Story:** As a user, I want clear error messages when my input is invalid, so that I can correct mistakes and successfully generate a JWT.

#### Acceptance Criteria

1. IF the JSON_Input is empty when the Sign_Button is clicked, THEN THE JWT_Signing_Page SHALL display "Please enter a JSON payload" in the Error_Display
2. IF the JSON_Input contains invalid JSON syntax, THEN THE JWT_Signing_Page SHALL display an error message containing "Invalid JSON" in the Error_Display
3. IF the PEM_Input is empty when the Sign_Button is clicked, THEN THE JWT_Signing_Page SHALL display "Please enter an RSA private key" in the Error_Display
4. IF the PEM_Input contains text missing PEM markers, THEN THE JWT_Signing_Page SHALL display "Invalid PEM key format" in the Error_Display
5. IF the Web_Crypto_API fails to import the key, THEN THE JWT_Signing_Page SHALL display an error message containing "Failed to import key" in the Error_Display
6. IF the Web_Crypto_API fails during signing, THEN THE JWT_Signing_Page SHALL display an error message containing "Failed to sign" in the Error_Display
7. WHEN an error is displayed, THE Error_Display SHALL be visually distinct from normal output
8. WHEN an error occurs during signing, THE JWT_Output SHALL be cleared

### Requirement 9: Security Constraints

**User Story:** As a security-conscious developer, I want the tool to handle keys safely, so that private key material is not leaked or persisted.

#### Acceptance Criteria

1. THE JWT_Signing_Page SHALL NOT persist the private key to localStorage, cookies, sessionStorage, or any other browser storage mechanism
2. THE JWT_Signing_Page SHALL NOT make any network requests
3. THE JWT_Signing_Page SHALL import the RSA private key as non-extractable via Web_Crypto_API when used for signing operations. Extractable import is permitted when deriving the public key for export (Requirements 10, 11).

### Requirement 10: Public Key Export as JWK

**User Story:** As a developer, I want to extract the public key from my RSA private key in JWK format, so that I can share it with services that need to verify my JWTs.

#### Acceptance Criteria

1. THE JWT_Signing_Page SHALL display a PublicJWK_Button labeled "Public JWK"
2. WHEN the user clicks the PublicJWK_Button, THE PublicKey_Extractor SHALL import the PEM private key as extractable, derive the public key components, and export it as a JWK object
3. WHEN export completes, THE PublicKey_Output SHALL display the JWK JSON string in a monospace font, pretty-printed
4. THE exported JWK SHALL contain the fields `kty`, `n`, `e`, and `alg` with `alg` set to `"RS256"`
5. IF the PEM_Input is empty when the PublicJWK_Button is clicked, THEN THE JWT_Signing_Page SHALL display "Please enter an RSA private key" in the Error_Display
6. IF the key import fails, THEN THE JWT_Signing_Page SHALL display an error message containing "Failed to import key" in the Error_Display

### Requirement 11: Public Key Export as PEM

**User Story:** As a developer, I want to extract the public key from my RSA private key in SPKI PEM format, so that I can use it with tools and libraries that expect PEM-encoded public keys.

#### Acceptance Criteria

1. THE JWT_Signing_Page SHALL display a PublicPEM_Button labeled "Public PEM"
2. WHEN the user clicks the PublicPEM_Button, THE PublicKey_Extractor SHALL import the PEM private key as extractable, derive the public key components, and export it in SPKI DER format, then encode as PEM with `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----` markers
3. WHEN export completes, THE PublicKey_Output SHALL display the PEM string in a monospace font
4. IF the PEM_Input is empty when the PublicPEM_Button is clicked, THEN THE JWT_Signing_Page SHALL display "Please enter an RSA private key" in the Error_Display
5. IF the key import fails, THEN THE JWT_Signing_Page SHALL display an error message containing "Failed to import key" in the Error_Display

### Requirement 12: Public Key Output Area

**User Story:** As a user, I want the public key output displayed separately from the JWT output, so that I can clearly distinguish between the two results.

#### Acceptance Criteria

1. THE JWT_Signing_Page SHALL display a PublicKey_Output area below the JWT_Output area that renders the public key in a monospace font
2. WHEN a public key export succeeds, THE Error_Display SHALL be cleared
3. WHEN a public key export fails, THE PublicKey_Output SHALL be cleared

### Requirement 13: Web Crypto API Availability

**User Story:** As a user, I want to be informed if my browser does not support the required cryptographic features, so that I know to switch to a compatible browser.

#### Acceptance Criteria

1. IF the Web_Crypto_API is not available, THEN THE JWT_Signing_Page SHALL display a message indicating that Web Crypto API is not available and suggesting the user switch to a modern browser

### Requirement 14: Dark / Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light themes, so that I can use the tool comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE JWT_Signing_Page SHALL default to dark mode when first loaded
2. THE JWT_Signing_Page SHALL display a theme toggle button in the top-right corner of the page
3. WHEN the user clicks the theme toggle, THE JWT_Signing_Page SHALL switch between dark and light themes
4. THE theme toggle SHALL display a sun icon (☀️) when in dark mode and a moon icon (🌙) when in light mode
5. ALL color values in the stylesheet SHALL be defined as CSS custom properties (variables) on `:root`, with overrides for the light theme on `:root[data-theme="light"]`
6. THE layout, spacing, font sizes, and structural properties SHALL remain identical between dark and light themes — only colors change
7. THE JWT_Signing_Page SHALL NOT persist the theme preference to any browser storage mechanism

### Requirement 15: Click-to-Select Output Content

**User Story:** As a user, I want clicking on the JWT output or public key output to automatically select the entire content, so that I can quickly copy the result without manually selecting text.

#### Acceptance Criteria

1. WHEN the user clicks on the JWT_Output area, THE JWT_Signing_Page SHALL select the entire text content of the JWT_Output element
2. WHEN the user clicks on the PublicKey_Output area, THE JWT_Signing_Page SHALL select the entire text content of the PublicKey_Output element
3. THE selection SHALL only occur when the output area contains content (non-empty)
4. THE selection SHALL use the browser's native `window.getSelection()` and `Range` API to select the full contents of the clicked element

### Requirement 16: "Now" Button for iat Claim

**User Story:** As a user, I want a "Now" button that sets the `iat` (issued at) claim in my JSON payload to the current time, so that I can quickly generate tokens with a fresh timestamp without manually editing the JSON.

#### Acceptance Criteria

1. THE JWT_Signing_Page SHALL display a Now_Button labeled "Now" placed near the JSON_Input textarea
2. WHEN the user clicks the Now_Button and the JSON_Input contains valid JSON, THE JWT_Signing_Page SHALL parse the JSON, set the `iat` field to the current Unix timestamp in seconds (integer, `Math.floor(Date.now() / 1000)`), and write the updated pretty-printed JSON back to the JSON_Input textarea
3. WHEN the user clicks the Now_Button and the JSON_Input contains valid JSON that already has an `iat` field, THE JWT_Signing_Page SHALL overwrite the existing `iat` value with the current Unix timestamp in seconds
4. WHEN the user clicks the Now_Button and the JSON_Input contains valid JSON that does not have an `iat` field, THE JWT_Signing_Page SHALL add the `iat` field with the current Unix timestamp in seconds
5. IF the JSON_Input is empty when the Now_Button is clicked, THEN THE JWT_Signing_Page SHALL display "Please enter a JSON payload" in the Error_Display
6. IF the JSON_Input contains invalid JSON when the Now_Button is clicked, THEN THE JWT_Signing_Page SHALL display an error message containing "Invalid JSON" in the Error_Display
7. WHEN the Now_Button successfully updates the payload, THE Error_Display SHALL be cleared

### Requirement 17: jwt.io Debugger Link

**User Story:** As a developer, I want a link to jwt.io's debugger pre-populated with my token and public key, so that I can quickly verify and inspect my JWT in an external tool.

#### Acceptance Criteria

1. WHEN the JWT_Output contains content, THE JWT_Signing_Page SHALL display a clickable link below the output areas that opens the jwt.io debugger
2. THE link SHALL point to `https://jwt.io/#token=<URL-encoded JWT>` where the token value is taken from the current JWT_Output content
3. THE link SHALL open in a new browser tab (`target="_blank"`)
4. WHEN the JWT_Output is empty, THE link SHALL be hidden
5. THE link SHALL update automatically whenever the JWT_Output content changes (after signing or error)
6. THE link text SHALL indicate that the public key needs to be pasted manually for verification, e.g., "Decode on jwt.io (paste public key to verify)"

### Requirement 18: Error Shake Animation on Repeated Invalid Input

**User Story:** As a user, I want the error message to shake when I click Sign or Now with invalid JSON that was already flagged, so that I notice the existing error instead of thinking nothing happened.

#### Acceptance Criteria

1. WHEN the user clicks the Sign_Button or Now_Button and the JSON_Input contains invalid JSON, THE Error_Display SHALL show an error message containing "Invalid JSON"
2. IF the Error_Display already contains an error message when a new error is triggered by Sign_Button or Now_Button, THE Error_Display SHALL play a brief shake animation to draw the user's attention
3. THE shake animation SHALL be a CSS keyframe animation (e.g., horizontal shake) lasting no more than 500ms
4. THE shake animation SHALL be re-triggerable on consecutive clicks (removing and re-adding the animation class)
5. THE shake animation SHALL use CSS custom properties for any colors to remain consistent with the current theme

### Requirement 19: Inline JSON Parse Error Display

**User Story:** As a user, I want JSON parse errors shown directly below the JSON payload textarea, so that I can immediately see what's wrong with my input without looking elsewhere on the page.

#### Acceptance Criteria

1. THE JWT_Signing_Page SHALL display a `json-error` element directly below the JSON_Input textarea, inside the same input group
2. WHEN a JSON parse error occurs (from Sign or Now), THE `json-error` element SHALL display the error message (e.g., "Invalid JSON: Unexpected token...")
3. WHEN a JSON parse error is displayed in `json-error`, THE main Error_Display SHALL be cleared (no duplication)
4. WHEN a non-JSON error occurs (PEM errors, signing errors, empty input), THE main Error_Display SHALL show the message and `json-error` SHALL be cleared
5. WHEN an operation succeeds (Sign or Now), BOTH `json-error` and Error_Display SHALL be cleared
6. THE `json-error` element SHALL be styled with the error color (`var(--error-color)`) and a smaller font size to fit inline below the textarea
7. Error routing and shake animation SHALL be handled by a single `showError(message)` function that directs the message to the correct element and shakes it


### Requirement 20: Continuous Integration — Test on Every Push and Pull Request

**User Story:** As a developer, I want the test suite to run automatically on every push and pull request, so that I can catch regressions before merging code.

#### Acceptance Criteria

1. WHEN a push event occurs on any branch, THE CI_Workflow SHALL run the full test suite using `pnpm test`
2. WHEN a pull request is opened or updated against any branch, THE CI_Workflow SHALL run the full test suite using `pnpm test`
3. THE CI_Workflow SHALL install dependencies using `pnpm install --frozen-lockfile` to ensure reproducible builds
4. THE CI_Workflow SHALL use a stable Node.js LTS version (22 or later)
5. IF the test suite fails, THEN THE CI_Workflow SHALL report the job as failed in the GitHub Actions UI and on the pull request status checks
6. IF the test suite passes, THEN THE CI_Workflow SHALL report the job as successful

### Requirement 21: Continuous Deployment — Deploy to GitHub Pages

**User Story:** As a developer, I want the static site automatically deployed to GitHub Pages after a successful push to main, so that the demo link at `https://ecki.github.io/jwtsign-kirotest/` always reflects the latest code.

#### Acceptance Criteria

1. WHEN a push to the `main` branch occurs and the test job passes, THE CD_Workflow SHALL deploy the site files to the `gh-pages` branch
2. THE CD_Workflow SHALL deploy only the site-facing files: `index.html`, `style.css`, and `app.js`
3. THE CD_Workflow SHALL NOT deploy development files including `node_modules`, `package.json`, `pnpm-lock.yaml`, `vitest.config.js`, `app.test.js`, `.github`, `.kiro`, and `.vscode`
4. THE CD_Workflow SHALL NOT run the deploy job on pull request events
5. THE CD_Workflow SHALL NOT run the deploy job on pushes to branches other than `main`
6. THE CD_Workflow SHALL use the automatically provided `GITHUB_TOKEN` for authentication — no manual secret configuration required
7. IF the test job fails, THEN THE CD_Workflow SHALL skip the deploy job entirely

### Requirement 22: Workflow File Structure

**User Story:** As a developer, I want the CI/CD pipeline defined in a single workflow file, so that the configuration is easy to find and maintain.

#### Acceptance Criteria

1. THE CI/CD pipeline SHALL be defined in a single file at `.github/workflows/ci.yml`
2. THE workflow file SHALL contain two jobs: a `test` job and a `deploy` job
3. THE `deploy` job SHALL depend on the `test` job (runs only after tests pass)
4. THE workflow SHALL use `pnpm/action-setup@v4` to install pnpm
5. THE workflow SHALL use `actions/checkout@v4` for repository checkout
6. THE workflow SHALL use `actions/setup-node@v4` for Node.js setup
