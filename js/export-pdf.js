/* ============================================================
   JUW-MicroSlides — export-pdf.js
   Snapshots the rendered .stage DOM node per slide to a
   print-quality PDF using html2canvas + jsPDF (via CDN).
   ============================================================ */

const ExportPDF = {

  async export(deck, renderSlideToStage){
    if(typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined'){
      throw new Error('PDF libraries did not load — check your internet connection.');
    }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation:'landscape', unit:'px', format:[1280,720] });

    const offscreen = document.createElement('div');
    offscreen.style.position='fixed';
    offscreen.style.left='-99999px';
    offscreen.style.top='0';
    offscreen.style.width='1280px';
    offscreen.style.height='720px';
    document.body.appendChild(offscreen);

    try{
      for(let i=0;i<deck.slides.length;i++){
        offscreen.innerHTML = '';
        const stageEl = renderSlideToStage(deck.slides[i], deck, { width:1280, height:720 });
        offscreen.appendChild(stageEl);
        // allow images to load
        await this.waitForImages(stageEl);
        const canvas = await html2canvas(stageEl, { width:1280, height:720, scale:2, useCORS:true, backgroundColor:'#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if(i>0) pdf.addPage([1280,720], 'landscape');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1280, 720);
      }
      const fileName = (deck.title || 'JUW-MicroSlides-Deck').replace(/[^a-z0-9\-_]+/gi,'_');
      pdf.save(`${fileName}.pdf`);
    } finally {
      document.body.removeChild(offscreen);
    }
  },

  waitForImages(container){
    const imgs = Array.from(container.querySelectorAll('img'));
    return Promise.all(imgs.map(img => {
      if(img.complete) return Promise.resolve();
      return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    }));
  }
};

window.ExportPDF = ExportPDF;
