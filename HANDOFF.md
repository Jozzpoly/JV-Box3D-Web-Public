# JV Web Public — takeover handoff

This repository should be simple to take over.

## Fresh entry

1. Resolve live public `main`.
2. Resolve the GitHub Pages source and status.
3. Read `AGENTS.md`.
4. Read `PUBLICATION_CONTRACT.md`.
5. Read `LIVE_BUILD.json` and `build-manifest.json`.
6. Use the private JV-Web repository for all product/source work.

Do not reconstruct old release/checkpoint branch campaigns unless new evidence requires archaeology.

## Durable state

- public steady-state authority: `main`;
- private source authority: `Jozzpoly/JV-Box3D-Web-experiment`;
- artifact prepared from private source `0260c8b39c0bb9594afe423b30d8e3536918f24c`;
- previous accepted Friends commit at promotion start: `a325c279cfe63a0607dba33c3c635a1716e09f8f`;
- historical R0 commit: `c3e33e3dcd343a6d3b5f60df6e07a4a78a64dd44`;
- approved JSPREV2 is preserved only under exact byte/provenance rules;
- public repo is artifact-only and must not become a development mirror.

If a temporary `release/friends-r1` branch still exists, it is only a rollback handle during Owner validation. Once the current `main` Pages build is Owner-accepted, retire that branch so normal steady state returns to `main` only.

## Publication acceptance boundary

A correct public commit and a successful Pages build prove publication mechanics. They do not prove user-visible behavior. Owner/browser/device validation remains external evidence and should be recorded in the private project state rather than by rewriting this artifact after publication.
