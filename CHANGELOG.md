# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2025-12-24

### Engine
- Added deterministic versioning header to `.cursor/rules.md` files
- Header includes `latticeVersion`, `stack`, `policyVersion`, and `configHash` for traceability
- Ensures rules files are fully deterministic and traceable to generator version and configuration

### Harness
- Added verification to assert versioning header fields in generated rules files
- Verifies `latticeVersion`, `stack`, `policyVersion`, and `configHash` are present and correct

## [0.1.1] - 2025-12-23

### Engine
- Made Cursor rules stack-specific: Next.js plugin generates Next.js-tailored rules, Expo EAS plugin generates Expo/EAS-tailored rules
- Rules include stack-specific guidelines for file structure, verification commands, and best practices

### Harness
- Added verification to assert Cursor rules content differs between fixtures
- Ensures stack-specific rules are correctly generated for each project type

## [0.1.0] - 2025-12-23

### Engine
- Implemented deterministic generator core with plugin system, policy system, and Zod-based config validation
- Added deterministic renderer that produces stable file maps and manifests with SHA-256 hashes
- Implemented plugin dependency graph resolution with cycle detection and conflict handling
- Added support for Next.js and Expo EAS stack plugins

### Harness
- Created automated validation system that generates packs and verifies they pass lint, typecheck, test, and build
- Added fixture-based testing with next-min and expo-min fixtures
- Implemented machine-readable scorecard output with detailed command results and timing
- Added CI workflow that runs on PRs, pushes to main, and nightly schedules

### CLI
- Implemented `lattice generate` command to create packs with manifest output
- Implemented `lattice apply` command for additive-only file application
- Added path safety checks to prevent traversal and absolute path issues

### Scorecard
- Added JSON scorecard output at `.lattice/scorecard.json` with fixture results, command status, and metadata
- Integrated scorecard artifact upload in CI workflows
- Added support for preserving failing fixtures as CI artifacts

[Unreleased]: https://github.com/rmach816/lattice/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/rmach816/lattice/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/rmach816/lattice/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/rmach816/lattice/releases/tag/v0.1.0

