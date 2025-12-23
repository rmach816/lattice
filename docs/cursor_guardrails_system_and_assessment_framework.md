## What you are doing now
- You are using Cursor as a junior developer that you manage with rules
- You are compensating for two gaps: inconsistent instruction-following and lack of continuous verification
- The missing piece is enforcement: rules that are automatically checked, not repeatedly re-explained

## Honest assessment of the approach
### What is strong
- You are thinking like an engineering lead: standards, repeatability, defect prevention
- You are trying to close the loop from critique to concrete remediation
- You are trying to convert “AI output” into “production-quality” by adding process

### What is weak
- You are relying on a conversational reminder loop instead of automated enforcement
- You are asking for a grade without a deterministic rubric and measurable gates
- You are not separating:
  - Requirements quality (what should be built)
  - Implementation quality (how it is built)
  - Verification quality (how you prove it is correct)

Net: the intent is correct. The mechanism is inefficient and will always drift.

## The correct way to grade an app
You cannot credibly grade code quality without at least:
- repo access or a representative code sample
- test coverage and test results
- production telemetry signals (crash-free sessions, error rates)
- CI status, lint status, typecheck status

If you want a real grade, use this rubric and require evidence for each item.

## App Quality Rubric
### A. Correctness and Reliability
- Type safety: strict mode, no unsafe casts, no ignored type errors
- Input validation: every boundary validates data (API responses, storage reads, navigation params)
- Error handling: errors are handled at the right layer with user-safe messaging
- Idempotency: retries do not duplicate writes
- Offline behavior: predictable behavior when network is absent or flaky

Grade gates
- 0 unhandled promise rejections in testing
- 0 runtime type errors from undefined access in Sentry for 7 days
- All network calls have timeouts and retry policy

### B. Security and Privacy
- Secrets management: no keys in client code
- Auth: token storage and refresh done correctly
- PII handling: no PII in logs, analytics events, or crash reports
- Permissions: minimum required, correct messaging

Grade gates
- Audit of logs and analytics payloads shows no PII
- Storage is appropriate for sensitivity (SecureStore vs AsyncStorage)

### C. Architecture and Maintainability
- Clear module boundaries (features, services, shared)
- One-way dependency graph
- No God components
- Consistent state management approach

Grade gates
- Circular deps: none
- Largest UI component under agreed threshold unless justified

### D. Performance
- Startup time
- Render performance (no unnecessary re-renders)
- Image and list optimization
- Memory usage

Grade gates
- Perf traces show acceptable TTI and screen transitions

### E. Testing and Verification
- Unit tests for pure logic
- Integration tests for critical flows
- E2E tests for core user journey
- Smoke test suite for release

Grade gates
- Coverage target by layer (logic higher, UI lower)
- Release blocked if smoke tests fail

### F. Observability
- Sentry: errors, breadcrumbs, release tracking
- Analytics: funnel, key events, revenue events
- Logging: structured, redaction

Grade gates
- Every critical flow has:
  - start event
  - success event
  - failure event
  - metadata for diagnosis

### G. DX and Process
- CI: lint, typecheck, test, build
- Pre-commit hooks
- Code review checklist
- Release checklist

Grade gates
- Main branch is always green
- No direct commits to main

## How to get a real grade quickly
### 30 minute audit inputs (minimum)
- tsconfig.json
- eslint config
- package.json
- app entry (App.tsx / layout)
- one example feature folder
- network layer code
- storage layer code
- navigation setup
- any existing tests
- a recent Sentry issue list

With that, a real grade per category is possible.

## The better way to do “rules” so they are always followed
### 1. Convert rules into automated gates
Rules that are not checkable will be ignored.

Implementation map
- Formatting: Prettier
- Style correctness: ESLint with strict rules
- Type correctness: TypeScript strict + noEmit CI gate
- Runtime correctness: Zod schemas on boundaries
- Testing: jest + detox/playwright as needed
- Security: secret scanning + dependency audit

### 2. One global standards pack plus small per-project deltas
Instead of rewriting rules per project, keep:
- Standard Pack (always)
- Project Pack (only what is unique)

Standard Pack contents
- Folder structure convention
- Error handling contract
- Logging and analytics conventions
- Naming conventions
- State management conventions
- Test strategy by layer
- Release checklist

### 3. Make Cursor consume a single authoritative file
You want one file that is always referenced, not retyped.

Suggested structure (repo)
- /docs/engineering/standards.md
- /docs/engineering/checklists/
  - pr-checklist.md
  - release-checklist.md
- /.cursorrules (or Cursor rules file)
- /.github/workflows/ci.yml

### 4. Add an AI “self-check” step that must pass before code is accepted
This is not a chat step. It is a scriptable step.

Example checks
- static: lint + typecheck
- dynamic: unit tests
- contract: schema validation tests
- regression: smoke tests

## Your current Cursor prompt pattern
### What to keep
- Ask for grading with a rubric
- Ask for category-specific todo lists

### What to change
- You should not ask it to “begin implementation” until the repo is green and gated
- You should require:
  - a patch plan
  - explicit file list
  - small PR-sized changes
  - verification steps after each change

## Your new workflow
### Step 1: Establish gates
- Add CI: lint, typecheck, test
- Add pre-commit: lint-staged
- Make build fail on warnings you care about

### Step 2: Establish boundaries
- Network layer returns typed results only
- Storage layer validates and migrates
- UI never touches raw API payloads

### Step 3: Iterate by feature
For each feature
- write acceptance criteria
- add tests
- implement
- verify metrics

## Product opportunity: the thing people would pay for
You are describing “AI output enforcement and consistency”. That is real.

### Who pays
- small teams using Cursor and similar IDE agents
- founders shipping apps without senior review
- agencies who want consistent standards across projects

### What they want
- standard packs
- automated gates
- repo scaffolding
- guardrail lint rules
- code review checklists
- AI prompts that reference the same authoritative standards

### What to build (MVP)
- A repo bootstrapper
  - generates standards pack
  - installs lint, prettier, tsconfig strict
  - installs CI workflows
  - installs boundary validation patterns
- A “policy engine”
  - defines rules as code
  - runs in CI
  - blocks merges when violated
- Optional
  - dashboard that shows grade by category over time
  - “top failures” heatmap (errors, types, perf, tests)

### Differentiator
- Most tools are either lint-only or documentation-only
- You sell enforcement plus a measurable grade that improves over time

## Alt Options
- Use a monorepo template such as Nx to enforce standardization across projects
- Use Biome instead of ESLint + Prettier for simpler, faster JS/TS lint and format
- Use a hosted CI policy tool (example: GitHub branch protection + required checks) as the enforcement layer

## If you want me to grade one of your apps
Provide
- repo zip or key files list (tsconfig, eslint, network, storage, navigation, one feature)
- Sentry issue export or screenshots
- CI status

Output you will get
- A grade per category with evidence
- A todo list per category to reach A-
- A phased implementation plan broken into PR-sized batches



## System design: make Cursor behave like a senior team

### Objective
Replace repeated “remind Cursor of rules” with enforcement that is automatic, measurable, and hard to bypass.

### Core idea
- Documentation describes intent
- Automation enforces behavior
- Cursor becomes a code-change engine inside guardrails

### Architecture
#### Layer 1: Standards as code (enforceable)
- Formatter and style gate
  - Prettier (or Biome) in CI and pre-commit
- Lint and best-practice gate
  - ESLint ruleset (strict, security, react-native)
- Type correctness gate
  - TypeScript strict, no emit, no suppressed errors
- Boundary validation gate
  - Runtime schemas at boundaries (API responses, AsyncStorage reads, navigation params)
- Test gate
  - Unit tests for logic, integration tests for critical services, at least one E2E happy path
- Dependency safety gate
  - lockfile required, audit, secret scan

#### Layer 2: Workflow enforcement
- Branch protection requiring green checks
- PR template checklist enforced by required status checks
- Small diffs default
- No large regeneration without a plan

#### Layer 3: Cursor operating model
- Cursor never free-forms
- Every change is a small PR-sized batch
- Each batch includes verification commands to run
- Cursor must report evidence: lint pass, typecheck pass, tests pass

### What to generate per project automatically
- /docs/engineering/standards.md (human readable)
- /policies/quality.yml (machine readable rules)
- /.github/workflows/ci.yml (enforcement)
- /.cursor/rules.md or equivalent (agent constraints)
- PR template and checklists

### Policy format (machine readable)
Define a single policy schema used across projects.
Example sections
- required_checks
- forbidden_patterns
- boundary_validation_required
- testing_minimums
- performance_slos
- logging_redaction

### Autonomous loop (quality feedback)
- CI results update a scorecard
- Scorecard produces top 10 violations by frequency
- Cursor is instructed to fix only the top 1-2 issues per iteration
- Repeat until score meets threshold

### Team simulation
Add roles with explicit responsibilities and handoffs.
- Architect role: approves structural changes and ADR triggers
- Implementer role: writes code and tests
- Reviewer role: runs checklist and rejects if gates fail
- Release role: verifies build, smoke tests, changelog

Cursor prompt template can simulate these roles, but gates remain the real enforcement.

### Practical rollout plan
Phase 1
- Add lint, typecheck, unit tests to CI and make them required
- Add pre-commit hooks
Phase 2
- Add boundary validation and error contracts
- Add E2E happy path
Phase 3
- Add performance checks and dependency scanning
- Add scorecard

### What you should stop doing
- Stop asking Cursor for a “grade” before evidence exists
- Stop starting implementation before gates are installed
- Stop maintaining per-project long rule lists without machine checks

### What you should do instead
- Maintain one Standards Pack that is enforced by CI
- Keep per-project deltas small
- Require evidence on every change



## Your setup assumptions (based on what you said)
- GitHub for everything
- Mobile apps: Expo + EAS
- Web: Next.js
- Current state: no unit tests

## What unit tests are and why you need them
- Unit tests verify small pieces of logic in isolation (pure functions, parsing, validation, reducers, business rules)
- They catch regressions fast, run in seconds, and are the lowest-effort way to raise code quality
- Without unit tests, your only safety net is manual testing plus Sentry after release

Minimum viable testing for your typical projects
- Mobile and web
  - Unit tests: Jest + Testing Library where needed
  - Focus on services and utilities first, not UI
- App only
  - Later: one E2E happy path (Detox) once the funnel stabilizes

## Your SaaS idea is correct
A UI that asks what you are building and generates a complete, enforced standards pack is exactly the right product shape.

The key is that it must generate enforcement, not just documentation.

## SaaS system design
### Product goal
Generate a project-specific standards pack that makes an AI coder behave like a senior team by enforcing quality gates in GitHub.

### Inputs the UI collects
Required
- Project type: Expo app, Next.js web, Node API, monorepo
- Language: TypeScript only or TS + JS
- Package manager: npm, yarn, pnpm
- Repo layout: single app, multi app, monorepo
- Target environment
  - Expo: managed workflow, EAS build profiles
  - Next: app router vs pages router

Optional toggles
- Strictness level: Startup, Pro, Enterprise
- Testing level: none, unit only, unit + integration, unit + E2E
- Validation: Zod at boundaries on or off
- Error reporting: Sentry on or off
- Analytics: provider selection
- Release cadence: weekly, biweekly, monthly

### Outputs the generator produces
Always
- /policies/quality.yml
- /docs/engineering/standards.md
- /.github/workflows/ci.yml
- /.github/pull_request_template.md
- /.github/CODEOWNERS (optional)
- pre-commit setup (husky + lint-staged or lefthook)
- lint, format, typecheck configs

Expo specific
- eas.json recommendations
- app.config checks and environment variable policy
- optional scripts for EAS update hygiene

Next.js specific
- next lint and typecheck wiring
- build and test pipeline
- env variable policy

### The policy engine
You need one shared policy schema that compiles to repo artifacts.

Policy concepts
- required_checks
  - lint
  - typecheck
  - test
  - build
- thresholds
  - coverage floors
  - max bundle size warnings (optional)
- forbidden_patterns
  - console.log in production
  - any, ts-ignore without ticket link
- boundary_validation
  - required for API responses
  - required for storage reads
- security
  - secret scanning on
  - dependency audit on

Implementation approach
- Store templates for each target stack
- Merge templates with policy selections
- Render files into a zip or GitHub PR

### Enforcement layer
The SaaS must help users turn on GitHub protections, otherwise the pack can be bypassed.

Required enforcement settings
- Branch protection on main
- Require status checks to pass
- Require pull request reviews
- Restrict direct pushes to main

The generator can output a checklist and optionally use the GitHub API to apply these settings.

### Cursor integration
Generate a single authoritative agent rules file that is short and operational.
It should instruct Cursor to
- never implement without a plan
- keep changes small
- always add or update tests when touching logic
- always run and report verification commands
- never bypass gates

## MVP feature set
### MVP v1
- UI wizard that collects inputs
- Generates a zip with the standards pack
- Provides copy-paste commands to install and run
- Provides GitHub settings checklist

### MVP v2
- GitHub App integration
  - connect repo
  - open a PR that adds the pack
  - optionally apply branch protection settings

### MVP v3
- Scorecard
  - reads CI results
  - shows grade by category over time
  - shows top recurring failures

## Pricing logic
- Free
  - zip export only
  - one template strictness
- Pro
  - GitHub PR generation
  - multiple templates
  - scorecard
- Team
  - org-wide policy packs
  - enforcement automation
  - policy versioning

## How this looks in practice for you
Your default preset should be
- TypeScript strict
- Biome or Prettier + ESLint
- Jest unit tests required
- Zod boundary validation required
- Sentry recommended
- CI required: lint + typecheck + test + build

## Concrete next deliverable
If you want, I will draft the initial policy schema and the two starter templates
- Expo + EAS template
- Next.js template

They will include
- file tree
- default scripts
- GitHub Actions workflow
- minimum Jest setup
- boundary validation pattern

## Alt Options
- Use Nx as the generator base for monorepo standardization and enforcement across apps and web
- Use Turborepo with shared ESLint, TypeScript, and test packages for a lighter monorepo standards pack
- Use Biome instead of ESLint + Prettier to reduce configuration complexity and speed up CI



## Recommended defaults for your environment (Windows + npm + Supabase)
### Goal
Best-practice, professional enforcement with minimal ongoing maintenance for a novice.

### Defaults I recommend
- Package manager: npm (match what you already use)
- Formatting: Prettier
- Linting: ESLint (configured once, you rarely touch it)
- Type safety: TypeScript strict
- Runtime safety: Zod at boundaries
- Unit tests: Jest
- GitHub enforcement: branch protection + required checks
- Supabase: typed client generation + strict env policy

Why not “no lint tool”
- Without a linter/formatter, your rules cannot be enforced automatically
- The simplest way to keep quality consistent is to let tools fail CI when standards are violated

## Standards Pack v1: exact deliverables
### Repo files added
- /policies/quality.yml
- /docs/engineering/standards.md
- /.github/workflows/ci.yml
- /.github/pull_request_template.md
- /.github/CODEOWNERS (optional)
- /.husky/pre-commit
- lint and format config
  - .eslintrc.cjs
  - .prettierrc
  - .prettierignore
- TypeScript config hardening
  - tsconfig.json adjustments
- Testing setup
  - jest.config.js
  - /tests/unit/ (starter)
- Runtime validation helpers
  - /src/lib/validation/

### Required npm scripts
- lint
- format
- typecheck
- test
- test:watch
- build

## Expo + EAS template specifics
- CI runs
  - npm ci
  - lint
  - typecheck
  - test
- Optional build check
  - keep local build optional at first to avoid CI complexity
  - add EAS build verification later

## Next.js template specifics
- CI runs
  - npm ci
  - lint
  - typecheck
  - test
  - next build

## Supabase specifics
### What to enforce
- Env var policy
  - public keys only in client
  - service role key never in client
- Typed API
  - generate Database types from Supabase
- Data access boundaries
  - all Supabase responses validated at boundary (Zod)

## Cursor rules file (short and enforceable)
Must instruct Cursor to
- keep changes PR-sized
- always add tests when touching logic
- never bypass lint/typecheck/test gates
- always report verification command output

## GitHub enforcement checklist
- Protect main
- Require status checks: lint, typecheck, test, build
- Require PR review
- Block direct pushes to main

## Implementation plan for you (fastest path)
Phase 1
- Add Prettier + ESLint + TypeScript strict + CI
- Add minimal Jest unit test setup
Phase 2
- Add Zod boundary validation patterns
- Add Supabase type generation and env policy
Phase 3
- Add one E2E happy path (optional)
- Add scorecard

## How your SaaS should package this
### User experience
- Choose: Expo or Next.js
- Choose: npm
- Choose: Supabase
- Choose strictness: Pro (default)
- Choose testing: Unit (default)
- Click Generate

### Output options
- Download zip
- Create GitHub PR (next version)
- Apply branch protections (GitHub App)

## Alt Options
- Biome instead of ESLint + Prettier for simpler config and faster CI, but less React Native specific lint coverage
- Turborepo shared-config repo for you (one central standards pack for all apps) so every project inherits the same tooling
- Nx monorepo if you want the strongest enforcement and shared tooling across Expo + Next.js, at the cost of more initial setup

