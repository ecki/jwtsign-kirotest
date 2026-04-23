// JWT Signing Page - Application Logic

/**
 * Encodes a string or ArrayBuffer to base64url format (RFC 4648 §5).
 * @param {string|ArrayBuffer} input - String or binary data to encode
 * @returns {string} Base64url-encoded string (no padding)
 */
function base64urlEncode(input) {
  if (input === '' || input === undefined || input === null) return '';
  if (input instanceof ArrayBuffer && input.byteLength === 0) return '';

  var binaryString = '';

  if (typeof input === 'string') {
    // Encode string to UTF-8 bytes via TextEncoder
    var bytes = new TextEncoder().encode(input);
    for (var i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
  } else {
    // ArrayBuffer: convert bytes to binary string
    var view = new Uint8Array(input);
    for (var i = 0; i < view.length; i++) {
      binaryString += String.fromCharCode(view[i]);
    }
  }

  var base64 = btoa(binaryString);

  // Convert base64 to base64url: replace + with -, / with _, remove = padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Converts a PEM-encoded private key string to an ArrayBuffer.
 * @param {string} pem - PEM-formatted RSA private key
 * @returns {ArrayBuffer} DER-encoded key data
 * @throws {Error} If PEM format is invalid
 */
function pemToArrayBuffer(pem) {
  if (pem.indexOf('-----BEGIN PRIVATE KEY-----') === -1) {
    throw new Error('Invalid PEM: missing BEGIN marker');
  }
  if (pem.indexOf('-----END PRIVATE KEY-----') === -1) {
    throw new Error('Invalid PEM: missing END marker');
  }

  // Strip header, footer, and all whitespace
  var body = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  // Decode base64 body to binary
  var binaryString = atob(body);

  // Convert to ArrayBuffer
  var buffer = new ArrayBuffer(binaryString.length);
  var view = new Uint8Array(buffer);
  for (var i = 0; i < binaryString.length; i++) {
    view[i] = binaryString.charCodeAt(i);
  }

  return buffer;
}

/**
 * Imports a PEM RSA private key into a Web Crypto CryptoKey.
 * @param {string} pem - PEM-formatted PKCS#8 RSA private key
 * @returns {Promise<CryptoKey>} Imported key usable for signing
 */
async function importPrivateKey(pem) {
  var keyBuffer = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

/**
 * Signs a JSON payload as a JWT using RS256.
 * @param {string} jsonPayload - Valid JSON string for the JWT claims
 * @param {string} pemPrivateKey - PEM-formatted PKCS#8 RSA private key
 * @returns {Promise<string>} Complete JWT string (header.payload.signature)
 */
async function signJwt(jsonPayload, pemPrivateKey) {
  // Validate JSON
  try {
    JSON.parse(jsonPayload);
  } catch (e) {
    throw new Error('Invalid JSON: ' + e.message);
  }

  // Construct fixed header
  var header = '{"alg":"RS256","typ":"JWT"}';
  var encodedHeader = base64urlEncode(header);
  var encodedPayload = base64urlEncode(jsonPayload);
  var signingInput = encodedHeader + '.' + encodedPayload;

  // Import key and sign
  var key;
  try {
    key = await importPrivateKey(pemPrivateKey);
  } catch (e) {
    throw new Error('Failed to import key: ' + (e.message || String(e)));
  }

  var data = new TextEncoder().encode(signingInput);
  var signature;
  try {
    signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
  } catch (e) {
    throw new Error('Failed to sign: ' + (e.message || String(e)));
  }

  // Assemble JWT
  var encodedSignature = base64urlEncode(signature);
  return signingInput + '.' + encodedSignature;
}

/**
 * Click handler for the Sign button. Reads inputs, calls signJwt,
 * and updates the UI with the result or error.
 */
async function onSignClick() {
  var jsonInput = document.getElementById('json-input');
  var pemInput = document.getElementById('pem-input');
  var jwtOutput = document.getElementById('jwt-output');

  var jsonValue = jsonInput.value.trim();
  var pemValue = pemInput.value.trim();

  // Validate non-empty inputs
  if (!jsonValue) {
    jwtOutput.textContent = '';
    showError('Please enter a JSON payload');
    return;
  }
  if (!pemValue) {
    jwtOutput.textContent = '';
    showError('Please enter an RSA private key');
    return;
  }

  try {
    var jwt = await signJwt(jsonValue, pemValue);
    jwtOutput.textContent = jwt;
    clearErrors();
  } catch (err) {
    jwtOutput.textContent = '';
    var message = err.message || String(err);
    if (message.indexOf('Invalid PEM') !== -1) {
      showError('Invalid PEM key format');
    } else {
      showError(message);
    }
  }
  if (typeof updateJwtIoLink === 'function') updateJwtIoLink();
}

/**
 * Converts an ArrayBuffer to a PEM-formatted string with the given label.
 * @param {ArrayBuffer} buffer - DER-encoded key data
 * @param {string} label - PEM label (e.g., "PUBLIC KEY")
 * @returns {string} PEM string with header/footer and base64 body
 */
function arrayBufferToPem(buffer, label) {
  var bytes = new Uint8Array(buffer);
  var binaryString = '';
  for (var i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  var base64 = btoa(binaryString);
  // Split into 64-character lines
  var lines = [];
  for (var i = 0; i < base64.length; i += 64) {
    lines.push(base64.slice(i, i + 64));
  }
  return '-----BEGIN ' + label + '-----\n' + lines.join('\n') + '\n-----END ' + label + '-----';
}

/**
 * Imports a PEM RSA private key as extractable, then exports the
 * public key components as a JWK object.
 * @param {string} pemPrivateKey - PEM-formatted PKCS#8 RSA private key
 * @returns {Promise<object>} JWK object with kty, n, e, alg fields
 */
async function exportPublicJwk(pemPrivateKey) {
  var keyBuffer = pemToArrayBuffer(pemPrivateKey);
  var cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    true,
    ['sign']
  );
  var fullJwk = await crypto.subtle.exportKey('jwk', cryptoKey);
  // Strip private components, keep only public fields
  return { kty: fullJwk.kty, n: fullJwk.n, e: fullJwk.e, alg: 'RS256' };
}

/**
 * Imports a PEM RSA private key as extractable, then exports the
 * public key in SPKI PEM format.
 * @param {string} pemPrivateKey - PEM-formatted PKCS#8 RSA private key
 * @returns {Promise<string>} PEM string with BEGIN/END PUBLIC KEY markers
 */
async function exportPublicPem(pemPrivateKey) {
  var keyBuffer = pemToArrayBuffer(pemPrivateKey);
  var cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    true,
    ['sign']
  );
  // Export as JWK first, then re-import as public key to get SPKI
  var fullJwk = await crypto.subtle.exportKey('jwk', cryptoKey);
  var publicJwk = { kty: fullJwk.kty, n: fullJwk.n, e: fullJwk.e };
  var publicKey = await crypto.subtle.importKey(
    'jwk',
    publicJwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    true,
    ['verify']
  );
  var spkiBuffer = await crypto.subtle.exportKey('spki', publicKey);
  return arrayBufferToPem(spkiBuffer, 'PUBLIC KEY');
}

/**
 * Click handler for the Public JWK button. Reads PEM input,
 * exports public JWK, and updates the UI.
 */
async function onPublicJwkClick() {
  var pemInput = document.getElementById('pem-input');
  var pubkeyOutput = document.getElementById('pubkey-output');
  var errorDisplay = document.getElementById('error-display');

  var pemValue = pemInput.value.trim();

  if (!pemValue) {
    pubkeyOutput.textContent = '';
    errorDisplay.textContent = 'Please enter an RSA private key';
    return;
  }

  try {
    var jwk = await exportPublicJwk(pemValue);
    pubkeyOutput.textContent = JSON.stringify(jwk, null, 2);
    errorDisplay.textContent = '';
  } catch (err) {
    pubkeyOutput.textContent = '';
    var message = err.message || String(err);
    if (message.indexOf('Invalid PEM') !== -1) {
      errorDisplay.textContent = 'Invalid PEM key format';
    } else {
      errorDisplay.textContent = 'Failed to import key: ' + message;
    }
  }
  if (typeof updateJwtIoLink === 'function') updateJwtIoLink();
}

/**
 * Click handler for the Public PEM button. Reads PEM input,
 * exports public PEM, and updates the UI.
 */
async function onPublicPemClick() {
  var pemInput = document.getElementById('pem-input');
  var pubkeyOutput = document.getElementById('pubkey-output');
  var errorDisplay = document.getElementById('error-display');

  var pemValue = pemInput.value.trim();

  if (!pemValue) {
    pubkeyOutput.textContent = '';
    errorDisplay.textContent = 'Please enter an RSA private key';
    return;
  }

  try {
    var pem = await exportPublicPem(pemValue);
    pubkeyOutput.textContent = pem;
    errorDisplay.textContent = '';
  } catch (err) {
    pubkeyOutput.textContent = '';
    var message = err.message || String(err);
    if (message.indexOf('Invalid PEM') !== -1) {
      errorDisplay.textContent = 'Invalid PEM key format';
    } else {
      errorDisplay.textContent = 'Failed to import key: ' + message;
    }
  }
  if (typeof updateJwtIoLink === 'function') updateJwtIoLink();
}

/**
 * Selects the entire text content of a DOM element for easy copy-paste.
 * Only acts if the element has non-empty textContent.
 * @param {HTMLElement} element - The element whose content to select
 */
function selectAllContent(element) {
  if (!element.textContent) return;
  var selection = window.getSelection();
  var range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Triggers a shake animation on the given DOM element.
 * Removes and re-adds the 'shake' class with a forced reflow
 * to make the animation re-triggerable on consecutive calls.
 * @param {HTMLElement} el - The element to shake
 */
function shakeElement(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

/**
 * Routes an error message to the correct display element.
 * JSON parse errors go to json-error (inline below textarea);
 * all other errors go to error-display. Clears the other element
 * and shakes whichever received the message.
 * @param {string} message - The error message to display
 */
function showError(message) {
  var jsonError = document.getElementById('json-error');
  var errorDisplay = document.getElementById('error-display');
  if (message.indexOf('Invalid JSON') !== -1) {
    jsonError.textContent = message;
    errorDisplay.textContent = '';
    shakeElement(jsonError);
  } else {
    errorDisplay.textContent = message;
    jsonError.textContent = '';
    shakeElement(errorDisplay);
  }
}

/**
 * Clears both json-error and error-display elements.
 */
function clearErrors() {
  var jsonError = document.getElementById('json-error');
  var errorDisplay = document.getElementById('error-display');
  if (jsonError) jsonError.textContent = '';
  if (errorDisplay) errorDisplay.textContent = '';
}

/**
 * Updates the jwt.io debugger link visibility and href.
 * Shows the link when the JWT output has content. Uses #token= format
 * (jwt.io v2 only supports token pre-population; public key must be
 * pasted manually by the user).
 */
function updateJwtIoLink() {
  var jwtOutput = document.getElementById('jwt-output');
  var link = document.getElementById('jwt-io-link');
  if (!link) return;

  var jwt = jwtOutput.textContent;

  if (jwt) {
    var url = 'https://jwt.io/#token=' + encodeURIComponent(jwt);
    link.href = url;
    link.style.display = 'block';
  } else {
    link.style.display = 'none';
  }
}

/**
 * Click handler for the Now button. Parses the JSON payload,
 * sets or overwrites the "iat" field with the current Unix timestamp
 * in seconds, and writes the updated JSON back to the textarea.
 */
function onNowClick() {
  var jsonInput = document.getElementById('json-input');

  var jsonValue = jsonInput.value.trim();

  if (!jsonValue) {
    showError('Please enter a JSON payload');
    return;
  }

  var obj;
  try {
    obj = JSON.parse(jsonValue);
  } catch (e) {
    showError('Invalid JSON: ' + e.message);
    return;
  }

  obj.iat = Math.floor(Date.now() / 1000);
  jsonInput.value = JSON.stringify(obj, null, 2);
  clearErrors();
}

// Sample data
var SAMPLE_PAYLOAD = JSON.stringify({
  sub: '1234567890',
  name: 'Jane Doe',
  iat: 1516239022
}, null, 2);

var SAMPLE_PEM_KEY = '-----BEGIN PRIVATE KEY-----\n' +
  'MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDsL2HyGaqh7Tqc\n' +
  'j1Z4zWkxwvxqEh+iIKsG8wiDrLOpgJnEHFLAXJtTpbRLmk35Vv3jeW8ospagdkPZ\n' +
  'qRm6nRAioRwzWmAjmBzekyco1h1omQ6Vvi5YXtGFjBAbnw3MR9obfjuntZ8JGrQi\n' +
  'notrmoye3A4cL+PJ7Ls/hk5A4Tuk38rzf3rVf5Zvz3KUutl1UCHtSo0qpZ8QdZye\n' +
  'dimReobgI3Rb4G8FYRfbN7CDosU9yeHzwQHaOr9dTAfOPatpckxfFbLdH9kDC3xi\n' +
  'YP2XsK3WdGfIRPfAlMYjJKGTsvGIgj/V1mA6kDDk333vLLNOgRnZl1OIO/V65Hz0\n' +
  'uah+D7DZAgMBAAECggEAZL3pN0z/XUZFA9aX+bsULaeP5uaIG613heVQMmoN0DUM\n' +
  'YXv7SBW4IzvA5aaRr9MNRGPdqCxU12jalBLu6Ixp/3tc/gKEk2oklkOKJn792EnA\n' +
  '0NpoBkWbdS1DCaUUS5gyThvP8j8j8Mw1HbcmnOU1KeWPFzLOJKkXTYdKBZ6MxEvm\n' +
  '6QZabAJVb9LQ0R+HEzeDHNdupD+lcvHZLB0yALx+SwAUFWX7+98LoJ2mXVEmiiEB\n' +
  '1sWcZ6KusXiOnRjNGuo3/QEDPyo54nES+Gk+S7HJH9Zd/o+nGhOg8UIJGMvtbgVI\n' +
  '6WLl9z/dwd3HRxTN9LpiNPa1kEeTOtYHCta1L4T5KQKBgQD/Ro0Yn+Fw2LYnLbbw\n' +
  '8p7CRWiRax0J+iDQEu6uIC8sWlXhK34wu83XP5V/3kLNktJifiTNGNXQpNnczc2/\n' +
  'v1gFdngV7k6tM1vY239U/oboUnBBGnnlvP8xk9bMdNOgzElvbbEnqipm/Q1FsDqG\n' +
  'LZy4hrp0DkWmEP00vyCs06c7/wKBgQDs2vZ9ztvzDjREkjgWkWUj6Am7wXQ8fP9t\n' +
  'j0MlFYvCx+a/z6OZib6ONxFuZeWQclH1vrH9uS3H1aqig/flLuqvK1lrxYm/ilob\n' +
  '/qDVHYyPOykdKhsYXz+KqT+ibuJ7X/ocTSZOuY4E8JlD8RpjZwndMw7jeoBOVEwv\n' +
  'WM2H6F5zJwKBgD3vwzovSIaVvhRhbhql80kViBqIT6JlEuMJROnwmyF6xY19fP+c\n' +
  'AYRxQ/ejWLgCIJOPIaS1muMlrEp7kKkuZs/kf5xqlqJFbMp/7zQTEW562guhveO0\n' +
  '6IIB6cLvsY05I7QqfCowils0mKzI5lo55OWMot6Xu+RgCN9sZCQqsk/HAoGAVILs\n' +
  'YIdmw5rV24GwsZy/UciBcJTePJb9LMJpWtoNPDrHgrk7zpTvgR71AUcqWhfwVpbs\n' +
  'O3PPefYrJEGiOgw7gLUe+u1I8ScUb9iy2lfox1J8oQNdF50ktv0cz4BxH0RnoaGF\n' +
  'gaGDow+WID/vAnjJdDu7nD8heNFrPZmZ/FxVFxECgYBhzjyLL1sCJQHTQ0W5cx2t\n' +
  'o8r5pAxmhUWyHor94b0f3lNMEIOcEW4BLwGo/KNETG5t/UrSC+8Neu0xpsXjQ/dw\n' +
  'o/MKY71NXAC5z3bG29KWanZkhcz6aegPiV3Z1ObxpmByIY1rsrLa8QZXw7G7qIoi\n' +
  'uf81ywSbB4Ig5q2dYnK+SA==\n' +
  '-----END PRIVATE KEY-----';

// Initialize on page load (only in browser context)
if (typeof document !== 'undefined') {
document.addEventListener('DOMContentLoaded', function () {
  var jsonInput = document.getElementById('json-input');
  var pemInput = document.getElementById('pem-input');
  var signButton = document.getElementById('sign-button');
  var errorDisplay = document.getElementById('error-display');

  // Pre-fill sample data
  jsonInput.value = SAMPLE_PAYLOAD;
  pemInput.value = SAMPLE_PEM_KEY;

  // Attach click handler
  signButton.addEventListener('click', onSignClick);

  // Attach public key export handlers
  var publicJwkBtn = document.getElementById('public-jwk-btn');
  var publicPemBtn = document.getElementById('public-pem-btn');
  publicJwkBtn.addEventListener('click', onPublicJwkClick);
  publicPemBtn.addEventListener('click', onPublicPemClick);

  // Attach Now button handler
  var nowBtn = document.getElementById('now-btn');
  nowBtn.addEventListener('click', onNowClick);

  // Theme toggle
  var themeToggle = document.getElementById('theme-toggle');
  themeToggle.addEventListener('click', function () {
    var html = document.documentElement;
    if (html.getAttribute('data-theme') === 'light') {
      html.removeAttribute('data-theme');
      themeToggle.textContent = '☀️';
    } else {
      html.setAttribute('data-theme', 'light');
      themeToggle.textContent = '🌙';
    }
  });

  // Check Web Crypto API availability
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    errorDisplay.textContent = 'Web Crypto API is not available in this browser. Please use a modern browser.';
    signButton.disabled = true;
  }

  // Click-to-select on output areas
  var jwtOutput = document.getElementById('jwt-output');
  var pubkeyOutput = document.getElementById('pubkey-output');
  jwtOutput.addEventListener('click', function () { selectAllContent(jwtOutput); });
  pubkeyOutput.addEventListener('click', function () { selectAllContent(pubkeyOutput); });
});
}

// Export for testing (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { base64urlEncode, pemToArrayBuffer, importPrivateKey, signJwt, exportPublicJwk, exportPublicPem, arrayBufferToPem };
}
