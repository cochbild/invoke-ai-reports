# Security Policy

## Supported Versions

Only the latest release on `main` receives security updates.

| Version | Supported |
| ------- | --------- |
| latest  | Yes       |
| older   | No        |

## Reporting a Vulnerability

**Please do not file public GitHub issues for security vulnerabilities.**

Report suspected vulnerabilities privately by emailing **dalecochran1968@gmail.com** with:

- A description of the issue and its impact
- Steps to reproduce
- The affected version or commit SHA
- Any proof-of-concept code (optional)

This is a personal side project maintained on a best-effort basis — acknowledgement and remediation are best-effort, with no committed timeline.

## Scope

This project reads a local InvokeAI SQLite database in read-only mode and serves a dashboard on `127.0.0.1` by default. Reports of particular interest:

- Path-traversal or arbitrary-file-read in the path-validation/setup endpoints
- SQL injection in the analytics layer
- Issues that would allow the dashboard to mutate the source `invokeai.db`
- Issues exposing the dashboard or its data outside `127.0.0.1` unintentionally

Out of scope: vulnerabilities requiring attacker control of the host the dashboard runs on, or issues in upstream InvokeAI itself.
