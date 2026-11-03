import { describe,expect,it } from "vitest";
import { gramsForMacro,ingredients,menuForDay,portionNutrition,proteinRange,recipeFits,recipes,recipeTotals } from "./nutrition-catalog";

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
 it("offers all four macros plus fiber for regional foods with sources",()=>{
  const chicken=ingredients.find(x=>x.id==="frango")!;
  expect(chicken.protein).toBe(31.5);
  expect(chicken.carbs).toBe(0);
  expect(chicken.fat).toBe(3.2);
  expect(chicken.kcal).toBe(163);
  expect(chicken.provenance).toBe("TACO");
  expect(ingredients).toHaveLength(66);
  expect(ingredients.filter(x=>x.protein!==null&&x.carbs!==null&&x.fat!==null).length).toBe(63);
 });
 it("converts 100g and calculated portions without pretending labels are verified",()=>{
  const chicken=ingredients.find(x=>x.id==="frango")!;
  expect(gramsForMacro(chicken,"protein",31.5)).toBe(100);
  expect(portionNutrition(chicken,200)).toMatchObject({protein:63,carbs:0,fat:6.4,kcal:326});
  const banana=ingredients.find(x=>x.id==="banana_prata")!;
  expect(gramsForMacro(banana,"carbs",26)).toBe(100);
  const neston=ingredients.find(x=>x.id==="neston")!;
  expect(gramsForMacro(neston,"protein",20)).toBeNull();
  expect(portionNutrition(neston,100).protein).toBeNull();
 });
 it("does not calculate an unfeasible target when food nutrient is zero",()=>{
  const waterLike=ingredients.find(x=>x.id==="cha_camomila")!;
  expect(gramsForMacro(waterLike,"protein",15)).toBeNull();
  expect(gramsForMacro(waterLike,"fat",15)).toBeNull();
  expect(gramsForMacro(waterLike,"carbs",-1)).toBeNull();
 });

});
