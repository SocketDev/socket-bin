# socket-bin

Socket's `@socketbin/*` npm packages are **published from** this repo.
The GitHub Actions workflow here is the one authorized to push new
versions to npm. The binaries themselves (SEA-packed Node.js apps,
build tooling, models) are _built_ in
[socket-btm](https://github.com/SocketDev/socket-btm); this repo only
takes finished binaries, verifies them, and publishes them.

## Why this repo exists

The npm registry has a feature called **trusted publishing**: instead
of storing a long-lived npm token in CI secrets, you tell npm "the
GitHub Actions workflow at `<owner>/<repo>` is allowed to publish
package X." When that workflow runs, it asks GitHub for a short-lived
OIDC token, presents it to npm, and npm verifies it before accepting
the publish.

Because trust is bound to one repo, we split build from publish:

- **socket-btm** builds binaries and uploads them to GitHub Releases,
  with embedded SHA-256 checksums.
- **socket-bin** (this repo) downloads those binaries, verifies the
  hashes, and is the only repo allowed to push to npm under the
  `@socketbin/*` scope.

Sister repo:
[socket-addon](https://github.com/SocketDev/socket-addon) does the
same for `@socketaddon/*` NAPI `.node` addons.

## Layout

```
packages/
  build-infra/                             # shared helpers
    lib/release-checksums/
      core.mts                             # parse + hash + verify
      consumer.mts                         # download from sibling GH releases
    release-assets.json                    # which release tag we're on + per-asset SHA-256
    release-assets.schema.json             # JSON Schema validating the .json above
  <tool>/                                  # umbrella package on npm
  <tool>-<platform>-<arch>/                # per-platform shims
scripts/
  publish.mts                              # the actual orchestrator
```

For per-platform binaries, the umbrella + N per-platform packages
pattern mirrors how Node-native modules ship: the umbrella declares
each per-platform package as `optionalDependencies` with `os` + `cpu`
constraints, and npm installs only the matching one. Consumers run
`npm install @socketbin/<tool>` and get exactly the right binary.

For single-binary tools that don't fan out per-platform, a single
top-level package may suffice.

`release-checksums/` is the **consumer half** of a fleet-wide helper
trio (`core` + `consumer` + `producer`). The producer half lives in
socket-btm — it generates `checksums.txt` at build time. We only need
the consumer half here. The canonical copies are in
[socket-wheelhouse](https://github.com/SocketDev/socket-wheelhouse/tree/main/template/packages/build-infra);
sync-scaffolding flags drift.

## How a publish actually goes

1. socket-btm finishes a build and cuts a GitHub Release like
   `<tool>-YYYYMMDD-<short-sha>`. The release contains the binary
   tarballs (one per platform-arch) plus a `checksums.txt` listing
   the SHA-256 of each.

2. Someone here updates `packages/build-infra/release-assets.json`
   with the new tag and the new per-asset SHA-256s. (The `$schema`
   pointer in that file makes editors autocomplete + flag typos.)

3. Someone triggers the GitHub Actions workflow at
   `.github/workflows/provenance.yml`. The workflow runs
   `scripts/publish.mts`, which:
   - Reads the embedded SHA-256s.
   - Downloads each artifact from socket-btm's GH Release.
   - Hashes the downloaded file and compares against the embedded
     SHA-256. Mismatch = abort the whole run, no packages published.
   - Stages the per-platform package in `os.tmpdir()` (so the working
     tree is never mutated), drops the verified binary into the
     stage, and runs `pnpm publish` from there.
   - Repeats for each platform, then publishes the umbrella package
     last (its `optionalDependencies` references the per-platforms by
     exact version, so they have to land on npm first).

If a checksum doesn't match, nothing publishes — fail-loudly.

## Local commands

```sh
pnpm install              # install dependencies + run husky setup
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

## Drift checks

Several files in this repo are required to be byte-identical to their
counterparts in
[socket-wheelhouse](https://github.com/SocketDev/socket-wheelhouse).
That includes our git hooks, Claude Code hooks + skills, lint config,
and the `release-checksums/` files mentioned above.

To check drift:

```sh
node ../socket-wheelhouse/scripts/sync-scaffolding.mts --target . # socket-hook: allow cross-repo
```

To auto-fix drift:

```sh
node ../socket-wheelhouse/scripts/sync-scaffolding.mts --target . --fix # socket-hook: allow cross-repo
```

## License

MIT (per published package).
