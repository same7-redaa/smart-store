# Supabase CLI Command Reference

Full command reference for the Supabase CLI. Use `supabase <command> --help` for flags not listed here.

---

## Auth

```bash
supabase login                    # authenticate with browser or token
supabase login --token <token>    # non-interactive (CI/CD)
supabase logout
```

---

## Project Setup

```bash
supabase init                              # create supabase/ directory with config.toml
supabase init --with-intellij-settings     # also creates .idea/ run configs
supabase link --project-ref <ref>          # link local to remote project
supabase link --project-ref <ref> --password <db-pass>
supabase unlink                            # remove remote link
supabase bootstrap                         # interactive: create + link new project
```

---

## Local Dev

```bash
supabase start                    # start all local containers (postgres, studio, etc.)
supabase start -x vector          # exclude specific service
supabase stop                     # stop containers
supabase stop --no-backup         # stop and discard local data
supabase status                   # show running service URLs and keys
supabase services                 # list available services
```

**Local URLs (default):**
- Studio: http://localhost:54323
- API: http://localhost:54321
- DB: postgresql://postgres:postgres@localhost:54322/postgres

---

## Database

```bash
# Compare local vs remote schema (or branch)
supabase db diff
supabase db diff --schema public,auth
supabase db diff --use-migra           # use migra engine instead
supabase db diff -f <migration-name>   # save diff as new migration file

# Dump
supabase db dump -f dump.sql           # dump remote schema
supabase db dump --data-only -f data.sql

# Lint
supabase db lint                       # check for issues
supabase db lint --level warning

# Pull remote schema
supabase db pull                       # creates migration from remote schema
supabase db pull --schema public,storage

# Push local migrations to remote
supabase db push
supabase db push --dry-run             # preview without applying
supabase db push --include-seed        # also run seed.sql

# Reset local DB
supabase db reset                      # drop + recreate + apply all migrations
supabase db reset --version <version>  # reset to specific migration version

# Start DB only (no full stack)
supabase db start
```

---

## Migrations

```bash
supabase migration new <name>             # create empty migration file
supabase migration list                   # show applied/pending migrations
supabase migration up                     # apply pending migrations locally
supabase migration down                   # revert last migration locally
supabase migration fetch                  # fetch remote migration history
supabase migration repair --status applied <version>   # mark migration as applied
supabase migration repair --status reverted <version>  # mark as reverted
supabase migration squash                 # squash all migrations into one
supabase migration squash --version <ver> # squash up to version
```

Migration files live in `supabase/migrations/` with format `<timestamp>_<name>.sql`.

---

## Edge Functions

```bash
supabase functions new <name>             # scaffold function at supabase/functions/<name>/index.ts
supabase functions list                   # list deployed functions
supabase functions deploy <name>          # deploy single function
supabase functions deploy                 # deploy all functions
supabase functions deploy <name> --no-verify-jwt   # allow unauthenticated calls
supabase functions delete <name>          # delete deployed function
supabase functions download <name>        # download function source
supabase functions serve                  # serve all functions locally (hot reload)
supabase functions serve <name>           # serve single function
supabase functions serve <name> --env-file .env.local
```

**Local function URL:** `http://localhost:54321/functions/v1/<name>`

---

## Secrets

```bash
supabase secrets list
supabase secrets set KEY=value
supabase secrets set KEY=value OTHER=val  # multiple at once
supabase secrets set --env-file .env      # from file
supabase secrets unset KEY
supabase secrets unset KEY1 KEY2
```

---

## Storage

```bash
supabase storage ls                       # list buckets
supabase storage ls ss://bucket/path      # list objects
supabase storage cp local.txt ss://bucket/path/remote.txt   # upload
supabase storage cp ss://bucket/path/file.txt local.txt     # download
supabase storage cp -r ./dir ss://bucket/prefix/            # recursive upload
supabase storage mv ss://bucket/old.txt ss://bucket/new.txt
supabase storage rm ss://bucket/path/file.txt
supabase storage rm -r ss://bucket/prefix/
```

---

## Type Generation

```bash
supabase gen types --lang typescript --project-id <ref>   # from remote
supabase gen types --lang typescript --local              # from local DB
supabase gen types --lang typescript --db-url <url>       # from connection string
supabase gen bearer-jwt                                    # generate bearer JWT
supabase gen signing-key                                   # generate signing key
```

**Pipe to file:**
```bash
supabase gen types --lang typescript --project-id <ref> > src/types/supabase.ts
```

---

## Inspection

```bash
supabase inspect db calls             # top function calls
supabase inspect db long-running-queries
supabase inspect db outliers
supabase inspect db bloat
supabase inspect db blocking
supabase inspect db cache-hit
supabase inspect db index-usage
supabase inspect db locks
supabase inspect db replication-slots
supabase inspect db role-connections
supabase inspect db seq-scans
supabase inspect db table-index-sizes
supabase inspect db table-record-counts
supabase inspect db table-sizes
supabase inspect db total-index-size
supabase inspect db total-table-sizes
supabase inspect db unused-indexes
supabase inspect db vacuum-stats
supabase inspect report               # generate full inspection report
```

---

## Backups

```bash
supabase backups list
supabase backups restore <id>
```

---

## Branches (Database Branching)

```bash
supabase branches create <name>
supabase branches list
supabase branches get <id>
supabase branches delete <id>
supabase branches pause <id>
supabase branches unpause <id>
supabase branches update <id> --name <new-name>
```

---

## Projects & Orgs

```bash
supabase projects create <name>
supabase projects create <name> --org-id <id> --region us-east-1 --db-password <pass>
supabase projects list
supabase projects delete <ref>
supabase projects api-keys --project-ref <ref>

supabase orgs create <name>
supabase orgs list
```

---

## Config

```bash
supabase config push                  # push local config.toml settings to remote
```

---

## Domains & Vanity

```bash
supabase domains create --project-ref <ref> --custom-hostname <domain>
supabase domains get --project-ref <ref>
supabase domains activate --project-ref <ref>
supabase domains reverify --project-ref <ref>
supabase domains delete --project-ref <ref>

supabase vanity-subdomains activate --project-ref <ref> --desired-subdomain <name>
supabase vanity-subdomains get --project-ref <ref>
supabase vanity-subdomains check-availability --project-ref <ref> --desired-subdomain <name>
supabase vanity-subdomains delete --project-ref <ref>
```

---

## SSL Enforcement

```bash
supabase ssl-enforcement get --project-ref <ref>
supabase ssl-enforcement update --project-ref <ref> --enable-db-ssl-enforcement
```

---

## Network

```bash
supabase network-bans get --project-ref <ref>
supabase network-bans remove --project-ref <ref> --db-unban-ip <ip>

supabase network-restrictions get --project-ref <ref>
supabase network-restrictions update --project-ref <ref> --db-allow-cidr <cidr>
```

---

## Encryption

```bash
supabase encryption get-root-key --project-ref <ref>
supabase encryption update-root-key --project-ref <ref>
```

---

## SSO

```bash
supabase sso add --project-ref <ref> --type saml --metadata-url <url>
supabase sso list --project-ref <ref>
supabase sso show --project-ref <ref> <provider-id>
supabase sso info --project-ref <ref>
supabase sso update --project-ref <ref> <provider-id> --metadata-url <url>
supabase sso remove --project-ref <ref> <provider-id>
```

---

## Postgres Config

```bash
supabase postgres-config get --project-ref <ref>
supabase postgres-config update --project-ref <ref> --config "max_connections=200"
supabase postgres-config delete --project-ref <ref> --config max_connections
```

---

## Snippets

```bash
supabase snippets list --project-ref <ref>
supabase snippets download <id> --project-ref <ref>
```

---

## Seed

```bash
supabase seed buckets              # seed storage buckets from supabase/seed.sql
```

---

## Testing

```bash
supabase test db                   # run pgTAP tests
supabase test new <name>           # create new test file
```

---

## Global Flags

```
--debug          verbose output
--output json    machine-readable output (json|pretty|csv|yaml)
--project-ref    override linked project
--workdir        override working directory
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Skip interactive login (CI/CD) |
| `SUPABASE_DB_PASSWORD` | Skip password prompts |
| `SUPABASE_PROJECT_ID` | Override linked project ref |
