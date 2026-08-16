# JV Box3D Web Public

Public, artifact-only deployment repository for JV Web.

## Current live state

```text
repository role:       PUBLIC ARTIFACT CONTROL PLANE + DEPLOYED STATIC ARTIFACT
default branch:        main (documentation/control plane; not the deployed app)
GitHub Pages source:   release/friends-r1 /
GitHub Pages status:   built
HTTPS:                 enforced
live Friends commit:   a325c279cfe63a0607dba33c3c635a1716e09f8f
private source commit: c9b5990b226685abe35851fc5e9496323096ecf7
immutable fallback:    release/r0@c3e33e3dcd343a6d3b5f60df6e07a4a78a64dd44
```

The deployed application is **not** the content of `main`. Resolve the live Pages source and `release/friends-r1` tip before making publication claims.

The current Friends artifact is Owner-tested on desktop and Galaxy A53 / Chrome. It contains the accepted P1 mobile/browser foundation, approved JSPREV2 scan, owner vehicle and current product assets. Its `LIVE_BUILD.json` binds the public artifact to the exact private source commit and records preserved-scan provenance.

## Repository roles

```text
main
  public control-plane documentation only

release/friends-r1
  moving, validated Friends GitHub Pages artifact

release/r0
  immutable historical rollback/fallback artifact

checkpoint/*
  historical rollback/evidence navigation only; not publication authority
```

Private source authority remains `Jozzpoly/JV-Box3D-Web-experiment`. This public repository must never become a second development/source repository.

## Publication model

A Friends release is built and validated from the private source repository, then the already-reviewed static bytes are promoted here. This repository does not rebuild private source.

Code-only Friends releases may preserve exact approved static data such as the already-published scan. A scan-changing release must pin and validate the new approved scan input. Executable root JavaScript/CSS must remain traceable to the exact private build; historical public runtime overlays must not be carried forward.

See `PUBLICATION_CONTRACT.md` for the durable artifact and rollback rules and `AGENTS.md` for agent guardrails.

## Branch hygiene

Historical checkpoint branches may still exist physically, but their names do not grant authority. If a checkpoint is already ancestral to an accepted release and has no unique recovery value, retire the redundant branch ref when branch deletion is available instead of accumulating permanent branch navigation.

## Licensing

No general license grant is implied by this repository. Required third-party notices accompany release artifacts. Do not add or change licensing without deliberate Owner approval.
