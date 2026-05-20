/**
 * @file socket-bin's source-allowlist — the trust boundary for every
 *   `@socketbin/*` CLI-tail this repo publishes. Each entry is one
 *   (source-repo, build-workflow, tag-pattern) tuple authorized to mint a
 *   family of npm tails. Adding a row is a fleet-level review (new trust
 *   grant); removing a row immediately revokes that family's ability to
 *   publish through socket-bin.
 *
 *   The publisher (`scripts/publish-cross-org.mts`) reads this array and
 *   refuses any publish whose `(sourceRepo, releaseTag)` doesn't match a
 *   row. Allowlist match is layer 1 of the trust gate; artifact attestation
 *   verification via `gh attestation verify` is layer 2. Both must pass.
 *
 *   Currently empty: the binsuite tail packages this repo will publish are
 *   still being scaffolded (tracked separately). When the first family
 *   lands, add its row here BEFORE merging the package directory — the
 *   publisher refuses publish attempts for unknown families, so the
 *   allowlist row is the trust grant that turns the package directory on.
 *
 *   Schema lives in the fleet (`scripts/fleet/util/source-allowlist.mts`);
 *   this file ships only the data + a typed export.
 */

import {
  EMPTY_ALLOWLIST,
  type SourceAllowlistEntry,
} from './fleet/util/source-allowlist.mts'

export const SOURCE_ALLOWLIST: readonly SourceAllowlistEntry[] =
  EMPTY_ALLOWLIST
