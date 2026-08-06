# JV Box3D Web Public — agent guard

This repository is public and artifact-only.

## Branch roles

- `main`: publication control plane and documentation. It is not the deployed application.
- `release/r0`: reserved for the exact validated static artifact. It must not be populated until the private release gates and owner acceptance pass.

Always fetch the current branch tips before acting. Do not infer publication state from branch names or documentation alone.

## Prohibited actions without explicit owner approval

Do not:

- enable GitHub Pages;
- add a build or deployment workflow;
- copy the private development repository or its Git history;
- copy `src/`, `node_modules`, package-manager state, private scan data, temporary tests or local receipts;
- publish local filesystem paths, secrets, tokens, credentials or unreviewed source maps;
- add a license or imply a license grant;
- change repository visibility or the default branch;
- present a placeholder page as a working JV release.

## Promotion rule

Files may enter `release/r0` only as one reviewed static artifact whose source commit/tree, toolchain, manifest, complete file table and SHA-256 are recorded. The exact bytes must first pass desktop and real-phone validation. A branch update is not publication acceptance, and Pages activation is a separate owner-gated operation.
