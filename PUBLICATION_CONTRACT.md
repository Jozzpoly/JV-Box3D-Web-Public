# Public artifact contract

Status: `FRIENDS R1 LIVE / ARTIFACT-ONLY / PAGES FROM release/friends-r1`

Target project subpath:

```text
/JV-Box3D-Web-Public/
```

GitHub Pages currently serves repository root from `release/friends-r1`. `main` remains the documentation/control-plane branch and is not the deployed application.

## Branch contract

- `release/friends-r1` is the moving Friends artifact line.
- `release/r0` is an immutable historical rollback/fallback and must never be rewritten.
- `main` contains public control-plane documentation only.
- `checkpoint/*` refs are historical evidence/rollback navigation, not current publication authority.

## Allowed release payload

A reviewed Friends artifact may contain only files required to run, audit or identify the exact static application. The current artifact shape includes categories such as:

```text
index.html
assets/**
__jv_scan__/**          exact approved public scan only
vehicles/**
scenes/**
receipts/**
LIVE_BUILD.json
build-manifest.json
THIRD_PARTY_NOTICES.md
.nojekyll
.gitattributes          when required for exact artifact storage/transport
```

This is descriptive, not a blanket allowlist. The exact candidate file table/manifest is authority for a given release. A path is not approved merely because it matches one of these broad categories.

## Prohibited payload and behavior

The public artifact must not contain:

- the private source tree or private Git history;
- `node_modules`, package caches, package-manager workspaces or temporary test/build workspaces;
- arbitrary local/private scan data that has not been explicitly approved and pinned;
- absolute Windows, Linux or container paths;
- secrets, credentials, personal data or unreviewed provenance fields;
- unreviewed remote network dependencies or URLs outside the release policy;
- source maps unless separately reviewed and approved;
- unused laboratory/development assets that are not part of the intended product;
- a manifest claiming source identity, validation or acceptance that did not occur.

The moving Friends executable root must come from the exact reviewed private build. Do not carry executable JavaScript/CSS forward from an older public artifact layer and do not patch compiled public runtime as a substitute for private-source implementation.

## Scan preservation rule

The approved JSPREV2 scan is a public release asset for the current Friends line.

A code-only release may preserve its **exact already-published Git object bytes** when the private release process explicitly records that preservation. A scan-changing release must independently pin and validate the replacement scan source and resulting public bytes.

Approval of one exact scan does not authorize arbitrary local scan packs.

## Required release evidence

Before promoting a materially changed Friends artifact, evidence should bind the claims relevant to that release, including as applicable:

- private source repository identity and exact source commit/tree;
- clean source state for the build;
- canonical Node/npm/TypeScript/Vite and lockfile identity;
- target base path `/JV-Box3D-Web-Public/`;
- complete reviewed artifact file table and/or deterministic build manifest;
- executable-root build identity;
- exact preserved or replaced scan identity;
- third-party notices;
- path/network/privacy validation;
- browser execution for runtime claims;
- real-device/Owner validation for user-visible feel/layout claims;
- known previous accepted public commit for rollback.

Validation claims must state what actually ran. A static fetch is not browser execution, and a branch update is not Owner acceptance.

## Promotion and rollback

The public repository does not rebuild private source. Promotion copies the already-reviewed artifact bytes into normal Git history on `release/friends-r1`, then verifies the exact public branch/live Pages result.

Keep rollback straightforward by retaining the exact prior accepted commit identity. `release/r0@c3e33e3dcd343a6d3b5f60df6e07a4a78a64dd44` remains the immutable historical fallback.

GitHub Pages is already enabled from `release/friends-r1` root with HTTPS enforcement. Changing the Pages source, repository visibility, default branch or domain is a separate Owner-level operation and is not part of an ordinary Friends artifact update.

## Current evidence snapshot — 2026-08-16

```text
live Friends branch:
  release/friends-r1@a325c279cfe63a0607dba33c3c635a1716e09f8f

private source recorded by LIVE_BUILD.json:
  c9b5990b226685abe35851fc5e9496323096ecf7

scan index:
  bytes: 7256
  sha256: 64a2cdf8ef30f245544d90786528e867186f0740c37aac415a5b8b0c4d7b885e

executableRootFromPrivateBuildOnly: true
publicRuntimeOverlayPreserved: false
```

Resolve moving refs live before future publication work; this snapshot is evidence, not a permanent moving-ref substitute.
