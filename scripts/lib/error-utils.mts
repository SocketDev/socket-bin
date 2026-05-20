/**
 * Helpers for extracting displayable text from unknown caught values.
 *
 * Thin wrappers around `@socketsecurity/lib/errors` that preserve this
 * package's "always return a non-empty string" contract for `errorStack`.
 */

import {
  errorMessage as libErrorMessage,
  errorStack as libErrorStack,
} from '@socketsecurity/lib/errors'

export const errorMessage = libErrorMessage

export function errorStack(error: unknown): string {
  const stack = libErrorStack(error)
  return stack ? stack : libErrorMessage(error)
}
