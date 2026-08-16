/* ============================================================
   JUW-MicroSlides — config.js
   Local key storage + shared constants. No server, no accounts.
   All API calls run client-side using the user's own key.
   ============================================================ */

const CONFIG = {
  STORAGE_KEYS: {
    anthropicKey: 'juw_anthropic_key',
    ncbiKey: 'juw_ncbi_key',        // optional, raises PubMed rate limit
    deckPrefix: 'juw_deck_',
    lastDeck: 'juw_last_deck_id',
    prefs: 'juw_prefs'
  },
  ANTHROPIC_MODEL: 'claude-sonnet-4-6',
  ANTHROPIC_URL: 'https://api.anthropic.com/v1/messages',
  PUBMED: {
    esearch: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
    esummary: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi',
    efetch: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'
  },
  WIKIMEDIA: 'https://commons.wikimedia.org/w/api.php',
  OPENVERSE: 'https://api.openverse.org/v1/images/',
  WIKIPEDIA_SUMMARY: 'https://en.wikipedia.org/api/rest_v1/page/summary/',
  NCBI_BOOKSHELF_ESEARCH_DB: 'books',
  DEFAULT_FONT_PAIR: { display: "'Source Serif 4', Georgia, serif", body: "'IBM Plex Sans', system-ui, sans-serif" },
  FONT_OPTIONS: [
    { id:'serif-plex', label:'Source Serif + Plex Sans', display:"'Source Serif 4', Georgia, serif", body:"'IBM Plex Sans', system-ui, sans-serif" },
    { id:'lora-inter', label:'Lora + Inter', display:"'Lora', Georgia, serif", body:"'Inter', system-ui, sans-serif" },
    { id:'merri-plex', label:'Merriweather + Plex Sans', display:"'Merriweather', Georgia, serif", body:"'IBM Plex Sans', system-ui, sans-serif" },
    { id:'plexmono-plex', label:'Plex Mono + Plex Sans (data-heavy)', display:"'IBM Plex Mono', monospace", body:"'IBM Plex Sans', system-ui, sans-serif" },
    { id:'all-sans', label:'Inter (all-sans, minimal)', display:"'Inter', system-ui, sans-serif", body:"'Inter', system-ui, sans-serif" }
  ],
  ACCENT_SWATCHES: [
    { id:'gram', label:'Gram (violet/safranin)', primary:'#5B3A9E', secondary:'#C13B2C' },
    { id:'ink', label:'Ink & Slate', primary:'#132038', secondary:'#5B6472' },
    { id:'agar', label:'Agar Green', primary:'#2E7D5B', secondary:'#8A6D3B' },
    { id:'iodine', label:'Iodine Amber', primary:'#8A6D3B', secondary:'#5B3A9E' }
  ],
  LAYOUTS: [
    { id:'juw-cover', label:'University Cover Page' },
    { id:'title-bullets-image', label:'Title + Bullets + Image' },
    { id:'two-column', label:'Two-Column' },
    { id:'full-bleed', label:'Full-Bleed Image' },
    { id:'divider', label:'Section Divider' },
    { id:'clinical-pearl', label:'Clinical Pearl / Quote' },
    { id:'comparison', label:'Comparison Table' },
    { id:'references', label:'References / Citations' },
    { id:'blank', label:'Blank (notes + media only)' }
  ]
};

const Store = {
  get(key, fallback=null){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  },
  set(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ console.error('Storage write failed', e); return false; }
  },
  getRaw(key, fallback=''){ return localStorage.getItem(key) || fallback; },
  setRaw(key, value){ localStorage.setItem(key, value); }
};

window.CONFIG = CONFIG;
window.Store = Store;
