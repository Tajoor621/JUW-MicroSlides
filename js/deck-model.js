/* ============================================================
   JUW-MicroSlides — deck-model.js
   Deck/slide data structures + persistence (localStorage).
   Unlimited slides. Deck-level design settings (fonts, accent).
   ============================================================ */

const DeckModel = {

  newDeck(title='Untitled Deck'){
    return {
      id: 'deck_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      design: {
        fontPairId: 'serif-plex',
        fontScale: 1.0,          // multiplier applied to base sizes
        accentId: 'gram'
      },
      slides: []
    };
  },

  newSlide(overrides={}){
    return Object.assign({
      id: 'slide_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      title: 'New slide',
      layout: 'title-bullets-image',
      bullets: ['Click to edit this point'],
      notes: '',
      citedPmids: [],
      image: null,        // { thumbUrl, fullUrl, source, license, attribution, pageUrl }
      userMedia: [],       // user-uploaded images/files (data URLs), kept local
      tableRows: [],         // used by 'comparison' layout: [[cellA,cellB,...], ...]
      // used by 'juw-cover' layout — replicates the JUW departmental title-slide format
      cover: {
        courseName: 'COURSE NAME',
        courseCode: 'COURSE CODE',
        preparedBy: 'PREPARED BY: ',
        department: 'DEPARTMENT OF MICROBIOLOGY',
        deptBadge: null   // { dataUrl } — user-uploaded department badge overrides the default
      }
    }, overrides);
  },

  save(deck){
    deck.updatedAt = Date.now();
    Store.set(CONFIG.STORAGE_KEYS.deckPrefix + deck.id, deck);
    Store.setRaw(CONFIG.STORAGE_KEYS.lastDeck, deck.id);
  },

  load(id){
    return Store.get(CONFIG.STORAGE_KEYS.deckPrefix + id, null);
  },

  loadLast(){
    const id = Store.getRaw(CONFIG.STORAGE_KEYS.lastDeck, '');
    return id ? this.load(id) : null;
  },

  listAll(){
    const decks = [];
    for(let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i);
      if(key && key.startsWith(CONFIG.STORAGE_KEYS.deckPrefix)){
        const d = Store.get(key, null);
        if(d) decks.push(d);
      }
    }
    return decks.sort((a,b)=>b.updatedAt-a.updatedAt);
  },

  delete(id){
    localStorage.removeItem(CONFIG.STORAGE_KEYS.deckPrefix + id);
  },

  getFontPair(deck){
    return CONFIG.FONT_OPTIONS.find(f=>f.id===deck.design.fontPairId) || CONFIG.FONT_OPTIONS[0];
  },

  getAccent(deck){
    return CONFIG.ACCENT_SWATCHES.find(a=>a.id===deck.design.accentId) || CONFIG.ACCENT_SWATCHES[0];
  }
};

window.DeckModel = DeckModel;
