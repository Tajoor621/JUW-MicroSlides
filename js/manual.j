/* ============================================================
   JUW-MicroSlides — manual.js
   No-API-key Manual Mode deck generation.
   Uses PubMed + open media + domain templates.
   ============================================================ */

const Manual = {

  TEMPLATES: {
    default: [
      { layout: 'juw-cover',           titleKey: 'cover' },
      { layout: 'divider',             title: 'Learning Objectives' },
      { layout: 'title-bullets-image', title: 'Taxonomy & Classification' },
      { layout: 'title-bullets-image', title: 'Morphology & Staining' },
      { layout: 'title-bullets-image', title: 'Culture Characteristics' },
      { layout: 'title-bullets-image', title: 'Virulence Factors' },
      { layout: 'title-bullets-image', title: 'Pathogenesis' },
      { layout: 'clinical-pearl',      title: 'Clinical Presentation' },
      { layout: 'title-bullets-image', title: 'Laboratory Diagnosis' },
      { layout: 'comparison',          title: 'Differential Diagnosis' },
      { layout: 'title-bullets-image', title: 'Treatment & Prevention' },
      { layout: 'title-bullets-image', title: 'Epidemiology' },
      { layout: 'references',          title: 'References' }
    ]
  },

  STARTERS: {
    'Learning Objectives': (topic) => [
      `Describe the key taxonomic features of ${topic}`,
      `Explain the major virulence mechanisms`,
      `Outline clinical presentation and diagnosis`,
      `Discuss current treatment and prevention strategies`
    ],
    'Taxonomy & Classification': (topic) => [
      `Domain / Kingdom / Phylum relevant to ${topic}`,
      'Key taxonomic features used for identification',
      'Clinically important related species'
    ],
    'Morphology & Staining': (topic) => [
      'Gram reaction, shape and arrangement',
      'Special staining characteristics',
      'Notable microscopic or ultrastructural features'
    ],
    'Culture Characteristics': (topic) => [
      'Preferred media and growth conditions',
      'Colony morphology and distinctive features',
      'Biochemical reactions useful for identification'
    ],
    'Virulence Factors': (topic) => [
      'Major toxins or effectors (if any)',
      'Adhesins, invasins or immune-evasion strategies',
      'Regulatory systems that control virulence'
    ],
    'Pathogenesis': (topic) => [
      'Route of entry and initial colonization',
      'Tissue damage and host response',
      'Key steps leading to clinical disease'
    ],
    'Clinical Presentation': (topic) => [
      `Classic clinical features associated with ${topic}`,
      'Important warning signs and complications'
    ],
    'Laboratory Diagnosis': (topic) => [
      'Microscopy and rapid tests',
      'Culture and identification methods',
      'Molecular and serologic approaches'
    ],
    'Differential Diagnosis': (topic) => [
      'Organisms or conditions that can mimic this presentation'
    ],
    'Treatment & Prevention': (topic) => [
      'First-line antimicrobial therapy (where applicable)',
      'Supportive care and infection-control measures',
      'Vaccines or prophylaxis (if available)'
    ],
    'Epidemiology': (topic) => [
      'Geographic distribution and risk groups',
      'Transmission routes and outbreaks',
      'Public-health significance'
    ]
  },

  async generateDeck({ topic, level, slideCount }) {
    const citations = await PubMed.search(topic, 12).catch(() => []);
    const template = this.TEMPLATES.default;
    const maxSlides = slideCount && slideCount > 0 ? Math.min(slideCount, template.length) : template.length;

    const slides = [];
    const usedPmids = new Set();

    for (let i = 0; i < maxSlides; i++) {
      const t = template[i];
      if (t.titleKey === 'cover') {
        slides.push(DeckModel.newSlide({
          title: topic,
          layout: 'juw-cover',
          cover: {
            courseName: level || 'Microbiology',
            courseCode: 'MIC-XXX',
            preparedBy: 'PREPARED BY: ',
            department: 'DEPARTMENT OF MICROBIOLOGY'
          }
        }));
        continue;
      }

      const title = t.title;
      const starterFn = this.STARTERS[title];
      const bullets = starterFn
        ? starterFn(topic)
        : [`Key points about ${title.toLowerCase()} of ${topic}`];

      const cited = citations.slice(0, 3).map(c => c.pmid).filter(Boolean);
      cited.forEach(p => usedPmids.add(p));

      const slide = DeckModel.newSlide({
        title,
        layout: t.layout,
        bullets,
        notes: `Speaker notes: ${title} — ${topic}`,
        citedPmids: cited
      });

      // Parallel media fetch later; collect queries first
      slide._imageQuery = `${topic} ${title}`;
      slides.push(slide);
    }

    // Parallel image fetching with concurrency limit
    await this.attachImages(slides, 4);

    // Build references slide content from used PMIDs
    const refSlide = slides.find(s => s.layout === 'references');
    if (refSlide && citations.length) {
      refSlide.bullets = citations
        .filter(c => usedPmids.has(c.pmid) || true)
        .slice(0, 12)
        .map(c => c.citation);
    }

    return { title: topic, slides };
  },

  async attachImages(slides, concurrency = 4) {
    const queue = slides.filter(s => s._imageQuery &&
      !['references', 'comparison', 'divider', 'juw-cover'].includes(s.layout));

    let idx = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (idx < queue.length) {
        const i = idx++;
        const slide = queue[i];
        try {
          const media = await Media.searchAll(slide._imageQuery);
          if (media && media[0]) slide.image = media[0];
        } catch (e) { /* non-fatal */ }
        delete slide._imageQuery;
      }
    });
    await Promise.all(workers);
  }
};

window.Manual = Manual;
