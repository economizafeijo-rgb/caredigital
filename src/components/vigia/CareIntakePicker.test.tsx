import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CareIntakePicker } from "./CareIntakePicker";

describe("CareDigital: categorias ilustradas de consumo",()=>{
  it("mostra 13 bebidas com ícone, incluindo energético, shake e suplemento",()=>{
    const html=renderToStaticMarkup(<CareIntakePicker group="beverage" value="cha" onChange={()=>{}}/>);
    expect((html.match(/data-intake-kind=/g)||[]).length).toBe(13);
    for(const name of ["energetico","shake","suplemento","agua_coco","isotonico","vitamina"]){
      expect(html).toContain(`data-intake-kind="${name}"`);
    }
    expect((html.match(/<svg/g)||[]).length).toBe(13);
    expect(html).toContain('data-intake-kind="cha"');
    expect(html).toContain('aria-pressed="true"');
  });
  it("mostra 10 categorias alimentares com ícone, desde frutas até refeições completas",()=>{
    const html=renderToStaticMarkup(<CareIntakePicker group="food" value="fruta" onChange={()=>{}}/>);
    expect((html.match(/data-intake-kind=/g)||[]).length).toBe(10);
    for(const name of ["fruta","almoco","jantar","ceia","cafe_manha","refeicao"]){
      expect(html).toContain(`data-intake-kind="${name}"`);
    }
    expect((html.match(/<svg/g)||[]).length).toBe(10);
  });
});
