import { Info } from "lucide-react";
import type { ReactNode } from "react";

/** Explicação discreta de como cada número é calculado: fechada por padrão, abre com um toque. */
export function HowItWorks({ title = "Como é calculado", children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <details className={`group/how rounded-lg border border-border/60 bg-muted/20 text-xs ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5 font-semibold text-muted-foreground transition hover:text-foreground [&::-webkit-details-marker]:hidden">
        <Info size={13} aria-hidden="true" className="shrink-0" />
        {title}
        <span aria-hidden="true" className="ml-auto text-[10px] transition-transform group-open/how:rotate-180">▾</span>
      </summary>
      <div className="grid gap-1.5 border-t border-border/50 px-2.5 py-2 leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_li]:ml-4 [&_li]:list-disc">{children}</div>
    </details>
  );
}

export const hydrationHowTo = (
  <>
    <p>
      <strong>Meta diária:</strong> 30 ml por kg de peso, mantida dentro da faixa de referência de líquidos para o seu sexo (EFSA 2010 e NASEM 2004): homens 2,0 a 3,0 L, mulheres 1,6 a 2,2 L. Sem sexo informado, usamos a média das duas faixas.
    </p>
    <ul>
      <li>Treino: soma-se a reposição do suor, de 350 a 750 ml por hora conforme o seu nível de transpiração (ACSM 2007), com teto de 1,5 L.</li>
      <li>Idade e objetivo não aumentam a quantidade de água.</li>
      <li>Café, chá, sucos e leite contam como líquido; água de coco e isotônico também.</li>
    </ul>
    <p>
      <strong>Intervalos:</strong> os rins eliminam cerca de 0,8 a 1,0 L por hora. Por isso o app sugere no máximo 500 ml por hora, doses de até 500 ml e pelo menos 30 min entre elas. Beber demais de uma vez dilui o sódio do sangue (hiponatremia).
    </p>
    <p>Estimativa educativa. Doença renal ou cardíaca, restrição de líquidos, diuréticos, gestação e amamentação pedem orientação profissional.</p>
  </>
);

export const foodHowTo = (
  <>
    <p>
      <strong>Calorias e nutrientes:</strong> cada alimento é reconhecido pelo nome e multiplicado pela quantidade. Valores por 100 g vêm da tabela TACO (Unicamp), do IBGE ou de estimativas indicadas no próprio alimento.
    </p>
    <ul>
      <li>Sem quantidade, usamos a porção usual (1 pão francês = 50 g, 1 ovo = 50 g, 1 concha de feijão = 100 g).</li>
      <li>Informe a quantidade no campo de porção (por exemplo 150 g) para um cálculo mais fiel.</li>
      <li>Preparos mudam o resultado: frito tem mais gordura que cozido ou assado.</li>
    </ul>
    <p>Os valores são aproximados e não substituem o rótulo nem a orientação de nutricionista.</p>
  </>
);

export const drinkHowTo = (
  <>
    <p>
      <strong>Volume e calorias:</strong> cada bebida usa o volume escolhido (copo de 200 ml, caneca de 300 ml…) e os valores por 100 ml da tabela TACO, do IBGE ou de estimativas indicadas. Açúcar, leite ou leite em pó contam à parte.
    </p>
    <p>
      <strong>Hidratação:</strong> o volume entra no total de líquidos do dia. Mais de 500 ml de uma vez, ou mais de 500 ml por hora, gera um aviso para proteger os rins.
    </p>
  </>
);

export const weightHowTo = (
  <>
    <p>
      <strong>IMC:</strong> peso em kg dividido pela altura em metros ao quadrado. Faixas da OMS: abaixo de 18,5, abaixo do peso; 18,5 a 24,9, adequado; 25 a 29,9, sobrepeso; 30 ou mais, obesidade.
    </p>
    <p>O IMC não separa músculo de gordura e não vale para crianças, gestantes e atletas de força. A média do gráfico suaviza as oscilações do dia a dia.</p>
  </>
);
