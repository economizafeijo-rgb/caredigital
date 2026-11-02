import {
  Apple, Coffee, Cookie, CupSoda, Citrus, Droplets, FlaskConical, GlassWater,
  Leaf, Milk, Moon, MoonStar, Salad, Sandwich, Soup, Sunrise, Utensils,
  UtensilsCrossed, Zap, type LucideIcon,
} from "lucide-react";
import {
  beverageKinds,foodKinds,foodCategory,beverageCategory,
  type IntakeKind,type FoodKind,type BeverageKind,
} from "@/lib/care-intake-categories";

const icons: Record<IntakeKind,LucideIcon>={
  fruta:Apple,cafe_manha:Sunrise,almoco:Utensils,jantar:MoonStar,lanche:Sandwich,
  ceia:Moon,refeicao:UtensilsCrossed,salada:Salad,sopa:Soup,sobremesa:Cookie,
  agua:Droplets,cha:Leaf,suco:Citrus,cafe:Coffee,energetico:Zap,
  suplemento:FlaskConical,shake:Milk,isotonico:GlassWater,vitamina:Milk,
  leite:Milk,agua_coco:Leaf,refrigerante:CupSoda,outra:GlassWater,
};

export const getCareIntakeIcon=(kind:string):LucideIcon|undefined=>icons[kind as IntakeKind];

export function CareIntakeIcon({kind,size=19,className=""}:{
  kind:string;size?:number;className?:string;
}){
  const Icon=icons[kind as IntakeKind]??GlassWater;
  return <Icon size={size} className={className} aria-hidden="true"/>;
}

type CommonProps={label?:string;compact?:boolean};
type Props=CommonProps&(
  {group:"food";value:FoodKind;onChange:(value:FoodKind)=>void;}|
  {group:"beverage";value:BeverageKind;onChange:(value:BeverageKind)=>void;}
);

export function CareIntakePicker(props:Props){
  const values=props.group==="food"?foodKinds:beverageKinds;
  return <fieldset className="min-w-0">
    <legend className="mb-1.5 text-[11px] font-extrabold text-foreground">
      {props.label??(props.group==="food"?"Categoria alimentar":"Tipo de bebida")}
    </legend>
    <div className={"care-intake-choices grid min-w-0 grid-cols-3 gap-1.5 sm:grid-cols-4 "+(props.compact?"care-intake-choices-compact":"")}>
      {values.map(item=>{
        const chosen=props.value===item.value;
        const Icon=icons[item.value];
        return <button type="button" key={item.value} data-intake-kind={item.value} data-intake-group={props.group} aria-pressed={chosen}
          title={item.hint}
          onClick={()=>{
            if(props.group==="food")props.onChange(item.value as FoodKind);
            else props.onChange(item.value as BeverageKind);
          }}
          className={"care-intake-option flex min-h-[59px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1.5 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary "+
            (chosen?"border-primary bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/.18)]":
              "border-border bg-muted/25 text-foreground hover:border-primary/45 hover:bg-muted/50")}>
          <Icon size={props.compact?19:21} className="shrink-0" strokeWidth={1.85}/>
          <span className="line-clamp-2 text-[10px] font-bold leading-tight">{item.label}</span>
        </button>;
      })}
    </div>
  </fieldset>;
}

export function CareIntakeChoiceTitle({kind}:{kind:string}){
  const category=foodCategory(kind)??beverageCategory(kind);
  return <span className="inline-flex min-w-0 items-center gap-1.5">
    <CareIntakeIcon kind={kind} size={17} className="shrink-0"/>
    <span className="truncate">{category?.label??"Outro consumo"}</span>
  </span>;
}
