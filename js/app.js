/* ============================================================
   JUW-MicroSlides — app.js
   Application state + event wiring. Ties together config,
   pubmed, media, ai, deck-model, editor, and export modules.
   ============================================================ */

const App = {
  deck: null,
  activeIndex: 0,
  lastPubmedResults: [],
  lastMediaResults: [],

  init(){
    this.deck = DeckModel.loadLast() || DeckModel.newDeck('My First Deck');
    if(this.deck.slides.length === 0){
      this.deck.slides.push(DeckModel.newSlide({ title: this.deck.title, layout:'juw-cover' }));
    }
    this.bindTopbar();
    this.bindGenerator();
    this.bindStage();
    this.bindCoverBadgeUpload();
    this.bindRail();
    this.bindInspectorTabs();
    this.bindDesignControls();
    this.bindNotes();
    this.bindPubmedSearch();
    this.bindMediaSearch();
    this.bindUpload();
    this.bindCopilot();
    this.bindSettings();
    this.bindMobileToggles();
    this.renderAll();
    this.refreshKeyBadge();
  },

  renderAll(){
    Editor.renderRail(this.deck, this.activeIndex);
    Editor.renderStage(this.currentSlide(), this.deck);
    document.getElementById('stagebar-layout').value = this.currentSlide().layout;
    this.syncDesignUI();
    document.getElementById('deck-title-input').value = this.deck.title;
    DeckModel.save(this.deck);
  },

  currentSlide(){ return this.deck.slides[this.activeIndex]; },

  toast(msg, isError=false){
    const el = document.createElement('div');
    el.className = 'toast';
    if(isError) el.style.background = '#C13B2C';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 3200);
  },

  /* ---------------- Topbar ---------------- */
  bindTopbar(){
    document.getElementById('deck-title-input').addEventListener('input', e=>{
      this.deck.title = e.target.value || 'Untitled Deck';
      DeckModel.save(this.deck);
    });
    document.getElementById('btn-export-pptx').addEventListener('click', async ()=>{
      try{ this.toast('Building PPTX…'); await ExportPPTX.export(this.deck); this.toast('PPTX downloaded.'); }
      catch(e){ this.toast(e.message, true); }
    });
    document.getElementById('btn-export-pdf').addEventListener('click', async ()=>{
      try{
        this.toast('Building PDF…');
        await ExportPDF.export(this.deck, (slide,deck,size)=>Editor.buildOffscreenStage(slide,deck,size));
        this.toast('PDF downloaded.');
      }catch(e){ this.toast(e.message, true); }
    });
    document.getElementById('btn-share').addEventListener('click', async ()=>{
      if(navigator.share){
        try{
          await navigator.share({ title:this.deck.title, text:`${this.deck.title} — made with JUW-MicroSlides` });
        }catch(e){ /* user cancelled */ }
      } else {
        this.toast('Web Share not supported on this browser — use Export instead.');
      }
    });
    document.getElementById('btn-settings').addEventListener('click', ()=>{
      document.getElementById('settings-modal').classList.remove('hidden');
    });
  },

  /* ---------------- Generator (AI) ---------------- */
  bindGenerator(){
    document.getElementById('btn-generate').addEventListener('click', async ()=>{
      const topic = document.getElementById('gen-topic').value.trim();
      const level = document.getElementById('gen-level').value;
      const countRaw = document.getElementById('gen-count').value.trim();
      const slideCount = countRaw ? parseInt(countRaw,10) : 0; // 0/blank = unlimited/AI-decided
      if(!topic){ this.toast('Enter a topic first.', true); return; }
      if(!AI.hasKey()){ this.toast('Add your Anthropic API key in Settings first.', true); document.getElementById('settings-modal').classList.remove('hidden'); return; }

      const btn = document.getElementById('btn-generate');
      btn.disabled = true; btn.textContent = 'Researching PubMed…';
      try{
        const citations = await PubMed.search(topic, 10).catch(()=>[]);
        this.lastPubmedResults = citations;
        this.renderPubmedPanel(citations);

        btn.textContent = 'Drafting slides…';
        const result = await AI.generateDeck({ topic, level, slideCount, citations });
        if(!result || !Array.isArray(result.slides)) throw new Error('AI returned an unexpected format.');

        btn.textContent = 'Fetching diagrams & micrographs…';
        const newSlides = [];
        for(const s of result.slides){
          const slide = DeckModel.newSlide({
            title: s.title || 'Untitled',
            layout: CONFIG.LAYOUTS.some(l=>l.id===s.layout) ? s.layout : 'title-bullets-image',
            bullets: s.bullets || [],
            notes: s.notes || '',
            citedPmids: s.citedPmids || []
          });
          if(s.imageQuery && slide.layout !== 'references' && slide.layout !== 'comparison' && slide.layout !== 'divider'){
            try{
              const media = await Media.searchAll(s.imageQuery);
              if(media && media[0]) slide.image = media[0];
            }catch(e){ /* non-fatal */ }
          }
          newSlides.push(slide);
        }
        this.deck.title = result.title || topic;
        const coverSlide = DeckModel.newSlide({
          title: this.deck.title,
          layout: 'juw-cover',
          cover: { courseName: level || 'COURSE NAME', courseCode: 'COURSE CODE', preparedBy: 'PREPARED BY: ', department: 'DEPARTMENT OF MICROBIOLOGY' }
        });
        this.deck.slides = [coverSlide, ...newSlides];
        this.activeIndex = 0;
        this.renderAll();
        this.toast(`Generated ${newSlides.length} slides, grounded in ${citations.length} PubMed sources.`);
      }catch(e){
        console.error(e);
        this.toast(e.message, true);
      }finally{
        btn.disabled = false; btn.textContent = 'Generate deck';
      }
    });
  },

  /* ---------------- Stage editing ---------------- */
  bindStage(){
    const stage = document.getElementById('stage');
    stage.addEventListener('input', e=>{
      const slide = this.currentSlide();
      const field = e.target.dataset && e.target.dataset.field;
      const coverField = e.target.dataset && e.target.dataset.coverField;
      if(field === 'title') slide.title = e.target.textContent.trim();
      if(field === 'bulletsHtml') slide.bullets = htmlToBullets(e.target.innerHTML);
      if(coverField){
        if(!slide.cover) slide.cover = {};
        slide.cover[coverField] = e.target.textContent.trim();
      }
      if(!coverField) Editor.renderRail(this.deck, this.activeIndex);
      DeckModel.save(this.deck);
    });

    // Click the department badge on a cover slide to replace it with your own image
    stage.addEventListener('click', e=>{
      if(e.target.dataset && e.target.dataset.coverBadge){
        document.getElementById('cover-badge-input').click();
      }
    });

    document.getElementById('stagebar-layout').addEventListener('change', e=>{
      this.currentSlide().layout = e.target.value;
      Editor.renderStage(this.currentSlide(), this.deck);
      DeckModel.save(this.deck);
    });
  },

  bindCoverBadgeUpload(){
    document.getElementById('cover-badge-input').addEventListener('change', e=>{
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const slide = this.currentSlide();
        if(!slide.cover) slide.cover = {};
        slide.cover.deptBadge = { dataUrl: reader.result };
        Editor.renderStage(slide, this.deck);
        DeckModel.save(this.deck);
        this.toast('Department badge updated.');
      };
      reader.readAsDataURL(file);
    });
  },

  /* ---------------- Rail: list, select, add, delete, reorder ---------------- */
  bindRail(){
    const list = document.getElementById('slidelist');
    list.addEventListener('click', e=>{
      const del = e.target.dataset.del;
      if(del !== undefined){
        e.stopPropagation();
        if(this.deck.slides.length <= 1){ this.toast('A deck needs at least one slide.', true); return; }
        this.deck.slides.splice(parseInt(del,10),1);
        this.activeIndex = Math.max(0, Math.min(this.activeIndex, this.deck.slides.length-1));
        this.renderAll();
        return;
      }
      const chip = e.target.closest('.slidechip');
      if(chip){ this.activeIndex = parseInt(chip.dataset.index,10); this.renderAll(); }
    });

    document.getElementById('btn-add-slide').addEventListener('click', ()=>{
      this.deck.slides.splice(this.activeIndex+1, 0, DeckModel.newSlide());
      this.activeIndex += 1;
      this.renderAll();
    });

    // drag reorder — unlimited slides, user can freely reorder
    let dragFrom = null;
    list.addEventListener('dragstart', e=>{
      const chip = e.target.closest('.slidechip');
      if(chip) dragFrom = parseInt(chip.dataset.index,10);
    });
    list.addEventListener('dragover', e=> e.preventDefault());
    list.addEventListener('drop', e=>{
      e.preventDefault();
      const chip = e.target.closest('.slidechip');
      if(!chip || dragFrom===null) return;
      const dragTo = parseInt(chip.dataset.index,10);
      const [moved] = this.deck.slides.splice(dragFrom,1);
      this.deck.slides.splice(dragTo,0,moved);
      this.activeIndex = dragTo;
      dragFrom = null;
      this.renderAll();
    });
  },

  /* ---------------- Inspector tabs ---------------- */
  bindInspectorTabs(){
    document.querySelectorAll('.tab').forEach(tab=>{
      tab.addEventListener('click', ()=>{
        document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
        document.querySelectorAll('.tabpanel').forEach(p=>p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-'+tab.dataset.tab).classList.add('active');
      });
    });
  },

  /* ---------------- Design controls: fonts, size, accent, layouts list ---------------- */
  bindDesignControls(){
    const fontSel = document.getElementById('design-font');
    CONFIG.FONT_OPTIONS.forEach(f=>{
      const opt = document.createElement('option');
      opt.value = f.id; opt.textContent = f.label;
      fontSel.appendChild(opt);
    });
    fontSel.addEventListener('change', e=>{
      this.deck.design.fontPairId = e.target.value;
      Editor.applyDesign(this.deck);
      DeckModel.save(this.deck);
    });

    document.getElementById('design-size').addEventListener('input', e=>{
      this.deck.design.fontScale = parseFloat(e.target.value);
      Editor.applyDesign(this.deck);
      DeckModel.save(this.deck);
    });

    const swatchWrap = document.getElementById('design-swatches');
    CONFIG.ACCENT_SWATCHES.forEach(a=>{
      const sw = document.createElement('button');
      sw.className = 'swatch';
      sw.style.background = a.primary;
      sw.title = a.label;
      sw.dataset.id = a.id;
      sw.addEventListener('click', ()=>{
        this.deck.design.accentId = a.id;
        Editor.applyDesign(this.deck);
        this.syncDesignUI();
        DeckModel.save(this.deck);
      });
      swatchWrap.appendChild(sw);
    });
  },

  syncDesignUI(){
    document.getElementById('design-font').value = this.deck.design.fontPairId;
    document.getElementById('design-size').value = this.deck.design.fontScale;
    document.querySelectorAll('#design-swatches .swatch').forEach(sw=>{
      sw.classList.toggle('active', sw.dataset.id === this.deck.design.accentId);
    });
  },

  /* ---------------- Notes ---------------- */
  bindNotes(){
    document.getElementById('notes-textarea').addEventListener('input', e=>{
      this.currentSlide().notes = e.target.value;
      DeckModel.save(this.deck);
    });
  },
  syncNotesUI(){
    document.getElementById('notes-textarea').value = this.currentSlide().notes || '';
  },

  /* ---------------- PubMed panel ---------------- */
  bindPubmedSearch(){
    document.getElementById('btn-pubmed-search').addEventListener('click', async ()=>{
      const q = document.getElementById('pubmed-query').value.trim();
      if(!q) return;
      const wrap = document.getElementById('pubmed-results');
      wrap.innerHTML = '<div class="panel-block">Searching PubMed…</div>';
      try{
        const results = await PubMed.search(q, 8);
        this.lastPubmedResults = results;
        this.renderPubmedPanel(results);
      }catch(e){ wrap.innerHTML = `<div class="panel-block">${e.message}</div>`; }
    });
  },
  renderPubmedPanel(results){
    const wrap = document.getElementById('pubmed-results');
    if(!results || results.length===0){ wrap.innerHTML = '<div class="panel-block">No results yet.</div>'; return; }
    wrap.innerHTML = `<div class="citelist">${results.map(r=>`
      <div class="citeitem">
        <b>${escapeAttr(r.title)}</b><br>
        ${escapeAttr(r.citation)}<br>
        <a href="${r.url}" target="_blank" rel="noopener">${r.url}</a>
        <div style="margin-top:6px;"><button class="chip-select" data-attach-pmid="${r.pmid}">Attach to slide</button></div>
      </div>
    `).join('')}</div>`;
    wrap.querySelectorAll('[data-attach-pmid]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const pmid = btn.dataset.attachPmid;
        const slide = this.currentSlide();
        if(!slide.citedPmids.includes(pmid)) slide.citedPmids.push(pmid);
        DeckModel.save(this.deck);
        this.toast('Citation attached to current slide.');
      });
    });
  },

  /* ---------------- Media panel ---------------- */
  bindMediaSearch(){
    document.getElementById('btn-media-search').addEventListener('click', async ()=>{
      const q = document.getElementById('media-query').value.trim();
      if(!q) return;
      const wrap = document.getElementById('media-results');
      wrap.innerHTML = '<div class="panel-block">Searching Commons + Openverse…</div>';
      try{
        const results = await Media.searchAll(q);
        this.lastMediaResults = results;
        this.renderMediaPanel(results, q);
      }catch(e){ wrap.innerHTML = `<div class="panel-block">${e.message}</div>`; }
    });
  },
  renderMediaPanel(results, query){
    const wrap = document.getElementById('media-results');
    const philLink = `<a href="${Media.philSearchLink(query||'')}" target="_blank" rel="noopener" style="font-size:0.75rem;color:var(--violet-600)">Also check CDC PHIL for this term →</a>`;
    if(!results || results.length===0){ wrap.innerHTML = `<div class="panel-block">No results.</div>${philLink}`; return; }
    wrap.innerHTML = results.map((r,i)=>`
      <div class="resultcard" data-media-index="${i}">
        <img src="${r.thumbUrl}" alt="">
        <div class="resultcard__meta">
          <b>${escapeAttr(r.title)} ${r.isGif?'· GIF':''}</b>
          ${escapeAttr(r.source)} · ${escapeAttr(r.license)}
        </div>
      </div>
    `).join('') + `<div style="margin-top:8px;">${philLink}</div>`;
    wrap.querySelectorAll('[data-media-index]').forEach(card=>{
      card.addEventListener('click', ()=>{
        const r = results[parseInt(card.dataset.mediaIndex,10)];
        this.currentSlide().image = r;
        Editor.renderStage(this.currentSlide(), this.deck);
        Editor.renderRail(this.deck, this.activeIndex);
        DeckModel.save(this.deck);
        this.toast('Image attached to slide.');
      });
    });
  },

  /* ---------------- User uploads (own notes/media) ---------------- */
  bindUpload(){
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('upload-input');
    zone.addEventListener('click', ()=>input.click());
    input.addEventListener('change', ()=>{
      const file = input.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.currentSlide().userMedia = [{ name:file.name, dataUrl:reader.result }];
        this.currentSlide().image = null; // user media takes priority
        Editor.renderStage(this.currentSlide(), this.deck);
        Editor.renderRail(this.deck, this.activeIndex);
        DeckModel.save(this.deck);
        this.toast('Your file was added to this slide.');
      };
      reader.readAsDataURL(file);
    });
  },

  /* ---------------- Copilot ---------------- */
  bindCopilot(){
    document.getElementById('btn-copilot-ask').addEventListener('click', async ()=>{
      const q = document.getElementById('copilot-input').value.trim();
      if(!q) return;
      if(!AI.hasKey()){ this.toast('Add your Anthropic API key in Settings first.', true); return; }
      const log = document.getElementById('copilot-log');
      log.insertAdjacentHTML('beforeend', `<div class="citeitem"><b>You</b><br>${escapeAttr(q)}</div>`);
      document.getElementById('copilot-input').value = '';
      log.insertAdjacentHTML('beforeend', `<div class="citeitem" id="copilot-pending"><b>Copilot</b><br>Thinking…</div>`);
      try{
        const answer = await AI.askCopilot({ deck:this.deck, question:q });
        document.getElementById('copilot-pending').outerHTML = `<div class="citeitem"><b>Copilot</b><br>${escapeAttr(answer)}</div>`;
      }catch(e){
        document.getElementById('copilot-pending').outerHTML = `<div class="citeitem"><b>Copilot</b><br>${escapeAttr(e.message)}</div>`;
      }
      log.scrollTop = log.scrollHeight;
    });

    document.getElementById('btn-copilot-refine').addEventListener('click', async ()=>{
      const instruction = document.getElementById('copilot-input').value.trim();
      if(!instruction){ this.toast('Type an instruction first, e.g. "make this more clinical".', true); return; }
      if(!AI.hasKey()){ this.toast('Add your Anthropic API key in Settings first.', true); return; }
      this.toast('Copilot is revising this slide…');
      try{
        const updated = await AI.refineSlide({ slide:this.currentSlide(), instruction });
        this.deck.slides[this.activeIndex] = Object.assign(this.currentSlide(), {
          title: updated.title ?? this.currentSlide().title,
          bullets: updated.bullets ?? this.currentSlide().bullets,
          notes: updated.notes ?? this.currentSlide().notes
        });
        this.renderAll();
        this.toast('Slide updated by Copilot.');
      }catch(e){ this.toast(e.message, true); }
    });
  },

  /* ---------------- Settings modal (API keys) ---------------- */
  bindSettings(){
    const modal = document.getElementById('settings-modal');
    document.getElementById('settings-close').addEventListener('click', ()=>modal.classList.add('hidden'));
    document.getElementById('anthropic-key-input').value = Store.getRaw(CONFIG.STORAGE_KEYS.anthropicKey);
    document.getElementById('ncbi-key-input').value = Store.getRaw(CONFIG.STORAGE_KEYS.ncbiKey);
    document.getElementById('settings-save').addEventListener('click', ()=>{
      Store.setRaw(CONFIG.STORAGE_KEYS.anthropicKey, document.getElementById('anthropic-key-input').value.trim());
      Store.setRaw(CONFIG.STORAGE_KEYS.ncbiKey, document.getElementById('ncbi-key-input').value.trim());
      this.refreshKeyBadge();
      modal.classList.add('hidden');
      this.toast('Settings saved locally on this device.');
    });
  },
  refreshKeyBadge(){
    const badge = document.getElementById('key-badge');
    if(AI.hasKey()){ badge.textContent = 'API key set'; badge.className = 'keybadge'; }
    else { badge.textContent = 'No API key'; badge.className = 'keybadge keybadge--off'; }
  },

  /* ---------------- Mobile rail/inspector toggles ---------------- */
  bindMobileToggles(){
    document.getElementById('btn-toggle-rail').addEventListener('click', ()=>{
      document.getElementById('rail').classList.toggle('open');
    });
    document.getElementById('btn-toggle-inspector').addEventListener('click', ()=>{
      document.getElementById('inspector').classList.toggle('open');
    });
  }
};

function escapeAttr(s){
  return (s==null?'':String(s)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Patch active-slide sync into renderAll (notes + rail selection depend on activeIndex)
const _origRenderAll = App.renderAll.bind(App);
App.renderAll = function(){
  _origRenderAll();
  this.syncNotesUI();
};

document.addEventListener('DOMContentLoaded', ()=> App.init());
