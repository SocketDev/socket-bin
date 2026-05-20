/**
 * @file Entry point for socket-bin's cross-org tail publishes. Driven by the
 *   `publish-cross-org.yml` workflow's `workflow_dispatch` inputs (mapped
 *   into env vars: `SOURCE_REPO`, `RELEASE_TAG`, `DRY_RUN`). Reads
 *   `scripts/source-allowlist.mts` for the trust boundary, delegates the
 *   download → verify → extract → stage pipeline to the fleet
 *   `stageMultiPackagePublish` runner, and on non-dry-run iterates the
 *   staged tails and `npm publish --provenance` each one.
 *
 *   Mirrors `socket-addon/scripts/publish-cross-org.mts` byte-for-byte
 *   except for the tail-directory convention (`packages/<prefix><triplet>`
 *   is identical in both repos) and the `kind` field on allowlist rows
 *   (socket-addon families are NAPI; socket-bin families are CLI). The
 *   `kind` distinction flows through `buildBinaryPathInTail()`, which
 *   places `bin/<name>[.exe]` instead of `<name>.node`.
 *
 *   The allowlist is empty until the first binsuite family is scaffolded
 *   — the runner refuses on `allowlist-miss`, which is the intended state
 *   for a freshly-scaffolded publisher with no authorized sources yet.
 *
 *   Exit codes:
 *     0 — every requested tail staged + (unless dry-run) published.
 *     1 — any stage or publish failure (the first one; fail-fast).
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { runCommand } from './fleet/util/run-command.mts'
import {
  MultiPackageStageError,
  stageMultiPackagePublish,
  type TailStageOutcome,
} from './fleet/util/multi-package-publish.mts'
import type { GitHubRepoSlug } from './fleet/util/source-allowlist.mts'
import {
  buildBinaryPathInTail,
  findAllowlistEntry,
} from './fleet/util/source-allowlist.mts'
import { SOURCE_ALLOWLIST } from './source-allowlist.mts'

const logger = getDefaultLogger()
const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const STAGING_DIR = path.join(REPO_ROOT, '.cross-org-stage')

function readRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required env: ${name}. Set it via workflow_dispatch input or the calling shell.`,
    )
  }
  return value.trim()
}

function isGitHubRepoSlug(value: string): value is GitHubRepoSlug {
  const parts = value.split('/')
  return parts.length === 2 && parts[0]!.length > 0 && parts[1]!.length > 0
}

async function publishTail(tail: TailStageOutcome): Promise<void> {
  logger.log(`Publishing ${tail.tailName}@${tail.version}…`)
  const exitCode = await runCommand(
    'npm',
    ['publish', '--access', 'public', '--provenance'],
    { cwd: tail.tailDir },
  )
  if (exitCode !== 0) {
    throw new Error(
      `npm publish failed for ${tail.tailName}@${tail.version} (exit ${exitCode}). See above stderr from npm.`,
    )
  }
  logger.success(`Published ${tail.tailName}@${tail.version}`)
}

async function main(): Promise<void> {
  const sourceRepoRaw = readRequiredEnv('SOURCE_REPO')
  if (!isGitHubRepoSlug(sourceRepoRaw)) {
    throw new Error(
      `SOURCE_REPO must be <owner>/<repo>; got ${sourceRepoRaw}.`,
    )
  }
  const sourceRepo: GitHubRepoSlug = sourceRepoRaw
  const releaseTag = readRequiredEnv('RELEASE_TAG')
  const dryRun = process.env['DRY_RUN'] !== 'false'

  const entry = findAllowlistEntry(SOURCE_ALLOWLIST, sourceRepo, releaseTag)
  if (!entry) {
    throw new MultiPackageStageError(
      `No socket-bin allowlist row matches ${sourceRepo} tag ${releaseTag}. Add a SourceAllowlistEntry in scripts/source-allowlist.mts or correct the inputs.`,
      'allowlist-miss',
    )
  }

  logger.log(`socket-bin cross-org publish`)
  logger.log(`  source: ${sourceRepo} @ ${releaseTag}`)
  logger.log(`  family: ${entry.familyId} (${entry.kind} → ${entry.binaryName})`)
  logger.log(`  dry-run: ${dryRun}`)

  const result = await stageMultiPackagePublish({
    allowlist: SOURCE_ALLOWLIST,
    sourceRepo,
    releaseTag,
    tailDirFor: triplet =>
      path.join(REPO_ROOT, 'packages', `${entry.namePrefix}${triplet}`),
    binaryPathInTail: triplet => buildBinaryPathInTail(entry, triplet),
    stagingDir: STAGING_DIR,
    dryRun,
  })

  logger.log(
    `Staged ${result.tails.length} tail(s) for ${result.entry.familyId}@${result.version}`,
  )

  if (dryRun) {
    logger.log('Dry run — skipping npm publish step. Done.')
    return
  }

  for (let i = 0, { length } = result.tails; i < length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await publishTail(result.tails[i]!)
  }

  logger.success(
    `socket-bin cross-org publish complete: ${result.tails.length} tail(s) → ${entry.targetScope}/${entry.namePrefix}*@${result.version}`,
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err: unknown) => {
    logger.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  })
}

export { main }
