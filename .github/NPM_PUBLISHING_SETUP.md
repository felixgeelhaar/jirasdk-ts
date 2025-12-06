# NPM Trusted Publishing Setup Guide

This guide explains how to set up NPM trusted publishing (provenance) for the Jira SDK TypeScript packages.

## What is NPM Trusted Publishing?

NPM trusted publishing uses GitHub's OIDC (OpenID Connect) tokens to authenticate package publishing without requiring long-lived NPM tokens. This provides:

- **Enhanced Security**: No need to store NPM tokens as secrets
- **Provenance**: Cryptographically signed attestation of where packages were built
- **Transparency**: Users can verify packages were published from your GitHub repository
- **Supply Chain Security**: Prevents unauthorized package publications

## Prerequisites

1. **NPM Account**: You need an NPM account at https://www.npmjs.com
2. **GitHub Repository**: Repository must be public (already configured ✅)
3. **Package Scopes**: Both packages use `@felixgeelhaar` scope

## Configuration Status

### ✅ Already Configured

The following are already set up in this repository:

1. **GitHub Actions Workflow** (`.github/workflows/release.yml`):
   - `id-token: write` permission enabled
   - `--provenance` flag added to publish command
   - Proper permissions for creating releases

2. **Package Configuration**:
   - Both `packages/core/package.json` and `packages/jira/package.json` have:
     ```json
     "publishConfig": {
       "access": "public",
       "provenance": true
     }
     ```
   - Repository metadata configured
   - Proper keywords and descriptions

3. **Repository Metadata**:
   - Root `package.json` has repository, bugs, and homepage URLs
   - Both packages have repository directory paths configured

## NPM Setup Steps

### Step 1: Create NPM Account (if needed)

1. Go to https://www.npmjs.com/signup
2. Create an account
3. Verify your email address

### Step 2: Create NPM Organization/Scope

Your packages use the `@felixgeelhaar` scope. You need to:

1. Go to https://www.npmjs.com/org/create
2. Create organization named `felixgeelhaar`
3. Or, use your username scope (NPM creates this automatically)

**Note**: If you want to use your username scope instead of an organization:
- Your NPM username should be `felixgeelhaar`
- Or update package names to match your actual NPM username

### Step 3: Configure NPM Trusted Publishing

#### Option A: Using NPM Granular Access Tokens (Recommended for now)

Until NPM fully supports OIDC trusted publishing, use granular access tokens:

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click **Generate New Token** → **Granular Access Token**
3. Configure the token:
   - **Token Name**: `jirasdk-ts-github-actions`
   - **Expiration**: 1 year (or custom)
   - **Packages and scopes**:
     - Select `@felixgeelhaar/sdk-core`
     - Select `@felixgeelhaar/jira-sdk`
     - Or select "All packages" if you prefer
   - **Permissions**:
     - ✅ Read and write (for publishing)
   - **Organizations**: Select `@felixgeelhaar`
   - **IP Allowlist**: Leave empty (GitHub Actions IPs change)

4. Click **Generate Token**
5. Copy the token (you won't see it again!)

#### Option B: Classic Token (Simpler but less secure)

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click **Generate New Token** → **Classic Token**
3. Select **Automation** type
4. Copy the token

### Step 4: Add NPM Token to GitHub Secrets

1. Go to your repository: https://github.com/felixgeelhaar/jirasdk-ts/settings/secrets/actions
2. Click **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: Paste the token from Step 3
5. Click **Add secret**

### Step 5: Verify Configuration

Check that everything is configured correctly:

```bash
# Verify package.json files
cat packages/core/package.json | grep -A3 publishConfig
cat packages/jira/package.json | grep -A3 publishConfig

# Verify workflow file
cat .github/workflows/release.yml | grep provenance

# Check repository is public
gh repo view --json visibility
```

## Publishing Workflow

### Using Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for version management and publishing:

1. **Create a changeset** when you make changes:
   ```bash
   pnpm changeset
   ```
   - Select which packages changed
   - Choose version bump type (major, minor, patch)
   - Write a description of changes

2. **Commit the changeset**:
   ```bash
   git add .changeset/*.md
   git commit -m "chore: add changeset for X feature"
   git push
   ```

3. **Automated process**:
   - GitHub Actions creates a "Version Packages" PR
   - The PR updates versions and CHANGELOG
   - When you merge the PR, packages are automatically published to NPM with provenance

### Manual Publishing (if needed)

If you need to publish manually:

```bash
# Build packages
pnpm build

# Publish with provenance
pnpm changeset publish --provenance

# Or publish individual packages
cd packages/core
pnpm publish --provenance --access public

cd ../jira
pnpm publish --provenance --access public
```

## Verifying Provenance

After publishing, verify provenance is working:

1. Go to your package on NPM:
   - https://www.npmjs.com/package/@felixgeelhaar/sdk-core
   - https://www.npmjs.com/package/@felixgeelhaar/jira-sdk

2. Look for the **Provenance** section showing:
   - ✅ Published from GitHub Actions
   - Build details and commit SHA
   - Signature verification

3. Or check via CLI:
   ```bash
   npm view @felixgeelhaar/sdk-core --json | jq .dist.attestations
   ```

## Security Best Practices

### NPM Token Security

- ✅ Use granular access tokens (not classic automation tokens)
- ✅ Set token expiration (rotate annually)
- ✅ Limit token to specific packages
- ✅ Never commit tokens to git
- ✅ Use GitHub repository secrets (not environment secrets)

### Publishing Security

- ✅ Require 2FA on your NPM account
- ✅ Review all version package PRs before merging
- ✅ Verify CI checks pass before publishing
- ✅ Monitor published packages for unauthorized changes
- ✅ Enable package provenance (already configured)

### GitHub Actions Security

- ✅ Use `id-token: write` only in release workflow
- ✅ Use `fetch-depth: 0` for proper changelog generation
- ✅ Set `concurrency` to prevent concurrent releases
- ✅ Pin action versions (already using `@v4`)

## Troubleshooting

### "403 Forbidden" when publishing

**Cause**: NPM token doesn't have permission to publish to the scope.

**Solution**:
1. Verify token has write access to `@felixgeelhaar` scope
2. Ensure packages exist on NPM or token has permission to create new packages
3. Check token hasn't expired

### "401 Unauthorized" when publishing

**Cause**: NPM_TOKEN secret is invalid or missing.

**Solution**:
1. Verify `NPM_TOKEN` secret is set in GitHub repository
2. Regenerate NPM token and update secret
3. Ensure token is correctly copied (no extra spaces)

### Provenance not showing on NPM

**Cause**: Missing `--provenance` flag or `id-token: write` permission.

**Solution**:
1. Verify workflow has `id-token: write` permission (✅ already set)
2. Check publish command includes `--provenance` flag (✅ already set)
3. Ensure using npm >= 9.5.0 (satisfied by Node.js 20+)

### Package not found on NPM

**Cause**: First publish hasn't happened yet, or package name is taken.

**Solution**:
1. For first publish, manually publish once:
   ```bash
   cd packages/core
   pnpm build
   pnpm publish --access public --provenance
   ```
2. Or wait for the automated release workflow to run

### Changesets not creating version PR

**Cause**: No changesets in `.changeset/` directory, or workflow not running.

**Solution**:
1. Create a changeset: `pnpm changeset`
2. Commit and push the changeset file
3. Verify GitHub Actions workflow runs successfully
4. Check workflow logs for errors

## Monitoring

### Package Health

Monitor your published packages:

1. **NPM Package Pages**:
   - https://www.npmjs.com/package/@felixgeelhaar/sdk-core
   - https://www.npmjs.com/package/@felixgeelhaar/jira-sdk

2. **Download Stats**:
   ```bash
   npm info @felixgeelhaar/sdk-core
   ```

3. **Security Audits**:
   ```bash
   npm audit
   ```

### GitHub Actions

Monitor release workflows:

1. Go to https://github.com/felixgeelhaar/jirasdk-ts/actions
2. Check **Release** workflow runs
3. Review logs for any publishing errors

## Next Steps

1. ✅ Add `NPM_TOKEN` secret to GitHub repository
2. ✅ Verify your NPM account has the `@felixgeelhaar` scope
3. ✅ Create your first changeset
4. ✅ Let the automation create a version PR
5. ✅ Merge the version PR to publish

## Resources

- [NPM Provenance Documentation](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [pnpm Publishing](https://pnpm.io/cli/publish)

---

**Questions?** Open a [GitHub Discussion](https://github.com/felixgeelhaar/jirasdk-ts/discussions) in the Development category.
