/** Educational energy and macronutrient estimates, not individualized prescriptions.
 * Basal metabolic rate: Mifflin–St Jeor; default activity assumption 1.2.
 * Changes from maintenance are conservative ±10%, not inferred from macro grams.
 */
export type NutritionObjective="equilibrio"|"emagrecimento"|"ganho_peso"|"hipertrofia";
export function objectiveLabel(objective:string|null|undefined){
 return ({equilibrio:"Manutenção do peso",emagrecimento:"Perda de peso",ganho_peso:"Ganho de peso",hipertrofia:"Ganho de massa muscular"} as Record<string,string>)[objective??""]??"Manutenção do peso";
}
export function estimateObjectiveNutrition(args:{weight:number|null;age:number|null;heightCm:number|null;sex:string|null;objective:string|null;activityFactor?:number}){
 const {weight,age,heightCm,sex,objective}=args;
 const sexKey=sex?.toLowerCase();
 const offset=sexKey==="male"||sexKey==="masculino"||sexKey==="m"?5:sexKey==="female"||sexKey==="feminino"||sexKey==="f"?-161:null;
 const valid=weight!==null&&weight>=30&&weight<=250&&age!==null&&age>=18&&age<=100&&heightCm!==null&&heightCm>=100&&heightCm<=230&&offset!==null;
 const basal=valid?Math.round(10*weight!+6.25*heightCm!-5*age!+offset!):null;
 const factor=args.activityFactor??1.2;
 const maintenance=basal===null?null:Math.round(basal*factor);
 const adjustment=objective==="emagrecimento"?.9:objective==="ganho_peso"||objective==="hipertrofia"?1.1:1;
 const target=maintenance===null?null:Math.round(maintenance*adjustment);
 const proteinFactor=objective==="hipertrofia"?1.6:objective==="emagrecimento"?1.5:objective==="ganho_peso"?1.3:1;
 const fatFactor=objective==="ganho_peso"?1:objective==="hipertrofia"?.9:.8;
 const protein=weight!==null&&weight>0?Math.round(weight*proteinFactor):null;
 const fat=weight!==null&&weight>0?Math.round(weight*fatFactor):null;
 const carbs=target!==null&&protein!==null&&fat!==null&&target>protein*4+fat*9?Math.round((target-protein*4-fat*9)/4):null;
 return {basal,maintenance,target,protein,fat,carbs,adjustment,activityFactor:factor,valid};
}
