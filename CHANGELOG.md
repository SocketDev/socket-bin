# Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `scripts/source-allowlist.mts`: authoritative allowlist of `(source-repo,
  build-workflow, tag-pattern)` tuples authorized to mint `@socketbin/*`
  CLI-tail packages. Empty until the first binsuite family is scaffolded.
- `scripts/publish-cross-org.mts`: entry-point that reads the allowlist,
  delegates the download → verify → extract → stage pipeline to the fleet
  `stageMultiPackagePublish()` runner, and `npm publish --provenance` per
  staged tail.
- `.github/workflows/publish-cross-org.yml`: `workflow_dispatch` trigger
  (`source-repo`, `release-tag`, `dry-run` inputs) that runs the publisher
  under the workflow's OIDC identity. Default `dry-run: true`; a real
  publish requires the canonical `Allow workflow-dispatch bypass:
  publish-cross-org` phrase in the operator's session.
- `package.json`: `publish:cross-org` script.
