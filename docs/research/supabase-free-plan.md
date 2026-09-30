# What Supabase's Free plan means for PeerConnect

Researched 2026-09-30 for issue #89. Built from Supabase's pricing page, its platform, storage,
auth and troubleshooting docs, its Terms of Service, Data Processing Addendum and sub-processor
list, the source of those pages in the `supabase/supabase` repository (`master` at commit
[`ad0ed2c`](https://github.com/supabase/supabase/tree/ad0ed2cdbc90ca72e5cf260834e3ee8028c0a492),
2026-09-30), and Supabase's GitHub discussions where the docs are silent. Free plan only. All
links were checked on 2026-09-30.

Facts only. Each section ends with what the facts rule in or out. No design decision is made here.

Items marked **Not confirmed** could not be settled from a primary source.

## Question

What do Supabase's free-plan rules mean for developing and defending PeerConnect? The setup under
study: one hosted team project on the Free plan, in its own organization owned by Kamel, with
Ahmad and Fadel invited as Developer members. Each developer runs Supabase locally for branch work.

## 1. Projects: the 2-active-projects rule

**The rule.** "You are granted two free projects. The project limit applies across all
organizations where you are an Owner or Administrator. [...] Paused projects do not count towards
your free project limit."
([About billing](https://supabase.com/docs/guides/platform/billing-on-supabase#free-plan))
The pricing page puts it as: "Limit of 2 active projects."
([Pricing](https://supabase.com/pricing))

**How it counts inside one organization.** "Within an organization, we count the free project
limits from all members that are either Owner or Admin. If you've got another organization member
with the Admin or Owner role that has already exhausted their free project quota, you won't be able
to launch another free project in that organization."
([Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq#how-many-free-projects-can-i-have))
The dashboard applies the same check when a paused project is resumed. The resume button is
blocked if any member has reached "their maximum limits for the number of active free plan
projects within organizations where they are an administrator or owner"
([`ResumeProjectButton.tsx`](https://github.com/supabase/supabase/blob/ad0ed2cdbc90ca72e5cf260834e3ee8028c0a492/apps/studio/components/interfaces/Project/ResumeProjectButton.tsx)).

**Does a Developer member use up any of their own?** No. Only Owner and Administrator roles are
counted. A Developer cannot create, pause or resume a project at all
([Access control, project permissions](https://supabase.com/docs/guides/platform/access-control#project-permissions)).
Each person's account also gets a default organization at sign-up, where they are Owner
([Access control](https://supabase.com/docs/guides/platform/access-control)). Projects there count
against their own two.

**Roles on Free.** Owner, Administrator and Developer are available. Read-Only and project-scoped
roles are Team and Enterprise only. Team members are unlimited on Free
([Pricing](https://supabase.com/pricing);
[Access control](https://supabase.com/docs/guides/platform/access-control)).

**What a Developer can and cannot do on the project** (from the
[project permissions table](https://supabase.com/docs/guides/platform/access-control#project-permissions)):

| A Developer can | A Developer cannot |
| --- | --- |
| Read the service key and the anon key | Create, delete, pause or resume (restore) the project |
| View the JWT secret | Reset the database password |
| View and manage data, run SQL | Update Auth settings, providers, URL configuration, email templates |
| Create buckets, upload and delete files | Update the Storage upload limit |
| Create and delete Auth users | Update API, pooling, SSL or network settings |
| Restart the project | Generate a new JWT secret, add add-ons |

**Can a Developer see the API keys?** Yes. The table allows a Developer to read both the service key
and the anon key and to view the JWT secret.
**Not confirmed:** the table still uses the older key names. It does not list Supabase's newer
publishable and secret keys separately
([API keys](https://supabase.com/docs/guides/getting-started/api-keys)).

**Can a Developer see the connection string?** Partly. Every connection string in the dashboard's
Connect dialog shows a `[YOUR-PASSWORD]` placeholder, not the password
([Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)). A
Developer can view pooling and SSL settings but cannot reset the database password. So a Developer
gets the password only if the Owner gives it to them.
**Not confirmed:** the permissions table does not list the Connect dialog itself.

**A related connection fact.** On Free, the direct connection (`db.[PROJECT-REF].supabase.co:5432`)
is IPv6 only. The shared pooler is IPv4 on every plan
([Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)).
Free compute is "Nano": shared CPU, up to 0.5 GB RAM, 60 database connections, 200 pooler clients
([Compute and disk](https://supabase.com/docs/guides/platform/compute-and-disk)).

**Rules in / out.**

- In: one team project in Kamel's organization uses one of Kamel's two slots and none of Ahmad's or
  Fadel's, as long as they stay Developers.
- Out: making Ahmad or Fadel an Administrator without it counting. The project would then count
  against their limit too. If either has two active projects elsewhere, the organization could not
  create or resume a free project.
- Out: a Developer resuming a paused project, resetting the database password, or changing Auth or
  Storage settings. Only the Owner (or an Administrator) can.
- In: a Developer copying the keys needed for a `.env` file. The database password has to come from
  the Owner.
- Out: a direct IPv4 connection to the database on Free. An IPv4-only network has to use the shared
  pooler.

## 2. Pausing after 1 week

**What counts as activity.** "A Free plan project is considered inactive if it does not receive
sufficient user database activity over the past week. [...] Typically a few user requests to the
database each day over the previous week is enough to keep the project from being paused."
([Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing))
After a warning email, the docs name two ways to prevent the pause: visit the project in the
dashboard, or make API calls or requests through the connected app (same page).
**Not confirmed:** the exact threshold. Also not confirmed: whether Auth-only or Storage-only
traffic counts, since the docs speak of "database activity".

**Warnings.** Supabase emails "the project owner" twice: "A warning email roughly one week before
the pause takes effect", then a confirmation once paused (same page).
**Not confirmed:** which members receive it in an organization with several members.

**What happens to a running app.** Every request gets HTTP `540 project paused`. "The project
cannot process requests until it is un-paused by the owner. Free Plan projects may be paused due to
inactivity, on request by the owner, or in rare instances, due to abuse."
([HTTP status codes](https://supabase.com/docs/guides/troubleshooting/http-status-codes))

**What happens to the data.** It is kept. The dashboard's paused screen on Free says "All data,
including backups and storage objects, remains safe."
([`ProjectPausedState.tsx`](https://github.com/supabase/supabase/blob/ad0ed2cdbc90ca72e5cf260834e3ee8028c0a492/apps/studio/components/layouts/ProjectLayout/PausedState/ProjectPausedState.tsx))
A resumed project "will return to its previous state, including data and configurations"
([Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)).
A Supabase contributor wrote: "A backup is taken as part of the pause process"
([discussion #27497](https://github.com/orgs/supabase/discussions/27497)).

**How to resume.** Dashboard, then the organization, then the paused project, then **Resume
project**. This works for up to 1 year after the pause. After that the project cannot be resumed,
but its database backup and Storage objects can still be downloaded
([Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing);
[Restore after 1 year](https://supabase.com/docs/guides/troubleshooting/restore-project-after-90-days-pause)).
The window was 90 days from 2024-06-24 ([#27497](https://github.com/orgs/supabase/discussions/27497));
the docs now say 1 year. Resuming needs the Owner or an Administrator, and a free slot (section 1).

**How long a resume takes.** The docs do not say. In a GitHub discussion, a Supabase maintainer
wrote that it "shouldn't take more than a couple of minutes (even less than 1 minute if your
database is small)", and a contributor wrote "no more than a few minutes". Users report restores
stuck for hours that support had to fix
([discussion #13776](https://github.com/orgs/supabase/discussions/13776)).
**Not confirmed** by any docs page.

**How to keep it active before a defense.** The docs offer only the two steps above: visit the
dashboard, or send requests from the app. The only documented way to rule out pausing is a paid
plan: "Paid projects cannot be paused and are not subject to pausing for inactivity"
([Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)).
A scheduled job that queries the database every day is a common community practice. Supabase does
not document it as a guarantee
([discussion #13776](https://github.com/orgs/supabase/discussions/13776)).
Separately, Fair Use restrictions (section 3) can also pause projects.

**Rules in / out.**

- In: a project left idle for a week between work sessions keeps its data and can be resumed in
  minutes, by Kamel.
- Out: any documented guarantee on Free that the project will not be paused on a given day. Only
  activity makes it unlikely.
- Out: Ahmad or Fadel resuming it on defense day. Kamel (or an Administrator) must be reachable.
- In: the evaluator's `make up` works against the hosted project only while it is active. A paused
  project answers every request with `540`.

## 3. Sizes, and what happens past them

Free-plan quotas ([About billing](https://supabase.com/docs/guides/platform/billing-on-supabase#variable-usage-fees-and-quotas);
[Pricing](https://supabase.com/pricing)). Quotas apply to the whole organization, summed across its
projects, except where marked per project.

| Item | Free quota | Source |
| --- | --- | --- |
| Database size | 500 MB per project (1 GB disk) | [Database size](https://supabase.com/docs/guides/platform/database-size) |
| File storage | 1 GB (744 GB-hours a month) | [Storage size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size) |
| Per-file upload limit | 50 MB, global, cannot be raised on Free | [Storage limits](https://supabase.com/docs/guides/storage/uploads/file-limits) |
| Egress | 5 GB uncached + 5 GB cached, per billing cycle | [Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress) |
| Auth monthly active users | 50,000 (total users unlimited) | [MAU](https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users) |
| Realtime | 200 peak connections, 2 million messages | [About billing](https://supabase.com/docs/guides/platform/billing-on-supabase) |
| Edge Function invocations | 500,000 | [About billing](https://supabase.com/docs/guides/platform/billing-on-supabase) |
| Log retention | API and database logs 1 day; Auth audit logs 1 hour | [Pricing](https://supabase.com/pricing) |

**Past the database size.** "Free Plan projects enter read-only mode when your database size
exceeds 500 MB." Writes then fail with `cannot execute INSERT in a read-only transaction`
(SQLSTATE `25006`). Separately, the organization can get a Fair Use restriction (HTTP `402`). That
one is based on the average daily database size over the billing period, not the live size
([Database size](https://supabase.com/docs/guides/platform/database-size)).

**Past storage, egress or MAU.** Free is never billed for overage. "You will get a notification to
your billing email address and put under a grace period." If usage stays over, Fair Use
restrictions apply. They can mean pausing projects, switching databases to read-only mode, blocking
new project launches and transfers, or answering every API request with `402`. They are "generally
applied to all projects of the restricted organization". Usage restrictions lift when the quota refills at the
next billing cycle, or at once on upgrade
([Billing FAQ, Fair Use Policy](https://supabase.com/docs/guides/platform/billing-faq#fair-use-policy)).
After one grace period, a second overrun gets no new grace period (same page). Storage size is an
average over the billing period, so deleting files late in the cycle lowers it only slowly
([Storage size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)).
**Not confirmed:** how long the grace period lasts. The docs do not say.

**Past the per-file limit.** A larger upload is refused. Per-bucket limits can be set lower, never
higher than the global one
([Storage limits](https://supabase.com/docs/guides/storage/uploads/file-limits)).

**Rules in / out.**

- In: ADR-0009's caps (5 MiB Evidence, 2 MiB avatar) sit far below the 50 MB per-file limit.
- In: a demo-sized database and file store fit well inside 500 MB and 1 GB.
- Out: overrunning a quota without consequence. Every overrun on Free ends, after a grace period, in
  restrictions on the whole organization, not only in extra cost.

## 4. Backups

**No backups the team can restore on Free.** "We automatically back up all Pro, Team, and
Enterprise Plan projects on a daily basis. [...] We recommend that free tier plan projects regularly
export their data using the Supabase CLI `db dump` command and maintain off-site backups."
([Backups](https://supabase.com/docs/guides/platform/backups)) The pricing table lists
"Automatic backups" and "Point in time recovery" as not included on Free
([Pricing](https://supabase.com/pricing)). PITR needs a paid plan and at least the Small compute
add-on ([Backups](https://supabase.com/docs/guides/platform/backups#point-in-time-recovery)).

**But Supabase does keep copies in some cases.**

- Pausing takes a full logical backup. It stays restorable for 1 year and downloadable after that
  (section 2; [#27497](https://github.com/orgs/supabase/discussions/27497)).
- The Data Processing Addendum's security schedule says: "Supabase takes daily backups of Customer
  projects by default. [...] Backups are stored on a storage system independent of the Customer's
  project resources." It makes no exception for Free
  ([DPA, Schedule 2](https://supabase.com/legal/customer-resources/data-processing-addendum)).
- A community contributor (not Supabase staff) reports that Free projects upgraded to Pro show 7
  daily backups from their free period, and calls this "not documented"
  ([discussion #47518](https://github.com/orgs/supabase/discussions/47518)).
  **Not confirmed.**

**Other backup facts.** Database backups never include Storage objects, only their metadata
([Backups](https://supabase.com/docs/guides/platform/backups)). Deleting a project "permanently
remove[s] all associated data, including any backups stored in S3" (same page).

**Rules in / out.**

- In: the sentence "there are no backups" holds in a narrow sense: on Free the team has no backup
  it can restore from.
- Out: the sentence as a claim that no copy of the data exists anywhere. The DPA says Supabase
  takes daily backups by default. Pausing creates a backup kept for at least a year. Whether
  Supabase keeps daily copies of a Free project is **not confirmed** either way.
- In: deleting the project removes its backups too, per the docs.

## 5. Regions, and what the Privacy Policy would have to name

**The list.** 17 specific AWS regions, plus three general ones (Americas, Europe, APAC)
([Regions](https://supabase.com/docs/guides/platform/regions);
[`regions.ts`](https://github.com/supabase/supabase/blob/ad0ed2cdbc90ca72e5cf260834e3ee8028c0a492/packages/shared-data/regions.ts)):

- Americas: `us-west-1` North California, `us-west-2` Oregon, `us-east-1` North Virginia,
  `us-east-2` Ohio, `ca-central-1` Canada, `sa-east-1` São Paulo.
- Europe: `eu-west-1` Ireland, `eu-west-2` London, `eu-west-3` Paris, `eu-central-1` Frankfurt,
  `eu-central-2` Zurich, `eu-north-1` Stockholm.
- Asia-Pacific: `ap-south-1` Mumbai, `ap-southeast-1` Singapore, `ap-northeast-1` Tokyo,
  `ap-northeast-2` Seoul, `ap-southeast-2` Sydney.

There is **no Middle East or Africa region**.

**Nearest to Lebanon and to France.** By straight-line distance from Beirut: Zurich about 2,700 km,
Frankfurt about 2,830 km, Stockholm about 3,100 km, Paris about 3,190 km, London about 3,460 km,
Mumbai about 4,040 km. From Paris, the nearest is Paris (`eu-west-3`), then London, Frankfurt and
Zurich. Distances are computed from city coordinates.
**Not confirmed:** actual network latency from the Beirut campus. Distance is not latency, and
nothing was measured.

**General regions.** A general region deploys to "an available AWS region within that broader
area" based on capacity. "Europe" includes London and Zurich, which are not in the EU
([Regions](https://supabase.com/docs/guides/platform/regions)). A project's region is fixed.
Moving means creating a new project and migrating
([Change project region](https://supabase.com/docs/guides/troubleshooting/change-project-region-eWJo5Z)).
No page found restricts which regions a Free project may use.

**Facts the Privacy Policy would have to name.** The policy today says there is no central server.
A hosted project changes that. Facts it would draw on:

- **Who processes the data.** The Terms of Service are a contract with "SUPABASE PTE. LTD., a
  Singapore entity with a registered address of 65 Chulia Street #38-02/03, OCBC Centre, Singapore
  049513" (version 3, effective 2026-08-01) ([Terms](https://supabase.com/terms)). The DPA casts
  the customer as controller and Supabase as processor.
- **Is there a DPA on Free?** Yes. The Terms say: "The Parties agree to comply with the Data
  Processing Addendum, which is incorporated into this Agreement." The Terms cover every customer,
  and no plan restriction was found. Nothing has to be signed separately: "acceptance of the
  Agreement shall have the same effect as signing the SCCs"
  ([DPA](https://supabase.com/legal/customer-resources/data-processing-addendum)).
  The DPA includes the EU Standard Contractual Clauses (Module Two, Irish law, Irish courts).
- **Where the data lives.** The project's Postgres database, Auth and Storage are hosted in its one
  primary region ([GDPR guide](https://supabase.com/docs/guides/security/gdpr-compliance)). Under
  DPA clause 6.1, data is "stored and primarily Processed in that region". The GDPR guide adds:
  "Backups, logs, data exported to external systems, Edge Function execution, and sub-processors
  can affect your data residency."
- **Sub-processors.** The list dated 2026-06-01 has 24 entries. Five are listed for "Provision of
  hosting services": Amazon Web Services, Cloudflare, Google, Fly.io and Vercel
  ([Sub-processor list](https://supabase.com/legal/customer-resources/subprocessor-list)).
- **Retention after the account ends.** Supabase keeps data for 30 days after the agreement
  expires, then deletes it (DPA clause 11.2).
- **Logs.** API and database logs are kept 1 day on Free, and Auth audit logs 1 hour
  ([Pricing](https://supabase.com/pricing)). **Not confirmed:** which fields they contain, such as
  IP addresses.
- **Email.** Hosted projects require email confirmation by default. Local ones do not. Without a
  custom SMTP server, Supabase delivers Auth email only to the project team's addresses
  ([Passwords](https://supabase.com/docs/guides/auth/passwords);
  [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)). The policy says PeerConnect sends no
  email.

**Rules in / out.**

- Out: a region in Lebanon or the Middle East. None exists.
- In: an EU region (Frankfurt, Paris, Stockholm, Ireland) if the data must stay in the EU. Also in:
  the specific-region choice rather than "Europe", which can land in London or Zurich.
- In: naming a DPA on Free. It is part of the Terms, with no separate signature.
- Out: the Privacy Policy's current "There is no central PeerConnect server" and "stored in that
  copy's own database, on that computer" for a hosted copy.

## Local development

The Supabase CLI runs "the entire Supabase stack locally", in Docker containers
([CLI getting started](https://supabase.com/docs/guides/local-development/cli/getting-started)).
The docs describe no project limit, pausing or quotas for the local stack.
**Not confirmed** as an explicit statement. Hosted Branching is not on Free
([Pricing](https://supabase.com/pricing)).

## Primary sources

- [Pricing](https://supabase.com/pricing), and its data files
  [`plans.ts`](https://github.com/supabase/supabase/blob/ad0ed2cdbc90ca72e5cf260834e3ee8028c0a492/packages/shared-data/plans.ts)
  and [`pricing.ts`](https://github.com/supabase/supabase/blob/ad0ed2cdbc90ca72e5cf260834e3ee8028c0a492/packages/shared-data/pricing.ts)
- [About billing on Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)
- [Access control](https://supabase.com/docs/guides/platform/access-control)
- [Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [How to restore a project paused for more than 1 year](https://supabase.com/docs/guides/troubleshooting/restore-project-after-90-days-pause)
- [HTTP status codes](https://supabase.com/docs/guides/troubleshooting/http-status-codes)
- [Database backups](https://supabase.com/docs/guides/platform/backups)
- [Database size](https://supabase.com/docs/guides/platform/database-size)
- [Storage size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size),
  [Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress),
  [Monthly active users](https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users)
- [Storage limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Compute and disk](https://supabase.com/docs/guides/platform/compute-and-disk)
- [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Available regions](https://supabase.com/docs/guides/platform/regions)
- [Change project region](https://supabase.com/docs/guides/troubleshooting/change-project-region-eWJo5Z)
- [GDPR compliance](https://supabase.com/docs/guides/security/gdpr-compliance)
- [Terms of Service](https://supabase.com/terms) (version 3, effective 2026-08-01)
- [Data Processing Addendum](https://supabase.com/legal/customer-resources/data-processing-addendum)
  (version 1, effective 2026-08-01)
- [Sub-processor list](https://supabase.com/legal/customer-resources/subprocessor-list) (PDF dated
  2026-06-01)
- [Passwords](https://supabase.com/docs/guides/auth/passwords),
  [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [CLI getting started](https://supabase.com/docs/guides/local-development/cli/getting-started)
- Dashboard source:
  [`ResumeProjectButton.tsx`](https://github.com/supabase/supabase/blob/ad0ed2cdbc90ca72e5cf260834e3ee8028c0a492/apps/studio/components/interfaces/Project/ResumeProjectButton.tsx),
  [`ProjectPausedState.tsx`](https://github.com/supabase/supabase/blob/ad0ed2cdbc90ca72e5cf260834e3ee8028c0a492/apps/studio/components/layouts/ProjectLayout/PausedState/ProjectPausedState.tsx)
- GitHub discussions, where the docs are silent:
  [#27497](https://github.com/orgs/supabase/discussions/27497) (pause backup, restore window),
  [#13776](https://github.com/orgs/supabase/discussions/13776) (resume time),
  [#47518](https://github.com/orgs/supabase/discussions/47518) (Free backups, community report)
