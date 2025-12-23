## Outcome
Build a web platform that generates a project-specific Standards Pack (repo scaffolding + CI enforcement + Cursor rules) for Expo + Next.js + Supabase projects, and later can open a GitHub PR and apply branch protections.

## What you must give Cursor
You need to give Cursor three things:
1) Product spec (what it does, what it does not do)
2) Technical spec (stack, architecture, data model, APIs)
3) Quality gates (tests, lint, typecheck, CI, release checks)

If you do not provide these, Cursor will fill gaps with guesses.

## 1) Product spec you should paste into Cursor
- Build a web platform called Guardrails (working name)
- Users can create a Project Config with:
  - projectType: expo-eas | nextjs
  - packageManager: npm
  - backend: supabase
  - strictnessPreset: startup | pro | enterprise
  - testingLevel: none | unit | unit-e2e
  - validation: zodOnBoundaries true|false
  - telemetry: sentry true|false
  - analytics: none | mixpanel | posthog
- The platform generates an Output Bundle containing:
  - file tree with all generated files
  - a zip download
  - a human readable install checklist
- It must be deterministic:
  - same inputs produce identical outputs
- v1 does not modify GitHub settings
- v2 adds GitHub OAuth and opens a PR adding the pack
- v3 adds GitHub App capability to apply branch protections

Non-goals for v1
- No “auto fix their code”
- No repo scanning
- No policy marketplace

Acceptance criteria for v1
- User can create a Project Config in UI
- User can click Generate
- User can download zip
- Zip includes CI workflow + lint/typecheck/test scripts + templates for expo and next
- Generated CI passes on a fresh repo created from the template (smoke verified locally)

## 2) Technical spec (recommended)
### Stack
- Next.js (App Router)
- TypeScript strict
- Tailwind
- Supabase Auth + Postgres
- Prisma (optional) or Supabase direct (recommended: Supabase direct for v1)
- Zip generation on server via Node

### Pages
- /login
- /dashboard
- /projects
- /projects/new
- /projects/[id]
  - config editor
  - generate button
  - output history

### Data model (Supabase)
Tables
- projects
  - id uuid pk
  - user_id uuid
  - name text
  - config jsonb
  - created_at timestamptz
- outputs
  - id uuid pk
  - project_id uuid
  - user_id uuid
  - config_hash text
  - manifest jsonb (file list, checksums)
  - zip_path text (Supabase storage path)
  - created_at timestamptz

RLS
- user can read/write only their own rows

Storage
- bucket: outputs
- store generated zips

### Backend modules
- /src/lib/policy
  - policy schema validation (Zod)
  - preset merging
- /src/lib/templates
  - expo template
  - next template
- /src/lib/generator
  - render files
  - create manifest
  - zip
- /src/app/api/generate
  - validates config
  - generates bundle
  - uploads zip to storage
  - writes output row

### Policy system
- One internal canonical schema
- Presets stored as JSON
- Merge order
  - base policy
  - preset policy
  - user overrides
- Templates read policy values to decide files and content

## 3) Standards Pack contents (what the generator emits)
### Always emitted
- /policies/quality.yml
- /docs/engineering/standards.md
- /.github/workflows/ci.yml
- /.github/pull_request_template.md
- /.cursor/rules.md
- /scripts/verify.sh (cross platform option below)
- configs
  - .prettierrc
  - .prettierignore
  - .eslintrc.cjs
  - tsconfig.strict.json (or tsconfig adjustments)
- testing setup
  - jest.config.js
  - tests/unit/smoke.test.ts

### Next.js pack extras
- package.json scripts include next build
- next lint config

### Expo pack extras
- scripts for expo typecheck
- optional expo prebuild check (off by default)

### Supabase guidance emitted
- env policy doc snippet
- typed database types generation snippet

## Quality gates for building this SaaS itself
### Local dev gates
- format: prettier
- lint: eslint
- typecheck: tsc
- test: jest

### CI gates (GitHub Actions)
- npm ci
- lint
- typecheck
- test
- next build

### Minimal test plan
- Unit tests
  - policy merge produces expected output
  - generator writes expected file set
  - manifest hash deterministic
- Integration test
  - API /generate returns output and zip link
- Smoke test
  - download zip, verify it contains required files

## What I can give you (to paste into Cursor)
### A) Repo scaffold prompt (one-time)
- Create a Next.js App Router project
- Configure Supabase auth
- Add DB schema, RLS policies
- Implement generator pipeline
- Implement zip download
- Implement templates for expo and next

### B) The policy schema and presets
- Zod schema for ProjectConfig and Policy
- base policy
- presets: startup, pro, enterprise

### C) The templates
- expo template file set + CI yaml + configs
- next template file set + CI yaml + configs

### D) The verification workflow
- verify commands the SaaS runs on itself
- how to validate generated packs locally

## Cursor prompts that work (copy/paste)
### Prompt 1: scaffold
You are a senior full-stack engineer responsible for production-quality code. Build the Guardrails Generator SaaS using Next.js App Router + TypeScript strict + Tailwind + Supabase Auth + Supabase Postgres + Supabase Storage. Implement the pages, tables, RLS, and the /api/generate endpoint. Do not generate mock code or placeholder logic. Return real working code. Tasks
- create schema.sql and RLS policies
- implement Supabase client utilities
- implement auth flows
- implement Project CRUD UI
- implement generator pipeline and zip output
- implement outputs history
- add tests for policy merge and deterministic generation
- add GitHub Actions CI

### Prompt 2: implement generator
You are a senior full-stack engineer responsible for production-quality code. Implement a deterministic file generator that takes ProjectConfig, merges a policy preset, renders template files, produces a manifest with sha256 per file, zips output, and uploads to Supabase Storage. Tasks
- define Zod schemas
- implement merge logic
- implement template renderer
- implement manifest + hashing
- implement zip creation
- implement upload and DB write
- add unit tests for determinism

### Prompt 3: add templates
You are a senior full-stack engineer responsible for production-quality code. Add two template packs: expo-eas and nextjs. Each must include eslint+prettier+typescript strict+jest and a GitHub Actions workflow that runs lint, typecheck, tests, and build (next only). Tasks
- implement template folder structure
- generate package.json scripts
- generate ci.yml
- generate cursor rules
- include docs/standards

## How you ensure it is built correctly
### Enforcement
- CI required checks on main
- No merge if lint/typecheck/test/build fails

### Determinism checks
- same config => same manifest hash
- unit test asserts stable output hashes

### Generated pack validation
- create a fresh test repo
- apply generated zip
- run npm ci then npm run lint typecheck test (and build for next)

## Cross-platform note (Windows)
Prefer node scripts over bash.
- Provide /scripts/verify.mjs that runs the checks via child_process.

## Alt Options
- Use a monorepo (Turborepo) so the generator and template test fixtures live together and share configs
- Use Biome instead of ESLint + Prettier for simpler config and faster CI, but less RN-specific lint rule ecosystem
- Use Prisma for the SaaS DB layer if you prefer migrations and type safety, but Supabase direct is simpler for v1



## Add billing and analytics integrations without hardcoding providers
### Principle
Treat billing and analytics as pluggable modules. The generator should emit provider-specific files only when the user selects them.

### Billing module design
- billingProvider: none | revenuecat | stripe | other
- For apps
  - revenuecat option emits
    - Purchases install steps
    - example purchase service wrapper
    - env var placeholders
    - minimal unit tests for wrapper
  - stripe option emits
    - stripe sdk install via expo install when applicable
    - payment intent flow wrapper (client + server placeholders for Next API)
    - explicit rule: secrets stay server-side
- For web
  - stripe option emits
    - server-side stripe SDK usage
    - webhook handler scaffolding

Note
- v1 can generate integration scaffolding and docs without forcing users into one provider.

### Analytics module design
- analyticsProvider: none | amplitude | mixpanel | posthog
- Emit
  - a typed event wrapper
  - an event name registry
  - optional schema enforcement (Amplitude Ampli style is an upgrade path)

## Why include Amplitude
Include it as a first-class option.
- It is widely used for product analytics
- It has defined compatibility expectations for its RN SDK
- Many teams want Amplitude specifically

## Keeping the generated stack current and compatible
### Problem
AI suggestions drift. You want the generator to resolve versions from sources of truth.

### Solution
Add a Version Resolver module that:
- uses official installers when available
  - Expo: use expo install for SDK-mapped versions
- otherwise resolves latest stable versions from npm registry
- pins ranges conservatively
  - caret ranges for patch/minor within a major
  - major upgrades are opt-in via preset

Version policy
- presets define upgrade posture
  - startup: latest stable minor, allow patches automatically
  - pro: pin to a stable minor, patch upgrades automatic
  - enterprise: pinned, upgrades on schedule

### Maintenance automation
- A nightly CI job in the SaaS repo that
  - checks template dependencies
  - opens a PR when new stable versions are available
- Use Renovate or Dependabot on the SaaS repo to keep the generator up to date

### Compatibility rules
- Expo specific
  - always prefer expo install for native modules that Expo maps (example: Stripe)
- RevenueCat
  - enforce minimum supported RN version rule and document it
- Next.js
  - include security update guidance in standards docs and enforce upgrades when critical



## What you are still missing (to avoid rewriting templates)

### 1) Plugin system (the real escape hatch)
If you do not design a plugin architecture, every new provider becomes a template fork.

Design
- core generator produces a base pack
- plugins contribute:
  - additional files
  - package.json deps and scripts
  - env vars
  - docs snippets
  - CI steps
- plugins are composable and ordered

Implementation
- define a Plugin interface
  - id, version
  - apply(config, context) => mutations
- context includes:
  - file map
  - deps map
  - scripts map
  - docs sections
  - ci steps

Examples
- billing/revenuecat
- billing/stripe
- analytics/amplitude
- backend/supabase
- observability/sentry
- featureflags/posthog

### 2) Policy versioning and migrations
You need to evolve policies without breaking older projects.

Add
- policyVersion in every output bundle
- changelog per policy version
- migration scripts that can update an older generated pack

### 3) Deterministic templating and reproducible builds
Determinism cannot be “best effort”. It must be enforced.

Add
- stable file ordering
- stable JSON serialization
- normalized line endings (LF) inside zip
- a manifest with:
  - sha256 per file
  - generator version
  - policy version
  - template versions

### 4) Template validation harness
Without automated validation, templates rot.

Add a harness repo inside the SaaS
- fixtures/
  - expo-min
  - next-min
- tests that:
  - apply generated output
  - run npm ci
  - run lint, typecheck, test, build

Run this in CI nightly.

### 5) Upgrade posture presets
Users want “stable” but definition varies.

Presets
- startup
  - latest stable minor, allow patches
- pro
  - pin minor, allow patches
- enterprise
  - pinned, upgrades via scheduled PRs

This applies to:
- generator itself
- emitted dependencies

### 6) Secrets and environment policy enforcement
Docs are not enough.

Add
- env allowlist
- .env.example generation
- CI step that fails if a secret-like key appears in client bundles or source
- clear separation between public and server env vars

### 7) CI as a pipeline builder (not one yaml)
Hardcoding a single ci.yml will not scale.

Model CI as steps contributed by plugins
- base steps: install, lint, typecheck, test
- next plugin adds: build
- stripe plugin adds: webhook test scaffold optional

### 8) Repo operations mode
You need two delivery modes.

- zip mode (v1)
- GitHub PR mode (v2)
  - creates branch
  - commits generated files
  - opens PR
  - posts checklist

Later
- enforcement mode (v3)
  - apply branch protections

### 9) Templates vs patchers
Long term, users want to apply packs to existing repos.

Add a patcher engine
- detects existing files
- merges safely
- never overwrites without a diff report

Start with
- additive only
- then controlled overwrites

### 10) Observability for the generator
If generation fails, you need diagnostics.

Add
- structured logs
- trace id per generation
- store errors in outputs table
- admin view for failures

### 11) Security model for the SaaS
Minimum
- Supabase RLS correct
- rate limiting on generate endpoint
- storage access scoped to user
- input validation on all configs

### 12) Documentation output that users actually follow
Most people ignore long docs.

Emit
- a 1-page install checklist
- a verify script
- a release checklist
- PR checklist

### 13) Support for monorepos and shared configs
Many serious users will ask.

Plan
- v1: single repo
- v2: turborepo mode
  - shared eslint/prettier/tsconfig/test packages

### 14) Contract-first boundaries
You will get better outcomes if generated code forces boundaries.

Emit patterns
- typed API client wrappers
- Zod parse at boundaries
- never let UI consume raw JSON

### 15) Backwards compatibility for generated packs
Users will generate packs months apart.

Add
- lock generator version per output
- allow regeneration using the same generator version for reproducibility

## Practical “do not rewrite templates” rules
- never fork templates per provider
- providers are plugins
- policies are data
- templates are thin renderers
- validation harness is mandatory

## Alt Options
- Build a CLI first (same engine) and add the web UI later. This proves the core generator fast.
- Use a monorepo from day one to keep generator, templates, and harness together.
- Offer an “opinionated default pack” only, then add plugins gradually as paid add-ons.

