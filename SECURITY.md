# Security policy

This repository is the public artifact/deployment side of JV Web. Authoritative product source is maintained separately in a private repository; this public repository is not a development workspace.

## Reporting

Do not publish credentials, private keys, personal data, private asset URLs, unpublished scan data, exploit details or sensitive reproduction information in a public issue or pull request.

If you discover a suspected vulnerability, contact Jozz through an already-established private channel. If no private channel is available, publish only a minimal non-sensitive note requesting private contact; do not include exploit details.

A useful private report includes:

- exact public commit/build identity;
- affected browser, operating system and device;
- impact and minimal reproduction;
- whether credentials, local files, camera, location, network or cross-origin data are involved;
- a sanitized log excerpt when useful.

## Remediation boundary

Do not treat compiled JavaScript/CSS in this repository as the source to patch. Security fixes belong in the private JV Web source, followed by normal rebuild, validation and artifact promotion.

A lack of visible GitHub security alerts is not proof that an artifact is secure. Security claims must identify the checks and evidence that actually support them.

There is currently no guaranteed response-time SLA.
