# Third-party notices

Updated: 2026-08-04

This file records third-party software used by the current JV Web reference build. It does **not** grant a license to JV Web source code, Jozz Vehicle source code, vehicle models, scans, textures, scenes, names or other project assets. The project license remains a separate owner decision.

## Distributed browser runtime

### `box3d.js@0.0.2`

Role: JavaScript/WebAssembly bindings bundled into the current `legacy_ts_m6` browser reference runtime.

Exact provenance:

```text
npm package: box3d.js
version: 0.0.2
binding repository: isaac-mason/box3d.js
binding commit: 2617a0ff763a60c9f17cee57c6ea72aab75a5077
npm tarball SHA-256: 020ba0ca3ecfea79d8f776bdca982779e6d13f80ce437bc4a0dac18830bd62dd
license: MIT
```

License text:

```text
MIT License

Copyright (c) 2026 Isaac Mason

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Box3D engine embedded by `box3d.js@0.0.2`

Role: native physics engine compiled into the distributed WebAssembly runtime.

Exact provenance:

```text
repository: erincatto/box3d
commit: 8441b4a06d6d09dcfb0b0f704df4d847d1437b92
tag recorded by the dependency audit: v0.1.0
license: MIT
```

License text:

```text
MIT License

Copyright (c) 2026 Erin Catto

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Development and packaging tools

These packages are pinned development dependencies. They are not the product physics authority.

| Package | Pinned version | Role | License |
|---|---:|---|---|
| Vite | 8.1.5 | development server and static bundle generation | MIT |
| TypeScript | 7.0.2 | static type checking and test compilation | Apache-2.0 |

Vite license attribution:

```text
Copyright (c) 2019-present, VoidZero Inc. and Vite contributors
MIT License
```

TypeScript is distributed under Apache License 2.0 by Microsoft and contributors. Its complete license is included in the installed package as `node_modules/typescript/LICENSE.txt` after the pinned `npm ci`.

## Validation sources

Dependency identity is pinned by:

```text
package.json
package-lock.json
docs/decisions/ADR-0002-pinned-box3d-runtime.md
```

The local foundation gate verifies installed package versions, declared licenses and the normalized `box3d.js` license text before accepting a portable artifact.
