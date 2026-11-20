/**
 * Cadeado animado para tudo que está registrado, fechado ou desativado.
 * A haste desce e trava uma vez ao aparecer; depois um brilho discreto passa pelo corpo.
 */
export function AnimatedLock({
  size = 16,
  label = "Registrado e protegido",
  className = "",
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`nv-lock inline-grid shrink-0 place-items-center text-emerald-400 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path className="nv-lock-shackle" d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" />
        <rect
          x="4.5"
          y="11"
          width="15"
          height="10"
          rx="2.2"
          fill="currentColor"
          fillOpacity=".16"
        />
        <path className="nv-lock-key" d="M12 15v2.4" strokeWidth="2" />
        <rect
          className="nv-lock-glint"
          x="4.5"
          y="11"
          width="5"
          height="10"
          fill="#fff"
          fillOpacity=".5"
          stroke="none"
        />
      </svg>
    </span>
  );
}
