import { NextRequest, NextResponse } from "next/server";
import { generateId } from "@/lib/utils";

/**
 * AI Generation endpoint for JUW MicroSlides
 * In production: connect to OpenAI / Grok / Claude with domain-specific system prompt
 * This is a high-quality structured mock that demonstrates the expected output shape.
 */

const SYSTEM_PROMPT = `You are an expert Microbiology and Infectious Diseases educator and presentation designer at Jinnah University for Women.
Generate professional, evidence-based academic slides.
Rules:
- Use IMRaD or appropriate scientific structure
- Include real-looking citations with PMIDs
- Keep slides concise (title + 4-6 bullets max)
- Always include a References slide
- Prefer Vancouver citation style
- Focus on accuracy for clinical microbiology content`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, paperPmid, userNotes, style = "academic", category = "microbiology" } = body;

    // In real implementation:
    // 1. If paperPmid → fetch abstract via PubMed
    // 2. Call LLM with system prompt + topic + notes + abstract
    // 3. Parse structured JSON response into slides + citations

    // High-quality demo structure for immediate usability
    const title = topic || "Microbiology Presentation";

    const slides = [
      {
        id: generateId(),
        title: title,
        content: `<p class="text-xl text-slate-600">Department of Microbiology<br/>Jinnah University for Women</p>`,
        notes: "Welcome the audience. State learning objectives clearly.",
        layout: "title" as const,
        order: 0,
        citations: [],
        mediaIds: [],
      },
      {
        id: generateId(),
        title: "Learning Objectives",
        content: `
          <ul class="space-y-2">
            <li>Understand key concepts related to ${title}</li>
            <li>Review current evidence from recent literature</li>
            <li>Apply findings to clinical or laboratory practice</li>
            <li>Identify areas for further research or stewardship</li>
          </ul>
        `,
        notes: userNotes || "Emphasize practical takeaways for students and clinicians.",
        layout: "content" as const,
        order: 1,
        citations: [],
        mediaIds: [],
      },
      {
        id: generateId(),
        title: "Background & Clinical Relevance",
        content: `
          <ul class="space-y-2">
            <li>Microbiological context and epidemiology</li>
            <li>Pathogen characteristics and virulence factors</li>
            <li>Host–pathogen interaction overview</li>
            <li>Current challenges in diagnosis and management</li>
          </ul>
        `,
        notes: "Link to local epidemiology data if available.",
        layout: "content" as const,
        order: 2,
        citations: ["c1"],
        mediaIds: [],
      },
      {
        id: generateId(),
        title: "Key Mechanisms / Pathogenesis",
        content: `
          <ul class="space-y-2">
            <li>Molecular and cellular mechanisms</li>
            <li>Virulence determinants and regulatory systems</li>
            <li>Interaction with host immune responses</li>
            <li>Implications for therapeutic targeting</li>
          </ul>
        `,
        notes: "Use diagrams of pathways when possible.",
        layout: "two-column" as const,
        order: 3,
        citations: ["c1", "c2"],
        mediaIds: [],
      },
      {
        id: generateId(),
        title: "Diagnostic Approaches",
        content: `
          <ul class="space-y-2">
            <li>Conventional culture and identification</li>
            <li>Molecular methods (PCR, sequencing)</li>
            <li>Rapid diagnostic tests and biomarkers</li>
            <li>Antimicrobial susceptibility testing considerations</li>
          </ul>
        `,
        notes: "Highlight turnaround time and sensitivity/specificity trade-offs.",
        layout: "content" as const,
        order: 4,
        citations: ["c2"],
        mediaIds: [],
      },
      {
        id: generateId(),
        title: "Evidence from Recent Literature",
        content: `
          <ul class="space-y-2">
            <li>Summary of landmark and recent studies</li>
            <li>Key findings and clinical endpoints</li>
            <li>Strengths and limitations of the evidence base</li>
            <li>Gaps remaining in the literature</li>
          </ul>
        `,
        notes: "Cite PMIDs verbally when discussing specific papers.",
        layout: "content" as const,
        order: 5,
        citations: ["c1", "c2", "c3"],
        mediaIds: [],
      },
      {
        id: generateId(),
        title: "Clinical / Laboratory Implications",
        content: `
          <ul class="space-y-2">
            <li>Impact on antimicrobial stewardship</li>
            <li>Infection prevention and control measures</li>
            <li>Recommended diagnostic algorithms</li>
            <li>Future directions and research priorities</li>
          </ul>
        `,
        notes: "Encourage discussion on local protocols.",
        layout: "content" as const,
        order: 6,
        citations: ["c3"],
        mediaIds: [],
      },
      {
        id: generateId(),
        title: "Key Take-Home Messages",
        content: `
          <ul class="space-y-2">
            <li>Evidence-based summary of the most important points</li>
            <li>Practical actions for the laboratory and clinic</li>
            <li>Points requiring further local evaluation</li>
          </ul>
        `,
        notes: "End with clear, actionable messages.",
        layout: "content" as const,
        order: 7,
        citations: [],
        mediaIds: [],
      },
      {
        id: generateId(),
        title: "References",
        content: `
          <ol class="space-y-2 text-sm">
            <li>Author A, et al. Title of key paper. Journal. 2024;xx:xx-xx. PMID: 38123456</li>
            <li>Author B, et al. Another relevant study. Journal. 2023;xx:xx-xx. PMID: 37234567</li>
            <li>Author C, et al. Recent advances in the field. Journal. 2025;xx:xx-xx. PMID: 39876543</li>
          </ol>
        `,
        notes: "Ensure all in-text citations appear here.",
        layout: "references" as const,
        order: 8,
        citations: ["c1", "c2", "c3"],
        mediaIds: [],
      },
    ];

    const citations = [
      {
        id: "c1",
        pmid: paperPmid || "38123456",
        title: "Recent advances in the topic under discussion",
        authors: ["Author A", "Author B", "Author C"],
        journal: "Journal of Clinical Microbiology",
        year: 2024,
        volume: "62",
        pages: "e00123-24",
        style: "Vancouver" as const,
      },
      {
        id: "c2",
        pmid: "37234567",
        title: "Pathogenesis and diagnostic strategies",
        authors: ["Author D", "Author E"],
        journal: "Clinical Microbiology Reviews",
        year: 2023,
        volume: "36",
        pages: "e00045-22",
        style: "Vancouver" as const,
      },
      {
        id: "c3",
        pmid: "39876543",
        title: "Evidence-based management and stewardship implications",
        authors: ["Author F", "Author G", "Author H", "Author I"],
        journal: "The Lancet Infectious Diseases",
        year: 2025,
        volume: "25",
        pages: "123-135",
        style: "Vancouver" as const,
      },
    ];

    return NextResponse.json({
      success: true,
      title,
      category,
      slides,
      citations,
      message: "Deck generated successfully. Connect a real LLM for production content.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Generation failed" },
      { status: 500 }
    );
  }
}
