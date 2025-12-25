# Getting Started with Lattice

Lattice is a CLI-first generator for creating production-ready project configurations with Cursor rules, CI/CD workflows, and best practices.

## Requirements

- **Node.js**: Version 20 (matches CI requirements)
- **npm**: Available in your PATH
- **git**: Available in your PATH

## Installation

Lattice can be used via `npx` without installation:

```bash
npx @lattice/cli <command>
```

Or install globally:

```bash
npm install -g @lattice/cli
```

## Quickstart: Next.js

1. **Check your environment** (optional but recommended):
   ```bash
   lattice doctor
   ```

2. **Initialize configuration**:
   ```bash
   lattice init --projectType nextjs --preset startup
   ```
   
   This creates `.lattice/config.json` with your project settings.

3. **Generate the pack**:
   ```bash
   lattice generate
   ```
   
   This creates a `lattice-pack` directory with all generated files.

4. **Apply the pack to your project**:
   ```bash
   lattice apply --pack lattice-pack --target .
   ```
   
   This adds files to your project (additive-only, won't overwrite existing files).

5. **Verify rules** (optional):
   ```bash
   lattice verify-rules
   ```
   
   This validates that your `.cursor/rules.md` file is up to date and correct.

## Available Commands

- `lattice doctor` - Check environment and prerequisites
- `lattice init` - Create `.lattice/config.json` configuration file
- `lattice generate` - Generate pack from configuration
- `lattice apply` - Apply generated pack to your project
- `lattice verify-rules` - Validate `.cursor/rules.md` file

## Quickstart: Expo EAS

1. **Check your environment** (optional but recommended):
   ```bash
   lattice doctor
   ```

2. **Initialize configuration**:
   ```bash
   lattice init --projectType expo-eas --preset startup
   ```

3. **Generate the pack**:
   ```bash
   lattice generate
   ```

4. **Apply the pack to your project**:
   ```bash
   lattice apply --pack lattice-pack --target .
   ```

5. **Verify rules** (optional):
   ```bash
   lattice verify-rules
   ```

## Advanced Configuration

The `lattice init` command supports additional options:

```bash
lattice init \
  --projectType nextjs \
  --preset pro \
  --billing stripe \
  --analytics amplitude \
  --observability sentry \
  --testing unit
```

**Required flags:**
- `--projectType`: `nextjs` or `expo-eas`
- `--preset`: `startup`, `pro`, or `enterprise`

**Optional flags:**
- `--billing`: `none`, `stripe`, or `revenuecat`
- `--analytics`: `none`, `amplitude`, `mixpanel`, or `posthog`
- `--observability`: `none` or `sentry`
- `--testing`: `none`, `unit`, or `unit-e2e`
- `--force`: Overwrite existing `.lattice/config.json`

## Troubleshooting

### `lattice doctor` fails on Node version

**Problem**: Doctor reports Node version mismatch (not Node 20)

**Solution**: Install Node.js 20. Use `nvm` (Node Version Manager) if you need multiple Node versions:
```bash
nvm install 20
nvm use 20
```

### `lattice init` fails with "Config file already exists"

**Problem**: `.lattice/config.json` already exists

**Solution**: Use `--force` flag to overwrite:
```bash
lattice init --projectType nextjs --preset startup --force
```

### `lattice apply` reports conflicts

**Problem**: Some files already exist and weren't applied

**Solution**: This is expected behavior. Lattice uses additive-only mode to prevent overwriting your existing files. Review the conflicting files and manually merge if needed.

### `lattice verify-rules` fails

**Problem**: Rules file is outdated or missing required sections

**Solution**: Regenerate the pack and re-apply:
```bash
lattice generate
lattice apply --pack lattice-pack --target .
```

### `lattice doctor` reports missing package-lock.json

**Problem**: Warning about missing `package-lock.json`

**Solution**: This is a warning, not an error. However, for deterministic installs, commit `package-lock.json` to your repository:
```bash
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
```

### Working tree has uncommitted changes

**Problem**: `lattice doctor` warns about uncommitted changes

**Solution**: This is a warning, not an error. Commit or stash your changes before running Lattice commands for a clean state:
```bash
git add .
git commit -m "Your changes"
# or
git stash
```

