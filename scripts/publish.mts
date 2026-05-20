/**
 * Publish all `@socketbin/*` packages to npm.
 *
 * SEA-packed binaries are NOT in the working tree — they're downloaded
 * from a signed socket-btm GitHub Release at publish time, verified
 * against the embedded SHA-256 in
 * `packages/build-infra/release-assets.json`, and copied into the
 * staged tmpdir before `pnpm publish` runs.
 *
 * **STATUS: scaffolding stub.** The generic multi-tool implementation
 * is implemented in tandem with task #42 (which rolls the same
 * pattern out to socket-addon for the non-iocraft addons). Until that
 * lands, this stub exits cleanly with a "no packages configured"
 * message so CI smoke-tests pass while we have no real `@socketbin/*`
 * packages yet.
 *
 * Order of operations per binary (when implemented):
 *   1. Skip if `<name>@<version>` already on npm (unless --force).
 *   2. Stage source dir to tmpdir, rewrite `workspace:*` + `catalog:`.
 *   3. Download `<tool>-<tag>-<asset-suffix>` from btm Release.
 *   4. verifyReleaseChecksum → fail loudly on mismatch.
 *   5. Copy verified binary into stage.
 *   6. `pnpm publish` from stage with `--access public --no-git-checks
 *      --ignore-scripts` (and `--provenance` in CI).
 *   7. Clean up stage dir.
 *
 * Usage (when implemented):
 *   pnpm run publish:ci                   # publish with dist-tag=latest
 *   pnpm run publish -- --tag next        # alt dist-tag
 *   pnpm run publish -- --dry-run         # stage + verify, skip publish
 *   pnpm run publish -- --force           # publish even if version exists
 *   pnpm run publish -- --platforms=darwin-arm64,linux-x64
 */

import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { getDefaultLogger } from '@socketsecurity/lib/logger'

const logger = getDefaultLogger()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  logger.info('socket-bin publish (stub)')
  logger.info(`  rootDir: ${rootDir}`)
  logger.info(`  dry-run: ${dryRun}`)
  logger.info('')
  logger.info(
    'No packages configured yet. Implement multi-tool publish flow ' +
      'as part of task #42 / #43 (see .claude/plans/build-publish-handoff.md).',
  )
}

main().catch(e => {
  logger.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
})
