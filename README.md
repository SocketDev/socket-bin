# socket-bin

[![CI](https://github.com/SocketDev/socket-bin/actions/workflows/ci.yml/badge.svg)](https://github.com/SocketDev/socket-bin/actions/workflows/ci.yml)

Socket's `@socketbin/*` npm packages are **published from** this repo. The
GitHub Actions workflow here is the one authorized to push new versions
to npm. The binaries themselves (SEA-packed Node.js apps, build tooling,
models) are _built_ in
[socket-btm](https://github.com/SocketDev/socket-btm); this repo only
takes finished binaries, verifies them, and publishes them.

## Why this repo exists

The npm registry has a feature called **trusted publishing**: instead of
storing a long-lived npm token in CI secrets, you tell npm "the GitHub
Actions workflow at `<owner>/<repo>` is allowed to publish package X."
When that workflow runs, it asks GitHub for a short-lived OIDC token,
presents it to npm, and npm verifies it before accepting the publish.

Because trust is bound to one repo, we split build from publish:

- **socket-btm** builds binaries and uploads them to GitHub Releases,
  with embedded SHA-256 checksums.
- **socket-bin** (this repo) downloads those binaries, verifies the
  hashes, and is the only repo allowed to push to npm under the
  `@socketbin/*` scope.

Sister repo:
[socket-addon](https://github.com/SocketDev/socket-addon) does the same
for `@socketaddon/*` NAPI `.node` addons.

## Install

End users install the published packages, not this repo:

```sh
npm install @socketbin/<tool>
```

The umbrella package declares each per-platform package as
`optionalDependencies` with `os` + `cpu` constraints, and npm installs
only the matching one.

## Usage

Repository layout:

```
packages/
  build-infra/                             # shared helpers
    lib/release-checksums/
      core.mts                             # parse + hash + verify
      consumer.mts                         # download from sibling GH releases
    release-assets.json                    # release tag + per-asset SHA-256
    release-assets.schema.json             # JSON Schema validating the .json
  <tool>/                                  # umbrella package on npm
  <tool>-<platform>-<arch>/                # per-platform shims
scripts/
  publish.mts                              # the actual orchestrator
```

How a publish actually goes:

1. socket-btm finishes a build and cuts a GitHub Release like
   `<tool>-YYYYMMDD-<short-sha>`. The release contains the binary
   tarballs (one per platform-arch) plus a `checksums.txt` listing the
   SHA-256 of each.
2. Someone here updates `packages/build-infra/release-assets.json` with
   the new tag and the new per-asset SHA-256s. The `$schema` pointer in
   that file makes editors autocomplete + flag typos.
3. Someone triggers the GitHub Actions workflow at
   `.github/workflows/provenance.yml`. The workflow runs
   `scripts/publish.mts`, which:
   - Reads the embedded SHA-256s.
   - Downloads each artifact from socket-btm's GH Release.
   - Hashes the downloaded file and compares against the embedded
     SHA-256. Mismatch = abort the whole run, no packages published.
   - Stages the per-platform package in `os.tmpdir()` so the working
     tree is never mutated, drops the verified binary into the stage,
     and runs `pnpm publish` from there.
   - Repeats for each platform, then publishes the umbrella package
     last (its `optionalDependencies` references the per-platforms by
     exact version, so they have to land on npm first).

If a checksum doesn't match, nothing publishes — fail-loudly.

## Development

<details>
<summary>Contributor commands</summary>

```sh
pnpm install              # install dependencies + git hook setup
pnpm run check            # lint + type check
pnpm run lint             # lint files modified vs HEAD
pnpm run lint --all       # lint the whole workspace
pnpm run fix              # auto-fix lint + format
pnpm run test             # run vitest scoped to changes
pnpm run test --all       # full vitest suite
pnpm run cover            # vitest with coverage
pnpm run security         # AgentShield + zizmor scans
pnpm run setup            # download zizmor + sfw with sha256 verification
pnpm run update           # bump dependencies (taze)
pnpm run publish:dry      # stage + verify, but don't actually publish
pnpm run publish:ci       # full publish — CI only, requires OIDC
pnpm run clean            # remove caches
```

</details>

## License

MIT (per published package).
