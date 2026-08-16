# JV Box3D Web Public

Public, artifact-only deployment repository for JV Web.

## Authority

- **Private source authority:** `Jozzpoly/JV-Box3D-Web-experiment`
- **Public publication authority:** this repository's `main`
- **GitHub Pages target:** repository root of `main`
- **Private source used for this artifact:** `0260c8b39c0bb9594afe423b30d8e3536918f24c`

The public repository is not a development workspace. Product changes belong in the private repository, are built and validated there, and only the reviewed static artifact is promoted here.

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

`build-manifest.json` binds the candidate to the exact private source commit and file bytes. `LIVE_BUILD.json` records the public release-layer provenance, including preservation of the already-approved JSPREV2 scan.

## Branch policy

Steady state is deliberately simple:

```text
main
```

A second rollback branch may exist **temporarily** while a newly promoted `main` is undergoing Owner/browser/device validation. It is not a second source of truth and should be removed after acceptance. Historical rollback remains available through exact Git commit ancestry.

Do not recreate permanent `release/*` or `checkpoint/*` branch forests.

## Scan policy

The current approved JSPREV2 scan is an explicit public release asset. Code-only releases may preserve its exact already-published Git bytes. A scan-changing release requires separate exact source/provenance validation.

## Licensing

No general license grant is implied by this repository. Required third-party notices accompany the artifact. Do not add or change licensing without deliberate Owner approval.
