import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { generateKeyPairSync } from 'crypto';
import { base64urlEncode, pemToArrayBuffer, signJwt, exportPublicJwk, exportPublicPem } from './app.js';

// --- Helpers ---

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64');
}

function wrapInPem(buffer) {
  const base64 = Buffer.from(buffer).toString('base64');
  return `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
}

// --- Test RSA key (generated once) ---

let testPemKey;

beforeAll(() => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  testPemKey = privateKey;
});

// --- Arbitrary JSON payload generator ---

const jsonPayloadArb = fc
  .dictionary(
    fc.string({ minLength: 1 }).filter((s) => !s.includes('\0')),
    fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))
  )
  .map((obj) => JSON.stringify(obj));

// ============================================================
// 8.2 - Base64url alphabet compliance (Property 1)
// ============================================================

describe('Property 1: Base64url alphabet compliance', () => {
  /**
   * **Validates: Requirements 4.1, 4.2, 7.4**
   */
  it('output contains only base64url characters for arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const encoded = base64urlEncode(input);
        expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
      }),
      { numRuns: 100 }
    );
  });

  it('output contains only base64url characters for arbitrary byte arrays', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 512 }), (bytes) => {
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const encoded = base64urlEncode(buffer);
        expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 8.3 - Base64url round-trip (Property 2)
// ============================================================

describe('Property 2: Base64url encoding round-trip', () => {
  /**
   * **Validates: Requirements 4.3, 4.4**
   */
  it('decoding the base64url output produces the original bytes', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const encoded = base64urlEncode(input);
        const decoded = base64urlDecode(encoded);
        const originalBytes = Buffer.from(new TextEncoder().encode(input));
        expect(decoded).toEqual(originalBytes);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 8.4 - PEM parsing round-trip (Property 3)
// ============================================================

describe('Property 3: PEM parsing round-trip', () => {
  /**
   * **Validates: Requirements 5.1, 5.2**
   */
  it('pemToArrayBuffer returns the original binary data from PEM-wrapped input', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 256 }), (bytes) => {
        const pem = wrapInPem(bytes);
        const result = pemToArrayBuffer(pem);
        const resultBytes = new Uint8Array(result);
        expect(Array.from(resultBytes)).toEqual(Array.from(bytes));
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 8.5 - PEM whitespace invariance (Property 4)
// ============================================================

describe('Property 4: PEM whitespace invariance', () => {
  /**
   * **Validates: Requirement 5.3**
   */
  it('inserting whitespace in PEM body produces the same ArrayBuffer', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 128 }),
        fc.array(fc.record({
          pos: fc.nat(),
          ws: fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 3 }).map((a) => a.join('')),
        }), { minLength: 1, maxLength: 10 }),
        (bytes, insertions) => {
          const base64Body = Buffer.from(bytes).toString('base64');
          // Insert random whitespace at random positions in the base64 body
          let modifiedBody = base64Body;
          for (const { pos, ws } of insertions) {
            const idx = pos % (modifiedBody.length + 1);
            modifiedBody = modifiedBody.slice(0, idx) + ws + modifiedBody.slice(idx);
          }
          const cleanPem = `-----BEGIN PRIVATE KEY-----\n${base64Body}\n-----END PRIVATE KEY-----`;
          const dirtyPem = `-----BEGIN PRIVATE KEY-----\n${modifiedBody}\n-----END PRIVATE KEY-----`;

          const cleanResult = new Uint8Array(pemToArrayBuffer(cleanPem));
          const dirtyResult = new Uint8Array(pemToArrayBuffer(dirtyPem));
          expect(Array.from(dirtyResult)).toEqual(Array.from(cleanResult));
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 8.6 - PEM missing markers error (Property 5)
// ============================================================

describe('Property 5: PEM missing markers error', () => {
  /**
   * **Validates: Requirements 5.4, 5.5, 8.4**
   */
  it('throws "Invalid PEM" for strings without PEM markers', () => {
    fc.assert(
      fc.property(
        fc.string().filter(
          (s) =>
            !s.includes('-----BEGIN PRIVATE KEY-----') &&
            !s.includes('-----END PRIVATE KEY-----')
        ),
        (input) => {
          expect(() => pemToArrayBuffer(input)).toThrow(/Invalid PEM/);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 8.7 - JWT three-segment structure (Property 6)
// ============================================================

describe('Property 6: JWT three-segment structure', () => {
  /**
   * **Validates: Requirement 6.5**
   */
  it('signJwt produces exactly 3 non-empty dot-separated segments', async () => {
    await fc.assert(
      fc.asyncProperty(jsonPayloadArb, async (payload) => {
        const jwt = await signJwt(payload, testPemKey);
        const parts = jwt.split('.');
        expect(parts).toHaveLength(3);
        expect(parts[0].length).toBeGreaterThan(0);
        expect(parts[1].length).toBeGreaterThan(0);
        expect(parts[2].length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 8.8 - JWT header invariance (Property 7)
// ============================================================

describe('Property 7: JWT header invariance', () => {
  /**
   * **Validates: Requirements 6.1, 7.1**
   */
  it('first segment always decodes to {"alg":"RS256","typ":"JWT"}', async () => {
    await fc.assert(
      fc.asyncProperty(jsonPayloadArb, async (payload) => {
        const jwt = await signJwt(payload, testPemKey);
        const headerSegment = jwt.split('.')[0];
        const decoded = JSON.parse(base64urlDecode(headerSegment).toString('utf-8'));
        expect(decoded).toEqual({ alg: 'RS256', typ: 'JWT' });
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 8.9 - JWT payload fidelity (Property 8)
// ============================================================

describe('Property 8: JWT payload fidelity', () => {
  /**
   * **Validates: Requirement 7.2**
   */
  it('second segment decodes to the original payload', async () => {
    await fc.assert(
      fc.asyncProperty(jsonPayloadArb, async (payload) => {
        const jwt = await signJwt(payload, testPemKey);
        const payloadSegment = jwt.split('.')[1];
        const decoded = base64urlDecode(payloadSegment).toString('utf-8');
        expect(decoded).toBe(payload);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 8.10 - JWT signing determinism (Property 10)
// ============================================================

describe('Property 10: JWT signing determinism', () => {
  /**
   * **Validates: Requirement 6.7**
   */
  it('signing the same payload twice produces identical output', async () => {
    await fc.assert(
      fc.asyncProperty(jsonPayloadArb, async (payload) => {
        const jwt1 = await signJwt(payload, testPemKey);
        const jwt2 = await signJwt(payload, testPemKey);
        expect(jwt1).toBe(jwt2);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 8.11 - Invalid JSON error propagation (Property 11)
// ============================================================

describe('Property 11: Invalid JSON error propagation', () => {
  /**
   * **Validates: Requirement 8.2**
   */
  it('signJwt throws "Invalid JSON" for non-JSON strings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => {
          try {
            JSON.parse(s);
            return false;
          } catch {
            return true;
          }
        }),
        async (input) => {
          await expect(signJwt(input, testPemKey)).rejects.toThrow(/Invalid JSON/);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 13.1 - Public JWK structure (Property 13)
// ============================================================

describe('Property 13: Public JWK structure', () => {
  /**
   * **Validates: Requirements 10.2, 10.4**
   */
  it('exportPublicJwk returns object with kty==="RSA", alg==="RS256", n and e present, no private fields', async () => {
    const privateFields = ['d', 'p', 'q', 'dp', 'dq', 'qi'];

    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const jwk = await exportPublicJwk(testPemKey);

          // Required public fields
          expect(jwk.kty).toBe('RSA');
          expect(jwk.alg).toBe('RS256');
          expect(typeof jwk.n).toBe('string');
          expect(jwk.n.length).toBeGreaterThan(0);
          expect(typeof jwk.e).toBe('string');
          expect(jwk.e.length).toBeGreaterThan(0);

          // No private fields
          for (const field of privateFields) {
            expect(jwk).not.toHaveProperty(field);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 13.2 - Public PEM format (Property 14)
// ============================================================

describe('Property 14: Public PEM format', () => {
  /**
   * **Validates: Requirement 11.2**
   */
  it('exportPublicPem returns string with BEGIN/END PUBLIC KEY markers and valid base64 body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const pem = await exportPublicPem(testPemKey);

          // Check markers
          expect(pem.startsWith('-----BEGIN PUBLIC KEY-----')).toBe(true);
          expect(pem.endsWith('-----END PUBLIC KEY-----')).toBe(true);

          // Extract body and validate base64
          const body = pem
            .replace('-----BEGIN PUBLIC KEY-----', '')
            .replace('-----END PUBLIC KEY-----', '')
            .trim();
          expect(body.length).toBeGreaterThan(0);

          // Each line should be at most 64 characters
          const lines = body.split('\n');
          for (const line of lines) {
            expect(line.length).toBeLessThanOrEqual(64);
          }

          // Body should be valid base64
          const base64Chars = /^[A-Za-z0-9+/=\n]+$/;
          expect(body).toMatch(base64Chars);

          // Should decode without error
          const cleanBase64 = body.replace(/\n/g, '');
          const decoded = Buffer.from(cleanBase64, 'base64');
          expect(decoded.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 13.3 - Public key derivation consistency (Property 15)
// ============================================================

describe('Property 15: Public key derivation consistency', () => {
  /**
   * **Validates: Requirements 10.2, 11.2**
   */
  it('JWK n and e values match the SPKI PEM public key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const jwk = await exportPublicJwk(testPemKey);
          const pem = await exportPublicPem(testPemKey);

          // Import the SPKI PEM back as a CryptoKey and export as JWK
          const body = pem
            .replace('-----BEGIN PUBLIC KEY-----', '')
            .replace('-----END PUBLIC KEY-----', '')
            .replace(/\s/g, '');
          const binaryString = atob(body);
          const spkiBuffer = new ArrayBuffer(binaryString.length);
          const view = new Uint8Array(spkiBuffer);
          for (let i = 0; i < binaryString.length; i++) {
            view[i] = binaryString.charCodeAt(i);
          }

          const importedKey = await crypto.subtle.importKey(
            'spki',
            spkiBuffer,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            true,
            ['verify']
          );
          const spkiJwk = await crypto.subtle.exportKey('jwk', importedKey);

          // The n and e values should match
          expect(jwk.n).toBe(spkiJwk.n);
          expect(jwk.e).toBe(spkiJwk.e);
        }
      ),
      { numRuns: 100 }
    );
  });
});
