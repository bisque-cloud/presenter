# Security policy

## Report a vulnerability

Use [GitHub's private vulnerability reporting form](https://github.com/bisque-cloud/presenter/security/advisories/new)
for security issues in this repository, including the GitHub Action, workflows,
skills, and SDK. Do not disclose vulnerabilities or credentials in public
issues, pull requests, or comments.

Include the affected version or commit, workflow configuration, steps to
reproduce, and potential impact. Redact secrets and private repository data
from logs and examples. Use public issues for non-security bugs.

## API keys and tokens

- Store provider API keys and Claude Code OAuth tokens in GitHub Actions
  secrets and pass them through the matching [Action inputs](./action.yml).
  Do not commit credentials or put them in prompts.
- In the composite Action's authoring flow, the proxy-start step receives
  the provider credential and passes it over stdin to a localhost proxy.
  The agent receives a placeholder credential and a minimal environment,
  without the provider secret, GitHub token, or OIDC request credentials.
  The proxy adds authentication when forwarding requests to the selected
  provider and is stopped after authoring. It still lets the agent make
  billable provider requests; use a dedicated API key with a spending cap.
- `github-token` defaults to the job's `github.token`. Non-agent steps use
  it to read GitHub data and post the watch link. Publishing normally uses
  a short-lived GitHub OIDC token (`id-token: write`) to publish as the
  repository, without a Bisque API key. Supplying both `BISQUE_API_KEY` and
  `BISQUE_USER_ID` in the environment overrides that publishing identity.
- Workflows that author with `anthropics/claude-code-action` instead of the
  composite Action's agent have different boundaries. In the
  [split API-key example](./examples/split-explainer-api-key.yml), the
  authoring session holds the API key directly; separate jobs publish
  without that secret. Do not assume the localhost proxy protects keys
  passed to another action.

## Workflow boundaries

Pin Actions to reviewed commit SHAs and grant only the permissions the
workflow needs: reading contents, writing pull-request comments or release
notes, reacting to mentions, and requesting an OIDC token for publishing.
Do not run untrusted pull-request code with secrets or write permissions.

The repository's automatic explainer skips forks and Dependabot. Its
mention workflow requires write, maintain, or admin access and sets
`network: deny` for contributor-controlled text. The Action defaults to
`network: allow`; `deny` disables the agent's shell and web-fetch tools,
not the entire runner's network. These are tool permissions and credential
separation, not an operating-system sandbox or a guarantee against prompt
injection.

Treat model output, logs, and artifacts as potentially sensitive. The
composite Action uploads working files with seven-day retention, excluding
`key-proxy.*`; this is not a guarantee that output contains no secrets.
Revoke or rotate exposed credentials and report suspected Action leaks
privately through the form above.
