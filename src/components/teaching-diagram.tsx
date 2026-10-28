import type { Teaching } from "@/lib/teaching";
export function TeachingDiagram({
  kind,
  label = "",
  alt = "",
  color = "#246b9e",
  steps,
}: {
  kind: NonNullable<Teaching["diagram"]>;
  label?: string;
  alt?: string;
  color?: string;
  steps?: string[];
}) {
  const points = [70, 140, 210, 280];
  return (
    <svg
      data-teaching-diagram
      viewBox="0 0 360 230"
      className="h-auto max-h-[260px] w-full"
      width="360"
      height="230"
      role="img"
      aria-label={alt || `${kind} conceptual schematic; not to scale`}
    >
      <title>{alt || kind}</title>
      <rect x="8" y="8" width="344" height="214" fill="#ffffff" stroke={color} />
      <text
        x="20"
        y="34"
        fontSize={Math.min(15, 310 / Math.max(1, (label || kind).length * 0.6))}
        fill="#17344c"
      >
        {label || kind}
      </text>
      {["viral-cycle", "conjugation", "one-health", "biofilm-stages"].includes(kind) ? (
        <>
          {kind === "one-health" ? (
            <>
              <line x1="105" y1="84" x2="255" y2="84" stroke={color} />
              <line x1="105" y1="84" x2="105" y2="150" stroke={color} />
              <line x1="255" y1="84" x2="105" y2="150" stroke={color} />
              <line x1="255" y1="84" x2="255" y2="150" stroke={color} />
              {["Humans", "Animals", "Environment", "Shared exposure"].map((step, i) => (
                <g key={step}>
                  <rect
                    x={25 + (i % 2) * 165}
                    y={65 + Math.floor(i / 2) * 65}
                    width="145"
                    height="35"
                    fill="#d7e5ef"
                    stroke={color}
                  />
                  <text
                    x={35 + (i % 2) * 165}
                    y={87 + Math.floor(i / 2) * 65}
                    fontSize="12"
                    fill="#17344c"
                  >
                    {step}
                  </text>
                </g>
              ))}
            </>
          ) : (
            <>
              {(steps?.length === 4
                ? steps
                : kind === "viral-cycle"
                  ? [
                      "Attachment",
                      "Entry / uncoating",
                      "Genome / protein synthesis",
                      "Assembly / release",
                    ]
                  : kind === "conjugation"
                    ? ["Donor cell", "Cell contact", "DNA transfer", "Recipient cell"]
                    : ["Attachment", "Microcolonies", "Maturation", "Dispersal"]
              ).map((step, i) => (
                <g key={step}>
                  <rect
                    x="30"
                    y={48 + i * 32}
                    width="300"
                    height="24"
                    fill="#d7e5ef"
                    stroke={color}
                  />
                  <text x="40" y={65 + i * 32} fontSize="12" fill="#17344c">
                    {i + 1}. {step}
                  </text>
                  {i < 3 && (
                    <>
                      <line x1="180" y1={72 + i * 32} x2="180" y2={80 + i * 32} stroke={color} />
                      <line x1="176" y1={76 + i * 32} x2="180" y2={80 + i * 32} stroke={color} />
                      <line x1="184" y1={76 + i * 32} x2="180" y2={80 + i * 32} stroke={color} />
                    </>
                  )}
                </g>
              ))}
            </>
          )}
          <text x="25" y="187" fontSize="10">
            Conceptual relationships; mechanism varies by system
          </text>
        </>
      ) : kind === "gram-wall" ? (
        <>
          {[80, 100, 120, 140].map((y) => (
            <rect key={y} x="40" y={y} width="280" height="12" fill={color} />
          ))}
          <text x="40" y="185" fontSize="14">
            Peptidoglycan layers (concept)
          </text>
        </>
      ) : kind === "fluorescence" ? (
        <>
          {[60, 110, 160, 210, 260, 300].map((x, i) => (
            <circle key={x} cx={x} cy={90 + (i % 2) * 50} r="12" fill="#159447" />
          ))}
          <text x="40" y="185" fontSize="14">
            Labelled targets; signal ≠ viability
          </text>
        </>
      ) : kind === "enzyme" ? (
        <>
          <circle cx="115" cy="115" r="45" fill={color} />
          <circle cx="225" cy="100" r="14" fill="#d18b21" />
          <line x1="207" y1="104" x2="166" y2="112" stroke="#17344c" strokeWidth="3" />
          <line x1="172" y1="105" x2="166" y2="112" stroke="#17344c" />
          <line x1="174" y1="117" x2="166" y2="112" stroke="#17344c" />
          <text x="80" y="180" fontSize="14">
            E + S ⇌ ES → E + P
          </text>
        </>
      ) : (
        <>
          {kind !== "cross-linking" && (
            <rect
              x="40"
              y="100"
              width="280"
              height="55"
              fill={kind === "entrapment" || kind === "biofilm" ? "#c9e4d3" : "#d7e5ef"}
              stroke={color}
            />
          )}
          {points.map((x, i) => (
            <g key={x}>
              <circle
                cx={x}
                cy={
                  kind === "entrapment" || kind === "biofilm"
                    ? 125
                    : kind === "cross-linking"
                      ? 105 + (i % 2) * 30
                      : kind === "adsorption"
                        ? 86
                        : 80
                }
                r="14"
                fill={color}
              />
              {kind === "covalent" && (
                <line x1={x} y1="94" x2={x} y2="110" stroke="#c94a3c" strokeWidth="4" />
              )}
              {kind === "cross-linking" && i < 3 && (
                <line
                  x1={x + 14}
                  y1={105 + (i % 2) * 30}
                  x2={x + 56}
                  y2={105 + ((i + 1) % 2) * 30}
                  stroke="#c94a3c"
                  strokeWidth="3"
                />
              )}
            </g>
          ))}
          {kind === "diffusion" &&
            points.map((x) => (
              <g key={x}>
                <line x1={x} y1="60" x2={x} y2="135" stroke="#d18b21" strokeWidth="3" />
                <line x1={x - 6} y1="127" x2={x} y2="135" stroke="#d18b21" />
                <line x1={x + 6} y1="127" x2={x} y2="135" stroke="#d18b21" />
              </g>
            ))}
          <text x="40" y="185" fontSize="14">
            {kind === "adsorption"
              ? "Reversible surface interactions"
              : kind === "covalent"
                ? "Enzyme–support chemical bonds"
                : kind === "entrapment"
                  ? "Confinement in a permeable matrix"
                  : kind === "cross-linking"
                    ? "Inter-enzyme links; carrier optional"
                    : kind === "biofilm"
                      ? "Cells in an extracellular matrix"
                      : "Transport, access and reaction"}
          </text>
        </>
      )}
      <text x="20" y="211" fontSize="10" fill="#52616b">
        Conceptual template · not to scale · inspect before teaching
      </text>
    </svg>
  );
}
