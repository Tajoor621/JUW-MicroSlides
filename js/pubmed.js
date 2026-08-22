/* ============================================================
   JUW-MicroSlides — pubmed.js
   NCBI E-utilities: search PubMed, pull summaries + abstracts,
   format Vancouver-style citations with live PMID links.
   No API key required for light/educational use.
   ============================================================ */

const PubMed = {

  async search(query, retmax = 8){
    const url = new URL(CONFIG.PUBMED.esearch);
    url.searchParams.set('db', 'pubmed');
    url.searchParams.set('term', query);
    url.searchParams.set('retmax', retmax);
    url.searchParams.set('retmode', 'json');
    url.searchParams.set('sort', 'relevance');
    const key = Store.getRaw(CONFIG.STORAGE_KEYS.ncbiKey);
    if(key) url.searchParams.set('api_key', key);

    const res = await fetch(url);
    if(!res.ok) throw new Error('PubMed search failed: ' + res.status);
    const data = await res.json();
    const ids = (data.esearchresult && data.esearchresult.idlist) || [];
    if(ids.length === 0) return [];
    return await this.summarize(ids);
  },

  async summarize(pmids){
    const url = new URL(CONFIG.PUBMED.esummary);
    url.searchParams.set('db', 'pubmed');
    url.searchParams.set('id', pmids.join(','));
    url.searchParams.set('retmode', 'json');
    const key = Store.getRaw(CONFIG.STORAGE_KEYS.ncbiKey);
    if(key) url.searchParams.set('api_key', key);

    const res = await fetch(url);
    if(!res.ok) throw new Error('PubMed summary failed: ' + res.status);
    const data = await res.json();
    const uids = data.result.uids || [];

    // Optionally enrich top results with abstracts (efetch)
    let abstracts = {};
    try{
      abstracts = await this.fetchAbstracts(uids.slice(0, 5));
    }catch(e){ /* non-fatal */ }

    return uids.map(id => {
      const r = data.result[id];
      const authors = (r.authors || []).slice(0, 3).map(a => a.name).join(', ') +
        ((r.authors || []).length > 3 ? ', et al.' : '');
      return {
        pmid: id,
        title: r.title ? r.title.replace(/<[^>]+>/g, '') : '(untitled)',
        authors: authors || 'Unknown authors',
        journal: r.fulljournalname || r.source || '',
        pubdate: r.pubdate || '',
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        abstract: abstracts[id] || '',
        citation: this.formatCitation({ authors, title: r.title, journal: r.fulljournalname || r.source, pubdate: r.pubdate, id })
      };
    });
  },

  async fetchAbstracts(pmids){
    if(!pmids.length) return {};
    const url = new URL(CONFIG.PUBMED.efetch);
    url.searchParams.set('db', 'pubmed');
    url.searchParams.set('id', pmids.join(','));
    url.searchParams.set('retmode', 'xml');
    url.searchParams.set('rettype', 'abstract');
    const key = Store.getRaw(CONFIG.STORAGE_KEYS.ncbiKey);
    if(key) url.searchParams.set('api_key', key);

    const res = await fetch(url);
    if(!res.ok) return {};
    const xml = await res.text();
    const map = {};
    // lightweight extraction without full XML parser
    const articles = xml.split('<PubmedArticle>').slice(1);
    articles.forEach(chunk => {
      const idMatch = chunk.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const absMatch = chunk.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
      if(idMatch && absMatch){
        map[idMatch[1]] = absMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    });
    return map;
  },

  formatCitation({ authors, title, journal, pubdate, id }){
    const year = (pubdate || '').match(/\d{4}/);
    return `${authors || 'Unknown'}. ${title || ''} ${journal || ''}. ${year ? year[0] : ''}. PMID: ${id}.`;
  },

  async searchBookshelf(query, retmax = 5){
    const url = new URL(CONFIG.PUBMED.esearch);
    url.searchParams.set('db', CONFIG.NCBI_BOOKSHELF_ESEARCH_DB);
    url.searchParams.set('term', query);
    url.searchParams.set('retmax', retmax);
    url.searchParams.set('retmode', 'json');
    const res = await fetch(url);
    if(!res.ok) return [];
    const data = await res.json();
    const ids = (data.esearchresult && data.esearchresult.idlist) || [];
    return ids.map(id => ({ id, url: `https://www.ncbi.nlm.nih.gov/books/${id}/` }));
  }
};

window.PubMed = PubMed;
