/**
 * @fileoverview Clean derived directories.
 *
 * Routes deletion through `safeDelete` from `@socketsecurity/lib-stable/fs/safe`
 * per the fleet's "no `rm -rf` direct calls" rule (CLAUDE.md
 * Code-style section).
 *
 * Wired in via package.json: `"clean": "node scripts/clean.mts"`.
 */

import { glob } from 'node:fs/promises'
import path from 'node:path'

import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { REPO_ROOT } from './fleet/paths.mts'

const logger = getDefaultLogger()

// oxlint-disable-next-line socket/prefer-node-modules-dot-cache -- this is a deletion target list (per-package leftover .cache dirs), not a new cache location.
const PATTERNS: readonly string[] = ['coverage', 'dist', 'packages/*/.cache']

const root = REPO_ROOT
let removed = 0

for (let i = 0, { length } = PATTERNS; i < length; i += 1) {
  const pattern = PATTERNS[i]!
  for await (const match of glob(pattern, { cwd: root })) {
    const target = path.resolve(root, match)
    await safeDelete(target)
    logger.info(`removed ${match}`)
    removed += 1
  }
}

logger.success(`Cleaned ${removed} path(s).`)
