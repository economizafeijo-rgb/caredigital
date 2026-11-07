import { describe, expect, it } from "vitest";
import {
  acreAddDays,
  acreDateAtTime,
  acreDateKey,
  acreDateTimeInput,
  acreEndOfDay,
  acreStartOfDay,
  acreTimeLabel,
  formatAcreDateOnly,
} from "./acre-time";

describe("Acre timezone helpers", () => {
  it("uses the Acre calendar day even when UTC has already advanced", () => {
    const instant = new Date("2026-11-07T04:30:00.000Z");
    expect(acreDateKey(instant)).toBe("2026-11-06");
    expect(acreDateTimeInput(instant)).toBe("2026-11-06T23:30");
    expect(acreTimeLabel(instant)).toBe("23:30");
  });

  it("converts Acre wall-clock time to the correct absolute instant", () => {
    expect(acreDateAtTime("2026-11-07", "00:15").toISOString())
      .toBe("2026-11-07T05:15:00.000Z");
  });

  it("builds a full Acre day without using the device timezone", () => {
    expect(acreStartOfDay("2026-11-07").toISOString())
      .toBe("2026-11-07T05:00:00.000Z");
    expect(acreEndOfDay("2026-11-07").toISOString())
      .toBe("2026-11-08T05:00:00.000Z");
  });

  it("adds calendar days across month and year boundaries", () => {
    expect(acreAddDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(acreAddDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("formats date-only values in the Acre timezone", () => {
    expect(formatAcreDateOnly("2026-11-07", { dateStyle: "short" })).toBe("07/11/2026");
  });
});
