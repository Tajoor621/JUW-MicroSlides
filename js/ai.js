/* ============================================================
   JUW-MicroSlides — ai.js
   Claude-powered slide generation + in-deck Copilot.
   Uses the user's own Anthropic API key (stored locally only).
   Grounds generation in real PubMed citations pulled beforehand.
   ============================================================ */

const AI = {

  hasKey(){ return !!Store.getRaw(CONFIG.STORAGE_KEYS.anthropicKey); },

  async callClaude(systemPrompt, userPrompt, maxTokens = 4000, retries = 2){
    const key = Store.getRaw(CONFIG.STORAGE_KEYS.anthropicKey);
    if(!key) throw new Error('No Anthropic API key set. Add one in Settings or use Manual Mode.');

    let lastError;
    for(let attempt = 0; attempt <= retries; attempt++){
      try{
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const res = await fetch(CONFIG.ANTHROPIC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: CONFIG.ANTHROPIC_MODEL,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if(!res.ok){
          const errText = await res.text().catch(() => '');
          if((res.status === 429 || res.status >= 500) && attempt < retries){
            await new Promise(r => setTimeout(r, 800 * Math.pow(2, attempt)));
            continue;
          }
          throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`);
        }
        const data = await res.json();
        const block = (data.content || []).find(b => b.type === 'text');
        return block ? block.text : '';
      }catch(e){
        lastError = e;
        if(e.name === 'AbortError') throw new Error('AI request timed out. Try a shorter topic or try again.');
        if(attempt === retries) throw lastError;
        await new Promise(r => setTimeout(r, 800 * Math.pow(2, attempt)));
      }
    }
    throw lastError;
  },

  async generateDeck({ topic, level, slideCount, citations }){
    const citeBlock = (citations || []).map(c =>
      `PMID ${c.pmid}: ${c.title} — \( {c.citation} \){c.abstract ? '\nAbstract: ' + c.abstract.slice(0, 400) : ''}`
    ).join('\n\n');

    const system = `You are a microbiology & infectious disease professor writing an exam-grade, evidence-based lecture deck for ${level || 'university'} students. Ground every factual claim in the provided PubMed citations where possible — cite by PMID inline in the "citedPmids" array per slide. Be precise, clinically relevant, and structured like a real course lecture (taxonomy, morphology/staining, culture, virulence, pathogenesis, clinical presentation, diagnosis, treatment, epidemiology, as applicable to the topic). Never fabricate a PMID. Return ONLY valid JSON, no markdown fences, no commentary.`;

    const targetCount = slideCount && slideCount > 0
      ? `Generate exactly ${slideCount} slides.`
      : `Generate as many slides as the topic warrants for a complete, thorough lecture (do not artificially limit).`;

    const user = `Topic: ${topic}
${targetCount}

Available PubMed citations to ground content in:
${citeBlock || '(none supplied — use established microbiology consensus knowledge and say so)'}

Return JSON exactly in this shape:
{
  "title": "Deck title",
  "slides": [
    {
      "title": "Slide title",
      "layout": "title-bullets-image | two-column | full-bleed | divider | clinical-pearl | comparison | references | blank",
      "bullets": ["point 1", "point 2"],
      "imageQuery": "specific search query for a diagram/micrograph/GIF illustrating this slide",
      "notes": "speaker notes: what the lecturer would say aloud",
      "citedPmids": ["12345678"]
    }
  ]
}
The final slide should have layout "references" listing all citedPmids used across the deck, with "bullets" as formatted citation strings.`;

    const raw = await this.callClaude(system, user, 8000);
    return this.parseJsonSafe(raw);
  },

  async refineSlide({ slide, instruction }){
    const system = `You are an in-app microbiology slide copilot. You receive one slide as JSON and an instruction. Return ONLY the updated slide as valid JSON in the exact same shape, no markdown fences, no commentary. Keep content accurate and citation-aware — do not invent PMIDs.`;
    const user = `Current slide JSON:\n${JSON.stringify(slide)}\n\nInstruction: ${instruction}`;
    const raw = await this.callClaude(system, user, 2000);
    return this.parseJsonSafe(raw);
  },

  async askCopilot({ deck, question }){
    const system = `You are a microbiology teaching copilot embedded in a slide-deck app. Answer concisely and accurately, referencing slide numbers/titles from the provided deck when relevant. If the user asks you to change content, describe the change in plain language (the app will apply edits separately).`;
    const summary = deck.slides.map((s, i) => `${i + 1}. ${s.title}`).join('\n');
    const user = `Deck "\( {deck.title}" has these slides:\n \){summary}\n\nQuestion: ${question}`;
    return await this.callClaude(system, user, 1200);
  },

  parseJsonSafe(text){
    let cleaned = (text || '').trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
    try{
      return JSON.parse(cleaned);
    }catch(e){
      const match = cleaned.match(/\{[\s\S]*\}/);
      if(match){
        try{ return JSON.parse(match[0]); }catch(e2){ /* fall through */ }
      }
      throw new Error('Could not parse AI response as JSON. Try again or simplify the topic.');
    }
  }
};

window.AI = AI;
