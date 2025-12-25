# Lattice Development Workflow

This document explains the development workflow and release process for the Lattice project.

## Development Discipline

### PR-Only Merges

**All changes must go through Pull Requests.** Direct commits to `main` are not allowed.

1. Create a feature branch from `main`
2. Make your changes
3. Create a PR targeting `main`
4. Wait for CI `validate` to pass
5. Merge only after `validate` is green

### CI Gate: `validate`

The `validate` workflow runs on every PR and must pass before merging. It includes:

- **Lint**: Code style checks
- **Typecheck**: TypeScript compilation
- **Test**: Unit tests
- **Harness**: Full fixture validation

If `validate` fails:
1. Review the failing step in the PR checks
2. Fix the issue on the same PR branch
3. Push changes and wait for re-run
4. Do not merge until `validate` is green

### Release Tagging Process

Releases follow a strict process:

1. **Feature PR**: Implement feature, get PR merged
2. **Version Bump PR**: 
   - Create branch `chore/bump-version-X.Y.Z`
   - Update `package.json` version
   - Update `CHANGELOG.md` with release notes
   - Create PR, wait for `validate` to pass, merge
3. **Tag Creation**:
   - On local `main` after version bump merge:
     ```bash
     git checkout main
     git pull
     npm install
     npm test
     npm run harness
     npm run release:tag
     git push --tags
     ```
4. **Release Validation**: 
   - Tag push triggers `Release Validation` workflow
   - Wait for it to complete and be green
5. **GitHub Release**:
   - Create release on GitHub
   - Title: `vX.Y.Z`
   - Notes: Copy from CHANGELOG section

### Harness Must Remain Green

The harness validation system is critical:

- Runs on every PR via `validate` workflow
- Runs nightly to detect drift
- Must pass for all fixtures (next-min, expo-min)
- If harness fails, fix before merging

### Versioning

- Follows [Semantic Versioning](https://semver.org/)
- Patch versions (0.1.X) for bug fixes and minor features
- Minor versions (0.X.0) for new features
- Major versions (X.0.0) for breaking changes

### Branch Naming

- Feature branches: `feat/description`
- Bug fixes: `fix/description`
- Version bumps: `chore/bump-version-X.Y.Z`
- Documentation: `docs/description`

### Commit Messages

Use conventional commit format:
- `feat: description` for new features
- `fix: description` for bug fixes
- `chore: description` for maintenance
- `docs: description` for documentation

