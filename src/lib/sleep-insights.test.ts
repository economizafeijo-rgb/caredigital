import { expect, test } from "vitest";
import { sleepMetrics, recommendedRange } from "@/lib/sleep-insights";
test("métricas", () => {
  const logs = [1,2,3,4].map((d) => ({ sleep_date: `2026-11-0${d}`, bed_at: `2026-11-0${d}T04:00:00Z`, wake_at: `2026-11-0${d}T10:00:00Z`, quality: 3 }));
  const m = sleepMetrics(logs, 43)!;
  expect(m.avgHours).toBe(6); expect(m.bedtime).toBe("23:00"); expect(m.wakeTime).toBe("05:00");
  expect(m.idealBedtime).toBe("20:45"); expect(m.caffeineCutoff).toBe("14:45");
  expect(recommendedRange(70).max).toBe(8);
});
