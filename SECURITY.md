# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

As this project is in early development (version 0.x), we provide security updates for the latest release only.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please report it privately:

### Email

Send details to: **felix@felixgeelhaar.de**

### What to Include

Please include the following information:

- **Type of vulnerability** (e.g., authentication bypass, injection, XSS)
- **Location** (package name, file path, affected component)
- **Step-by-step instructions** to reproduce the issue
- **Proof of concept** or example code (if applicable)
- **Impact assessment** (what an attacker could achieve)
- **Suggested fix** (if you have one)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: Within 7 days
  - High: Within 14 days
  - Medium: Within 30 days
  - Low: Next regular release

### Disclosure Policy

- We will acknowledge receipt of your vulnerability report
- We will confirm the vulnerability and determine its impact
- We will release a fix as part of a security advisory
- We will publicly disclose the vulnerability after a fix is available
- We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices

When using this SDK:

### Authentication
- **Never hardcode credentials** in your source code
- Use environment variables or secure credential storage
- Rotate API tokens regularly
- Use the minimum required permissions

### Network Security
- **Always use HTTPS** (HTTP is rejected by default in production)
- Configure appropriate timeouts to prevent hanging connections
- Use TLS 1.2 or higher

### Data Handling
- **Validate all inputs** using the provided Zod schemas
- Sanitize data before logging (credentials are auto-redacted)
- Be cautious with error messages that might leak sensitive information

### Dependencies
- Keep dependencies up to date
- Run `pnpm audit` regularly to check for known vulnerabilities
- Review security advisories for this project

### Rate Limiting
- Use the built-in rate limiting middleware to prevent abuse
- Respect Jira API rate limits
- Implement exponential backoff for retries

## Known Security Considerations

### OAuth2 Token Storage
- Access tokens and refresh tokens should be stored securely
- Use encrypted storage for tokens in production
- Implement proper token rotation

### Circuit Breaker State
- Circuit breaker state is kept in memory
- In distributed systems, use a shared state store

### Logging
- Sensitive headers (Authorization, API tokens) are automatically redacted
- Review custom middleware to ensure no sensitive data leaks

## Security Updates

Security updates will be:
- Released as patch versions
- Documented in CHANGELOG.md with a `[SECURITY]` tag
- Announced via GitHub Security Advisories
- Highlighted in release notes

## Scope

This security policy applies to:
- `@felixgeelhaar/jira-sdk`
- `@felixgeelhaar/sdk-core`

## Out of Scope

The following are considered out of scope:
- Issues in Jira Cloud platform itself
- Third-party dependencies (report to respective projects)
- Social engineering attacks
- Denial of Service (DoS) attacks

## Bug Bounty

We currently do not offer a bug bounty program. However, we deeply appreciate security researchers who responsibly disclose vulnerabilities and will publicly acknowledge your contribution.

## Contact

For security-related questions that are not vulnerabilities, you can:
- Open a GitHub Discussion
- Create a public issue with the `security` label

Thank you for helping keep Jira SDK TypeScript secure!
