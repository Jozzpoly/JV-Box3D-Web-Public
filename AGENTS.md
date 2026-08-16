# JV Box3D Web Public — agent guard

This repository is public and artifact-only. Private JV Web source authority lives in `Jozzpoly/JV-Box3D-Web-experiment`.

## Branch roles

- `main`: publication control plane and documentation. It is the default branch but **not** the deployed application.
- `release/friends-r1`: moving validated Friends artifact and current GitHub Pages source at repository root.
- `release/r0`: immutable historical rollback/fallback. Never rewrite it.
- `checkpoint/*`: historical rollback/evidence navigation only. A checkpoint name does not make a branch current authority.

Always resolve live refs and the GitHub Pages source before acting. Documentation and branch names are not sufficient publication evidence.

## Public/private boundary

This public repository may contain only reviewed static artifact bytes and public control-plane documentation. It must not become a development workspace or a mirror of the private source repository.

Do not add:

- private `src/` or private Git history;
- `node_modules`, package caches, package-manager workspaces or development/test outputs;
- absolute local filesystem paths, secrets, tokens or credentials;
- unreviewed source maps or provenance containing private machine data;
- a build/deployment workflow merely to avoid validating and promoting the already-built private artifact;
- a license or implied license grant without deliberate Owner approval.

Approved release assets such as the current JSPREV2 scan are allowed only when their exact identity/provenance is part of the reviewed release. Do not generalize that approval to arbitrary local scan data.

## Executable-root rule

The moving Friends root must not inherit executable JavaScript/CSS from an older public release layer. Executable root behavior must be traceable to the exact private source build. Carry-forward is limited to explicitly approved static data/assets and necessary release metadata.

Do not patch compiled public JavaScript/CSS as a normal development method. Product fixes belong in private typed source, followed by a new validated artifact promotion.

## Promotion rule

For `release/friends-r1`:

1. resolve exact accepted private source;
2. build and validate the static candidate outside this public repository;
3. bind source/build identity and exact artifact files;
4. preserve or replace approved scan data only under an explicit evidence-backed rule;
5. promote the already-reviewed bytes by normal Git history;
6. verify the resulting public branch and live Pages artifact;
7. keep a known rollback commit.

A branch update is not by itself Owner acceptance. User-visible changes require the appropriate browser/device validation for the claim being made.

## Repository settings

Do not change repository visibility, default branch, GitHub Pages source, custom domain, or release/r0 history without explicit Owner intent. Pages is already enabled from `release/friends-r1` root; do not treat activation as pending work.

Historical checkpoint branches should be retired when they are redundant and safely reachable from accepted history. Do not create new checkpoint branches as permanent trophies.
