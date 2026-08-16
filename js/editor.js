/* ============================================================
   JUW-MicroSlides — editor.js
   Renders the slide rail, the live stage (per layout), and
   applies deck-level design settings (font pair, font scale,
   accent color) as CSS custom properties.
   ============================================================ */

const Editor = {

  applyDesign(deck){
    const fontPair = DeckModel.getFontPair(deck);
    const accent = DeckModel.getAccent(deck);
    const stage = document.getElementById('stage');
    if(!stage) return;
    stage.style.setProperty('--stage-display-font', fontPair.display);
    stage.style.setProperty('--stage-body-font', fontPair.body);
    stage.style.setProperty('--stage-accent', accent.primary);
    stage.style.setProperty('--stage-accent-2', accent.secondary);
    stage.style.setProperty('--stage-scale', deck.design.fontScale || 1);
  },

  renderRail(deck, activeIndex){
    const list = document.getElementById('slidelist');
    const count = document.getElementById('slidecount');
    count.textContent = `${deck.slides.length} slide${deck.slides.length===1?'':''}`.trim();
    count.textContent = `${deck.slides.length} slide${deck.slides.length===1?'':'s'}`;
    list.innerHTML = '';
    deck.slides.forEach((slide, i) => {
      const chip = document.createElement('div');
      chip.className = 'slidechip' + (i===activeIndex ? ' active' : '');
      chip.draggable = true;
      chip.dataset.index = i;
      const thumbImg = slide.image ? `<img src="${slide.image.thumbUrl}" alt="">` : '';
      chip.innerHTML = `
        <span class="slidechip__num">${i+1}</span>
        <span class="slidechip__thumb">${thumbImg}</span>
        <span class="slidechip__title">${escapeHtml(slide.title||'Untitled')}</span>
        <button class="slidechip__del" title="Delete slide" data-del="${i}">✕</button>
      `;
      list.appendChild(chip);
    });
  },

  layoutBody(slide){
    switch(slide.layout){
      case 'juw-cover': {
        const c = slide.cover || {};
        const badgeSrc = (c.deptBadge && c.deptBadge.dataUrl) || 'icons/dept-badge-default.png';
        return `
          <div class="cover-frame">
            <div class="cover-seals">
              <img src="icons/logo-juw.png" alt="Jinnah University for Women">
              <img src="${badgeSrc}" alt="Department badge" data-cover-badge="1" title="Click to replace department badge" style="cursor:pointer;">
            </div>
            <h1 class="cover-title" contenteditable="true" data-field="title">${escapeHtml(slide.title)}</h1>
            <div class="cover-spacer"></div>
            <div class="cover-bottom">
              <div class="cover-dash"></div>
              <div class="cover-info">
                <div contenteditable="true" data-cover-field="courseName">${escapeHtml(c.courseName||'')}</div>
                <div contenteditable="true" data-cover-field="courseCode">${escapeHtml(c.courseCode||'')}</div>
                <div contenteditable="true" data-cover-field="preparedBy">${escapeHtml(c.preparedBy||'')}</div>
                <div contenteditable="true" data-cover-field="department">${escapeHtml(c.department||'')}</div>
              </div>
            </div>
          </div>
        `;
      }
      case 'title-bullets-image':
        return `
          <div class="stage__col stage__col--text">
            <div class="stage__eyebrow">Microbiology · JUW-MicroSlides</div>
            <h2 class="stage__title" contenteditable="true" data-field="title">${escapeHtml(slide.title)}</h2>
            <div class="stage__body" contenteditable="true" data-field="bulletsHtml">${bulletsToHtml(slide.bullets)}</div>
          </div>
          <div class="stage__col stage__col--media">${mediaFigure(slide)}</div>
        `;
      case 'two-column':
        return `
          <div class="stage__eyebrow">Microbiology · JUW-MicroSlides</div>
          <h2 class="stage__title" contenteditable="true" data-field="title">${escapeHtml(slide.title)}</h2>
          <div class="stage__row">
            <div class="stage__body" contenteditable="true" data-field="bulletsHtml">${bulletsToHtml(slide.bullets)}</div>
            <div class="stage__col--media">${mediaFigure(slide)}</div>
          </div>
        `;
      case 'full-bleed':
        return `
          <div class="stage__media">${slide.image ? `<img src="${slide.image.fullUrl||slide.image.thumbUrl}" alt="">` : userMediaImg(slide)}</div>
          <div class="stage__caption">
            <h2 class="stage__title" contenteditable="true" data-field="title" style="color:#fff">${escapeHtml(slide.title)}</h2>
            <div class="stage__body" contenteditable="true" data-field="bulletsHtml" style="color:#F5F3EE">${bulletsToHtml(slide.bullets)}</div>
          </div>
        `;
      case 'divider':
        return `<h2 class="stage__title" contenteditable="true" data-field="title" style="font-size:2.2em;color:#fff">${escapeHtml(slide.title)}</h2>`;
      case 'clinical-pearl':
        return `
          <div class="pearl-mark">&ldquo;</div>
          <div class="stage__body" contenteditable="true" data-field="bulletsHtml" style="font-family:var(--stage-display-font);font-style:italic;font-size:1.3em;max-width:26ch">${bulletsToHtml(slide.bullets)}</div>
        `;
      case 'comparison':
        return `
          <h2 class="stage__title" contenteditable="true" data-field="title">${escapeHtml(slide.title)}</h2>
          <table>${tableToHtml(slide.tableRows)}</table>
        `;
      case 'references':
        return `
          <h2 class="stage__title" contenteditable="true" data-field="title">${escapeHtml(slide.title||'References')}</h2>
          <ol>${(slide.bullets||[]).map(b=>`<li>${escapeHtml(b)}</li>`).join('')}</ol>
        `;
      case 'blank':
      default:
        return `
          <h2 class="stage__title" contenteditable="true" data-field="title">${escapeHtml(slide.title)}</h2>
          <div class="stage__body" contenteditable="true" data-field="bulletsHtml">${bulletsToHtml(slide.bullets)}</div>
          ${userMediaImg(slide)}
        `;
    }
  },

  renderStage(slide, deck){
    const stage = document.getElementById('stage');
    stage.dataset.layout = slide.layout;
    stage.innerHTML = `<div class="stage__inner">${this.layoutBody(slide)}</div>`;
    this.applyDesign(deck);
  },

  // Build an offscreen node (used by PDF export) mirroring renderStage but fixed pixel size.
  // Relies on the same app.css class rules as the live stage (this element is appended
  // into the live document, just positioned off-screen) so every layout — including
  // full-bleed and juw-cover, which need zero padding on .stage__inner — renders correctly.
  buildOffscreenStage(slide, deck, size){
    const wrap = document.createElement('div');
    wrap.className = 'stage';
    wrap.dataset.layout = slide.layout;
    wrap.style.width = size.width+'px';
    wrap.style.height = size.height+'px';
    wrap.style.position = 'relative';
    wrap.style.aspectRatio = 'auto';
    wrap.style.fontFamily = 'var(--stage-body-font)';
    const fontPair = DeckModel.getFontPair(deck);
    const accent = DeckModel.getAccent(deck);
    wrap.style.setProperty('--stage-display-font', fontPair.display);
    wrap.style.setProperty('--stage-body-font', fontPair.body);
    wrap.style.setProperty('--stage-accent', accent.primary);
    wrap.style.setProperty('--stage-accent-2', accent.secondary);
    wrap.style.setProperty('--stage-scale', deck.design.fontScale || 1);
    wrap.style.fontSize = (16 * (deck.design.fontScale||1)) + 'px';
    const inner = document.createElement('div');
    inner.className = 'stage__inner';
    inner.innerHTML = this.layoutBody(slide).replace(/contenteditable="true"/g,'');
    wrap.appendChild(inner);
    return wrap;
  }
};

function bulletsToHtml(bullets){
  if(!bullets || bullets.length===0) return '<ul><li>Click to add content</li></ul>';
  return '<ul>' + bullets.map(b=>`<li>${escapeHtml(b)}</li>`).join('') + '</ul>';
}
function htmlToBullets(html){
  const div = document.createElement('div');
  div.innerHTML = html;
  const lis = Array.from(div.querySelectorAll('li'));
  if(lis.length) return lis.map(li=>li.textContent.trim()).filter(Boolean);
  const text = div.textContent.trim();
  return text ? [text] : [];
}
function tableToHtml(rows){
  if(!rows || rows.length===0) return '<tr><th>Feature</th><th>Organism A</th><th>Organism B</th></tr>';
  return rows.map((row,i)=>{
    const tag = i===0 ? 'th' : 'td';
    return '<tr>' + row.map(c=>`<${tag}>${escapeHtml(String(c))}</${tag}>`).join('') + '</tr>';
  }).join('');
}
function mediaFigure(slide){
  if(slide.image){
    return `<img src="${slide.image.thumbUrl}" alt="${escapeHtml(slide.image.title||'')}">
      <div class="stage__attribution">${escapeHtml(slide.image.attribution||'')} · ${escapeHtml(slide.image.license||'')}</div>`;
  }
  return userMediaImg(slide);
}
function userMediaImg(slide){
  if(slide.userMedia && slide.userMedia[0]){
    return `<img src="${slide.userMedia[0].dataUrl}" alt="">`;
  }
  return `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8A93A3;font-size:0.8em;border:1px dashed #DAD5C8;border-radius:10px;">No image yet — search Media or upload your own</div>`;
}
function escapeHtml(s){
  return (s==null?'':String(s)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

window.Editor = Editor;
window.htmlToBullets = htmlToBullets;
