# Public artifact contract

Status: `CONTROL PLANE ONLY / NO APPLICATION ARTIFACT`

Target project subpath:

```text
/JV-Box3D-Web-Public/
```

## Allowed release payload

A reviewed `release/r0` artifact may contain only the files required to run and audit the static application, such as:

```text
index.html
assets/**
receipts/**
THIRD_PARTY_NOTICES.md
release-manifest.json
.nojekyll
README.md
404.html                 optional, only when deliberately required
```

The final allowlist must be generated from the actual artifact and reviewed before promotion. This list does not authorize files merely because they match a broad directory name.

## Prohibited payload

The public artifact must not contain:

- the private source tree or private Git history;
- `node_modules`, package caches, build workspaces or test fixtures;
- the JSPREV2 private scan, scan index, scan textures or the `/__jv_scan__/` runtime dependency;
- absolute Windows, Linux or container paths;
- secrets, credentials, personal data or unreviewed provenance fields;
- remote network requests or URLs outside an explicit reviewed allowlist;
- source maps unless separately reviewed and approved;
- unused laboratory vehicle assets or inactive proof fixtures;
- a manifest claiming publication or acceptance that did not occur.

## Required release evidence

Before promotion, the artifact receipt must bind at least:

- private source repository identity;
- exact source commit and Git tree;
- clean working-tree state before and after build;
- exact Node, npm, TypeScript and Vite versions;
- package-lock SHA-256 and normalized dependency evidence;
- release profile `MAP_ONLY_R0`;
- target base path `/JV-Box3D-Web-Public/`;
- complete sorted artifact file table with byte counts and SHA-256;
- third-party notice presence;
- static HTML/CSS/JavaScript network and path audit;
- runtime browser request capture;
- desktop and real-phone validation tied to the artifact hash;
- owner acceptance of the exact artifact.

## Promotion and rollback

Promotion must copy the already validated bytes. The public repository must not rebuild private source. The previous accepted artifact commit must remain known so `release/r0` can be rolled back by a normal, reviewed branch update.

GitHub Pages activation is a separate final operation after the promoted branch, repository subpath behavior and rollback have been verified.
