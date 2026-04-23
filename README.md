# JWT Signing Page

A browser-based JWT signing tool built entirely with the Web Crypto API. No server, no dependencies — just open the HTML file.

This is a test project by **Bernd Eckenfels**, created with [Kiro](https://kiro.dev). Licensed under the [MIT License](LICENSE).

## Live Demo

If hosted on GitHub Pages, open the raw HTML directly:

[**Open JWT Signing Tool**](https://ecki.github.io/jwtsign-kirotest/index.html)


## Features

- RS256 JWT signing using the browser's native `crypto.subtle`
- Public key export as JWK or SPKI PEM
- "Now" button to set `iat` claim to current Unix timestamp
- Click-to-select on output fields for easy copy/paste
- "Verify on jwt.io" link when both token and public key are available
- Dark/light mode toggle (dark by default)
- Pre-filled sample payload and RSA key for quick testing
- Works from `file://` protocol — no server required
- Zero runtime dependencies

## Generate a Test RSA Key

```bash
node -e "const{generateKeyPairSync}=require('crypto');const{privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'}});console.log(privateKey)"
```

Or with OpenSSL:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048
```

## CI/CD

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request:

- **Test job** — installs dependencies and runs `pnpm test`
- **Deploy job** — on pushes to `main` only, deploys the static site to the `gh-pages` branch for GitHub Pages

All actions are pinned to full commit SHAs and token permissions are explicitly scoped per job.

## Build & Test

Prerequisites: [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```bash
# Install dev dependencies
pnpm install

# Run the property-based test suite (vitest + fast-check)
pnpm test
```

There is no build step — the HTML/JS/CSS files are used directly. To serve locally:

```bash
pnpm dlx serve .
```

## Project Structure

```
index.html        — page structure
app.js            — all application logic (signing, export, UI wiring)
style.css         — theming via CSS custom properties (dark/light)
app.test.js       — 14 property-based tests (vitest + fast-check)
vitest.config.js
package.json
.kiro/            — Kiro spec documents (requirements, design, tasks)
```

The `.kiro/` directory contains the spec-driven development artifacts created with [Kiro](https://kiro.dev) — requirements, technical design, correctness properties, and implementation task lists. These are committed as project documentation.

## License

MIT
