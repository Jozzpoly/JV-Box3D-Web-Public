# JV Web public artifact contract

Status: `MAIN-BASED PUBLICATION / ARTIFACT-ONLY`

Target Pages subpath:

```text
/JV-Box3D-Web-Public/
```

## Repository model

`main` is both the default branch and the steady-state public artifact branch. GitHub Pages should serve `main` from repository root.

The public repository does not rebuild or author JV-Web. Private source authority remains `Jozzpoly/JV-Box3D-Web-experiment`.

Permanent release/checkpoint branch families are intentionally retired. Rollback authority is an exact known commit SHA in `main` ancestry. A temporary preview/rollback branch is permitted only during an active Owner validation window.

## Evidence layers

`build-manifest.json` is generated from the clean private candidate and records exact private repository/source/file identity at build time.

`LIVE_BUILD.json` is release-layer provenance. It records the exact private source used for the executable root and whether already-approved static data was preserved from a prior public artifact.

Live public Git `main` plus the GitHub Pages configuration establish what is deployed.

Owner/browser/device evidence establishes user-visible acceptance. Never infer Owner acceptance from a branch update alone.

## Allowed payload

A reviewed artifact may contain only files required to run, identify, document, or audit the public static application, including the executable root, approved assets, receipts, manifests, third-party notices and the small public-repository documentation set.

The exact `build-manifest.json` file table is authoritative for the executable artifact layer. Public repository metadata and explicitly preserved approved scan data are release-layer additions and must be identified separately.

## Prohibited payload

Do not publish:

- private source/history;
- `node_modules`, caches or build workspaces;
- secrets, credentials, private paths or personal data;
- arbitrary/unapproved local scan packs;
- unreviewed source maps;
- obsolete test/laboratory overlays in the production root;
- executable JS/CSS carried forward from an older public layer instead of rebuilt private source;
- provenance or validation claims that did not occur.

## Approved scan preservation

The current JSPREV2 scan may be preserved byte-for-byte from the previously accepted public artifact for a code-only release. Preservation must keep its index, tile/texture bytes and release receipt exact.

A scan-changing release requires its own pinned source pack and independent validation.

## Current promotion basis

```text
canonical private executable source:
  cd7f5f89e8cfb872ff6bddc619e3fb78f2124af4

previous accepted public main:
  f512551dc41196bc8ca053357408c93b4b3725be

clean canonical preview artifact:
  fe5ba2c772dbb530848df5bcd55163171b5847bc

approved preserved JSPREV2 provenance anchor:
  a325c279cfe63a0607dba33c3c635a1716e09f8f

historical R0 commit:
  c3e33e3dcd343a6d3b5f60df6e07a4a78a64dd44
```

## Rollback and acceptance

Before Owner acceptance of a newly promoted `main`, keep the exact prior accepted public commit as rollback authority in normal Git history. A temporary preview/rollback branch may remain only while it has a concrete validation purpose.

After Owner acceptance, retire redundant temporary branch refs. Never use force-push as ordinary publication mechanics.
