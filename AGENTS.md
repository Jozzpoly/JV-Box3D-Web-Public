# JV Box3D Web Public — agent guard

This repository is public and artifact-only. Authoritative product source is `Jozzpoly/JV-Box3D-Web-experiment`.

## Authority

- `main` is the steady-state public artifact and GitHub Pages authority.
- JV-Web source `main` remains product/source authority.
- Exact Git commits are rollback/evidence anchors; branch names are not archives.
- A temporary second public branch is allowed only for a concrete validation/rollback need.

Always resolve live source `main`, public artifact `main`, and the GitHub Pages source when tooling permits before making publication claims.

## Do not develop here

Do not add product source, `node_modules`, build workspaces, source maps, credentials, local paths, arbitrary private scan data or experimental runtime overlays.

Do not patch compiled JavaScript/CSS as a normal fix. Product changes belong in the typed source repository and must be rebuilt and re-promoted.

## Executable-root rule

Executable JavaScript/CSS must come from the exact reviewed source build. Carry-forward is limited to explicitly approved static data/assets and public release metadata. The approved JSPREV2 scan may be preserved byte-for-byte for a code-only release when that preservation is recorded and validated.

## Promotion rule

1. resolve exact source and public baseline;
2. build outside this public artifact repository;
3. validate source/type/tests/build and artifact contract;
4. preserve or replace scan data only under an explicit provenance rule;
5. promote reviewed bytes to public `main` by normal Git ancestry;
6. verify live delivery/source identity;
7. obtain Owner/browser/device validation for user-visible claims;
8. retire temporary preview/rollback refs when practical after acceptance.

A Git push or green static validator is not Owner acceptance.

## Current accepted promotion basis

- canonical executable source for the currently accepted Friends artifact: `cd7f5f89e8cfb872ff6bddc619e3fb78f2124af4`;
- public executable promotion: `7efe864a337349f4bbdb9e690c2209a0ee781ba2`;
- Owner-acceptance provenance closure: `086e25c9bd22bddca6462f0d585de6d0fd424012` plus later docs-only descendants;
- previous accepted steady public `main`: `f512551dc41196bc8ca053357408c93b4b3725be`;
- approved JSPREV2 remains preserved from public history anchored at `a325c279cfe63a0607dba33c3c635a1716e09f8f`;
- clean canonical preview artifact used for promotion composition: `fe5ba2c772dbb530848df5bcd55163171b5847bc`;
- Owner steady-state validation: **PASS**, Samsung Galaxy A53 / Chrome.

The current Friends artifact predates the later dual-mode steering source integration. Do not infer that accepted source changes are already promoted here until a separate Friends publication is executed and accepted.

The still-visible `preview/p1-2-owner` ref is redundant historical navigation, not active validation or authority. Do not create an Owner-side helper campaign solely to remove that name.
