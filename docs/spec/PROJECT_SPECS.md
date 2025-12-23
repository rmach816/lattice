# Guardrails Generator – Project Specification

## 1. Purpose and Problem Statement

AI-assisted development drifts over time. Rules communicated through conversation or documentation are gradually ignored, misinterpreted, or replaced with outdated best practices.

This project exists to solve the enforcement gap.

Guardrails Generator converts intent, standards, and engineering discipline into machine-enforced constraints. The output is designed to make AI coding tools behave like a disciplined senior engineering team by enforcing gates in tooling and CI.

## 2. Product Goal

Build a CLI-first, deterministic generator that produces a repo-ready Standards Pack.

The Standards Pack enforces:

* correctness
* safety
* maintainability
* consistency
* upgrade discipline

Enforcement is through tooling and CI, not reminders.

A future web UI is a delivery mechanism. The engine is the source of truth.

## 3. Target Users

* solo developers using AI coding tools
* founders shipping production apps without senior review
* small teams that want consistent standards across multiple repos

Product progression

* start individual (CLI, zip)
* graduate to teams (GitHub PR mode, org policy packs)

## 4. Supported Project Types (v1)

* Expo + EAS mobile applications (managed workflow)
* Next.js web applications (App Router)

## 5. Supported Constraints (v1)

These constraints are intentional.

* Windows-first
* npm only
* TypeScript only
* GitHub-hosted repositories
* Supabase as the backend platform

## 6. Core Capabilities

The system must:

* accept a structured ProjectConfig
* select a strictness preset
* compose provider functionality through plugins
* generate a complete Standards Pack
* emit a folder or zip output
* be fully deterministic
* emit a manifest describing what was generated
* produce an ApplyPlan (even if v1 is additive-only)

## 7. Explicit Non-Goals (v1)

Out of scope:

* automatic fixing of user application logic
* refactoring existing codebases
* destructive overwrites of existing files
* automatic GitHub permission or branch protection changes
* community or third-party plugin marketplaces
* network-based dependency resolution inside the engine

## 8. Required Standards Pack Contents

Every generated pack must include:

Enforcement

* GitHub Actions workflow enforcing required checks
* verify scripts that run on Windows
* branch protection setup checklist

Tooling

* formatting configuration
* linting configuration
* TypeScript strict configuration
* minimal unit test scaffolding

Runtime safety

* boundary validation pattern templates
* explicit rule: UI never consumes unvalidated JSON

AI alignment

* Cursor rules that enforce workflow discipline

  * no implementation without a plan
  * PR-sized changes
  * mandatory verification commands
  * no bypassing gates

Docs

* install checklist (one page)
* verification checklist
* release checklist
* short explanations for why key rules exist

## 9. Configuration Inputs

ProjectConfig fields (v1):

* projectType: expo-eas | nextjs
* backend: supabase
* packageManager: npm
* strictnessPreset: startup | pro | enterprise
* testingLevel: none | unit | unit-e2e
* billingProvider: none | revenuecat | stripe
* analyticsProvider: none | amplitude | mixpanel | posthog
* observability: none | sentry

## 10. Preset Definitions (Concrete)

Presets define:

* required CI checks
* version pinning posture
* required runtime boundary validation
* required docs and process controls

### Startup

Goal: speed with basic safety.

* required checks

  * lint
  * typecheck
* tests

  * optional
* build

  * optional
* version posture

  * latest stable within major

### Pro

Goal: production quality with sustainable velocity.

* required checks

  * lint
  * typecheck
  * unit tests
  * build (Next.js)
* runtime safety

  * boundary validation required
* version posture

  * pinned minor versions
  * patch upgrades allowed

### Enterprise

Goal: maximum safety and predictability.

* required checks

  * all Pro checks
  * E2E tests (when applicable)
  * security scanning
  * dependency audit
* process

  * CODEOWNERS required
  * audit trail requirements
* version posture

  * fully pinned
  * scheduled, reviewed upgrades

## 11. Determinism Requirements

Determinism is a hard requirement.

* stable file ordering
* stable JSON serialization with sorted keys
* normalized LF line endings
* no timestamps
* no UUIDs
* no random values
* no network calls during render

Manifest must include sha256 for every output file.

## 12. Versioning, Migrations, and Update Story

Outputs must be updatable without rewriting repos.

* every output records

  * generatorVersion
  * policyVersion
  * plugin versions
  * config hash
* policy versions have a changelog
* future update modes

  * diff view between policy versions
  * selective adoption of changes
  * migrations for known transforms

## 13. Patcher and Apply Strategy

Most users have existing repos.

* v1

  * additive-only apply
  * conflict reporting for existing paths
* v2

  * diff preview
  * controlled overwrites behind explicit confirmation
  * rollback guidance

A full smart merge engine is explicitly deferred.

## 14. Version Resolver Requirements

The engine uses an offline version resolver that enforces compatibility.

* validate Node minimums
* validate Expo SDK constraints
* validate plugin compatibility constraints
* fail generation on incompatible combinations
* record resolved dependency map in the manifest

Network-based resolution is out of scope for the engine.

## 15. Cost Model and Abuse Prevention (SaaS, future)

CLI does not require strong abuse controls.

For a hosted UI later:

* caching by config hash (identical config serves cached output)
* generation quotas per tier
* storage quotas and cleanup policies
* rate limiting on generation endpoints

## 16. GitHub Integration and Trust Model (future)

* v2: OAuth PR creation
* v3: GitHub App for enforcement automation

Trust requirements:

* progressive permission model
* explicit explanation of requested permissions and why
* always provide a manual fallback guide

## 17. Acceptance Criteria (v1)

* user can generate a pack from a valid config
* output is deterministic for identical inputs
* generated pack installs cleanly on fresh repos
* harness validates expo-min and next-min continuously
* verify commands run successfully on Windows
* no undocumented side effects

## 18. Positioning

Differentiator is enforcement and measurable quality improvement.

This is not a template library.
This is not a linter-as-a-service.

This is AI-aligned enforcement that compiles standards into gates and makes them hard to bypass.
