# JV Box3D Web Public

Public, artifact-only deployment repository for the browser release of JV.

## Current status

```text
application artifact: NOT PRESENT
GitHub Pages:         NOT ENABLED BY THIS CAMPAIGN
public release:       NOT ACCEPTED
repository role:      PUBLIC ARTIFACT CONTROL PLANE
```

This repository is intentionally separate from the private development repository. It must receive only an explicitly validated static release artifact. It must not receive the private source workspace, Git history, local scan data, development dependencies, temporary test outputs, or experimental branches.

## Controlled publication path

1. Verify the exact private repair commit and tree.
2. Pass the exact Node/npm/TypeScript/Vite toolchain gate in clean disposable checkouts.
3. Produce the structural `MAP_ONLY_R0` product mode with no private scan request or scan UI.
4. Build a clean, allowlisted and reproducible static artifact for the repository subpath `/JV-Box3D-Web-Public/`.
5. Validate the exact artifact on desktop and a real phone, including controls, camera, rebuild, network requests and console health.
6. Obtain owner acceptance for the exact artifact SHA-256.
7. Promote those exact bytes to the dedicated release branch in this repository.
8. Enable GitHub Pages only after the promoted branch and rollback procedure are verified.

Expected project-site address after deliberate activation:

```text
https://jozzpoly.github.io/JV-Box3D-Web-Public/
```

## Licensing

No license grant is implied by this repository. A license must be added deliberately before source or reusable assets are published. Required third-party notices must accompany every release artifact.
