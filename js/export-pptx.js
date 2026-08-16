/* ============================================================
   JUW-MicroSlides — export-pptx.js
   Builds an editable .pptx using PptxGenJS (loaded via CDN in app.html).
   Mirrors the on-screen layout, font pair, and accent color.
   ============================================================ */

const ExportPPTX = {

  async export(deck){
    if(typeof PptxGenJS === 'undefined'){
      throw new Error('PptxGenJS did not load — check your internet connection.');
    }
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name:'WIDE', width:13.33, height:7.5 });
    pptx.layout = 'WIDE';

    const accent = DeckModel.getAccent(deck);
    const fontPair = DeckModel.getFontPair(deck);
    const bodyFont = this.cssFontToPptx(fontPair.body);
    const displayFont = this.cssFontToPptx(fontPair.display);

    for(const slide of deck.slides){
      const s = pptx.addSlide();
      await this.renderSlide(pptx, s, slide, { accent, bodyFont, displayFont, deck });
    }

    const fileName = (deck.title || 'JUW-MicroSlides-Deck').replace(/[^a-z0-9\-_]+/gi,'_');
    await pptx.writeFile({ fileName: `${fileName}.pptx` });
  },

  cssFontToPptx(cssFont){
    // take first family name out of a css font-family string
    const first = (cssFont||'Arial').split(',')[0].replace(/['"]/g,'').trim();
    return first || 'Arial';
  },

  async imgFromUrl(url){
    try{
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve,reject)=>{
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }catch(e){ return null; }
  },

  async renderSlide(pptx, s, slide, ctx){
    const { accent, bodyFont, displayFont } = ctx;
    s.background = { color:'FFFFFF' };
    const primary = accent.primary.replace('#','');
    const secondary = accent.secondary.replace('#','');

    let imgData = null;
    if(slide.image && slide.image.fullUrl){
      imgData = await this.imgFromUrl(slide.image.fullUrl);
    } else if(slide.userMedia && slide.userMedia[0]){
      imgData = slide.userMedia[0].dataUrl;
    }

    if(slide.layout === 'juw-cover'){
      s.background = { color:'C7623F' };
      s.addShape('rect', { x:0.22, y:0.22, w:12.89, h:7.06, fill:{color:'D9E4E6'}, line:{type:'none'} });
      s.addShape('rect', { x:0.45, y:0.45, w:12.43, h:6.6, fill:{color:'FFFFFF'}, line:{type:'none'} });

      const logoData = await this.imgFromUrl('icons/logo-juw.png');
      if(logoData) s.addImage({ data:logoData, x:0.7, y:0.7, w:1.35, h:1.35, sizing:{type:'contain', w:1.35, h:1.35} });

      const c = slide.cover || {};
      const badgeUrl = (c.deptBadge && c.deptBadge.dataUrl) || 'icons/dept-badge-default.png';
      const badgeData = c.deptBadge ? c.deptBadge.dataUrl : await this.imgFromUrl(badgeUrl);
      if(badgeData) s.addImage({ data:badgeData, x:10.9, y:0.65, w:1.5, h:1.5, sizing:{type:'contain', w:1.5, h:1.5} });

      s.addText(slide.title||'', { x:1.0, y:2.5, w:9.5, h:1.4, fontFace:displayFont, fontSize:34, bold:true, color:'14202F' });
      s.addShape('rect', { x:5.0, y:5.85, w:0.35, h:0.09, fill:{color:'8FC7E8'}, line:{type:'none'} });

      const infoLines = [c.courseName, c.courseCode, c.preparedBy, c.department].filter(Boolean);
      s.addText(infoLines.join('\n'), { x:8.3, y:5.35, w:4.2, h:1.5, fontFace:bodyFont, fontSize:12, color:'14202F', align:'right', lineSpacing:20 });
      return;
    }

    if(slide.layout === 'divider'){
      s.background = { color: primary };
      s.addText(slide.title||'', { x:0.8, y:3.1, w:11.7, h:1.3, fontFace:displayFont, fontSize:36, bold:true, color:'FFFFFF', align:'center' });
      return;
    }

    if(slide.layout === 'full-bleed'){
      if(imgData) s.addImage({ data:imgData, x:0, y:0, w:13.33, h:7.5, sizing:{type:'cover', w:13.33, h:7.5} });
      s.addText(slide.title||'', { x:0.6, y:5.9, w:12.1, h:0.9, fontFace:displayFont, fontSize:28, bold:true, color:'FFFFFF' });
      if(slide.bullets && slide.bullets[0]){
        s.addText(slide.bullets.join('  •  '), { x:0.6, y:6.7, w:12.1, h:0.6, fontFace:bodyFont, fontSize:13, color:'F5F3EE' });
      }
      return;
    }

    if(slide.layout === 'clinical-pearl'){
      s.background = { color:'EFE8FB' };
      s.addText('"', { x:0.6, y:0.6, w:1, h:1, fontFace:displayFont, fontSize:60, color:primary });
      s.addText(slide.bullets ? slide.bullets.join(' ') : (slide.title||''), { x:1.2, y:2.2, w:11.0, h:3.0, fontFace:displayFont, fontSize:26, italic:true, align:'center', color:'14202F' });
      return;
    }

    if(slide.layout === 'comparison'){
      s.addText(slide.title||'', { x:0.6, y:0.4, w:12.1, h:0.7, fontFace:displayFont, fontSize:24, bold:true, color:'14202F' });
      const rows = (slide.tableRows && slide.tableRows.length) ? slide.tableRows : [['—','—'],['—','—']];
      const tableRows = rows.map(r => r.map(cell => ({ text:String(cell), options:{ fontFace:bodyFont, fontSize:12 } })));
      s.addTable(tableRows, { x:0.6, y:1.3, w:12.1, h:5.5, border:{type:'solid', color:'DAD5C8', pt:1}, autoPage:false });
      return;
    }

    if(slide.layout === 'references'){
      s.addText(slide.title||'References', { x:0.6, y:0.4, w:12.1, h:0.7, fontFace:displayFont, fontSize:24, bold:true, color:'14202F' });
      const text = (slide.bullets||[]).map((b,i)=>`${i+1}. ${b}`).join('\n');
      s.addText(text, { x:0.6, y:1.2, w:12.1, h:5.8, fontFace:'Courier New', fontSize:11, color:'5B6472' });
      return;
    }

    // Default: title-bullets-image / two-column / blank all share this base
    s.addText(slide.title||'', { x:0.6, y:0.4, w:12.1, h:0.9, fontFace:displayFont, fontSize:26, bold:true, color:'14202F' });
    s.addShape('rect', { x:0.6, y:1.25, w:1.1, h:0.04, fill:{color:secondary} });

    const hasImg = !!imgData;
    const textW = hasImg ? 6.6 : 12.1;
    if(slide.bullets && slide.bullets.length){
      s.addText(
        slide.bullets.map(b=>({ text:b, options:{ bullet:true, breakLine:true } })),
        { x:0.6, y:1.6, w:textW, h:5.4, fontFace:bodyFont, fontSize:16, color:'14202F', valign:'top' }
      );
    }
    if(hasImg){
      s.addImage({ data:imgData, x:7.5, y:1.6, w:5.2, h:5.2, sizing:{type:'contain', w:5.2, h:5.2} });
      if(slide.image && slide.image.attribution){
        s.addText(`Image: ${slide.image.attribution} (${slide.image.license||''})`, { x:7.5, y:6.85, w:5.2, h:0.4, fontFace:bodyFont, fontSize:8, color:'8A93A3' });
      }
    }

    if(slide.notes){
      s.addNotes(slide.notes);
    }
  }
};

window.ExportPPTX = ExportPPTX;
