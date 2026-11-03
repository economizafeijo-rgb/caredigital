import { describe,expect,it } from "vitest";
import { ingredients,menuForDay,proteinRange,recipeFits,recipes,recipeTotals } from "./nutrition-catalog";

describe("CareDigital nutrition safety and planning",()=>{
 it("keeps common regional foods and branded products distinct",()=>{
  expect(ingredients.some(item=>item.id==="banana_prata")).toBe(true);
  expect(ingredients.some(item=>item.id==="macaxeira")).toBe(true);
  expect(ingredients.find(item=>item.id==="neston")?.protein).toBeNull();
  expect(ingredients.find(item=>item.id==="mucilon")?.protein).toBeNull();
 });
 it("does not suggest acidic or high-fat recipes in the opt-in sensitive mode",()=>{
  const acidic=recipes.find(r=>r.id==="suco_ovo_cuscuz")!;
  const acai=recipes.find(r=>r.id==="acai_banana")!;
  const mild=recipes.find(r=>r.id==="sopa_frango")!;
  expect(recipeFits(acidic,"equilibrio",true,[])).toBe(false);
  expect(recipeFits(acai,"equilibrio",true,[])).toBe(false);
  expect(recipeFits(mild,"equilibrio",true,[])).toBe(true);
 });
 it("respects manually excluded ingredients for all goals",()=>{
  const recipe=recipes.find(r=>r.id==="frango_macaxeira")!;
  expect(recipeFits(recipe,"hipertrofia",false,["frango"])).toBe(false);
 });
 it("calculates adult exercise protein reference range and rejects impossible values",()=>{
  expect(proteinRange(70,"hipertrofia")).toEqual({low:98,high:140,perKg:[1.4,2]});
  expect(proteinRange(-1,"hipertrofia")).toBeNull();
 });
 it("creates four real meal suggestions without mandating supper",()=>{
  const p=menuForDay(0,recipes,0,"equilibrio");
  expect(p.map(item=>item.slot.id)).toEqual(["cafe","almoco","jantar","lanche"]);
  expect(p.every(item=>item.recipe!==null)).toBe(true);
  for(const item of p){expect(recipeTotals(item.recipe!).protein).toBeGreaterThanOrEqual(0);}
 });
});
