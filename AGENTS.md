# JV Box3D Web Public — agent guard

This repository is public and artifact-only. Authoritative product source is private in `Jozzpoly/JV-Box3D-Web-experiment`.

## Authority

- `main` is the steady-state public artifact and GitHub Pages authority.
- Private JV-Web `main` remains product/source authority.
- Exact Git commits are rollback/evidence anchors; branch names are not archives.
- A temporary second public branch is allowed only while an Owner validation/rollback need is active.

Always resolve live private `main`, public `main`, and the GitHub Pages source before making publication claims.

## Do not develop here

Do not add private source, `node_modules`, build workspaces, source maps, credentials, local paths, arbitrary private scan data, or experimental runtime overlays.

Do not patch compiled JavaScript/CSS as a normal fix. Product changes belong in the private typed source and must be rebuilt and re-promoted.

## Executable-root rule

Executable JavaScript/CSS must come from the exact reviewed private build. Carry-forward is limited to explicitly approved static data/assets and public release metadata. The current approved JSPREV2 scan may be preserved byte-for-byte for a code-only release when that preservation is recorded and validated.

## Promotion rule

1. resolve exact private source and public baseline;
2. build outside this public repository;
3. validate source/type/tests/build and the artifact contract;
4. preserve or replace scan data only under an explicit provenance rule;
5. promote reviewed bytes to public `main` by normal Git ancestry;
6. verify live delivery and source identity;
7. obtain Owner/browser/device validation for user-visible claims;
8. retire any temporary preview/rollback branch after acceptance.

A Git push or green static validator is not Owner acceptance.

## Current promotion basis

- canonical private executable source: `cd7f5f89e8cfb872ff6bddc619e3fb78f2124af4`;
- previous accepted steady public `main`: `f512551dc41196bc8ca053357408c93b4b3725be`;
- approved JSPREV2 remains preserved from public history anchored at `a325c279cfe63a0607dba33c3c635a1716e09f8f`;
- current clean canonical preview artifact: `fe5ba2c772dbb530848df5bcd55163171b5847bc`;
- Owner validation of the promoted steady-state public `main` is still required before this release is called accepted.
