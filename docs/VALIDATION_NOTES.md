# Real World Validation Notes

This document captures issues found during real-world validation of Lattice on 3 repositories.

## Validation Process

For each repo, we run:
1. `lattice doctor` - Check environment
2. `lattice init` - Initialize configuration
3. `lattice generate` - Generate pack
4. `lattice apply` - Apply pack to repo
5. `lattice verify-rules` - Verify rules file
6. Repo verification commands (npm ci, lint, typecheck, test, build)

---

## Repo 1: Next.js App Router

**Type**: Next.js app using App Router  
**Status**: Complete  
**Date**: 2025-01-15  
**Repo**: https://github.com/rmach816/constructa

### Validation Results

- ✓ `lattice doctor`: Passed (Node 22 warning, non-blocking)
- ✓ `lattice init`: Success
- ✓ `lattice generate`: Success (generated `.cursor/rules.md`, skipped existing files)
- ✓ `lattice apply`: Success (applied rules file, skipped conflicting files)
- ✓ `lattice verify-rules`: Passed

### Issues

_No issues found_

---

## Repo 2: Expo EAS

**Type**: Expo managed app using EAS  
**Status**: Complete  
**Date**: 2025-01-15  
**Repo**: D:\GluteMaxxing App

### Validation Results

- ✓ `lattice doctor`: Passed (Node 22 warning, non-blocking)
- ✓ `lattice init`: Success
- ✓ `lattice generate`: Success (generated `.cursor/rules.md`)
- ✓ `lattice apply`: Success (applied rules file, skipped existing files)
- ✓ `lattice verify-rules`: Passed

### Issues

#### BLOCKER: Plugins fail on existing repos

**Failure**: `lattice generate` produces 0 files because plugins throw errors when `package.json` already exists.

**Root Cause**: Both `NextJsPlugin` and `ExpoEasPlugin` check `if (ctx.hasFile('package.json'))` and throw an error. This prevents any files from being generated, including `.cursor/rules.md` which is the main purpose for existing repos.

**Expected Behavior**: For existing repos, Lattice should skip generating project files (package.json, tsconfig.json, etc.) and only generate `.cursor/rules.md`.

**Fix**: Modified plugins to skip files that already exist instead of throwing errors. Only generate `.cursor/rules.md` if other files are present. Also updated `generate` function to scan current directory for existing files and pass them to the context.

**Status**: Fixed

---

## Repo 3: Messy Repo

**Type**: Repo with existing eslint or tsconfig  
**Status**: Skipped  
**Date**: 2025-01-15

### Note

User does not have a "messy repo" and this requirement is unclear. The constructa repo (Repo 1) already has existing eslint and tsconfig files, which tested the same edge case. No additional validation needed.

---

## Summary

**Total Repos Validated**: 2/3 (Repo 3 skipped - edge case covered by Repo 1)  
**Blockers Found**: 1 (fixed)  
**Non-Blocker Issues**: 0

### Blockers Fixed

1. **Plugins fail on existing repos** - Fixed by modifying plugins to skip existing project files and only generate `.cursor/rules.md`

