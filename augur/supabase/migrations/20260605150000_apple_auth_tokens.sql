-- apple_auth_tokens: stores Apple Sign-In refresh tokens for token revocation on
-- account deletion, as required by Apple App Store guideline 5.1.1(v).
--
-- Security model:
--   - This table is SERVICE-ROLE ONLY. RLS is enabled with NO client-readable
--     policies. anon and authenticated roles have zero access.
--   - The only writer is the server-side /api/auth/apple-link endpoint which
--     operates under the service role key.
--   - The only reader is the server-side /api/auth/delete-account endpoint.
--   - Tokens are purged automatically when the parent auth.users row is deleted
--     (ON DELETE CASCADE), so no orphaned tokens can accumulate.
--
-- Write path: mobile client calls /api/auth/apple-link with the authorizationCode
-- immediately after a successful Apple Sign-In. The backend exchanges the code for
-- a refresh_token and upserts here.
--
-- Delete path: /api/auth/delete-account reads the refresh_token, calls Apple's
-- /auth/revoke endpoint, then calls supabase.auth.admin.deleteUser() which
-- cascades and removes this row.

CREATE TABLE IF NOT EXISTS public.apple_auth_tokens (
  user_id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  apple_refresh_token text       NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger — reuses set_updated_at() defined in subscriptions_table.sql
DROP TRIGGER IF EXISTS apple_auth_tokens_set_updated_at ON public.apple_auth_tokens;
CREATE TRIGGER apple_auth_tokens_set_updated_at
  BEFORE UPDATE ON public.apple_auth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS — SERVICE-ROLE ONLY ────────────────────────────────────────────────────
-- RLS is enabled. NO policies are added for anon or authenticated roles.
-- This table must never be client-readable or client-writable.
-- All access is via the Supabase service role key (server-side only).

ALTER TABLE public.apple_auth_tokens ENABLE ROW LEVEL SECURITY;
