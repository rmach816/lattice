# Guardrails Generator – Architecture

## High-Level Design

CLI-first architecture with a reusable generator engine. Any future UI or SaaS calls the same engine.

Core principle: standards are compiled into enforceable repo artifacts. Documentation describes intent, CI enforces behavior.

## Monorepo Structure

* packages/engine

  * core generator logic
  * policy system (schema, presets, merges)
  * plugin system (composable modules)
  * deterministic rendering
  * version resolution (offline rules)
  * diff and patch planning (apply/patcher logic, no filesystem)
* packages/cli

  * command-line wrapper
  * filesystem operations
  * prompts and config creation
  * apply and verification runners
* packages/harness

  * fixture repos
  * automated validation that generated packs work
  * determinism tests across OS and Node versions

## Engine Responsibilities

The engine is pure and hermetic.

* Validate ProjectConfig against a Zod schema
* Resolve policy

  * base policy
  * preset policy
  * user overrides
* Resolve versions according to preset posture and offline compatibility rules
* Load and execute plugins in deterministic order
* Produce a FileMap (path -> bytes)
* Produce a Manifest

  * generatorVersion
  * policyVersion
  * plugin versions
  * config hash
  * sha256 per file
  * version resolution output (dependency map)
* Produce an optional zip buffer using deterministic zip rules
* Produce an ApplyPlan

  * additive file creates
  * conflicts and required confirmations
  * diff summary metadata

Hard constraints

* engine must not touch disk
* engine must not touch network
* engine must not read environment variables directly

## CLI Responsibilities

* Collect config via flags or prompts
* Read and write repo files
* Generate and persist .guardrails/config.json
* Apply an ApplyPlan to a working directory

  * v1 supports additive-only
  * v2 adds diff preview and limited overwrite with explicit confirmation
* Run verify commands and print results
* Provide doctor checks (node, npm, git status)

## Command Surface

* guardrails init

  * create .guardrails/config.json from flags or prompts
* guardrails generate

  * emit a folder or zip plus manifest
* guardrails apply

  * apply generated pack using an ApplyPlan
* guardrails verify

  * run required checks from the policy
* guardrails doctor

  * sanity checks for environment prerequisites

## Plugin System

Plugins extend the base pack without forking templates.

### Goals

* avoid template sprawl
* isolate provider logic behind stable contracts
* keep CI, docs, and deps composed from modules

### Plugin Interface (Authoritative)

```ts
export type PluginId = string;

export type PluginPhase =
  | "pre"          // runs before templates render
  | "render"       // can add or modify files
  | "post"         // can add checks, docs, verify steps
  | "ci";          // contributes CI steps and required checks

export type ConflictPolicy = "error" | "last-wins";

export interface Plugin {
  id: PluginId;
  version: string;
  dependencies?: PluginId[];

  appliesTo(config: ProjectConfig): boolean;

  phase?: PluginPhase; // default: render
  conflictPolicy?: ConflictPolicy; // default: error

  apply(ctx: GeneratorContext): void;

  validate?(ctx: GeneratorContext): ValidationResult;
}
```

### Deterministic Execution Order

1. Filter: appliesTo(config)
2. Resolve dependency graph (toposort)

   * unknown dependency is a hard error
   * dependency cycles are a hard error
3. Stable ordering among independent plugins: sort by plugin id
4. Phase ordering: pre -> render -> post -> ci

### Conflict Rules

Conflicts are surfaced early and deterministically.

* File writes

  * default: if two plugins write the same path, hard error
  * optional: a plugin may declare last-wins, but this must be rare and justified
* Dependency and script mutations

  * conflicts resolved by policy
  * different versions of same dependency are a hard error unless a resolver rule exists
* CI steps

  * steps must have stable IDs
  * duplicate IDs are a hard error

### Plugin Testing Harness

* Each plugin must have unit tests that validate:

  * generated file set
  * deterministic output
  * apply plan behavior
* Harness runs plugin selection combinations for:

  * expo-min
  * next-min

### Core Plugins

* stack/expo-eas
* stack/nextjs
* backend/supabase
* billing/revenuecat
* billing/stripe
* analytics/amplitude
* analytics/mixpanel
* analytics/posthog
* observability/sentry

## Policy System

Policies are data, not templates.

* base policy defines defaults
* presets define posture

  * gates
  * version pinning rules
  * required boundary validation
  * required docs and checklists
* user overrides allow limited customization within allowed ranges

Policy output must compile into:

* required npm scripts
* required CI checks
* required docs sections
* forbidden patterns checks (as CI steps)

## Version Resolution

Version resolution is a deterministic, offline module.

* Inputs

  * projectType
  * selected plugins
  * strictnessPreset
  * known compatibility rules shipped with the generator
* Outputs

  * dependency map with pinned ranges according to preset posture
  * warnings and hard errors for incompatible combinations

Compatibility rules include:

* minimum Node versions
* Expo SDK constraints
* provider SDK constraints (example: RevenueCat React Native minimums)

Network-based resolution is out of scope for the engine.

## Deterministic Output Rules

* stable iteration order for all maps
* normalized LF line endings in text files
* stable JSON serialization with sorted keys
* no timestamps, UUIDs, or random values
* deterministic zip creation

  * stable file ordering
  * fixed metadata

## Patcher and Apply Strategy

* v1

  * additive-only
  * conflict report when a target path already exists
* v2

  * diff preview
  * limited overwrites behind explicit confirmation
  * rollback instructions for safe recovery
* future

  * migrations by policyVersion
  * selective adoption for updates

The engine produces an ApplyPlan. The CLI performs the filesystem actions.

## Template Validation Harness

* fixtures

  * expo-min
  * next-min
* per fixture

  * apply generated pack
  * npm ci
  * npm run lint
  * npm run typecheck
  * npm test
  * npm run build (next only)
* schedules

  * run on every change
  * run nightly to catch dependency drift

## Delivery Modes

* v1: zip and folder output
* v2: GitHub PR creation (optional OAuth)
* v3: enforcement automation (GitHub App)

  * progressive permission model
  * always provide manual fallback instructions

## Windows Compatibility

* avoid bash-only scripts
* provide Node-based verify scripts where possible
* ensure verify commands run on Windows in harness CI

## Upgrade Strategy

* presets define upgrade posture
* policyVersion is explicit and changelogged
* generator releases are versioned
* older outputs must remain reproducible using pinned versions
