# Contributing to Jira SDK TypeScript

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Git

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/jirasdk-ts.git
cd jirasdk-ts

# Install dependencies
pnpm install

# Build packages
pnpm build

# Run tests
pnpm test
```

## Development Workflow

### Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming:
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation
- `refactor/*` - Code improvements

### Make Changes

1. Write your code
2. Add or update tests
3. Run the test suite: `pnpm test`
4. Check types: `pnpm typecheck`
5. Lint code: `pnpm lint:fix`
6. Format code: `pnpm format`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(jira): add issue attachment support
fix(core): prevent OAuth2 race condition
docs(readme): update authentication examples
test(jira): add search service tests
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

## Code Standards

### TypeScript
- Enable strict mode
- Add explicit return types for public APIs
- Avoid `any` types
- Use proper type annotations

### Style
- Follow ESLint rules
- Use Prettier for formatting
- `camelCase` for variables/functions
- `PascalCase` for classes/types
- `UPPER_SNAKE_CASE` for constants

### Testing
- Write unit tests for new code
- Maintain test coverage above 90%
- Test error cases and edge conditions

## Submitting Changes

### Pull Request Process

1. Update your branch:
```bash
git checkout main
git pull upstream main
git checkout your-feature-branch
git rebase main
```

2. Push to your fork:
```bash
git push origin your-feature-branch
```

3. Create a PR with:
   - Clear, descriptive title
   - Summary of changes
   - Link to related issues
   - Test evidence

### PR Requirements
- All tests pass
- Code coverage maintained
- No linting errors
- Documentation updated
- At least one maintainer approval

## Project Structure

```
src/
├── adf/           # Atlassian Document Format builder
├── auth/          # Authentication providers
├── client/        # Client, functional options, env config
├── custom-fields/ # Typed custom-field accessors
├── errors/        # Error hierarchy
├── jql/           # JQL query builder and escaping
├── logging/       # Logging abstraction
├── pagination/    # Shared pagination primitives
├── schemas/       # Zod schemas, one directory per domain
├── services/      # Domain services (27)
├── transport/     # HTTP client, middleware, circuit breaker
└── utils/         # Utilities
```

Adding a service means: a schema directory under `src/schemas/<domain>/`, a
`src/services/<domain>.service.ts` extending `BaseService`, a colocated test,
and wiring into the three barrels (`src/schemas/index.ts`,
`src/services/index.ts`) plus a lazy getter on `JiraClient`.

## Documentation

- Add JSDoc comments to public APIs
- Include usage examples
- Update CHANGELOG.md
- Update README.md for new features

## Security

Report security issues privately via our [SECURITY.md](SECURITY.md) process, not through public issues.

## Questions?

- Check existing documentation
- Search existing issues
- Create a new issue with the question label

Thank you for contributing!
