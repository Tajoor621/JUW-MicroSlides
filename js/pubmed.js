/* ============================================================
   JUW-MicroSlides — pubmed.js
   NCBI E-utilities: search PubMed, pull summaries + abstracts,
   format Vancouver-style citations with live PMID links.
   No API key required for light/educational use.
   ============================================================ */

const PubMed = {

  async search(query, retmax=8){
    const url = new URL(CONFIG.PUBMED.esearch);
    url.searchParams.set('db','pubmed');
    url.searchParams.set('term', query);
    url.searchParams.set('retmax', retmax);
    url.searchParams.set('retmode','json');
    url.searchParams.set('sort','relevance');
    const key = Store.getRaw(CONFIG.STORAGE_KEYS.ncbiKey);
    if(key) url.searchParams.set('api_key', key);

    const res = await fetch(url);
    if(!res.ok) throw new Error('PubMed search failed: '+res.status);
    const data = await res.json();
    const ids = (data.esearchresult && data.esearchresult.idlist) || [];
    if(ids.length === 0) return [];
    return await this.summarize(ids);
  },

  async summarize(pmids){
    const url = new URL(CONFIG.PUBMED.esummary);
    url.searchParams.set('db','pubmed');
    url.searchParams.set('id', pmids.join(','));
    url.searchParams.set('retmode','json');
    const key = Store.getRaw(CONFIG.STORAGE_KEYS.ncbiKey);
    if(key) url.searchParams.set('api_key', key);

    const res = await fetch(url);
    if(!res.ok) throw new Error('PubMed summary failed: '+res.status);
    const data = await res.json();
    const uids = data.result.uids || [];
    return uids.map(id => {
      const r = data.result[id];
      const authors = (r.authors||[]).slice(0,3).map(a=>a.name).join(', ') + ((r.authors||[]).length>3 ? ', et al.' : '');
      return {
        pmid: id,
        title: r.title ? r.title.replace(/<[^>]+>/g,'') : '(untitled)',
        authors: authors || 'Unknown authors',
        journal: r.fulljournalname || r.source || '',
        pubdate: r.pubdate || '',
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        citation: this.formatCitation({ authors, title:r.title, journal:r.fulljournalname||r.source, pubdate:r.pubdate, id })
      };
    });
  },

  formatCitation({authors, title, journal, pubdate, id}){
    const year = (pubdate||'').match(/\d{4}/);
    return `${authors||'Unknown'}. ${title||''} ${journal||''}. ${year?year[0]:''}. PMID: ${id}.`;
  },

  // NCBI Bookshelf (StatPearls etc.) — public-domain clinical reference text
  async searchBookshelf(query, retmax=5){
    const url = new URL(CONFIG.PUBMED.esearch);
    url.searchParams.set('db', CONFIG.NCBI_BOOKSHELF_ESEARCH_DB);
    url.searchParams.set('term', query);
    url.searchParams.set('retmax', retmax);
    url.searchParams.set('retmode','json');
    const res = await fetch(url);
    if(!res.ok) return [];
    const data = await res.json();
    const ids = (data.esearchresult && data.esearchresult.idlist) || [];
    return ids.map(id => ({ id, url: `https://www.ncbi.nlm.nih.gov/books/${id}/` }));
  }
};

window.PubMed = PubMed;
