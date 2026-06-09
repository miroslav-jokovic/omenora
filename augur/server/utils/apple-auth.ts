import { createPrivateKey, createSign } from 'node:crypto'

export interface AppleSiwaConfig {
  teamId: string
  keyId: string
  clientId: string
  privateKey: string
}

// DER -> IEEE P1363 (r || s). node:crypto returns DER ECDSA signatures; Apple
// expects the raw 64-byte r||s concatenation (each zero-padded to 32 bytes).
function derToP1363(der: Buffer): Buffer {
  let offset = 2 // skip 0x30 <totalLen>
  if (der[offset] !== 0x02) throw new Error('Unexpected DER structure')
  const rLen = der[offset + 1]!
  offset += 2
  const rRaw = der.subarray(offset, offset + rLen)
  offset += rLen
  if (der[offset] !== 0x02) throw new Error('Unexpected DER structure')
  const sLen = der[offset + 1]!
  offset += 2
  const sRaw = der.subarray(offset, offset + sLen)
  const r = rRaw[0] === 0x00 ? rRaw.subarray(1) : rRaw
  const s = sRaw[0] === 0x00 ? sRaw.subarray(1) : sRaw
  const p1363 = Buffer.alloc(64)
  r.copy(p1363, 32 - r.length)
  s.copy(p1363, 64 - s.length)
  return p1363
}

/** Build a short-lived (~5 min) ES256 client_secret JWT for Apple token endpoints. */
export function buildAppleClientSecret(cfg: AppleSiwaConfig): string {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const header  = { alg: 'ES256', kid: cfg.keyId }
  const payload = {
    iss: cfg.teamId,
    iat: nowSeconds,
    exp: nowSeconds + 300,
    aud: 'https://appleid.apple.com',
    sub: cfg.clientId,
  }
  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const signingInput = `${encode(header)}.${encode(payload)}` 
  const normalizedPem = cfg.privateKey.replace(/\\n/g, '\n')
  const key  = createPrivateKey(normalizedPem)
  const sign = createSign('SHA256')
  sign.update(signingInput)
  const derSig = sign.sign(key)
  const sig = derToP1363(derSig)
  return `${signingInput}.${sig.toString('base64url')}` 
}

/**
 * Revoke an Apple refresh token (App Store guideline 5.1.1(v)).
 * Best-effort: returns true on success, false on any failure, and NEVER throws,
 * so account deletion is never blocked by an Apple-side failure. Never logs tokens.
 */
export async function revokeAppleRefreshToken(refreshToken: string, cfg: AppleSiwaConfig): Promise<boolean> {
  try {
    const clientSecret = buildAppleClientSecret(cfg)
    const params = new URLSearchParams({
      client_id:       cfg.clientId,
      client_secret:   clientSecret,
      token:           refreshToken,
      token_type_hint: 'refresh_token',
    })
    const res = await fetch('https://appleid.apple.com/auth/revoke', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    })
    if (!res.ok) {
      const code = await res.json()
        .then((d: Record<string, unknown>) => d?.error ?? 'unknown')
        .catch(() => 'parse_error')
      console.error('[apple-revoke] revoke failed - error_code:', code, 'status:', res.status)
      return false
    }
    return true
  } catch (err) {
    console.error('[apple-revoke] revoke threw:', (err as Error).message)
    return false
  }
}
