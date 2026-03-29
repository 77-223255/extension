/**
 * popup.js - 设置窗口 v1.0.0
 */

const i18n = {
  zh: {
    thumbOn: '预览',
    thumbOff: '无预览',
    previewOn: '特写',
    previewOff: '无特写',
    overlayOn: '覆盖',
    overlayOff: '无覆盖'
  },
  en: {
    thumbOn: 'PREVIEW',
    thumbOff: 'NO PREVIEW',
    previewOn: 'MACRO',
    previewOff: 'NO MACRO',
    overlayOn: 'OVERLAY',
    overlayOff: 'NO OVERLAY'
  }
};

let lang = 'zh';

async function init() {
  const { vts_settings: s = {}, vts_lang: l } = await chrome.storage.local.get(['vts_settings', 'vts_lang']);
  lang = l || (navigator.language.startsWith('zh') ? 'zh' : 'en');
  
  const optThumb = document.getElementById('optThumb');
  const optPreview = document.getElementById('optPreview');
  const optOverlay = document.getElementById('optOverlay');
  const langBtn = document.getElementById('langBtn');
  const divBeforeOverlay = document.getElementById('divBeforeOverlay');
  const divAfterOverlay = document.getElementById('divAfterOverlay');
  
  function applyLang() {
    const hasThumb = s.showThumbnailsInList ?? true;
    const hasPreview = s.showSidePreview ?? true;
    const hasOverlay = s.titleOverlay ?? true;
    
    optThumb.querySelector('.option-text').textContent = hasThumb ? i18n[lang].thumbOn : i18n[lang].thumbOff;
    optPreview.querySelector('.option-text').textContent = hasPreview ? i18n[lang].previewOn : i18n[lang].previewOff;
    optOverlay.querySelector('.option-text').textContent = hasOverlay ? i18n[lang].overlayOn : i18n[lang].overlayOff;
    langBtn.textContent = lang === 'zh' ? '中文 / EN' : 'EN / 中文';
  }
  
  function applyState() {
    const hasThumb = s.showThumbnailsInList ?? true;
    const hasPreview = s.showSidePreview ?? true;
    const hasOverlay = s.titleOverlay ?? true;
    
    optThumb.classList.toggle('on', hasThumb);
    optPreview.classList.toggle('on', hasPreview);
    optOverlay.classList.toggle('on', hasOverlay);
    optOverlay.classList.toggle('disabled', !hasThumb);
    divBeforeOverlay.classList.toggle('collapsed', !hasThumb);
    divAfterOverlay.classList.toggle('collapsed', !hasThumb);
    
    optOverlay.querySelector('.option-img').style.width = hasThumb ? '100%' : '0';
    
    applyLang();
  }
  
  function save() {
    chrome.storage.local.set({ vts_settings: s });
  }
  
  optThumb.onclick = () => {
    s.showThumbnailsInList = !(s.showThumbnailsInList ?? true);
    applyState(); save();
  };
  
  optPreview.onclick = () => {
    s.showSidePreview = !(s.showSidePreview ?? true);
    applyState(); save();
  };
  
  optOverlay.onclick = () => {
    if (!(s.showThumbnailsInList ?? true)) return;
    s.titleOverlay = !(s.titleOverlay ?? true);
    applyState(); save();
  };
  
  langBtn.onclick = () => {
    lang = lang === 'zh' ? 'en' : 'zh';
    chrome.storage.local.set({ vts_lang: lang });
    applyLang();
  };
  
  applyState();
}

init();