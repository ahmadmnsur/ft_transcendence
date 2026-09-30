# What Supabase Auth offers PeerConnect's login

Researched and checked 2026-09-30 for
[#87](https://github.com/ahmadmnsur/ft_transcendence/issues/87). Built from:

- the Supabase Auth server source, [`supabase/auth` v2.197.0](https://github.com/supabase/auth/tree/v2.197.0)
  (latest release, 2026-09-09);
- the official Supabase docs, read at their source
  ([`supabase/supabase` at `ad0ed2c`](https://github.com/supabase/supabase/tree/ad0ed2cdbc90ca72e5cf260834e3ee8028c0a492/apps/docs/content/guides/auth),
  2026-09-29) and cited below by their live `supabase.com/docs` address;
- the JavaScript client, [`supabase-js` v2.117.2](https://github.com/supabase/supabase-js/tree/v2.117.2/packages/core/auth-js/src),
  and [`@supabase/ssr` v0.12.7](https://github.com/supabase/ssr/tree/v0.12.7/src);
- the Supabase CLI, [`supabase/cli` v2.118.0](https://github.com/supabase/cli/tree/v2.118.0)
  (2026-09-25), which runs Auth v2.197.0 in its local stack
  ([`Dockerfile`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/templates/Dockerfile));
- unauthenticated requests to `api.intra.42.fr` on 2026-09-30, and an unofficial mirror of 42's API
  docs, flagged wherever it is used. 42's own docs sit behind its sign-in page, as
  [`42-oauth-redirect-uris.md`](42-oauth-redirect-uris.md) already found.

These are facts only. Each finding says which options it rules in or out. **No design choice for
PeerConnect is made here.** Where the source code was read but not run, the finding says so. A local
stack could not be started for this check, so no behaviour below was observed live.

## Question

What does Supabase Auth offer for each thing PeerConnect's login must do: email and password,
signing someone out at once, where the browser keeps the login, checking a login in NestJS and on
the Socket.IO handshake, a custom OAuth provider for 42, managing accounts from the server, and what
the local Supabase stack supports of all this?

## Short answer

Supabase Auth covers email and password, server-side account management and server-side sign-in,
so a browser can sign in with a password without ever contacting Supabase. But it hashes with
**bcrypt** (not argon2id), caps passwords at **72 bytes**, and its access tokens **stay valid until
they expire** (1 hour by default) after a sign-out unless PeerConnect's server checks the session on
every request. Its **custom OAuth provider does not fit 42 as it stands**: reading the source, 42's
`/v2/me` gives no `sub` field and Supabase cannot map 42's `id` into one, so a 42 login would fail
(not run, only read). Any Supabase-run OAuth login also sends the browser through Supabase's own
address. Deleting a Supabase user frees its email; only a row that is kept keeps the email taken.

## 1. Email and password

### How passwords are hashed and salted

- **bcrypt, cost 10.** Every password Supabase sets (sign-up, password change, admin set) goes
  through `GenerateFromPassword`, which calls Go's `bcrypt.GenerateFromPassword` with
  `bcrypt.DefaultCost`
  ([`internal/crypto/password.go` L373–391](https://github.com/supabase/auth/blob/v2.197.0/internal/crypto/password.go#L373-L391)).
  `DefaultCost` is 10
  ([`golang.org/x/crypto` v0.55.0, `bcrypt.go` L24](https://github.com/golang/crypto/blob/v0.55.0/bcrypt/bcrypt.go#L24)).
- **Salted.** The docs: *"Supabase Auth uses bcrypt … Each hash is accompanied by a randomly
  generated salt parameter"*, stored in `auth.users.encrypted_password`
  ([Password security → How are passwords stored?](https://supabase.com/docs/guides/auth/password-security#how-are-passwords-stored)).
- **Imported hashes.** The admin create call accepts a `password_hash` instead of a password: bcrypt,
  argon2i/argon2id in PHC format, or Firebase scrypt
  ([`admin.go` L447–473](https://github.com/supabase/auth/blob/v2.197.0/internal/api/admin.go#L447-L473),
  [`password.go` L160–190](https://github.com/supabase/auth/blob/v2.197.0/internal/crypto/password.go#L160-L190)).
  An imported argon2 hash is checked as argon2 at sign-in and is not rewritten to bcrypt; only
  bcrypt hashes with an out-of-range cost are rehashed
  ([`models/user.go` L467–507](https://github.com/supabase/auth/blob/v2.197.0/internal/models/user.go#L467-L507)).
  A later password change makes it bcrypt again.

Rules out: argon2id at the OWASP floor (spec §5.1, ADR-0003 d3) for any password Supabase itself
sets. Rules in: "hashed and salted" (`en.subject.md:377`) met by bcrypt with a per-hash salt.

### Whether confirmation emails can be switched off

- Yes. *"You can configure whether users need to verify their email to sign in. On hosted Supabase
  projects, this is true by default. On self-hosted projects or in local development, this is false
  by default."*
  ([Password-based Auth → Enabling email and password-based authentication](https://supabase.com/docs/guides/auth/passwords#enabling-email-and-password-based-authentication)).
  Locally the switch is `[auth.email] enable_confirmations`
  ([CLI `config.toml` template](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/templates/config.toml)).
- With confirmations off, sign-up confirms the user at once and sends nothing
  ([`signup.go` L228–236](https://github.com/supabase/auth/blob/v2.197.0/internal/api/signup.go#L228-L236)).
  With them on, a sign-up whose confirmation mail cannot be sent fails as a whole
  ([`signup.go` L250](https://github.com/supabase/auth/blob/v2.197.0/internal/api/signup.go#L250)).
- The built-in mail server of a hosted project sends **2 emails per hour** and **only to members of
  the project's organization**; other addresses fail with *"Email address not authorized"*
  ([Rate limits](https://supabase.com/docs/guides/auth/rate-limits),
  [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)).

Rules in: no email at all on sign-up (ADR-0003 d11). Rules out: leaving the hosted default on
without custom SMTP, since Students' addresses are not team members.

### Password rules

- **Minimum length**: configurable, never below 6
  ([`configuration.go` L23, L1253](https://github.com/supabase/auth/blob/v2.197.0/internal/conf/configuration.go#L1253-L1255)).
  8 can be set.
- **Composition**: optional; none by default. Choices are letters+digits, lower+upper+digits, or
  lower+upper+digits+symbols ([Password security](https://supabase.com/docs/guides/auth/password-security)).
- **Maximum length: 72 bytes, fixed.** `checkPasswordStrength` refuses any password with
  `len(password) > 72`, with the comment *"BCrypt hashed passwords have a 72 character limit"*
  ([`api/password.go` L12–37](https://github.com/supabase/auth/blob/v2.197.0/internal/api/password.go#L12-L37)).
  Go's `len` counts bytes, so a password with accented or Arabic letters reaches the cap in fewer
  than 72 characters. It is not a setting.
- **Leaked-password check** (HaveIBeenPwned): Pro plan and above only
  ([Password security](https://supabase.com/docs/guides/auth/password-security)).
- A password that no longer meets the rules still signs in; the response carries a `weak_password`
  notice ([`token.go` L129–138](https://github.com/supabase/auth/blob/v2.197.0/internal/api/token.go#L129-L138)).

Rules out: spec §5.1's "8–128 characters". Rules in: 8 to 72 bytes with no composition rule.

### How sign-in refuses (bears on spec §5.1's single refusal)

From the password grant ([`token.go` L97–183](https://github.com/supabase/auth/blob/v2.197.0/internal/api/token.go#L97-L183)),
read, not run:

- Unknown email → `invalid_credentials`, returned **before any hashing**. There is no dummy hash.
- Banned user → `user_banned` (*"User is banned"*), returned **before the password is checked**, so
  anyone who knows the email learns of the ban.
- Wrong password → `invalid_credentials`.
- Unconfirmed email → `email_not_confirmed`, after a correct password.
- Emails are lower-cased but not trimmed
  ([`mail.go` L710–722](https://github.com/supabase/auth/blob/v2.197.0/internal/api/mail.go#L710-L722)).

Rules out: Supabase on its own giving one refusal for wrong password, Suspension and Removal, or
equal timing for known and unknown emails. A server in front can map the codes to one refusal;
whether it can hide the timing difference was not checked.

## 2. Signing someone out at once

### How long a token stays valid

- A Supabase login is a **JWT access token** plus a **refresh token**. The access token lasts
  `jwt_expiry` seconds: **3600 by default**
  ([`configuration.go` L1140–1141](https://github.com/supabase/auth/blob/v2.197.0/internal/conf/configuration.go#L1140-L1141)),
  *"maximum 604,800 (1 week)"* per the CLI template. The docs advise against going *"below 5
  minutes"* ([User sessions](https://supabase.com/docs/guides/auth/sessions)).
- Refresh tokens *"never expire but can only be used once"*, with a 10-second reuse window
  ([User sessions](https://supabase.com/docs/guides/auth/sessions)).
- **On the free plan a session never ends by itself.** Time-boxed sessions, an inactivity timeout and
  one session per user are *"only available on Pro Plans and up"*
  ([User sessions → Limiting session lifetime](https://supabase.com/docs/guides/auth/sessions#limiting-session-lifetime-and-number-of-allowed-sessions-per-user)).

Rules out: a Supabase-enforced 30-day inactivity expiry (ADR-0003 d4) on the free plan. Such an
expiry would be PeerConnect's own to enforce.

### How sessions are revoked

Each session is a row in `auth.sessions`; each access token carries its id as the `session_id`
claim ([User sessions](https://supabase.com/docs/guides/auth/sessions#access-token-jwt-claims)).

| Action | What it does to the sessions | Source |
| --- | --- | --- |
| `POST /logout?scope=global` | deletes every session row of the user | [`logout.go` L21–65](https://github.com/supabase/auth/blob/v2.197.0/internal/api/logout.go#L21-L65) |
| `scope=local` / `scope=others` | this session only / all others | same |
| Admin `signOut(jwt, scope)` | the same call; it **needs a valid access token of that user** | [`GoTrueAdminApi.ts` L132–165](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/auth-js/src/GoTrueAdminApi.ts#L132-L165) |
| Admin delete, hard (default) | deletes the user row; sessions and refresh tokens cascade | [sessions migration](https://github.com/supabase/auth/blob/v2.197.0/migrations/20220811173540_add_sessions_table.up.sql), [User Management → Removing account access](https://supabase.com/docs/guides/auth/managing-user-data#removing-account-access) |
| Admin delete, soft | deletes every session (`Logout`) and scrubs the row | [`models/user.go` L1054–1116](https://github.com/supabase/auth/blob/v2.197.0/internal/models/user.go#L1054-L1116) |
| Admin ban (`ban_duration`) | sets `banned_until` only; **session rows stay**, but refresh and `GET /user` are refused while banned | [`models/user.go` L987–1004](https://github.com/supabase/auth/blob/v2.197.0/internal/models/user.go#L987-L1004), [`tokens/service.go` L223–225](https://github.com/supabase/auth/blob/v2.197.0/internal/tokens/service.go#L223-L225) |
| User's own password change | deletes the **other** sessions; keeps the current one | [`models/user.go` L435–463](https://github.com/supabase/auth/blob/v2.197.0/internal/models/user.go#L435-L463) |

- There is **no admin call that signs a user out by user id**: the admin route list has no such
  route ([`api.go` L359–394](https://github.com/supabase/auth/blob/v2.197.0/internal/api/api.go#L359-L394)).
  `/logout` goes through the same check as `GET /user`, so it also refuses a banned user's token.
- Deleting `auth.sessions` rows directly in SQL has the same effect in the code (refresh and
  `GET /user` then fail), but no doc names that as a supported way. **Not confirmed as supported.**
- **No hook fires on sign-out.** The hooks are before-user-created, after-user-created, custom access
  token, send email, send SMS, MFA and password verification
  ([`v0hooks.go` L19–25](https://github.com/supabase/auth/blob/v2.197.0/internal/hooks/v0hooks/v0hooks.go#L19-L25)).
  Nothing tells PeerConnect's server that a session ended, so an open socket stays open.

Rules in: deleting every session of a Suspended or Removed Student at once. Rules out: doing it by
user id through the Auth API without holding one of that user's valid access tokens.

### Whether a still-valid token can be refused

- The docs, twice: *"Access Tokens of revoked sessions remain valid until their expiry time"*
  ([Signing out](https://supabase.com/docs/guides/auth/signout)), and *"a token already in the
  user's hands stays valid until its `exp` claim passes"*
  ([User Management → Removing account access](https://supabase.com/docs/guides/auth/managing-user-data#removing-account-access)).
- A server can refuse it in two documented ways, both a lookup on every request:
  - **Ask Auth**: `GET /auth/v1/user` with the token. The server loads the user and the session
    from the token and refuses with `user_not_found`, `session_not_found` or `user_banned`
    ([`auth.go` L20–41, L118–160](https://github.com/supabase/auth/blob/v2.197.0/internal/api/auth.go#L20-L160)).
  - **Check the table**: *"check that the `session_id` claim in the JWT corresponds to a row in the
    `auth.sessions` table"* ([User sessions](https://supabase.com/docs/guides/auth/sessions#how-to-ensure-an-access-token-jwt-cannot-be-used-after-a-user-signs-out)).

Rules in: "signed out at once" (`CONTEXT.md` Suspension, Removal) if every request and handshake does
one of these lookups. Rules out: "at once" with signature-only checking; the gap is up to
`jwt_expiry`.

## 3. Where the browser keeps the login

- **Every Auth call is plain HTTP**, so a server can make them for the user: sign in with a password,
  refresh, sign out. The docs allow HttpOnly cookies *"only for apps that use the traditional
  server-only web app approach"*, where *"only your server will be able to read and refresh the
  session"*, and show a server-side client with a custom `storage`
  ([User sessions → Using HTTP-only cookies](https://supabase.com/docs/guides/auth/sessions#using-http-only-cookies-to-store-access-and-refresh-tokens)).
  With a custom storage, where the tokens live and what the cookie holds is PeerConnect's choice.
- **The `@supabase/ssr` defaults are not one HttpOnly cookie**: `httpOnly: false`, `SameSite=Lax`,
  400-day `Max-Age` ([`constants.ts`](https://github.com/supabase/ssr/blob/v0.12.7/src/utils/constants.ts)).
  The session is split into chunks of up to 3,180 characters
  ([`chunker.ts` L6](https://github.com/supabase/ssr/blob/v0.12.7/src/utils/chunker.ts#L6)), and a
  PKCE sign-in keeps its verifier under a separate `…-code-verifier` key
  ([`GoTrueClient.ts` L4022](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/auth-js/src/GoTrueClient.ts#L4022)).
  The docs call HttpOnly *"not necessary"* for that library's model
  ([Advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide#how-do-i-make-the-cookies-httponly)).
- The access token carries `email`, `phone`, `app_metadata`, `user_metadata` and `amr`
  ([JWT claims reference](https://supabase.com/docs/guides/auth/jwt-fields)), so its size grows with
  them. Its size was not measured.
- **Rate limits then see the server's address.** Sign-in, refresh and PKCE code exchange share one
  per-IP bucket: 150 requests per 5 minutes, bursts of 30
  ([Rate limits](https://supabase.com/docs/guides/auth/rate-limits),
  [`apilimiter.go` L197–200](https://github.com/supabase/auth/blob/v2.197.0/internal/api/apilimiter/apilimiter.go#L197-L200)).
  To key limits on each browser instead, the server must send `Sb-Forwarded-For` with a **secret
  key**, and the project must turn this on; it is *"explicitly enabled for new projects"* only
  ([Rate limits → IP address forwarding](https://supabase.com/docs/guides/auth/rate-limits#ip-address-forwarding),
  default `false` in [`configuration.go` L908](https://github.com/supabase/auth/blob/v2.197.0/internal/conf/configuration.go#L908)).
- **A Supabase-run OAuth login cannot avoid Supabase's address.** The browser goes to
  `/auth/v1/authorize`, on to 42, and back to Supabase's `/auth/v1/callback`; only then does Supabase
  redirect to PeerConnect with a `code`
  ([`external.go` L64–135](https://github.com/supabase/auth/blob/v2.197.0/internal/api/external.go#L64-L135)).
  These are page navigations, not fetches. On a hosted project that address is
  `<project-ref>.supabase.co`. Moving it to another domain is a *"paid add-on for projects on a paid
  plan"* ([Custom Domains](https://supabase.com/docs/guides/platform/custom-domains)). Locally it is
  `http://127.0.0.1:54321/auth/v1` unless `auth.external_url` changes it.

Rules in: one HttpOnly cookie set by PeerConnect's server, with the browser never contacting
Supabase, for **email and password**. Rules out: the same for any 42 login that Supabase runs on the
free plan. ADR-0018 d5's one exception names 42, not Supabase.

## 4. Checking a login in NestJS, per request and on the Socket.IO handshake

Nothing in Supabase is specific to Socket.IO. The handshake is checked the same way as a request.

- **Signature only, locally.** Fetch the public keys from `/auth/v1/.well-known/jwks.json` and verify
  (the docs show `jose`'s `createRemoteJWKSet` and `jwtVerify`), or call `getClaims()`. This works
  only with asymmetric signing keys (ES256, RS256); the endpoint *"does not return any keys"* for the
  legacy shared secret ([JWTs → Verifying a JWT from Supabase](https://supabase.com/docs/guides/auth/jwts#verifying-a-jwt-from-supabase)).
  The key set is cached 10 minutes at Supabase's edge and up to 10 more in the client
  ([Signing keys](https://supabase.com/docs/guides/auth/signing-keys)). It checks signature and
  `exp` only: *"an unexpired token stays valid even when the session behind it was revoked"*
  ([Advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide#should-i-set-a-shorter-max-age-parameter-on-the-cookies)).
- **Ask Auth.** `getUser(jwt)` sends `GET /auth/v1/user` every time and refuses a revoked session, a
  deleted user or a banned user (section 2). With the legacy shared secret, `getClaims()` does the
  same network call ([`GoTrueClient.ts` L6625–6650](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/auth-js/src/GoTrueClient.ts#L6625-L6650)).
- **Signature plus table.** Verify locally, then look up `session_id` in `auth.sessions` (section 2).
- An open socket is not closed by the token's `exp` passing, nor by a revocation: Supabase sends no
  event (section 2). Dropping sockets stays PeerConnect's job (spec §5.8, §7.5).
- The local stack signs with a default **ES256** key and also accepts HS256
  ([`gotrue.service.ts` L416–422](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/commands/start/services/gotrue.service.ts#L416-L422),
  [`Defaults.ts` L4–12](https://github.com/supabase/cli/blob/v2.118.0/packages/stack/src/Defaults.ts#L4-L12)).

Rules in: spec §7.2's shape (read the cookie, resolve, refuse) with any of the three checks. Rules
out: the "at once" guarantee with the first check alone.

## 5. A custom OAuth provider for 42

### What Supabase offers

- Custom providers have a `custom:` identifier. The **OAuth2** type takes an authorization URL, a
  token URL and a userinfo URL. The **OIDC** type needs a discovery document. **Free plan: up to 3**
  ([Custom OAuth/OIDC Providers](https://supabase.com/docs/guides/auth/custom-oauth-providers)).
- PKCE toward the provider is **on by default** and can be turned off per provider. By default the
  provider *"must return an email address"* unless `email_optional` is set (same page).
- `state` is sent by Supabase, not by the app: it is Supabase's own flow id, checked on Supabase's
  callback. An app cannot pass its own `state`, which is a reserved parameter
  ([`external.go` L73–83, L121–134](https://github.com/supabase/auth/blob/v2.197.0/internal/api/external.go#L73-L134),
  [`custom_oauth_admin.go` L654](https://github.com/supabase/auth/blob/v2.197.0/internal/api/custom_oauth_admin.go#L654)).
  Between the app and Supabase, the app's own PKCE `code_challenge` binds the returned `code` to the
  server that holds the verifier. Whether that meets ADR-0003 d10's *"demonstrably equivalent
  browser-binding mechanism"* is not a fact question.
- The Supabase flow must finish within the flow-state expiry: 300 seconds by default and at minimum
  ([`configuration.go` L26, L1274–1276](https://github.com/supabase/auth/blob/v2.197.0/internal/conf/configuration.go#L1274-L1276)).
- Provider URLs **must be public HTTPS**: `localhost`, loopback and private addresses are refused
  ([`url_validator.go` L17–50](https://github.com/supabase/auth/blob/v2.197.0/internal/utilities/url_validator.go#L17-L50)).
- There is no built-in 42 provider (provider list in the CLI template).

### What 42 has

- Endpoints (spec §5.6): `https://api.intra.42.fr/oauth/authorize`, `/oauth/token`, `/v2/me`. On
  2026-09-30, `/oauth/token` answered a dummy request with an OAuth2 `invalid_client` error in
  Doorkeeper's wording, and `/v2/me` answered 401 without a token. So the OAuth2 type's three URLs
  exist.
- **No OIDC discovery**: `https://api.intra.42.fr/.well-known/openid-configuration` returned 404 on
  2026-09-30. So only the OAuth2 type applies.
- `state`: 42's getting-started text describes it as *"an unguessable random string"* that must
  match. **Secondary**: this comes from the unofficial mirror
  [leeoocca.github.io/42apidocs](https://leeoocca.github.io/42apidocs/), not from 42.
- PKCE at 42: the mirror does not mention it. **Not confirmed** either way.
- The immutable account id: the mirror's `/v2/me` example has `id` as a **number** and `login` as a
  string, and no `sub`. **Secondary**, and whether `id` never changes is **not confirmed** by any
  source reached.
- 42's API limit: *"2 requests per second and 1200 requests per hour"* per application
  (**secondary**, same mirror).

### The gap: 42's `id` cannot become Supabase's `sub` (read from source, not run)

1. For an OAuth2 custom provider, Supabase decodes the userinfo JSON into a fixed set of claim
   fields (`sub`, `email`, `name`, `preferred_username`, `phone`, …). The set has no `id` and no
   `login` ([`provider.go` L86–123](https://github.com/supabase/auth/blob/v2.197.0/internal/api/provider/provider.go#L86-L123),
   [`custom_oauth.go` L73–101, L297–314](https://github.com/supabase/auth/blob/v2.197.0/internal/api/provider/custom_oauth.go#L73-L314)).
2. The attribute mapping copies **only between those fields**. It reads from the decoded claims,
   not from the raw response ([`custom_oauth.go` L332–365](https://github.com/supabase/auth/blob/v2.197.0/internal/api/provider/custom_oauth.go#L332-L365)).
   Its tests map between existing fields only
   ([`custom_oauth_test.go`, "Map between existing fields"](https://github.com/supabase/auth/blob/v2.197.0/internal/api/provider/custom_oauth_test.go)).
   Allow-listed raw keys go under `custom_claims`, which the mapping does not reach.
3. The identity row needs `sub`. Without it, creating the identity fails with *"error missing
   provider id"* ([`models/identity.go` L48–52](https://github.com/supabase/auth/blob/v2.197.0/internal/models/identity.go#L48-L52),
   [`external.go` L301–313](https://github.com/supabase/auth/blob/v2.197.0/internal/api/external.go#L301-L313)).
4. The OIDC type falls back to the same userinfo decoding when there is no ID token
   ([`custom_oauth.go` L232–262](https://github.com/supabase/auth/blob/v2.197.0/internal/api/provider/custom_oauth.go#L232-L262)).

So pointing a custom provider's userinfo URL straight at 42's `/v2/me` should end every 42 login in
an error. This needs a live check with a registered 42 application. A userinfo URL that returns a
`sub` would fit, but by point 5 above it must be a public HTTPS address, not `https://localhost:8443`.

### The redirect address

- 42 sends the browser back to **Supabase's** callback, `<Auth external URL>/callback`
  ([`external.go` L705–713](https://github.com/supabase/auth/blob/v2.197.0/internal/api/external.go#L705-L713)):
  - hosted: `https://<project-ref>.supabase.co/auth/v1/callback`
    ([Custom Domains](https://supabase.com/docs/guides/platform/custom-domains));
  - local: `http://127.0.0.1:54321/auth/v1/callback`
    ([Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)).
- `https://localhost:8443/...` is only where Supabase sends the browser afterwards (`redirect_to`),
  and it must be on the project's redirect allow list
  ([Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)).
- Whether 42 accepts a plain `http://` redirect such as the local one is still open. Doorkeeper
  refuses it by default outside development, and 42's setting could not be seen
  ([`42-oauth-redirect-uris.md`](42-oauth-redirect-uris.md)).

Rules out, as the source stands: 42 as a Supabase custom provider with `/v2/me` as its userinfo
URL; a 42 redirect address on `https://localhost:8443`. Rules in: 42's endpoints in the OAuth2 form,
with PKCE toward 42 switched off if 42 turns out not to support it.

## 6. Managing accounts from the server

### Creating accounts without the sign-up form

- `POST /auth/v1/admin/users` (`auth.admin.createUser`) with the service-role or secret key
  ([`admin.go` L400–593](https://github.com/supabase/auth/blob/v2.197.0/internal/api/admin.go#L400-L593)):
  - `email_confirm: true` confirms the email; **no mail is sent** on this path;
  - it works **with sign-ups disabled**: there is no sign-up switch check;
  - it applies the password rules to a plain password, or takes an imported `password_hash`;
  - it accepts a chosen `id` (UUID), which bears on spec §14.3's id-order assertion;
  - the before-user-created hook **does not fire** here; it fires on sign-up, invite, magic link
    and OAuth ([`hooks.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/hooks.go),
    [`signup.go` L186](https://github.com/supabase/auth/blob/v2.197.0/internal/api/signup.go#L186),
    [`external.go` L207](https://github.com/supabase/auth/blob/v2.197.0/internal/api/external.go#L207)).
- The email check is format-only, so `@peerconnect.test` addresses pass it
  ([`mail.go` L710–722](https://github.com/supabase/auth/blob/v2.197.0/internal/api/mail.go#L710-L722)).
  DNS checks only run when a mail is sent. Read, not run.
- A session can also be issued from the server without a password: `generate_link` returns a
  `hashed_token` **without sending mail**, which `/verify` exchanges for a session
  ([`mail.go` L52–320](https://github.com/supabase/auth/blob/v2.197.0/internal/api/mail.go#L52-L320)).
  `/verify` refuses banned users. Read, not run.

### Changing an email with no confirmation mail

- `PUT /auth/v1/admin/users/{id}` (`auth.admin.updateUserById`) with `email` writes the new address
  at once and calls no mailer; `email_confirm: true` also marks it verified. It clears pending
  confirmation and recovery tokens
  ([`admin.go` L196–395](https://github.com/supabase/auth/blob/v2.197.0/internal/api/admin.go#L196-L395),
  [`models/user.go` L398–401](https://github.com/supabase/auth/blob/v2.197.0/internal/models/user.go#L398-L401)).
- A user changing their own email always gets confirmation mail
  ([`user.go` L252–272](https://github.com/supabase/auth/blob/v2.197.0/internal/api/user.go#L252-L272)).
- Uniqueness is held by the unique index `users_email_partial_key` on `auth.users (email)` for
  non-SSO users ([migration](https://github.com/supabase/auth/blob/v2.197.0/migrations/20221215195500_modify_users_email_unique_index.up.sql)).
  The admin update does not check first, so a taken address fails as a database error. Read, not
  run.

Rules in: ADR-0008 d8's Admin email edit with no mail.

### Banning, deleting, and keeping a Removed Student's email unusable

- **Ban**: `ban_duration` is a Go duration such as `"876000h"` (100 years); `"none"` lifts it
  ([`admin.go` L222–231](https://github.com/supabase/auth/blob/v2.197.0/internal/api/admin.go#L222-L231)).
  A ban stops password sign-in, refresh, `GET /user`, OAuth sign-in and `/verify`. It keeps session
  rows and discloses itself at sign-in as `user_banned` (section 1).
- **Hard delete** removes the row, so the email is **free again** for a new account. It fails if the
  user owns Storage objects
  ([User Management → Deleting users](https://supabase.com/docs/guides/auth/managing-user-data#deleting-users)).
- **Soft delete** replaces the email with a SHA-256 hash of id and email, clears the password and
  deletes all sessions, so the email is **free again** too. The docs: *"not reversible"*
  ([`models/user.go` L1054–1116, L1186–1193](https://github.com/supabase/auth/blob/v2.197.0/internal/models/user.go#L1054-L1193),
  [`GoTrueAdminApi.ts` L806](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/auth-js/src/GoTrueAdminApi.ts#L806)).
- **What keeps an email taken** is an `auth.users` row that stays and keeps it: sign-up then gets
  *"User already registered"* (confirmations off) and admin create gets `email_exists`
  ([`signup.go` L281–296](https://github.com/supabase/auth/blob/v2.197.0/internal/api/signup.go#L281-L296),
  [`admin.go` L426–431](https://github.com/supabase/auth/blob/v2.197.0/internal/api/admin.go#L426-L431)).
  The before-user-created hook (free plan) can also refuse new accounts, but not admin-created ones
  ([Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks)).

Rules out: either Supabase delete as a Removal that burns the email (ADR-0008 d7). Rules in: a kept
row, banned for a long duration, holding the email under the unique index.

### Rate limits that would stop the seed (32 accounts)

- **Admin routes have no Auth rate limiter**: the `/admin` group applies none
  ([`api.go` L359–394](https://github.com/supabase/auth/blob/v2.197.0/internal/api/api.go#L359-L394)).
  Not listed in the rate-limit table either.
- **`/signup`** allows 30 per 5 minutes per IP, bursts of 30
  ([Rate limits](https://supabase.com/docs/guides/auth/rate-limits),
  [`apilimiter.go` L232–238](https://github.com/supabase/auth/blob/v2.197.0/internal/api/apilimiter/apilimiter.go#L232-L238)).
  32 sign-ups in a row from one address would see 429 near the end on a hosted project.
- With confirmations on (the hosted default), each sign-up must send a mail. Two per hour and
  team-only addresses would make the seed fail (section 1).
- **Locally, per-IP limits are not applied.** The limiter skips when no rate-limit header is
  configured ([`middleware.go` L72–78, L123–134](https://github.com/supabase/auth/blob/v2.197.0/internal/api/middleware.go#L72-L134)),
  and the local stack sets none. Its mail limit is set to 360,000 per hour with the local mail
  catcher ([`gotrue.service.ts` L336–440](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/commands/start/services/gotrue.service.ts#L336-L440)).
  Read, not run.

Rules in: creating all 32 accounts through the admin API on either stack. Rules out: 32 public
sign-ups in one burst against the hosted project, or with hosted email confirmations on.

## 7. What the local Supabase stack supports

`supabase start` with CLI v2.118.0 runs Auth v2.197.0, the version read above.

| Need | Hosted, free plan | Local stack |
| --- | --- | --- |
| bcrypt, 72-byte cap | yes | yes, same server |
| Confirmation emails | on by default; a switch | off by default; `enable_confirmations` |
| Mail | built-in: 2 per hour, team addresses only | all mail caught locally (Mailpit, `127.0.0.1:54324`) |
| Admin create, email change, ban, delete | yes | yes |
| Custom OAuth providers | up to 3 | server feature on by default, no count limit; no `config.toml` section, so created through the admin API ([`configuration.go` L87–91](https://github.com/supabase/auth/blob/v2.197.0/internal/conf/configuration.go#L87-L91)) |
| Provider URLs must be public HTTPS | yes | yes, same check |
| OAuth callback address | `https://<ref>.supabase.co/auth/v1/callback` | `http://127.0.0.1:54321/auth/v1/callback`, or `auth.external_url` |
| Session time-box, inactivity timeout | Pro plan only | `[auth.sessions] timebox`, `inactivity_timeout` |
| Leaked-password check | Pro plan only | not in the config template (not confirmed) |
| Per-IP rate limits | enforced | not applied |
| JWT signing | legacy secret or signing keys; see "Not confirmed" | default ES256 key, HS256 also accepted |
| `jwt_expiry` | dashboard setting | `jwt_expiry`, default 3600, max 604,800 |
| Custom domain | paid add-on | `auth.external_url` |

Sources: the [CLI `config.toml` template](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/templates/config.toml),
[`gotrue.service.ts`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/commands/start/services/gotrue.service.ts),
[CLI getting started](https://supabase.com/docs/guides/local-development/cli/getting-started), and
the hosted pages cited in sections 1 to 6.

## Not confirmed

- **The 42 `sub` gap was read from source, not run.** It needs a live check with a registered 42
  application, against the Auth version the team project actually runs.
- Which Auth version a hosted project ran on 2026-09-30. Findings are from v2.197.0.
- Which JWT signing system a new hosted project starts with (legacy shared secret or asymmetric
  keys). The docs describe migrating without downtime, but do not state the default.
- Whether 42 supports PKCE, whether its `id` is immutable, and whether it accepts `http://`
  redirect addresses. 42's docs are behind its sign-in page.
- Whether `GET /auth/v1/user` is rate-limited on hosted projects. The docs' table lists
  `/auth/v1/user` under sign-ins, but in the source only `PUT /user` has a limiter
  ([`api.go` L281–283](https://github.com/supabase/auth/blob/v2.197.0/internal/api/api.go#L281-L283)).
- Whether deleting `auth.sessions` rows directly in SQL is a supported way to sign a user out.
- Whether the leaked-password check can run locally.
- The size of an access token, and so of a cookie that holds one.

## Primary sources

Supabase Auth server, `supabase/auth` v2.197.0:
[`api/api.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/api.go) ·
[`api/auth.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/auth.go) ·
[`api/admin.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/admin.go) ·
[`api/token.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/token.go) ·
[`api/signup.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/signup.go) ·
[`api/user.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/user.go) ·
[`api/logout.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/logout.go) ·
[`api/password.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/password.go) ·
[`api/mail.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/mail.go) ·
[`api/external.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/external.go) ·
[`api/custom_oauth_admin.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/custom_oauth_admin.go) ·
[`api/provider/custom_oauth.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/provider/custom_oauth.go) ·
[`api/provider/provider.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/provider/provider.go) ·
[`api/middleware.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/middleware.go) ·
[`api/apilimiter/apilimiter.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/api/apilimiter/apilimiter.go) ·
[`crypto/password.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/crypto/password.go) ·
[`models/user.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/models/user.go) ·
[`models/sessions.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/models/sessions.go) ·
[`models/identity.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/models/identity.go) ·
[`models/linking.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/models/linking.go) ·
[`tokens/service.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/tokens/service.go) ·
[`sbff/sbff.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/sbff/sbff.go) ·
[`conf/configuration.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/conf/configuration.go) ·
[`utilities/url_validator.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/utilities/url_validator.go) ·
[`hooks/v0hooks/v0hooks.go`](https://github.com/supabase/auth/blob/v2.197.0/internal/hooks/v0hooks/v0hooks.go) ·
[sessions migration](https://github.com/supabase/auth/blob/v2.197.0/migrations/20220811173540_add_sessions_table.up.sql) ·
[email index migration](https://github.com/supabase/auth/blob/v2.197.0/migrations/20221215195500_modify_users_email_unique_index.up.sql)

Supabase docs (text read at `supabase/supabase` `ad0ed2c`, 2026-09-29):
[Password-based Auth](https://supabase.com/docs/guides/auth/passwords) ·
[Password security](https://supabase.com/docs/guides/auth/password-security) ·
[User sessions](https://supabase.com/docs/guides/auth/sessions) ·
[Signing out](https://supabase.com/docs/guides/auth/signout) ·
[JWTs](https://supabase.com/docs/guides/auth/jwts) ·
[JWT claims reference](https://supabase.com/docs/guides/auth/jwt-fields) ·
[Signing keys](https://supabase.com/docs/guides/auth/signing-keys) ·
[Server-side advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) ·
[Rate limits](https://supabase.com/docs/guides/auth/rate-limits) (values from
[`shared-data/config.ts`](https://github.com/supabase/supabase/blob/ad0ed2cdbc90ca72e5cf260834e3ee8028c0a492/packages/shared-data/config.ts)) ·
[Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) ·
[Custom OAuth/OIDC Providers](https://supabase.com/docs/guides/auth/custom-oauth-providers) ·
[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) ·
[User Management](https://supabase.com/docs/guides/auth/managing-user-data) ·
[Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks) ·
[Custom Domains](https://supabase.com/docs/guides/platform/custom-domains) ·
[Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google) ·
[CLI getting started](https://supabase.com/docs/guides/local-development/cli/getting-started)

Client libraries:
[`supabase-js` `GoTrueAdminApi.ts` v2.117.2](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/auth-js/src/GoTrueAdminApi.ts) ·
[`supabase-js` `GoTrueClient.ts` v2.117.2](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/auth-js/src/GoTrueClient.ts) ·
[`@supabase/ssr` `constants.ts` v0.12.7](https://github.com/supabase/ssr/blob/v0.12.7/src/utils/constants.ts) ·
[`@supabase/ssr` `chunker.ts` v0.12.7](https://github.com/supabase/ssr/blob/v0.12.7/src/utils/chunker.ts)

Supabase CLI v2.118.0:
[`Dockerfile`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/templates/Dockerfile) ·
[`config.toml` template](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/templates/config.toml) ·
[`gotrue.service.ts`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/commands/start/services/gotrue.service.ts) ·
[`Defaults.ts`](https://github.com/supabase/cli/blob/v2.118.0/packages/stack/src/Defaults.ts)

Go bcrypt: [`golang.org/x/crypto` v0.55.0 `bcrypt.go`](https://github.com/golang/crypto/blob/v0.55.0/bcrypt/bcrypt.go)

42, requested 2026-09-30 without signing in: `https://api.intra.42.fr/.well-known/openid-configuration`
(404), `https://api.intra.42.fr/oauth/token` (401 `invalid_client`), `https://api.intra.42.fr/v2/me`
(401), `https://api.intra.42.fr/apidoc` (302 to sign-in).

Secondary, not relied on alone: [leeoocca.github.io/42apidocs](https://leeoocca.github.io/42apidocs/),
an unofficial mirror of 42's API docs.
