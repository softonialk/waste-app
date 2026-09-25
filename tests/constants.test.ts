import { describe, expect, it } from "vitest";
import { addDays, colomboTimeNow, colomboToday, isValidPhone, normalizePhone } from "../lib/constants";

describe("normalizePhone", () => {
  it.each([
    ["0771234567", "0771234567"],
    ["077 123 4567", "0771234567"],
    ["077-123-4567", "0771234567"],
    ["+94771234567", "0771234567"],
    ["+94 77 123 4567", "0771234567"],
    ["94771234567", "0771234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
    expect(isValidPhone(input)).toBe(true);
  });

  it.each(["0112345678", "077123456", "+9477123456789", "", "abc"])("rejects %s", (input) => {
    expect(isValidPhone(input)).toBe(false);
  });
});

describe("Sri Lanka dates", () => {
  it("uses Colombo time regardless of the server time zone", () => {
    // 20:00 UTC is 01:30 the next day in Sri Lanka (UTC+5:30).
    const lateUtc = new Date("2026-09-25T20:00:00Z");
    expect(colomboToday(lateUtc)).toBe("2026-09-26");
    expect(colomboTimeNow(lateUtc)).toBe("01:30");
  });

  it("adds days across month ends", () => {
    expect(addDays("2026-09-25", 30)).toBe("2026-10-25");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
