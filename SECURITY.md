# Security policy

This repository is the public artifact/deployment side of JV Web. Authoritative product source is maintained separately in a private repository; this public repository is not a development workspace.

## Reporting

Do not publish credentials, private keys, personal data, private asset URLs, unpublished scan data, exploit details or sensitive reproduction information in a public issue or pull request.

If you discover a suspected vulnerability, contact Jozz through an already-established private channel. If no private channel is available, publish only a minimal non-sensitive note requesting private contact; do not include exploit details.

A useful private report includes the exact public commit/build identity, affected browser/OS/device, impact, minimal reproduction and a sanitized log when useful.

## Remediation boundary

Do not patch compiled JavaScript/CSS here as the source fix. Security fixes belong in the private JV-Web source, followed by rebuild, validation and artifact promotion.

A lack of visible GitHub security alerts is not proof that an artifact is secure. Security claims must identify the checks and evidence that actually support them.

There is currently no guaranteed response-time SLA.
