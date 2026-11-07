export type WaterRecordForEstimate={recordedAt:string;amountMl:number};
export type NextHydrationEstimate={atMs:number;intervalMinutes:number;immediate:boolean;basedOnLastRecord:boolean};

/**
 * Estimates a reminder time for the homepage only. The intervals mirror the
 * existing adaptive reminder spacing in the database; they are organizational
 * reminder gaps, not a medical hydration prescription.
 */
export function estimateNextHydrationReminder(
  nowMs:number,
  lastWater:WaterRecordForEstimate|null,
  cutoffMs:number,
):NextHydrationEstimate|null{
  if(!Number.isFinite(nowMs)||!Number.isFinite(cutoffMs)||nowMs>=cutoffMs)return null;
  const recordedMs=lastWater?Date.parse(lastWater.recordedAt):Number.NaN;
  const basedOnLastRecord=Number.isFinite(recordedMs)&&recordedMs<=nowMs;
  const amount=basedOnLastRecord?lastWater!.amountMl:0;
  const intervalMinutes=amount>=750?90:amount>=500?75:amount>=300?60:45;
  const baseMs=basedOnLastRecord?recordedMs:nowMs;
  const proposedMs=baseMs+intervalMinutes*60_000;
  const atMs=Math.max(nowMs,proposedMs);
  if(atMs>cutoffMs)return null;
  return {atMs,intervalMinutes,immediate:proposedMs<=nowMs,basedOnLastRecord};
}
