# Guardrails Generator – Quality Gates

## Purpose

Ensure both the generator and generated output meet professional engineering standards without manual policing.

Principle: rules that are not checkable will be ignored. Every important standard must map to an automated gate.

## A. Generator Quality Gates

### A1. Local Development Gates

Required before commit:

* format
* lint
* typecheck
* unit tests

### A2. CI Gates

Required before merge:

* npm ci
* lint
* typecheck
* test
* build

No merge if any check fails.

### A3. Determinism Gates

Hard failures if any source of entropy exists.

* no timestamps, UUIDs, random values
* stable file ordering
* stable JSON serialization with sorted keys
* normalized LF line endings in generated files
* deterministic zip output

  * stable file order
  * fixed metadata
* hermetic generation

  * no filesystem access
  * no network calls

Required tests:

* determinism test

  * same config and versions must produce identical file hashes and zip hash
* golden fixtures

  * expected file list and hashes for sample configs

### A4. Plugin System Gates

* dependency graph resolution tests

  * unknown dependency fails
  * cycles fail
* execution order is deterministic
* conflict detection tests

  * file path collisions default to hard error
  * any last-wins exceptions must be explicitly tested
* plugin validation tests

  * validate hooks must run and can block generation

### A5. Windows Compatibility Gates

* harness CI must run verification on Windows
* verify scripts must not require bash
* prefer Node-based scripts where possible

## B. Generated Pack Quality Gates

### B1. Required Checks (by preset)

Startup preset:

* lint
* typecheck

Pro preset:

* lint
* typecheck
* unit tests
* build (Next.js)

Enterprise preset:

* all Pro checks
* E2E (where applicable)
* security scanning
* dependency audit

### B2. CI Enforcement Gates

* GitHub Actions workflow is generated
* required checks match preset
* branch protection instructions are generated

### B3. Boundary Safety Gates

* runtime validation at all boundaries

  * API responses
  * storage reads
  * navigation params
* UI must not consume raw JSON

Gate implementation examples:

* unit tests for validation helpers
* example boundary tests that fail on invalid payloads

### B4. Secrets and Environment Policy Gates

* .env.example is emitted
* env allowlist is emitted
* CI checks fail if secret-like keys are referenced in client code
* clear separation between public and server-only env vars

### B5. Apply and Patcher Safety Gates

v1 apply behavior:

* additive-only
* if a target path exists, report conflict and do not overwrite

v2 apply behavior:

* diff preview required before any overwrite
* overwrites require explicit confirmation
* rollback guidance must be generated

## C. Validation Harness Gates

Harness exists to prevent template rot.

### C1. Fixtures

* fixtures/expo-min
* fixtures/next-min

### C2. Harness Flow

For each fixture:

* apply generated pack
* npm ci
* npm run lint
* npm run typecheck
* npm test
* npm run build (next only)

### C3. Schedules

* run on every change (PR)
* run nightly to detect drift

## D. Observability Gates (Generator)

* structured logs for every run
* stable trace id per run
* errors captured and surfaced

For SaaS later:

* store generation outcomes and failures
* basic usage metrics to detect drop-offs and high failure rates

## E. Release Discipline Gates

* main branch always green
* no direct commits to main
* release checklist is part of the generated pack
* PR template includes required verification checkboxes
