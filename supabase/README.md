# Local Supabase service configuration

These files are trimmed from Supabase's self-hosted Docker setup at commit
`7353782724d837be316f0f6f87471ed176ab4bfd` (2026-10-03). The database
keeps only the role passwords and JWT expiry initialization used by Auth and
Storage. The gateway keeps their routes and key translation. Storage talks to
Postgres directly and the REST service is left out, so no Data API exists, as
on the team project.
