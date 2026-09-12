// Failures a reader of the dashboard can act on, versus transient ones worth retrying.

export const MAX_ATTEMPTS = 3;

/** A failure with a message safe to show the flipbook's owner. */
export class ProcessingError extends Error {
  constructor(
    readonly reason: string,
    readonly retryable = false,
  ) {
    super(reason);
    this.name = "ProcessingError";
  }
}

export function describeFailure(error: unknown): { reason: string; retryable: boolean } {
  if (error instanceof ProcessingError) return { reason: error.reason, retryable: error.retryable };
  const name = (error as { name?: string } | null)?.name;
  if (name === "PasswordException") return { reason: "the PDF is password-protected", retryable: false };
  if (name === "InvalidPDFException" || name === "FormatError") return { reason: "the file is not a readable PDF", retryable: false };
  if (name === "AbortError" || name === "TimeoutError") return { reason: "processing took too long", retryable: true };
  // Storage, database or other infrastructure hiccups: try again later.
  return { reason: "something went wrong on our side", retryable: true };
}

/** Wait before retry n (1-based): 30 s, 2 min, 8 min… capped at 30 min. */
export function backoffMs(attempt: number) {
  return Math.min(30_000 * 4 ** Math.max(0, attempt - 1), 30 * 60_000);
}
