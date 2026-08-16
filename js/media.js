/* ============================================================
   JUW-MicroSlides — media.js
   Free/open image, diagram, and GIF sourcing:
   1) Wikimedia Commons  2) Openverse  3) CDC PHIL (link-through)
   4) Wikipedia lead image (fallback)
   All keyless. Every result carries license + attribution.
   ============================================================ */

const Media = {

  async searchCommons(query, limit=12){
    const url = new URL(CONFIG.WIKIMEDIA);
    url.searchParams.set('action','query');
    url.searchParams.set('generator','search');
    url.searchParams.set('gsrsearch', `${query} filetype:bitmap|drawing`);
    url.searchParams.set('gsrlimit', limit);
    url.searchParams.set('prop','imageinfo');
    url.searchParams.set('iiprop','url|extmetadata|mime');
    url.searchParams.set('iiurlwidth','400');
    url.searchParams.set('format','json');
    url.searchParams.set('origin','*');

    const res = await fetch(url);
    if(!res.ok) return [];
    const data = await res.json();
    const pages = (data.query && data.query.pages) || {};
    return Object.values(pages).map(p => {
      const info = (p.imageinfo && p.imageinfo[0]) || {};
      const meta = info.extmetadata || {};
      return {
        source: 'Wikimedia Commons',
        title: p.title ? p.title.replace('File:','') : 'Untitled',
        thumbUrl: info.thumburl || info.url,
        fullUrl: info.url,
        mime: info.mime || '',
        isGif: (info.mime||'').includes('gif'),
        license: meta.LicenseShortName ? meta.LicenseShortName.value : 'See file page',
        attribution: meta.Artist ? stripHtml(meta.Artist.value) : (meta.Credit ? stripHtml(meta.Credit.value) : 'Wikimedia Commons'),
        pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title||'')}`
      };
    }).filter(x => x.thumbUrl);
  },

  async searchOpenverse(query, limit=12){
    const url = new URL(CONFIG.OPENVERSE);
    url.searchParams.set('q', query);
    url.searchParams.set('license_type','all-cc,commercial,modification');
    url.searchParams.set('page_size', limit);

    const res = await fetch(url);
    if(!res.ok) return [];
    const data = await res.json();
    return (data.results||[]).map(r => ({
      source:'Openverse',
      title: r.title || 'Untitled',
      thumbUrl: r.thumbnail || r.url,
      fullUrl: r.url,
      isGif: (r.filetype||'').toLowerCase()==='gif',
      license: (r.license||'').toUpperCase() + (r.license_version ? ' '+r.license_version : ''),
      attribution: r.creator || r.source || 'Openverse',
      pageUrl: r.foreign_landing_url || r.url
    }));
  },

  // CDC PHIL has no open JSON API — we link out to a pre-built search URL
  // rather than scraping/hotlinking without permission.
  philSearchLink(query){
    return `https://phil.cdc.gov/Details.aspx?SearchTerm=${encodeURIComponent(query)}`;
  },

  async wikipediaLeadImage(topic){
    try{
      const res = await fetch(CONFIG.WIKIPEDIA_SUMMARY + encodeURIComponent(topic));
      if(!res.ok) return null;
      const data = await res.json();
      if(!data.thumbnail) return null;
      return {
        source:'Wikipedia',
        title: data.title,
        thumbUrl: data.thumbnail.source,
        fullUrl: (data.originalimage && data.originalimage.source) || data.thumbnail.source,
        isGif:false,
        license:'CC BY-SA (see article)',
        attribution: data.title + ' — Wikipedia contributors',
        pageUrl: data.content_urls ? data.content_urls.desktop.page : ''
      };
    }catch(e){ return null; }
  },

  async searchAll(query){
    const [commons, openverse, wiki] = await Promise.all([
      this.searchCommons(query).catch(()=>[]),
      this.searchOpenverse(query).catch(()=>[]),
      this.wikipediaLeadImage(query).catch(()=>null)
    ]);
    const results = [...commons, ...openverse];
    if(wiki) results.push(wiki);
    return results;
  }
};

function stripHtml(s){ return (s||'').replace(/<[^>]+>/g,'').trim(); }

window.Media = Media;
