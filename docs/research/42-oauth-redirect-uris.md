# 42 intranet OAuth applications and multiple redirect URIs

Researched 2026-09-21 against RFC 6749, the current Doorkeeper gem source
(the OAuth2 provider library 42's API is built on), and — where the
authenticated 42 documentation could not be reached — a non-authoritative
community mirror flagged explicitly below.

## Question

Does a 42 school intranet OAuth application (registered at intra.42.fr, the
42 API's OAuth2 provider) accept more than one redirect URI on a single
registered application, and if so, can one application carry both
`http://localhost` and `https://localhost:8443` simultaneously — what format
constraints apply (exact vs. prefix match, non-default ports, plain `http://`
for localhost)?

## Findings

### 42's own docs could not be reached unauthenticated

Every relevant page on 42's live documentation and registration surfaces
redirects to the sign-in wall rather than serving content:

- `https://api.intra.42.fr/apidoc` → 302 to `https://signin.intra.42.fr/users/sign_in`
- `https://api.intra.42.fr/apidoc/guides/getting_started` → same 302
- `https://api.intra.42.fr/apidoc/guides/web_application_flow` → same 302
- `https://profile.intra.42.fr/oauth/applications/new` (the actual
  application-registration form) → same 302

I have no 42 login, so I could not get past this gate. **Definitive
confirmation of the current, live 42 registration-form behavior would
require someone logged into 42 to check the actual form** — I could not do
that myself. Everything below is either (a) the underlying Doorkeeper
library 42's form is built on, (b) the OAuth 2.0 RFC that library
implements, or (c) an unofficial, unverifiable secondary mirror, clearly
flagged.

### 42's API is a Doorkeeper OAuth2 provider

42's application-registration form is the stock Doorkeeper "New application"
form; 42 does not appear to have published a competing spec for
`redirect_uri` handling, so Doorkeeper's own model and validation code is
the operative definition of what the form accepts, subject to whatever
configuration 42 has applied to their deployment (which I cannot see without
logging in).

### Doorkeeper stores and validates `redirect_uri` as a whitespace-separated list — multiple URIs per application

The current Doorkeeper `Application` model validates the `redirect_uri`
attribute with `Doorkeeper::RedirectUriValidator`
(`lib/doorkeeper/orm/active_record/redirect_uri_validator.rb`), whose
`validate_each` method reads:

```ruby
value.split.each do |val|
  next if oob_redirect_uri?(val)

  uri = ::URI.parse(val)
  record.errors.add(attribute, :forbidden_uri) if forbidden_uri?(uri)
  record.errors.add(attribute, :fragment_present) unless uri.fragment.nil?
  record.errors.add(attribute, :unspecified_scheme) if unspecified_scheme?(uri)
  record.errors.add(attribute, :relative_uri) if relative_uri?(uri)
  record.errors.add(attribute, :secured_uri) if invalid_ssl_uri?(uri)
  record.errors.add(attribute, :invalid_uri) if unspecified_host?(uri)
end
```

`String#split` with no argument splits on any run of whitespace, including
newlines. So the `redirect_uri` column is a single text field that can hold
several URIs (conventionally one per line, as Doorkeeper's own admin form
renders it as a textarea), each validated independently. This is the
concrete mechanism behind "yes, one application can register more than one
redirect URI" — it is not a separate has-many table, it's one string field
Doorkeeper treats as a whitespace-delimited list.

This matches the trajectory of two long-standing Doorkeeper feature
requests — [Multiple redirect URIs #261](https://github.com/doorkeeper-gem/doorkeeper/issues/261)
(opened 2013, asking to support both an `http://` and `https://` variant of
the same callback on one client) and
[Have Multiple redirect_uri for same client app #674](https://github.com/doorkeeper-gem/doorkeeper/issues/674)
(opened 2015, same request) — both closed; GitHub's rendered comment threads
on both issues errored out for me and did not display the resolving
comments, so I'm citing them only as corroborating history, not as the
source of the current behavior — the current source code above is the
authoritative evidence.

### Matching at authorize/token time checks the request against every registered URI, using exact string comparison

`Doorkeeper::OAuth::Helpers::URIChecker.valid_for_authorization?`
(`lib/doorkeeper/oauth/helpers/uri_checker.rb`) is used both when validating
an authorization request
(`Doorkeeper::OAuth::PreAuthorization#validate_redirect_uri`) and when
validating the token exchange
(`Doorkeeper::OAuth::Authorization::CodeRequest#validate_redirect_uri`):

```ruby
def self.valid_for_authorization?(url, client_url)
  return false if client_url.blank?

  valid?(url) && client_url.split.any? { |other_url| matches?(url, other_url) }
end
```

`client_url` here is the application's stored `redirect_uri` field, split
the same way as at registration, and the presented `url` must match *at
least one* of the registered entries — confirming multiple registered URIs
are each independently usable at request time, not merely stored for
display.

The match itself (`self.matches?`) is **exact string comparison**, per RFC
6749 §3.1.2.3 (quoted below) as implemented:

```ruby
def self.matches?(url, client_url)
  return true if url == client_url

  # RFC8252, Paragraph 7.3 allows the port of loopback interface
  # redirect URIs to vary at runtime, so it is ignored when both
  # URIs point to the loopback interface.
  url = as_uri(url)
  client_url = as_uri(client_url)

  return false unless loopback_uri?(url) && loopback_uri?(client_url)

  urls_match?(url, client_url)
end

def self.loopback_uri?(uri)
  IPAddr.new(uri.host).loopback?
rescue IPAddr::Error, IPAddr::InvalidAddressError
  false
end
```

There is exactly one exception to exact matching, and it is narrower than
it first looks: `loopback_uri?` calls `IPAddr.new(uri.host)`, which only
succeeds for a literal numeric loopback address (`127.0.0.1`, `::1`, etc.).
`IPAddr.new("localhost")` raises and is caught, returning `false`. So the
RFC 8252 "port may vary at runtime" exception applies to redirect URIs
registered against a numeric loopback IP, **not** to ones registered against
the hostname `localhost`. A URI matched against a `localhost`-hosted entry
still needs its port (and every other component — scheme, userinfo, host,
path, query, fragment) to match exactly.

### Non-default ports are accepted; nothing rejects them

Nothing in `RedirectUriValidator` or `URIChecker` restricts port numbers.
`URI.parse` handles a port as a normal URI component, and it simply becomes
part of the string that must match exactly at authorization/token time. A
registered `https://localhost:8443/callback` is valid on that basis alone.

### Plain `http://` for `localhost` is gated by a config flag Doorkeeper defaults to *rejecting* in production, and I cannot see 42's value for it

`invalid_ssl_uri?` in the validator checks `Doorkeeper.config.force_ssl_in_redirect_uri`:

```ruby
def invalid_ssl_uri?(uri)
  forces_ssl = Doorkeeper.config.force_ssl_in_redirect_uri
  non_https = uri.try(:scheme) == "http"

  if forces_ssl.respond_to?(:call)
    forces_ssl.call(uri) && non_https
  else
    forces_ssl && non_https
  end
end
```

Doorkeeper's own `lib/doorkeeper/config.rb` sets the default:

```ruby
option :force_ssl_in_redirect_uri, default: !Rails.env.development?
```

i.e., **enabled by default outside a development Rails environment** — a
plain `http://` redirect URI (including one hosted at `localhost`) is
rejected at registration by default in anything 42 would run as production.
Doorkeeper's own generated initializer explicitly anticipates operators
wanting an exception for localhost, offering this as a documented example
override:

```ruby
# force_ssl_in_redirect_uri { |uri| uri.host != 'localhost' }
```

Whether 42 has configured such an override (or runs any part of their stack
in a mode where the default is `false`) is exactly the kind of
deployment-specific fact their public docs would state and their logged-in
registration form would enforce live — and it's the piece I could not
verify, since both are behind the sign-in wall documented above. This is
the load-bearing unknown for the `http://localhost` half of the question.

### RFC 6749 itself treats "multiple registered redirection URIs" as an ordinary case

Independent of Doorkeeper's specific implementation, the OAuth 2.0 core
spec Doorkeeper implements already assumes an authorization server may hold
more than one registered redirect URI per client. RFC 6749 §3.1.2.3 reads,
verbatim:

> If multiple redirection URIs have been registered, if only part of the
> redirection URI has been registered, or if no redirection URI has been
> registered, the client MUST include a redirection URI with the
> authorization request using the "redirect_uri" request parameter.
>
> When a redirection URI is included in an authorization request, the
> authorization server MUST compare and match the value received against at
> least one of the registered redirection URIs (or URI components) as
> defined in [RFC3986] Section 6, if any redirection URIs were registered.
> If the client registration included the full redirection URI, the
> authorization server MUST compare the two URIs using simple string
> comparison as defined in [RFC3986] Section 6.2.1.

This is the spec-level backing for what Doorkeeper's `client_url.split.any?
{ |other_url| matches?(url, other_url) }` implements, and for the exact
("simple string comparison") match rule.

### Secondary, unverified: a community mirror of what appears to be 42's own getting-started text

I could not reach `api.intra.42.fr/apidoc` (see above), so I looked for
whether any independent copy of that content was reachable. I found
`https://leeoocca.github.io/42apidocs/` — **an unofficial, third-party
GitHub Pages mirror, not an api.intra.42.fr or 42.fr domain**. Its HTML
references image assets at
`raw.githubusercontent.com/42School/api-documentation/...`, which would
imply a `42School/api-documentation` GitHub repository as the underlying
source, but that repository returns 404 from the GitHub API today — it no
longer exists at that name/org, or was made private, so I could not
independently verify this mirror's text against the actual current or
historical 42-owned source. **I am flagging this explicitly as secondary
and non-authoritative**, per the research brief's instruction, and using it
only as directional corroboration, not as evidence for any claim above.

With that caveat, the mirror's "Register your application" section reads:

> The **redirect URI(s)**. These URI(s) are needed if you app acts as a
> third tier between the 42 data and an user (this *flow* is called `Web
> Application Flow`), and specify where the user need to be redirected
> after his authentication.

— "redirect URI(s)" plural, consistent with (but not proof of) the
Doorkeeper-level finding above. The same mirror's worked example for the
authorize-URL step uses `redirect_uri=http%3A%2F%2Flocalhost%3A1919%2F...`
— a plain `http://` scheme, host `localhost`, non-default port 1919 — which
if accurate to 42's actual former configuration, would mean 42 has at some
point applied a `force_ssl_in_redirect_uri` override (or otherwise permitted
non-HTTPS localhost redirects) rather than running Doorkeeper's plain
production default. I cannot confirm this is still 42's current
configuration, or that this text is not stale/altered, without reaching the
authenticated source.

## Conclusion

**Yes** — a 42 OAuth application can be registered with more than one
redirect URI. This is a definitive finding from the current Doorkeeper gem
source (the library 42's registration form is built on): `redirect_uri` is
stored as one whitespace/newline-delimited string field, each entry
validated independently at registration and checked independently at both
the authorization and token-exchange steps. It is reinforced by RFC 6749
§3.1.2.3, which explicitly contemplates "multiple redirection URIs
registered" as an ordinary case for any compliant OAuth 2.0 authorization
server. I could not reach 42's own authenticated documentation or
registration form to get a 42-specific statement, so this conclusion is an
inference from the underlying library and the spec it implements, not a
confirmed 42-specific fact — flagged per the research brief.

On whether one application can carry both `http://localhost` and
`https://localhost:8443` at once:

- **Storage/multiplicity**: yes, both could occupy the same `redirect_uri`
  field as two whitespace-separated entries — nothing in Doorkeeper limits
  entries by scheme or requires them to share a scheme.
- **Match rule**: exact string comparison (RFC 6749 §3.1.2.3 / RFC 3986
  §6.2.1), not prefix matching. Doorkeeper's one narrow exception — the port
  of a loopback address may vary at runtime per RFC 8252 §7.3 — applies only
  to a literal numeric loopback IP host (e.g. `127.0.0.1`), not to the
  hostname `localhost`; a `localhost`-hosted registered URI still needs an
  exact port match.
- **Non-default port (`:8443`)**: accepted — nothing rejects a non-default
  port; it simply becomes part of the string that must match exactly.
- **Plain `http://` for `localhost`**: **unresolved for 42 specifically.**
  Doorkeeper's own default (`force_ssl_in_redirect_uri: !Rails.env.development?`)
  rejects non-HTTPS redirect URIs, including `localhost` ones, outside
  development — but this is a per-deployment config flag Doorkeeper
  explicitly documents overriding for localhost, and I have no way to see
  which value 42 has set without logging into their platform. The
  non-authoritative community mirror's example (`http://localhost:1919/...`)
  suggests 42 may have permitted this at some point, but I could not verify
  that text against a current, official 42 source.

## Primary sources

- [RFC 6749 §3.1.2.3, Dynamic Configuration](https://www.rfc-editor.org/rfc/rfc6749.txt) — "If multiple redirection URIs have been registered..." and the simple-string-comparison matching rule
- [Doorkeeper `RedirectUriValidator` (main branch)](https://github.com/doorkeeper-gem/doorkeeper/blob/main/lib/doorkeeper/orm/active_record/redirect_uri_validator.rb) — `value.split.each`, per-entry validation, `force_ssl_in_redirect_uri`-driven `invalid_ssl_uri?`
- [Doorkeeper `Application` ActiveRecord mixin (main branch)](https://github.com/doorkeeper-gem/doorkeeper/blob/main/lib/doorkeeper/orm/active_record/mixins/application.rb) — `validates_with Doorkeeper::RedirectUriValidator, attributes: [:redirect_uri]`
- [Doorkeeper `URIChecker` (main branch)](https://github.com/doorkeeper-gem/doorkeeper/blob/main/lib/doorkeeper/oauth/helpers/uri_checker.rb) — `valid_for_authorization?` matching against every registered entry, exact-match `matches?`, loopback-port exception scoped to numeric loopback IPs
- [Doorkeeper `PreAuthorization` (main branch)](https://github.com/doorkeeper-gem/doorkeeper/blob/main/lib/doorkeeper/oauth/pre_authorization.rb) — authorization-request `validate_redirect_uri` calling `URIChecker.valid_for_authorization?`
- [Doorkeeper `Authorization::CodeRequest` (main branch)](https://github.com/doorkeeper-gem/doorkeeper/blob/main/lib/doorkeeper/oauth/authorization/code_request.rb) — token-exchange `validate_redirect_uri`, RFC 6749 §5.2 citation
- [Doorkeeper `Config` (main branch)](https://github.com/doorkeeper-gem/doorkeeper/blob/main/lib/doorkeeper/config.rb) — `force_ssl_in_redirect_uri` default (`!Rails.env.development?`)
- [Doorkeeper generated initializer template (main branch)](https://github.com/doorkeeper-gem/doorkeeper/blob/main/lib/generators/doorkeeper/templates/initializer.rb) — documented `force_ssl_in_redirect_uri { |uri| uri.host != 'localhost' }` override example
- [Doorkeeper issue #261, "Multiple redirect URIs"](https://github.com/doorkeeper-gem/doorkeeper/issues/261) — corroborating history only, comment thread did not render for me
- [Doorkeeper issue #674, "Have Multiple redirect_uri for same client app"](https://github.com/doorkeeper-gem/doorkeeper/issues/674) — corroborating history only, comment thread did not render for me

### Attempted but unreachable (42's own authenticated docs/form)

- `https://api.intra.42.fr/apidoc` — 302 to sign-in
- `https://api.intra.42.fr/apidoc/guides/getting_started` — 302 to sign-in
- `https://api.intra.42.fr/apidoc/guides/web_application_flow` — 302 to sign-in
- `https://profile.intra.42.fr/oauth/applications/new` — 302 to sign-in

### Secondary, non-authoritative (flagged, not relied on for the conclusion)

- [leeoocca.github.io/42apidocs](https://leeoocca.github.io/42apidocs/) — third-party GitHub Pages mirror of unverified provenance; cited only for the "redirect URI(s)" plural phrasing and the `http://localhost:1919` example, not as proof of current 42 behavior
