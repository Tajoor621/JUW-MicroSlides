import { ScientificText } from "./scientific-text";
import type { Slide } from "@/lib/types";
import { TeachingDiagram } from "./teaching-diagram";
export function LectureSlideContent({ slide, reveal = 999 }: { slide: Slide; reveal?: number }) {
  const box = "rounded border border-current p-3";
  const field = (label: string, value: string | undefined) =>
    value ? (
      <section className={box}>
        <h3 className="text-base font-semibold">{label}</h3>
        <p className="mt-1 text-lg leading-snug">
          <ScientificText text={value} />
        </p>
      </section>
    ) : null;
  const table = slide.scientificTable;
  const diagram = slide.teaching?.diagram;
  return (
    <div data-lecture-content className="grid min-h-0 grid-cols-2 gap-5 text-lg">
      {slide.layout === "common-misconceptions" ? (
        <aside className="col-span-2 rounded border-2 border-current p-5">
          <h3 className="text-xl font-semibold">
            Common misconceptions — source-supported correction
          </h3>
          {slide.bullets.map((text, i) => (
            <p key={i} className="mt-4 text-xl">
              <ScientificText text={text} />
            </p>
          ))}
        </aside>
      ) : slide.layout === "learning-objectives" ? (
        <ol className="col-span-2 space-y-4 text-2xl">
          {(slide.learningObjectives?.length ? slide.learningObjectives : slide.bullets).map(
            (s, i) => (
              <li key={i}>
                {i + 1}. <ScientificText text={s} />
              </li>
            ),
          )}
        </ol>
      ) : slide.layout === "assessment" ? (
        <div className="col-span-2 space-y-3">
          {slide.assessment?.map((q, i) => (
            <section key={i} className={box}>
              <h3 className="text-lg font-semibold">
                {i + 1}. <ScientificText text={q.question} />
              </h3>
              {q.kind === "image" && slide.media.find((m) => m.id === q.mediaId) && (
                <img
                  src={slide.media.find((m) => m.id === q.mediaId)!.src}
                  alt={
                    slide.teaching?.altText || slide.media.find((m) => m.id === q.mediaId)!.title
                  }
                  className="mt-2 max-h-32 max-w-full object-contain"
                />
              )}
              {q.options.length > 0 && (
                <ol className="mt-1 grid grid-cols-2 gap-2 text-base">
                  {q.options.map((o, j) => (
                    <li key={j}>
                      {String.fromCharCode(65 + j)}. <ScientificText text={o} />
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      ) : slide.layout === "lab-protocol" && slide.protocol ? (
        <>
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Materials & procedure</h3>
            {diagram && (
              <div className="max-w-56">
                <TeachingDiagram
                  kind={diagram}
                  label={slide.teaching?.diagramLabel}
                  alt={slide.teaching?.altText}
                />
              </div>
            )}
            {slide.protocol.materials.length > 0 && <p>{slide.protocol.materials.join(" · ")}</p>}
            <ol className="space-y-3">
              {slide.protocol.steps.map((s, i) => (
                <li
                  key={i}
                  className={
                    (
                      slide.revealSteps?.length
                        ? !slide.revealSteps.includes(i) || slide.revealSteps.indexOf(i) < reveal
                        : i < reveal
                    )
                      ? ""
                      : "invisible"
                  }
                >
                  {i + 1}. {s.action}{" "}
                  <strong>{s.timing || "Timing requires source verification"}</strong>
                </li>
              ))}
            </ol>
            {!slide.protocol.steps.length &&
              slide.bullets.map((s, i) => (
                <p key={i}>
                  <ScientificText text={s} />
                </p>
              ))}
          </section>
          <section className="space-y-3">
            {field("Interpretation", slide.protocol.interpretation)}
            {field("Quality control", slide.protocol.qc)}
            {field("Biosafety & PPE", slide.protocol.biosafety)}
            {field("Troubleshooting", slide.protocol.troubleshooting)}
          </section>
        </>
      ) : slide.layout === "clinical-case" && slide.caseData ? (
        <>
          <section className="space-y-3">
            {slide.caseData.phase === "presentation" ? (
              <>
                {field(`Case ${slide.caseData.caseNumber} — vignette`, slide.caseData.vignette)}
                {field("Differential diagnosis", slide.caseData.differential)}
                {field("Laboratory work-up", slide.caseData.workup)}
              </>
            ) : (
              <>
                {field("Expected results", slide.caseData.results)}
                {field("Final diagnosis", slide.caseData.diagnosis)}
              </>
            )}
            {slide.media[0] && (
              <img
                src={slide.media[0].src}
                alt={slide.teaching?.altText || slide.media[0].altText || slide.media[0].title}
                className="max-h-40 max-w-full object-contain"
              />
            )}
          </section>
          <section className="space-y-3">
            {slide.caseData.phase === "resolution" &&
              field("Management & infection control", slide.caseData.management)}
            {slide.caseData.questions.map((q, i) => (
              <p key={i} className="font-semibold">
                Q: {q}
              </p>
            ))}
          </section>
        </>
      ) : table ? (
        <table className="col-span-2 w-full border-collapse text-lg">
          <caption className="mb-3 text-left font-semibold">{table.caption}</caption>
          <thead>
            <tr>
              {table.headers.map((h, i) => (
                <th className="border border-current p-3 text-left" key={i}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td className="border border-current p-3" key={j}>
                    <ScientificText text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : slide.layout === "growth-curve" && slide.chart ? (
        <>
          <svg
            data-teaching-diagram
            role="img"
            aria-label={slide.chart.title}
            viewBox="0 0 500 300"
          >
            <title>{slide.chart.title}</title>
            <line x1="55" y1="240" x2="470" y2="240" stroke="currentColor" />
            <line x1="55" y1="240" x2="55" y2="30" stroke="currentColor" />
            {(() => {
              const pts = slide.chart!.points;
              if (!pts.length) return null;
              const xs = pts.map((p) => p.x),
                ys = pts.map((p) => p.y),
                minX = Math.min(...xs),
                maxX = Math.max(...xs),
                minY = Math.min(...ys),
                maxY = Math.max(...ys);
              const x = (v: number) => 55 + ((v - minX) / (maxX - minX || 1)) * 400,
                y = (v: number) => 240 - ((v - minY) / (maxY - minY || 1)) * 200;
              return pts.map((p, i) => (
                <g key={i}>
                  <circle cx={x(p.x)} cy={y(p.y)} r="3" fill="currentColor" />
                  {i > 0 && (
                    <line
                      x1={x(pts[i - 1].x)}
                      y1={y(pts[i - 1].y)}
                      x2={x(p.x)}
                      y2={y(p.y)}
                      stroke="currentColor"
                    />
                  )}
                  <text x={x(p.x)} y="260" fontSize="12">
                    {p.x}
                  </text>
                  <text x="5" y={y(p.y)} fontSize="12">
                    {p.y}
                  </text>
                </g>
              ));
            })()}
            <text x="160" y="290" fontSize="14">
              {slide.chart.xLabel}
            </text>
            <text x="60" y="20" fontSize="14">
              {slide.chart.yLabel}
            </text>
          </svg>
          <section>
            {slide.bullets.map((b, i) => (
              <p key={i}>{b}</p>
            ))}
            <p className="mt-3 text-sm">{slide.chart.sourceUrl}</p>
          </section>
        </>
      ) : slide.layout === "taxonomy-tree" && slide.taxonomy?.length ? (
        <>
          <ol className="space-y-3">
            {slide.taxonomy.map((n, i) => (
              <li key={i} className="rounded border border-current px-3 py-1 text-lg">
                {n.parent >= 0 ? `${slide.taxonomy![n.parent]?.label || "Parent"} → ` : ""}
                <ScientificText text={n.label} />
              </li>
            ))}
          </ol>
          <section>
            {slide.bullets.map((b, i) => (
              <p key={i}>{b}</p>
            ))}
          </section>
        </>
      ) : (
        <>
          <section className="space-y-3">
            {diagram ? (
              <TeachingDiagram
                kind={diagram}
                label={slide.teaching?.diagramLabel}
                alt={slide.teaching?.altText}
              />
            ) : slide.media[0] ? (
              <img
                src={slide.media[0].src}
                alt={slide.teaching?.altText || slide.media[0].altText || slide.media[0].title}
                className="max-h-64 max-w-full object-contain"
              />
            ) : null}
            {slide.teaching?.definition && (
              <p className="text-xl font-semibold">
                <ScientificText text={slide.teaching.definition} />
              </p>
            )}
            {slide.teaching?.mechanism && (
              <p className="mt-3 text-lg">
                <ScientificText text={slide.teaching.mechanism} />
              </p>
            )}
            {slide.learningObjectives?.map((x, i) => (
              <p key={i}>{x}</p>
            ))}
          </section>
          <ul className="space-y-4 text-xl">
            {slide.bullets.map((b, i) => (
              <li key={i} className={i < reveal ? "" : "invisible"}>
                <ScientificText text={b} />
              </li>
            ))}
          </ul>
        </>
      )}
      {slide.clinicalPearl && (
        <aside className="col-span-2 rounded border-2 border-current p-3">
          <strong>Clinical pearl:</strong> <ScientificText text={slide.clinicalPearl} />
        </aside>
      )}
      {slide.keyTakeaway && (
        <aside className="col-span-2 rounded border-l-4 border-current p-3">
          <strong>Key takeaway:</strong> <ScientificText text={slide.keyTakeaway} />
        </aside>
      )}
    </div>
  );
}
