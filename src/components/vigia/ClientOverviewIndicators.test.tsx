import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ClientOverviewIndicators } from "./ClientOverviewIndicators";

afterEach(() => cleanup());

describe("Indicadores compactos da visão geral", () => {
  it("mostra IMC calculado apenas com peso e altura reais e as metas recebidas", () => {
    render(<ClientOverviewIndicators heightCm={174} weightKg={75} waterTarget={2500} protein={120} carbs={220} fat={65} kcal={1900}/>);
    expect(screen.getByText("24,8")).toBeTruthy();
    expect(screen.getByText("2.500")).toBeTruthy();
    expect(screen.getByText("120")).toBeTruthy();
    expect(screen.getByText("220")).toBeTruthy();
    expect(screen.getByText("65")).toBeTruthy();
    expect(screen.getByText("1.900")).toBeTruthy();
  });

  it("não inventa indicadores quando os dados do perfil estão ausentes", () => {
    render(<ClientOverviewIndicators heightCm={null} weightKg={null} waterTarget={null} protein={null} carbs={null} fat={null} kcal={null}/>);
    expect(screen.getByText("Dados incompletos")).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(6);
    expect(screen.getAllByText("Não definida")).toHaveLength(4);
  });
});
