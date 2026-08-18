# JV Box3D Web Public

Public, artifact-only deployment repository for JV Web.

## Authority

- **Private source authority:** `Jozzpoly/JV-Box3D-Web-experiment`
- **Public publication authority:** this repository's `main`
- **GitHub Pages target:** repository root of `main`
- **Canonical private executable source for the accepted artifact:** `cd7f5f89e8cfb872ff6bddc619e3fb78f2124af4`

The public repository is not a development workspace. Product changes belong in the private repository, are built and validated there, and only reviewed static artifacts are promoted here.

## Current artifact model

The root contains the runnable static site plus the minimum metadata needed to audit it:

```text
index.html
assets/**
__jv_scan__/**
vehicles/**
scenes/**
receipts/**
LIVE_BUILD.json
build-manifest.json
THIRD_PARTY_NOTICES.md
README.md
AGENTS.md
HANDOFF.md
PUBLICATION_CONTRACT.md
SECURITY.md
.nojekyll
.gitattributes
```

`build-manifest.json` binds the executable candidate to exact private source/file bytes. `LIVE_BUILD.json` records release-layer provenance and Owner acceptance, including preservation of the approved JSPREV2 scan.

## Branch policy

Steady-state authority is deliberately simple:

```text
main
```

A temporary preview/rollback branch is never a second source of truth. After acceptance it should be retired when normal ref-deletion tooling is available. The currently visible `preview/p1-2-owner` ref is redundant historical navigation only; it remains because the current connector session does not expose branch-ref deletion. Do not build a special Owner-side cleanup helper solely to remove it.

Historical rollback remains available through exact Git commit ancestry. Do not recreate permanent `release/*` or `checkpoint/*` branch forests.

## Scan policy

The current approved JSPREV2 scan is an explicit public release asset. Code-only releases may preserve its exact already-published Git bytes. A scan-changing release requires separate exact source/provenance validation.

## Licensing

No general license grant is implied by this repository. Required third-party notices accompany the artifact. Do not add or change licensing without deliberate Owner approval.
