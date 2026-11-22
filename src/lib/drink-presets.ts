import type { BeverageKind } from "./care-intake-categories";

/**
 * Bebidas comuns para escolher num menu suspenso. `text` é o que vai para a descrição do
 * registro e é lido pelo calculador de alimentos (sem " com ", " e " ou vírgulas soltas).
 */
export type DrinkPreset = {
  key: string;
  kind: BeverageKind;
  group: string;
  label: string;
  text: string;
  ml: number;
};
const d = (
  kind: BeverageKind,
  group: string,
  label: string,
  ml: number,
  text = label,
): DrinkPreset => ({ key: `${kind}:${label}`, kind, group, label, text, ml });

export const drinkPresets: DrinkPreset[] = [
  d("cafe", "Café", "Café coado sem açúcar", 100, "café coado"),
  d("cafe", "Café", "Café expresso", 50, "café expresso"),
  d("cafe", "Café", "Café com leite integral", 200, "café com leite"),
  d("cafe", "Café", "Café com leite desnatado", 200, "café com leite desnatado"),
  d("cafe", "Café", "Café com leite em pó", 200, "café com leite em pó"),
  d("cafe", "Café", "Café com leite de gado (leite fresco)", 200, "café com leite de gado"),
  d("cafe", "Café", "Nescafé (café solúvel)", 150, "nescafé"),
  d("cafe", "Café", "Nescafé com leite integral", 200, "nescafé com leite"),
  d("cafe", "Café", "Nescafé com leite em pó", 200, "nescafé com leite em pó"),
  d("leite", "Leite e achocolatado", "Leite integral", 200, "leite integral"),
  d("leite", "Leite e achocolatado", "Leite semidesnatado", 200, "leite semidesnatado"),
  d("leite", "Leite e achocolatado", "Leite desnatado", 200, "leite desnatado"),
  d("leite", "Leite e achocolatado", "Leite em pó dissolvido", 200, "leite em pó dissolvido"),
  d("leite", "Leite e achocolatado", "Nescau (achocolatado com leite)", 250, "nescau"),
  d("leite", "Leite e achocolatado", "Iogurte natural", 170, "iogurte natural"),
  d("suco", "Sucos naturais", "Suco de graviola", 250, "suco de graviola"),
  d("suco", "Sucos naturais", "Suco de maracujá", 250, "suco de maracujá"),
  d("suco", "Sucos naturais", "Suco de goiaba", 250, "suco de goiaba"),
  d("suco", "Sucos naturais", "Suco de acerola", 250, "suco de acerola"),
  d("suco", "Sucos naturais", "Suco de laranja", 250, "suco de laranja"),
  d("suco", "Sucos naturais", "Suco de caju", 250, "suco de caju"),
  d("suco", "Sucos naturais", "Suco de abacaxi", 250, "suco de abacaxi"),
  d("suco", "Sucos naturais", "Suco de manga", 250, "suco de manga"),
  d("suco", "Sucos naturais", "Suco de cupuaçu", 250, "suco de cupuaçu"),
  d("suco", "Sucos naturais", "Suco de cajá (taperebá)", 250, "suco de cajá"),
  d("suco", "Sucos naturais", "Suco de melancia", 250, "suco de melancia"),
  d("suco", "Sucos naturais", "Suco de maçã", 250, "suco de maçã"),
  d("suco", "Sucos naturais", "Limonada sem açúcar", 250, "limonada"),
  d("suco", "Sucos naturais", "Suco de caixinha / néctar", 200, "néctar de caixinha"),
  d("suco", "Sucos naturais", "Suco de uva (envasado)", 200, "suco de uva"),
  d("suco", "Sucos naturais", "Caldo de cana (garapa)", 300, "caldo de cana"),
  d("vitamina", "Vitaminas", "Vitamina de banana com leite", 300, "vitamina de banana"),
  d("vitamina", "Vitaminas", "Vitamina de mamão com leite", 300, "vitamina de mamão"),
  d("vitamina", "Vitaminas", "Abacatada", 250, "abacatada"),
  d("cha", "Chás", "Chá de camomila", 200, "chá de camomila"),
  d("cha", "Chás", "Chá de erva-doce", 200, "chá de erva-doce"),
  d("cha", "Chás", "Chá de capim-santo", 200, "chá de capim-santo"),
  d("cha", "Chás", "Chá de boldo", 150, "chá de boldo"),
  d("cha", "Chás", "Chá de hortelã", 200, "chá de hortelã"),
  d("cha", "Chás", "Chá verde", 200, "chá verde"),
  d("cha", "Chás", "Chá preto ou mate", 200, "chá preto"),
  d("agua_coco", "Água de coco", "Água de coco", 250, "água de coco"),
  d("refrigerante", "Refrigerante", "Refrigerante tipo cola", 250, "refrigerante"),
  d("refrigerante", "Refrigerante", "Refrigerante zero açúcar", 350, "refrigerante zero"),
  d("refrigerante", "Refrigerante", "Guaraná Quinari Zero", 350, "guaraná quinari zero"),
  d("refrigerante", "Refrigerante", "Refrigerante tipo laranja", 350, "refrigerante de laranja"),
  d("refrigerante", "Refrigerante", "Água tônica", 250, "água tônica"),
  d("outra", "Outras", "Cerveja (contém álcool)", 350, "cerveja"),
];

export const drinkGroups = Array.from(new Set(drinkPresets.map((p) => p.group)));
export const drinkPresetFor = (kind: string, description: string) =>
  drinkPresets.find(
    (p) => p.kind === kind && p.text.toLowerCase() === description.trim().toLowerCase(),
  );
