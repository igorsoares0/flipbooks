import { describe, expect, it } from "vitest";
import { backoffMs, describeFailure, ProcessingError } from "./errors";

const named = (name: string) => Object.assign(new Error("x"), { name });

describe("describeFailure", () => {
  it("passes through our own messages", () => {
    expect(describeFailure(new ProcessingError("it has 51 pages and your plan allows 50"))).toEqual({
      reason: "it has 51 pages and your plan allows 50",
      retryable: false,
    });
  });

  it("maps pdf.js errors to messages the owner can act on, without retrying", () => {
    expect(describeFailure(named("PasswordException"))).toEqual({ reason: "the PDF is password-protected", retryable: false });
    expect(describeFailure(named("InvalidPDFException"))).toEqual({ reason: "the file is not a readable PDF", retryable: false });
  });

  it("retries timeouts and infrastructure errors without leaking details", () => {
    expect(describeFailure(named("TimeoutError"))).toMatchObject({ retryable: true });
    const leaky = describeFailure(new Error("connect ECONNREFUSED 10.0.0.3:5432"));
    expect(leaky).toEqual({ reason: "something went wrong on our side", retryable: true });
  });
});

describe("backoffMs", () => {
  it("grows 30 s → 2 min → 8 min and caps at 30 min", () => {
    expect([1, 2, 3, 4, 10].map(backoffMs)).toEqual([30_000, 120_000, 480_000, 1_800_000, 1_800_000]);
  });
});
