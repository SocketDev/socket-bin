/**
 * @file Cross-org publish allowlist for socket-bin. Each entry authorizes
 *   one (source-repo, build-workflow, tag-pattern) tuple to publish under
 *   `@socketbin/<prefix><triplet>`.
 *
 *   The allowlist is the trust boundary: adding a row is a PR review.
 *   Each row must independently pass the second trust gate — a successful
 *   `gh attestation verify --signer-workflow=<row.attestationSubject>`
 *   against the downloaded artifact — before publishing proceeds.
 *
 * @see scripts/util/source-allowlist.mts (cascade-fed from
 *   socket-wheelhouse template) for the `SourceAllowlistEntry` type.
 * @see scripts/util/pack-app-triplets.mts for the canonical triplet set.
 */

import { PACK_APP_TRIPLETS } from './util/pack-app-triplets.mts'
import { buildAttestationSubject } from './util/source-allowlist.mts'
import type { SourceAllowlistEntry } from './util/source-allowlist.mts'

/**
 * Every authorized cross-org publish for `@socketbin/*` tail packages.
 * Ordered by `familyId` ASCII byte order so additions sit deterministically.
 */
export const SOURCE_ALLOWLIST: readonly SourceAllowlistEntry[] = [
  // ultrathink/acorn — standalone parser CLI binaries built by ultrathink's
  // Rust crate in `packages/acorn/lang/rust/crates/cli/`. The `build-rust.yml`
  // matrix produces a per-triplet tarball, uploads them to a GH Release
  // tagged `acorn-rust-<semver>`, and signs them via GitHub Actions OIDC.
  // socket-bin verifies + republishes under `@socketbin/acorn-*`.
  {
    sourceRepo: 'SocketDev/ultrathink',
    familyId: 'ultrathink-acorn',
    workflowPath: '.github/workflows/build-rust.yml',
    tagPattern: /^acorn-rust-\d+\.\d+\.\d+(?:-[\w.]+)?$/,
    targetScope: '@socketbin',
    namePrefix: 'acorn-',
    triplets: PACK_APP_TRIPLETS,
    attestationSubject: buildAttestationSubject({
      sourceRepo: 'SocketDev/ultrathink',
      workflowPath: '.github/workflows/build-rust.yml',
      tagGlob: 'acorn-rust-*',
    }),
    maintainer: '@jdalton',
  },
] as const satisfies readonly SourceAllowlistEntry[]
