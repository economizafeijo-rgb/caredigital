import {describe,expect,it} from "vitest";
import {estimateNextHydrationReminder} from "./hydration-reminder-estimate";

describe("estimativa do próximo lembrete de água",()=>{
 const now=Date.parse("2026-11-07T15:00:00-05:00");
 const cutoff=Date.parse("2026-11-07T22:50:00-05:00");
 const last=(minutesAgo:number,amountMl:number)=>({
  recordedAt:new Date(now-minutesAgo*60_000).toISOString(),amountMl
 });
 it.each([
  [200,45],[300,60],[500,75],[750,90]
 ])("aplica o intervalo organizacional de %i ml: %i minutos",(amount,expected)=>{
  const result=estimateNextHydrationReminder(now,last(0,amount),cutoff);
  expect(result?.intervalMinutes).toBe(expected);
  expect(result?.atMs).toBe(now+expected*60_000);
 });
 it("mostra agora quando o intervalo mínimo já passou",()=>{
  const result=estimateNextHydrationReminder(now,last(120,250),cutoff);
  expect(result?.atMs).toBe(now);
  expect(result?.immediate).toBe(true);
  expect(result?.basedOnLastRecord).toBe(true);
 });
 it("usa uma estimativa inicial de 45 minutos sem registro de água",()=>{
  const result=estimateNextHydrationReminder(now,null,cutoff);
  expect(result?.atMs).toBe(now+45*60_000);
  expect(result?.basedOnLastRecord).toBe(false);
 });
 it("não estima lembretes depois do limite diário",()=>{
  expect(estimateNextHydrationReminder(cutoff,null,cutoff)).toBeNull();
  expect(estimateNextHydrationReminder(now,null,now+30*60_000)).toBeNull();
 });
});
