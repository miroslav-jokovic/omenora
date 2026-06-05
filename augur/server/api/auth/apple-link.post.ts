/**
 * POST /api/auth/apple-link
 *
 * Exchanges an Apple authorizationCode for a refresh_token and stores it
 * in public.apple_auth_tokens for later use during account deletion
 * (Apple App Store guideline 5.1.1(v) — token revocation requirement).
 *
 * Must be called immediately after a successful Apple Sign-In on the mobile
 * client, once a Supabase session is established.
 *
 * Security:
 *   - user.id is sourced from the verified Supabase JWT, NEVER from the body.
 *   - authorizationCode, client_secret, and refresh_token are NEVER logged.
 *   - Apple's raw error body is never forwarded to the caller.
 *   - The endpoint is idempotent (UPSERT on conflict).
 */
import { createPrivateKey, createSign } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // ── 1. Authenticate caller ─────────────────────────────────────────────────
  const user = await requireAuth(event)

  // ── 2. Read + validate body ────────────────────────────────────────────────
  const body = await readBody(event)
  const authorizationCode: string | undefined =
    typeof body?.authorizationCode === 'string' ? body.authorizationCode.trim() : undefined

  if (!authorizationCode) {
    throw createError({ statusCode: 400, message: 'authorizationCode is required' })
  }

  // ── 3. Validate required env vars ──────────────────────────────────────────
  const teamId     = config.appleSiwaTeamId     as string
  const keyId      = config.appleSiwaKeyId      as string
  const clientId   = config.appleSiwaClientId   as string
  const privateKey = config.appleSiwaPrivateKey as string

  if (!teamId || !keyId || !clientId || !privateKey) {
    console.error('[apple-link] Missing one or more APPLE_SIWA_* env vars')
    throw createError({ statusCode: 503, message: 'Apple Sign-In not configured' })
  }

  // ── 4. Build Apple client_secret JWT (ES256) ───────────────────────────────
  // Apple requires a short-lived (~5 min) ES256 JWT signed with the .p8 private key.
  // Spec: https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens

  const nowSeconds = Math.floor(Date.now() / 1000)

  const header  = { alg: 'ES256', kid: keyId }
  const payload = {
    iss: teamId,
    iat: nowSeconds,
    exp: nowSeconds + 300,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  }

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const signingInput = `${encode(header)}.${encode(payload)}`

  // .p8 keys from Apple are PKCS#8 PEM. Railway/env vars may have literal \n
  // sequences instead of real newlines — normalise before parsing.
  const normalizedPem = privateKey.replace(/\\n/g, '\n')

  let clientSecret: string
  try {
    const key  = createPrivateKey(normalizedPem)
    const sign = createSign('SHA256')
    sign.update(signingInput)
    const derSig = sign.sign(key)

    // Apple expects the raw IEEE P1363 (r || s) format, not DER.
    // node:crypto sign('SHA256') with an EC key returns DER — convert it.
    const r = derToP1363(derSig)
    clientSecret = `${signingInput}.${r.toString('base64url')}`
  } catch (err) {
    console.error('[apple-link] Failed to sign client_secret JWT:', (err as Error).message)
    throw createError({ statusCode: 500, message: 'Internal configuration error' })
  }

  // ── 5. Exchange authorizationCode for refresh_token ───────────────────────
  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    code:          authorizationCode,
    client_id:     clientId,
    client_secret: clientSecret,
  })

  let appleResponse: Response
  try {
    appleResponse = await fetch('https://appleid.apple.com/auth/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    })
  } catch (networkErr) {
    console.error('[apple-link] Network error reaching appleid.apple.com:', (networkErr as Error).message)
    throw createError({ statusCode: 502, message: 'Could not reach Apple servers' })
  }

  if (!appleResponse.ok) {
    // Parse Apple's error code for logging — but never forward the raw body.
    const errorCode = await appleResponse.json()
      .then((d: Record<string, unknown>) => d?.error ?? 'unknown')
      .catch(() => 'parse_error')
    console.error('[apple-link] Apple token exchange failed — error_code:', errorCode, 'status:', appleResponse.status)
    throw createError({ statusCode: 502, message: 'Apple token exchange failed' })
  }

  const tokenData = await appleResponse.json() as Record<string, unknown>
  const refreshToken = typeof tokenData.refresh_token === 'string' ? tokenData.refresh_token : null

  if (!refreshToken) {
    console.error('[apple-link] Apple response missing refresh_token for user:', user.id)
    throw createError({ statusCode: 502, message: 'Apple token exchange returned no refresh_token' })
  }

  // ── 6. Upsert into apple_auth_tokens ──────────────────────────────────────
  const supabaseAdmin = createSupabaseAdmin()
  const { error: upsertErr } = await supabaseAdmin
    .from('apple_auth_tokens')
    .upsert(
      { user_id: user.id, apple_refresh_token: refreshToken, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )

  if (upsertErr) {
    console.error('[apple-link] Failed to upsert apple_auth_tokens for user:', user.id, upsertErr.message)
    throw createError({ statusCode: 500, message: 'Failed to store Apple token' })
  }

  console.log('[apple-link] Stored Apple refresh token for user:', user.id)
  return { success: true }
})

// ── DER → IEEE P1363 (r || s) conversion ──────────────────────────────────────
// node:crypto returns DER-encoded ECDSA signatures. Apple expects the raw
// 64-byte concatenation of r and s (each zero-padded to 32 bytes).
function derToP1363(der: Buffer): Buffer {
  // DER ECDSA structure: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
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

  // Strip leading 0x00 padding byte that DER uses for positive-integer encoding
  const r = rRaw[0] === 0x00 ? rRaw.subarray(1) : rRaw
  const s = sRaw[0] === 0x00 ? sRaw.subarray(1) : sRaw

  const p1363 = Buffer.alloc(64)
  r.copy(p1363, 32 - r.length)
  s.copy(p1363, 64 - s.length)
  return p1363
}
