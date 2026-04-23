# Design Document: JWT Signing Page

## Overview

This feature is a self-contained, single HTML page that allows users to sign JSON payloads as JSON Web Tokens (JWTs) using the RS256 algorithm. The page includes two input areas — one for the JSON payload and one for a PEM-encoded RSA private key — along with a "Sign" button that produces a base64url-encoded JWT string. The result is displayed in a monospace font below the inputs.

The page must work when opened directly via the `file://` protocol (no server required) as well as when served by any static development server. It relies exclusively on the browser's built-in Web Crypto API (`window.crypto.subtle`) for all cryptographic operations, with zero external dependencies. JavaScript, CSS, and HTML are seperate files. Use `pnpm` as package manager and build.

The design follows the JWT specification (RFC 7519) for token structure and the JWS specification (RFC 7515) for the RS256 signing process. The header is always `{"alg":"RS256","typ":"JWT"}`, and the signature is computed over the base64url-encoded header and payload concatenated with a period separator.

## Architecture

```mermaid
graph TD
    subgraph "JWT Signing Page (HTML + CSS + JS)"
        UI[UI Layer<br/>HTML + CSS]
        JS[Application Logic<br/>JavaScript Module]
        WC[Web Crypto API<br/>crypto.subtle]
    end

    User((User)) -->|Enters JSON & PEM key| UI
    UI -->|Click Sign| JS
    JS -->|Parse PEM → importKey| WC
    WC -->|CryptoKey object| JS
    JS -->|sign header.payload| WC
    WC -->|ArrayBuffer signature| JS
    JS -->|Display JWT string| UI
```

## Sequence Diagrams

### Main Signing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as HTML UI
    participant App as App Logic (JS)
    participant Crypto as Web Crypto API

    U->>UI: Enter JSON payload
    U->>UI: Enter PEM private key
    U->>UI: Click "Sign" button

    UI->>App: onSignClick()
    App->>App: validateJsonPayload(jsonString)
    alt Invalid JSON
        App-->>UI: Display error message
    end

    App->>App: buildHeader()
    App->>App: base64urlEncode(header)
    App->>App: base64urlEncode(payload)
    App->>App: signingInput = header.payload

    App->>App: pemToArrayBuffer(pemString)
    App->>Crypto: crypto.subtle.importKey("pkcs8", keyData, {name:"RSASSA-PKCS1-v1_5", hash:"SHA-256"}, false, ["sign"])
    Crypto-->>App: CryptoKey

    App->>Crypto: crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data)
    Crypto-->>App: ArrayBuffer (signature)

    App->>App: base64urlEncode(signature)
    App->>App: jwt = signingInput + "." + signature
    App-->>UI: Display JWT string
    UI-->>U: Show JWT in monospace output
```

### Error Handling Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as HTML UI
    participant App as App Logic (JS)

    U->>UI: Click "Sign" with invalid input
    UI->>App: onSignClick()

    alt Empty JSON payload
        App-->>UI: "Please enter a JSON payload"
    else Invalid JSON syntax
        App-->>UI: "Invalid JSON: <parse error>"
    else Empty PEM key
        App-->>UI: "Please enter an RSA private key"
    else Invalid PEM format
        App-->>UI: "Invalid PEM key format"
    else Web Crypto import fails
        App-->>UI: "Failed to import key: <error>"
    else Web Crypto sign fails
        App-->>UI: "Failed to sign: <error>"
    end
```

## Components and Interfaces

### Component 1: UI Layer (HTML + CSS)

**Purpose**: Provides the user interface for input, action, and output display.

**Elements**:
```javascript
// DOM element IDs
const elements = {
  jsonInput: "json-input",           // <textarea> for JSON payload
  pemInput: "pem-input",             // <textarea> for RSA private key (PEM)
  signButton: "sign-button",         // <button> to trigger signing
  publicJwkButton: "public-jwk-btn", // <button> to export public key as JWK
  publicPemButton: "public-pem-btn", // <button> to export public key as PEM
  nowButton: "now-btn",              // <button> to set iat claim to current time
  themeToggle: "theme-toggle",       // <button> to toggle dark/light mode
  output: "jwt-output",              // <pre> for JWT result display
  publicKeyOutput: "pubkey-output",  // <pre> for public key display
  jwtIoLink: "jwt-io-link",          // <a> link to jwt.io debugger
  jsonError: "json-error",            // <div> inline error below JSON textarea (parse errors)
  errorDisplay: "error-display"      // <div> for general error messages
}
```

**Responsibilities**:
- Render two textarea inputs pre-filled with sample data
- Provide a "Sign" button that triggers the signing workflow
- Provide "Public JWK" and "Public PEM" buttons for public key extraction
- Provide a "Now" button to inject the current timestamp as the `iat` claim
- Provide a theme toggle button (☀️/🌙) in the top-right corner
- Display the resulting JWT in a `<pre>` element (monospace font)
- Display the extracted public key in a separate `<pre>` element (monospace font)
- Select all content on click for both output `<pre>` elements
- Display a "Verify on jwt.io" link when both JWT and public key outputs are populated
- Display JSON parse errors inline directly below the JSON payload textarea (`json-error`)
- Display general error messages (PEM errors, signing errors, empty input) in the main error display area

### Component 2: Application Logic (JavaScript)

**Purpose**: Orchestrates JWT construction, PEM parsing, and Web Crypto API calls.

**Interface**:
```javascript
/**
 * Encodes a string to base64url format (RFC 4648 §5).
 * @param {string|ArrayBuffer} input - String or binary data to encode
 * @returns {string} Base64url-encoded string (no padding)
 */
function base64urlEncode(input) {}

/**
 * Converts a PEM-encoded private key string to an ArrayBuffer.
 * Strips header/footer lines and decodes the base64 body.
 * @param {string} pem - PEM-formatted RSA private key
 * @returns {ArrayBuffer} DER-encoded key data
 * @throws {Error} If PEM format is invalid
 */
function pemToArrayBuffer(pem) {}

/**
 * Imports a PEM RSA private key into a Web Crypto CryptoKey.
 * @param {string} pem - PEM-formatted PKCS#8 RSA private key
 * @returns {Promise<CryptoKey>} Imported key usable for signing
 * @throws {Error} If key import fails
 */
async function importPrivateKey(pem) {}

/**
 * Signs a JSON payload as a JWT using RS256.
 * @param {string} jsonPayload - Valid JSON string for the JWT claims
 * @param {string} pemPrivateKey - PEM-formatted PKCS#8 RSA private key
 * @returns {Promise<string>} Complete JWT string (header.payload.signature)
 * @throws {Error} If JSON is invalid, key import fails, or signing fails
 */
async function signJwt(jsonPayload, pemPrivateKey) {}

/**
 * Click handler for the Sign button. Reads inputs, calls signJwt,
 * and updates the UI with the result or error.
 */
async function onSignClick() {}

/**
 * Imports a PEM RSA private key as extractable, then exports the
 * public key components as a JWK object.
 * @param {string} pemPrivateKey - PEM-formatted PKCS#8 RSA private key
 * @returns {Promise<object>} JWK object with kty, n, e, alg fields
 * @throws {Error} If key import or export fails
 */
async function exportPublicJwk(pemPrivateKey) {}

/**
 * Imports a PEM RSA private key as extractable, then exports the
 * public key in SPKI PEM format.
 * @param {string} pemPrivateKey - PEM-formatted PKCS#8 RSA private key
 * @returns {Promise<string>} PEM string with BEGIN/END PUBLIC KEY markers
 * @throws {Error} If key import or export fails
 */
async function exportPublicPem(pemPrivateKey) {}

/**
 * Converts an ArrayBuffer to a PEM-formatted string with the given label.
 * @param {ArrayBuffer} buffer - DER-encoded key data
 * @param {string} label - PEM label (e.g., "PUBLIC KEY")
 * @returns {string} PEM string with header/footer and base64 body
 */
function arrayBufferToPem(buffer, label) {}

/**
 * Selects the entire text content of a DOM element for easy copy-paste.
 * Uses window.getSelection() and Range API. Only acts if element has content.
 * @param {HTMLElement} element - The element whose content to select
 */
function selectAllContent(element) {}

/**
 * Click handler for the Now button. Parses the JSON payload,
 * sets or overwrites the "iat" field with Math.floor(Date.now() / 1000),
 * and writes the updated pretty-printed JSON back to the textarea.
 */
function onNowClick() {}

/**
 * Updates the jwt.io debugger link. Shows the link only when both
 * jwt-output and pubkey-output have content. Builds the URL:
 * https://jwt.io/#debugger-io?token={encoded}&publicKey={encoded}
 */
function updateJwtIoLink() {}

/**
 * Triggers a shake animation on the given DOM element.
 * Removes and re-adds the 'shake' class with a forced reflow to make
 * the animation re-triggerable on consecutive calls.
 * @param {HTMLElement} el - The element to shake
 */
function shakeElement(el) {}

/**
 * Routes an error message to the correct display element.
 * If the message contains "Invalid JSON", writes to json-error and clears
 * error-display. Otherwise writes to error-display and clears json-error.
 * Shakes whichever element received the message.
 * @param {string} message - The error message to display
 */
function showError(message) {}

/**
 * Clears both json-error and error-display elements.
 */
function clearErrors() {}
```

**Responsibilities**:
- Validate JSON payload syntax
- Construct the JWT header `{"alg":"RS256","typ":"JWT"}`
- Base64url-encode header and payload
- Parse PEM key and import via Web Crypto API
- Sign the `header.payload` string using RSASSA-PKCS1-v1_5 with SHA-256
- Assemble the final JWT: `base64url(header).base64url(payload).base64url(signature)`
- Export public key as JWK (stripping private components) or SPKI PEM
- Inject current Unix timestamp into the `iat` claim via the "Now" button
- Select all content in output areas on click
- Manage the jwt.io debugger link visibility and URL construction
- Toggle dark/light theme via `data-theme` attribute on `<html>`
- Handle and display errors gracefully

### Component 3: Web Crypto API (Browser Built-in)

**Purpose**: Provides cryptographic primitives for key import and signing.

**Used Methods**:
```javascript
// Import a PKCS#8 private key for RS256 signing
crypto.subtle.importKey(
  "pkcs8",                                    // format
  arrayBuffer,                                // key data (DER)
  { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, // algorithm
  false,                                      // not extractable
  ["sign"]                                    // usage
) // → Promise<CryptoKey>

// Import a PKCS#8 private key as extractable (for public key derivation)
crypto.subtle.importKey(
  "pkcs8",                                    // format
  arrayBuffer,                                // key data (DER)
  { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, // algorithm
  true,                                       // extractable
  ["sign"]                                    // usage
) // → Promise<CryptoKey>

// Export key as JWK
crypto.subtle.exportKey("jwk", cryptoKey)     // → Promise<JsonWebKey>

// Export key as SPKI (DER-encoded public key)
crypto.subtle.exportKey("spki", cryptoKey)    // → Promise<ArrayBuffer>

// Sign data with the imported key
crypto.subtle.sign(
  "RSASSA-PKCS1-v1_5",                       // algorithm
  cryptoKey,                                  // signing key
  encodedData                                 // data to sign (Uint8Array)
) // → Promise<ArrayBuffer>
```

**Responsibilities**:
- RSA private key import from PKCS#8 DER format
- RSASSA-PKCS1-v1_5 signature generation with SHA-256 hash
- Public key export in JWK and SPKI formats

## Data Models

### JWT Structure

```javascript
/**
 * JWT Header (always fixed for this application)
 * @typedef {Object} JwtHeader
 * @property {string} alg - Always "RS256"
 * @property {string} typ - Always "JWT"
 */
const JWT_HEADER = { alg: "RS256", typ: "JWT" }

/**
 * JWT Token Structure
 * Format: base64url(header) + "." + base64url(payload) + "." + base64url(signature)
 *
 * Example:
 * eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.<signature>
 */
```

**Validation Rules**:
- JSON payload must be valid JSON (parseable by `JSON.parse`)
- PEM key must contain `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers
- PEM body (between markers) must be valid base64
- The key must be an RSA key in PKCS#8 format

### Sample Data

```javascript
// Pre-filled sample JWT payload
const SAMPLE_PAYLOAD = JSON.stringify({
  sub: "1234567890",
  name: "Jane Doe",
  iat: 1516239022
}, null, 2)

// Pre-filled sample RSA private key (PKCS#8 PEM format)
// A 2048-bit RSA key generated at page load or hardcoded
const SAMPLE_PEM_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASC...
-----END PRIVATE KEY-----`
```

## Key Functions with Formal Specifications

### Function 1: base64urlEncode()

```javascript
function base64urlEncode(input) {
  // Convert string to bytes if needed, then to base64, then to base64url
}
```

**Preconditions:**
- `input` is a non-null string or ArrayBuffer
- If string, it contains only characters representable in UTF-8

**Postconditions:**
- Returns a string containing only characters from the base64url alphabet: `[A-Za-z0-9_-]`
- No padding characters (`=`) in the output
- Output can be decoded back to the original input via the inverse operation
- Empty input produces empty string output

**Loop Invariants:** N/A

### Function 2: pemToArrayBuffer()

```javascript
function pemToArrayBuffer(pem) {
  // Strip PEM headers, decode base64 body to ArrayBuffer
}
```

**Preconditions:**
- `pem` is a non-empty string
- `pem` contains `-----BEGIN PRIVATE KEY-----` header line
- `pem` contains `-----END PRIVATE KEY-----` footer line
- Content between header and footer is valid base64

**Postconditions:**
- Returns an ArrayBuffer containing the DER-encoded key data
- The returned ArrayBuffer has length > 0
- The returned data is the raw binary decode of the base64 content between PEM markers
- Whitespace and newlines within the base64 body are ignored

**Loop Invariants:** N/A

### Function 3: importPrivateKey()

```javascript
async function importPrivateKey(pem) {
  // Parse PEM → ArrayBuffer → crypto.subtle.importKey
}
```

**Preconditions:**
- `pem` is a valid PEM-encoded PKCS#8 RSA private key
- `crypto.subtle` is available (secure context or file:// with browser support)

**Postconditions:**
- Returns a CryptoKey with `type === "private"`
- The CryptoKey has `usages` including `"sign"`
- The CryptoKey's algorithm is `RSASSA-PKCS1-v1_5` with `SHA-256` hash
- The CryptoKey is not extractable (`extractable === false`)
- Throws an Error if the PEM is malformed or the key is not a valid RSA key

**Loop Invariants:** N/A

### Function 4: signJwt()

```javascript
async function signJwt(jsonPayload, pemPrivateKey) {
  // Validate → encode → import key → sign → assemble JWT
}
```

**Preconditions:**
- `jsonPayload` is a valid JSON string (parseable by `JSON.parse`)
- `pemPrivateKey` is a valid PEM-encoded PKCS#8 RSA private key
- `crypto.subtle` is available

**Postconditions:**
- Returns a string in the format `xxxxx.yyyyy.zzzzz` (three base64url segments separated by dots)
- The first segment decodes to `{"alg":"RS256","typ":"JWT"}`
- The second segment decodes to the original `jsonPayload` content
- The third segment is a valid RSASSA-PKCS1-v1_5 signature over `segment1.segment2`
- The returned JWT can be verified using the corresponding RSA public key
- Throws an Error with a descriptive message if any step fails

**Loop Invariants:** N/A

## Algorithmic Pseudocode

### Public Key Export as JWK Algorithm

```pascal
ALGORITHM exportPublicJwk(pemPrivateKey)
INPUT: pemPrivateKey of type String
OUTPUT: jwk of type Object

BEGIN
  // Step 1: Import private key as extractable
  keyBuffer ← pemToArrayBuffer(pemPrivateKey)
  cryptoKey ← crypto.subtle.importKey(
    "pkcs8", keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true, ["sign"]
  )

  // Step 2: Export as JWK (Web Crypto exports both public+private components)
  fullJwk ← crypto.subtle.exportKey("jwk", cryptoKey)

  // Step 3: Strip private components, keep only public fields
  jwk ← { kty: fullJwk.kty, n: fullJwk.n, e: fullJwk.e, alg: "RS256" }

  RETURN jwk
END
```

### Public Key Export as PEM Algorithm

```pascal
ALGORITHM exportPublicPem(pemPrivateKey)
INPUT: pemPrivateKey of type String
OUTPUT: pem of type String

BEGIN
  // Step 1: Import private key as extractable
  keyBuffer ← pemToArrayBuffer(pemPrivateKey)
  cryptoKey ← crypto.subtle.importKey(
    "pkcs8", keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true, ["sign"]
  )

  // Step 2: Export as SPKI (DER-encoded public key)
  spkiBuffer ← crypto.subtle.exportKey("spki", cryptoKey)

  // Step 3: Convert to PEM format
  pem ← arrayBufferToPem(spkiBuffer, "PUBLIC KEY")

  RETURN pem
END
```

### Main Signing Algorithm

```pascal
ALGORITHM signJwt(jsonPayload, pemPrivateKey)
INPUT: jsonPayload of type String, pemPrivateKey of type String
OUTPUT: jwt of type String

BEGIN
  // Step 1: Validate JSON payload
  TRY
    JSON.parse(jsonPayload)
  CATCH error
    THROW Error("Invalid JSON: " + error.message)
  END TRY

  // Step 2: Build and encode JWT header
  header ← '{"alg":"RS256","typ":"JWT"}'
  encodedHeader ← base64urlEncode(header)

  // Step 3: Encode the payload
  encodedPayload ← base64urlEncode(jsonPayload)

  // Step 4: Create signing input
  signingInput ← encodedHeader + "." + encodedPayload

  // Step 5: Import the RSA private key
  keyBuffer ← pemToArrayBuffer(pemPrivateKey)
  cryptoKey ← crypto.subtle.importKey(
    "pkcs8", keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  )

  // Step 6: Sign the input
  signatureBytes ← crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    textToBytes(signingInput)
  )

  // Step 7: Encode signature and assemble JWT
  encodedSignature ← base64urlEncode(signatureBytes)
  jwt ← signingInput + "." + encodedSignature

  RETURN jwt
END
```

**Preconditions:**
- jsonPayload is a valid JSON string
- pemPrivateKey is a valid PKCS#8 PEM RSA private key
- Web Crypto API is available

**Postconditions:**
- jwt contains exactly two "." separators (three segments)
- First segment decodes to the fixed RS256 header
- Second segment decodes to the original JSON payload
- Third segment is a valid RSA signature

### Base64url Encoding Algorithm

```pascal
ALGORITHM base64urlEncode(input)
INPUT: input of type String or ArrayBuffer
OUTPUT: encoded of type String

BEGIN
  // Step 1: Convert input to bytes if it is a string
  IF input IS String THEN
    bytes ← UTF8Encode(input)
  ELSE
    bytes ← input
  END IF

  // Step 2: Convert bytes to standard base64
  binaryString ← ""
  FOR i ← 0 TO bytes.length - 1 DO
    binaryString ← binaryString + charFromByte(bytes[i])
  END FOR
  base64 ← btoa(binaryString)

  // Step 3: Convert base64 to base64url
  //   Replace "+" with "-"
  //   Replace "/" with "_"
  //   Remove trailing "=" padding
  encoded ← base64
    .replace("+", "-")
    .replace("/", "_")
    .replace("=", "")

  RETURN encoded
END
```

**Preconditions:**
- input is non-null
- If string, contains valid UTF-8 characters

**Postconditions:**
- Output contains only characters [A-Za-z0-9_-]
- No padding characters in output
- Output length ≤ ceil(inputByteLength * 4/3)

### PEM Parsing Algorithm

```pascal
ALGORITHM pemToArrayBuffer(pem)
INPUT: pem of type String
OUTPUT: buffer of type ArrayBuffer

BEGIN
  // Step 1: Validate PEM structure
  IF pem does NOT contain "-----BEGIN PRIVATE KEY-----" THEN
    THROW Error("Invalid PEM: missing header")
  END IF
  IF pem does NOT contain "-----END PRIVATE KEY-----" THEN
    THROW Error("Invalid PEM: missing footer")
  END IF

  // Step 2: Extract base64 body
  body ← pem
    .removeSubstring("-----BEGIN PRIVATE KEY-----")
    .removeSubstring("-----END PRIVATE KEY-----")
    .removeAllWhitespace()

  // Step 3: Decode base64 to binary
  binaryString ← atob(body)

  // Step 4: Convert to ArrayBuffer
  buffer ← new ArrayBuffer(binaryString.length)
  view ← new Uint8Array(buffer)
  FOR i ← 0 TO binaryString.length - 1 DO
    view[i] ← binaryString.charCodeAt(i)
  END FOR

  RETURN buffer
END
```

**Preconditions:**
- pem is a non-empty string with valid PEM markers
- Base64 content between markers is valid

**Postconditions:**
- Returns ArrayBuffer with length > 0
- Buffer contains DER-encoded key data

## Example Usage

```javascript
// Example 1: Basic JWT signing
const payload = '{"sub":"1234567890","name":"Jane Doe","iat":1516239022}'
const pemKey = document.getElementById("pem-input").value
const jwt = await signJwt(payload, pemKey)
// Result: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOi..."

// Example 2: Click handler wiring
document.getElementById("sign-button").addEventListener("click", async () => {
  const jsonInput = document.getElementById("json-input").value
  const pemInput = document.getElementById("pem-input").value
  const output = document.getElementById("jwt-output")
  const errorDisplay = document.getElementById("error-display")

  try {
    errorDisplay.textContent = ""
    const jwt = await signJwt(jsonInput, pemInput)
    output.textContent = jwt
  } catch (err) {
    output.textContent = ""
    errorDisplay.textContent = err.message
  }
})

// Example 3: Validating the three-part JWT structure
const parts = jwt.split(".")
console.assert(parts.length === 3, "JWT must have 3 parts")
console.assert(JSON.parse(atob(parts[0])).alg === "RS256")
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Base64url alphabet compliance

*For any* string or ArrayBuffer input, the output of `base64urlEncode` SHALL contain only characters from the set `[A-Za-z0-9_-]` with no padding characters (`=`), no `+`, and no `/`.

**Validates: Requirements 4.1, 4.2, 7.4**

### Property 2: Base64url encoding round-trip

*For any* string or ArrayBuffer input, decoding the base64url-encoded output SHALL produce a byte sequence identical to the original input's byte representation.

**Validates: Requirements 4.3, 4.4**

### Property 3: PEM parsing round-trip

*For any* binary data wrapped in valid PEM format (with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers), `pemToArrayBuffer` SHALL return an ArrayBuffer whose bytes match the original binary data exactly.

**Validates: Requirements 5.1, 5.2**

### Property 4: PEM whitespace invariance

*For any* valid PEM string, inserting arbitrary whitespace or newline characters within the base64 body SHALL produce the same ArrayBuffer output from `pemToArrayBuffer` as the original PEM string without extra whitespace.

**Validates: Requirement 5.3**

### Property 5: PEM missing markers error

*For any* string that is missing the `-----BEGIN PRIVATE KEY-----` header or the `-----END PRIVATE KEY-----` footer, `pemToArrayBuffer` SHALL throw an error with a message containing "Invalid PEM".

**Validates: Requirements 5.4, 5.5, 8.4**

### Property 6: JWT three-segment structure

*For any* valid JSON payload and valid RSA private key, `signJwt(payload, key)` SHALL return a string with exactly two `.` separators, producing three non-empty base64url-encoded segments.

**Validates: Requirement 6.5**

### Property 7: JWT header invariance

*For any* valid JSON payload and valid RSA private key, the first segment of the JWT produced by `signJwt` SHALL always decode to exactly `{"alg":"RS256","typ":"JWT"}`.

**Validates: Requirements 6.1, 7.1**

### Property 8: JWT payload fidelity

*For any* valid JSON payload string and valid RSA private key, the second segment of the JWT produced by `signJwt`, when base64url-decoded, SHALL equal the original JSON payload string byte-for-byte.

**Validates: Requirement 7.2**

### Property 9: JWT signature validity

*For any* valid JSON payload and valid RSA key pair, the third segment of the JWT produced by `signJwt` SHALL be a valid RSASSA-PKCS1-v1_5 signature that can be verified using the corresponding RSA public key against the first two segments joined by a period.

**Validates: Requirement 7.3**

### Property 10: JWT signing determinism

*For any* valid JSON payload and valid RSA private key, calling `signJwt` multiple times with the same inputs SHALL produce identical JWT strings.

**Validates: Requirement 6.7**

### Property 11: Invalid JSON error propagation

*For any* string that is not valid JSON, calling `signJwt` with that string as the payload SHALL throw an error with a message containing "Invalid JSON".

**Validates: Requirement 8.2**

### Property 12: Output cleared on error

*For any* invalid input (invalid JSON, missing PEM markers, or empty inputs), when a signing error occurs, the JWT_Output area SHALL be cleared.

**Validates: Requirement 8.8**

### Property 13: Public JWK structure

*For any* valid RSA private key in PKCS#8 PEM format, `exportPublicJwk(key)` SHALL return an object containing exactly the fields `kty` (equal to `"RSA"`), `n`, `e`, and `alg` (equal to `"RS256"`), with no private key components (`d`, `p`, `q`, `dp`, `dq`, `qi`).

**Validates: Requirements 10.2, 10.4**

### Property 14: Public PEM format

*For any* valid RSA private key in PKCS#8 PEM format, `exportPublicPem(key)` SHALL return a string that starts with `-----BEGIN PUBLIC KEY-----` and ends with `-----END PUBLIC KEY-----`, with valid base64 content between the markers.

**Validates: Requirement 11.2**

### Property 15: Public key derivation consistency

*For any* valid RSA private key, the `n` and `e` values from `exportPublicJwk(key)` SHALL correspond to the same public key as the SPKI data from `exportPublicPem(key)`.

**Validates: Requirements 10.2, 11.2**

### Property 16: Click-to-select (manual verification)

*For any* non-empty output in `jwt-output` or `pubkey-output`, clicking the element SHALL result in the entire text content being selected via the browser's selection API. This property is verified by manual testing as it depends on DOM interaction.

**Validates: Requirements 15.1, 15.2, 15.3**

### Property 17: Now button iat injection (manual verification)

*For any* valid JSON object in the payload textarea, clicking the Now button SHALL produce a JSON object identical to the original except with the `iat` field set to a Unix timestamp within 1 second of `Math.floor(Date.now() / 1000)`. This property is verified by manual testing as it depends on DOM interaction and real-time clock.

**Validates: Requirements 16.2, 16.3, 16.4**

### Property 18: jwt.io link visibility (manual verification)

The jwt.io debugger link SHALL be visible if and only if `jwt-output` contains non-empty text. The link URL SHALL use the format `https://jwt.io/#token={encoded}`. This property is verified by manual testing as it depends on DOM state.

**Validates: Requirements 17.1, 17.2, 17.4**

### Property 19: Error shake animation (manual verification)

*For any* sequence of clicks on Sign or Now with invalid JSON, the error display SHALL play a shake animation each time an error is triggered while an error message is already visible. The animation SHALL complete within 500ms and be re-triggerable on consecutive clicks.

**Validates: Requirements 18.2, 18.3, 18.4**

### CI/CD Pipeline (Requirements 20–22): No Property-Based Tests

Requirements 20–22 define the GitHub Actions CI/CD pipeline configuration. All acceptance criteria are declarative YAML configuration checks (SMOKE) or GitHub Actions platform behavior (INTEGRATION). There are no pure functions with varying inputs, so property-based testing is not applicable. Verification is done by inspecting the workflow YAML structure and by observing GitHub Actions runs.

## Error Handling

### Error Scenario 1: Invalid JSON Payload

**Condition**: User enters text that is not valid JSON in the payload textarea.
**Response**: Display error message "Invalid JSON: \<parse error details\>" in red text. Do not attempt signing.
**Recovery**: User corrects the JSON and clicks Sign again.

### Error Scenario 2: Empty Inputs

**Condition**: Either the JSON payload or PEM key textarea is empty when Sign is clicked.
**Response**: Display "Please enter a JSON payload" or "Please enter an RSA private key" as appropriate.
**Recovery**: User fills in the missing input.

### Error Scenario 3: Invalid PEM Format

**Condition**: The PEM key text is missing `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` markers or contains invalid base64.
**Response**: Display "Invalid PEM key format" error.
**Recovery**: User provides a correctly formatted PKCS#8 PEM key.

### Error Scenario 4: Key Import Failure

**Condition**: The PEM content is structurally valid but not a valid RSA private key (e.g., wrong key type, corrupted data).
**Response**: Display "Failed to import key: \<browser error\>".
**Recovery**: User provides a valid RSA private key.

### Error Scenario 5: Web Crypto API Unavailable

**Condition**: Browser does not support `crypto.subtle` (very old browsers or restricted contexts).
**Response**: Display "Web Crypto API is not available in this browser. Please use a modern browser."
**Recovery**: User switches to a supported browser.

### Error Scenario 6: Empty JSON Payload on Now Click

**Condition**: The JSON payload textarea is empty when the Now button is clicked.
**Response**: Display "Please enter a JSON payload" in the error display.
**Recovery**: User enters a JSON payload and clicks Now again.

### Error Scenario 7: Invalid JSON on Now Click

**Condition**: The JSON payload textarea contains invalid JSON when the Now button is clicked.
**Response**: Display "Invalid JSON: \<parse error details\>" in the error display. If an error is already displayed, play a shake animation on the error display to draw attention.
**Recovery**: User corrects the JSON and clicks Now again.

### Error Scenario 8: Repeated Invalid Input (Shake)

**Condition**: The user clicks Sign or Now when the error display already contains an error message (e.g., from a previous invalid JSON attempt).
**Response**: The new error message replaces the old one, and the target error element plays a brief CSS shake animation (horizontal, ≤500ms) to signal that the error is still present. JSON parse errors are routed to `json-error` (inline below the textarea); all other errors are routed to `error-display`. The `showError(message)` function handles routing and shaking automatically.
**Recovery**: User corrects the input.

## Testing Strategy

### Unit Testing Approach

Key test cases for manual or automated verification:
- `base64urlEncode("")` returns `""`
- `base64urlEncode("Hello")` returns a string with no `+`, `/`, or `=` characters
- `pemToArrayBuffer` correctly strips headers and decodes base64
- `pemToArrayBuffer` throws on missing PEM markers
- `signJwt` throws on invalid JSON input
- `signJwt` produces a three-part dot-separated string
- The first JWT segment always decodes to the RS256 header

### Property-Based Testing Approach

**Property Test Library**: fast-check (if a test harness is added)

Properties to verify:
- For any valid JSON string and valid RSA key, the output always has exactly 3 dot-separated segments
- The first segment is always the same (header is fixed)
- The second segment always decodes back to the original payload
- All output characters are in the base64url alphabet
- Signing the same inputs twice produces identical output (determinism)

### Integration Testing Approach

- Open the HTML file via `file://` protocol, verify the Sign button works with pre-filled data
- Serve the HTML file via a local HTTP server, verify identical behavior
- Verify the generated JWT can be decoded and verified at jwt.io using the corresponding public key

## Performance Considerations

- RSA key import and signing are async operations; the UI should remain responsive during signing
- For typical JWT payloads (< 1KB) and 2048-bit RSA keys, signing completes in under 100ms on modern hardware
- No performance optimization is needed for this single-page tool; the bottleneck is the Web Crypto API call which is already native code
- The sample RSA key should be hardcoded rather than generated at page load to avoid a startup delay

## Security Considerations

- **Private key exposure**: The RSA private key is entered directly in the browser. Users should be warned not to use production keys in this tool. This is a development/testing utility.
- **No key storage**: The page must not persist the private key to localStorage, cookies, or any other storage mechanism.
- **No network requests**: The page must not make any network requests. All operations are local.
- **Web Crypto API**: Using the browser's native crypto implementation avoids vulnerabilities in third-party JS crypto libraries.
- **file:// compatibility**: `crypto.subtle` availability on `file://` varies by browser. Chrome and Firefox generally support it; the page should detect and warn if unavailable.

## Theming: Dark / Light Mode

### Approach

Colors are parameterized using CSS custom properties (variables) defined on `:root`. Two themes are provided: **dark** (default) and **light**. A toggle button in the top-right corner of the page switches between them by toggling a `data-theme="light"` attribute on `<html>`. When the attribute is absent or set to `"dark"`, the dark theme applies.

### CSS Variable Palette

```css
/* Dark theme (default) */
:root {
  --bg-page: #1a1a2e;
  --bg-card: #16213e;
  --bg-input: #0f3460;
  --bg-output: #0f3460;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0b0;
  --text-mono: #c8d6e5;
  --border-color: #2a2a4a;
  --btn-bg: #3b82f6;
  --btn-hover: #2563eb;
  --btn-active: #1d4ed8;
  --btn-text: #ffffff;
  --error-color: #f87171;
  --focus-ring: #3b82f6;
  --toggle-bg: #2a2a4a;
}

/* Light theme */
:root[data-theme="light"] {
  --bg-page: #f5f5f5;
  --bg-card: #ffffff;
  --bg-input: #fafafa;
  --bg-output: #f0f0f0;
  --text-primary: #1a1a1a;
  --text-secondary: #555555;
  --text-mono: #333333;
  --border-color: #cccccc;
  --btn-bg: #3b82f6;
  --btn-hover: #2563eb;
  --btn-active: #1d4ed8;
  --btn-text: #ffffff;
  --error-color: #dc2626;
  --focus-ring: #3b82f6;
  --toggle-bg: #e0e0e0;
}
```

### Toggle Button

- Positioned absolute in the top-right corner of `<main>` (or `<body>`)
- Shows a sun icon (☀️) in dark mode, moon icon (🌙) in light mode
- Clicking toggles `data-theme` between `"dark"` and `"light"` on `<html>`
- Preference is NOT persisted (no localStorage) to comply with the no-storage security constraint

### Implementation Rules

- All color values in `style.css` MUST reference `var(--xxx)` variables — no hardcoded hex colors in element rules
- Layout, spacing, font sizes, border-radius, and other structural properties remain unchanged between themes
- The toggle logic lives in `app.js` alongside the existing DOMContentLoaded handler

## Dependencies

- **None** — the page is entirely self-contained
- **Browser APIs used**: `crypto.subtle` (Web Crypto API), `btoa`/`atob` (Base64), `TextEncoder` (UTF-8 encoding)
- **Minimum browser support**: Any browser supporting Web Crypto API with RSASSA-PKCS1-v1_5 (Chrome 37+, Firefox 34+, Safari 11+, Edge 12+)


---

## GitHub Actions CI/CD Pipeline

### Overview

This section adds a GitHub Actions CI/CD pipeline to the JWT Signing Tool project. The pipeline has two concerns:

1. **Continuous Integration (CI)**: Run the test suite (`pnpm test` → `vitest --run`) on every push and pull request to verify code correctness.
2. **Continuous Deployment (CD)**: Deploy the static site files (`index.html`, `style.css`, `app.js`) to the `gh-pages` branch so the demo at `https://ecki.github.io/jwtsign-kirotest/` stays up to date.

The project has no build step — the static files are served directly. Deployment copies the site files to the `gh-pages` branch using the `peaceiris/actions-gh-pages` action (or equivalent `actions/deploy-pages`).

### Architecture

```mermaid
graph TD
    subgraph "GitHub Actions"
        Push[Push / PR Event] --> CI[CI Job: Test]
        CI -->|pnpm install| Install[Install Dependencies]
        Install -->|pnpm test| Test[Run vitest]
        Test -->|Pass| Deploy{Deploy?}
        Deploy -->|Push to main only| GHPages[Deploy to gh-pages branch]
        Deploy -->|PR or non-main| Skip[Skip deploy]
    end

    subgraph "GitHub Pages"
        GHPages --> Site["https://ecki.github.io/jwtsign-kirotest/"]
    end
```

### Workflow Configuration

**File**: `.github/workflows/ci.yml`

The workflow is a single file with two jobs:

#### Job 1: `test`

- **Triggers**: `push` (all branches), `pull_request` (all branches)
- **Runner**: `ubuntu-latest`
- **Steps**:
  1. Checkout the repository (`actions/checkout@v4`)
  2. Set up Node.js (`actions/setup-node@v4`) with a stable LTS version (e.g., `22`)
  3. Install pnpm (`pnpm/action-setup@v4`) — version is read from `packageManager` field in `package.json`, or latest stable
  4. Install dependencies (`pnpm install --frozen-lockfile`)
  5. Run tests (`pnpm test`)

#### Job 2: `deploy`

- **Triggers**: Only runs on `push` to `main` branch (not on PRs, not on other branches)
- **Depends on**: `test` job (must pass first)
- **Runner**: `ubuntu-latest`
- **Permissions**: `contents: write` (to push to `gh-pages` branch)
- **Steps**:
  1. Checkout the repository (`actions/checkout@v4`)
  2. Deploy to GitHub Pages using `peaceiris/actions-gh-pages@v4`:
     - `publish_dir`: `.` (root of the repo — the static files are at the top level)
     - `publish_branch`: `gh-pages`
     - `exclude_assets`: `'.github,node_modules,.kiro,.vscode,.git,.gitignore,package.json,pnpm-lock.yaml,vitest.config.js,app.test.js,LICENSE,README.md'`
     - `github_token`: `${{ secrets.GITHUB_TOKEN }}`

### Deployment Strategy

Since the project has no build step, the deployment copies only the site-facing files to the `gh-pages` branch:

**Files to deploy** (included):
- `index.html`
- `style.css`
- `app.js`

**Files to exclude** (not deployed):
- `.github/` (workflow files)
- `node_modules/` (dependencies)
- `.kiro/` (spec files)
- `.vscode/` (editor config)
- `.git/` (git internals)
- `.gitignore`
- `package.json`
- `pnpm-lock.yaml`
- `vitest.config.js`
- `app.test.js`
- `LICENSE`
- `README.md`

The `peaceiris/actions-gh-pages` action handles force-pushing to the `gh-pages` branch, which is the standard approach for GitHub Pages deployment.

### GitHub Pages Configuration

The repository must have GitHub Pages configured to serve from the `gh-pages` branch (root `/`). This is a one-time manual setting in the repository's Settings → Pages section.

### Package Manager Field

The workflow relies on `pnpm/action-setup@v4` which can auto-detect the pnpm version from `package.json`'s `packageManager` field. A `packageManager` field should be added to `package.json` to pin the pnpm version used in CI.

### Security Considerations

- The workflow uses `GITHUB_TOKEN` which is automatically provided by GitHub Actions — no manual secret configuration needed.
- `contents: write` permission is scoped only to the deploy job.
- Dependencies are installed with `--frozen-lockfile` to ensure reproducible builds.
- The workflow does not upload or transmit any secrets or private data.

### Error Handling

- If tests fail, the deploy job is skipped (it depends on the test job).
- If deployment fails (e.g., permissions issue), the GitHub Actions UI shows the failure with logs.
- PR checks show the test status, blocking merge if tests fail (when branch protection is configured).
