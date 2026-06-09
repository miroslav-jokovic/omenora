/**
 * Account deletion endpoint.
 *
 * Requires an authenticated request (JWT in Authorization header). The userId is
 * derived from the verified JWT, NEVER from the body. Revokes the user's Apple
 * Sign-In refresh token (App Store guideline 5.1.1(v)) before deleting, then calls
 * supabase.auth.admin.deleteUser() which cascades to public.users and owned data.
 */
import { revokeAppleRefreshToken } from '../../utils/apple-auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const supabaseAdmin = createSupabaseAdmin()

  // ── Apple token revocation (5.1.1(v)) — best-effort, non-blocking, BEFORE delete ──
  try {
    const { data: appleRow } = await supabaseAdmin
      .from('apple_auth_tokens')
      .select('apple_refresh_token')
      .eq('user_id', user.id)
      .maybeSingle()

    const refreshToken = appleRow?.apple_refresh_token as string | undefined
    if (refreshToken) {
      const config = useRuntimeConfig()
      const cfg = {
        teamId:     config.appleSiwaTeamId as string,
        keyId:      config.appleSiwaKeyId as string,
        clientId:   config.appleSiwaClientId as string,
        privateKey: config.appleSiwaPrivateKey as string,
      }
      if (cfg.teamId && cfg.keyId && cfg.clientId && cfg.privateKey) {
        const revoked = await revokeAppleRefreshToken(refreshToken, cfg)
        if (!revoked) {
          console.error('[delete-account] Apple token revoke failed (non-blocking) for user:', user.id)
        }
      } else {
        console.error('[delete-account] APPLE_SIWA_* not configured - skipping Apple revoke for user:', user.id)
      }
      // Tidy the token row (also handled by cascade if the FK is ON DELETE CASCADE).
      await supabaseAdmin.from('apple_auth_tokens').delete().eq('user_id', user.id)
    }
  } catch (revokeErr) {
    console.error('[delete-account] Apple revoke step error (non-blocking):', (revokeErr as Error).message)
  }

  // ── Delete the user (cascades to public.users + owned data via FK) ──
  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (deleteErr) {
    console.error('[delete-account] deleteUser failed:', deleteErr.message)
    throw createError({
      statusCode: 500,
      message: 'Account deletion failed. Please contact support@omenora.com.',
    })
  }

  console.log('[delete-account] deleted user:', user.id)
  return { success: true }
})
