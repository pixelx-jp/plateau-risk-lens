# Security policy

## Reporting a vulnerability

If you discover a security issue in plateau-risk-lens, please report it
privately. Do **not** open a public GitHub issue.

Email: [pan@yodolabs.jp](mailto:pan@yodolabs.jp)

Please include:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept
- The commit SHA or version you tested against
- Whether the issue affects deployed instances or only local builds

We'll acknowledge receipt within **3 business days** and aim to resolve
critical issues within **30 days** of confirmation. For severe issues we
will coordinate a disclosure timeline with you before publishing a fix.

## Scope

In scope:

- The source code in this repository
- Build / deployment workflows in `.github/workflows/`
- The contributor-facing scripts in `scripts/`
- The data-validation boundary in `src/manifest/manifestSchema.ts`

Out of scope:

- Vulnerabilities in upstream PLATEAU data files (report to MLIT)
- Vulnerabilities in Cloudflare, GitHub, or other third-party hosting
  used by deployments
- Theoretical CORS / XSS findings on `localhost`-only dev paths

## Disclosure

We follow coordinated disclosure. Once a fix is available we will publish
a security advisory on GitHub crediting the reporter (unless anonymity is
requested).
