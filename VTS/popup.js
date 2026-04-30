/**
 * popup.js - Settings popup v1.1.2
 */

const i18n = {
  zh: {
    thumbOn: '预览',
    thumbOff: '无预览',
    previewOn: '特写',
    previewOff: '无特写',
    unsupportedTitle: '不支持此页面',
    unsupportedMessage: '浏览器内部页面（如新标签页、扩展设置页等）无法使用此扩展功能。'
  },
  en: {
    thumbOn: 'PREVIEW',
    thumbOff: 'NO PREVIEW',
    previewOn: 'MACRO',
    previewOff: 'NO MACRO',
    unsupportedTitle: 'Unsupported Page',
    unsupportedMessage: 'Browser internal pages (new tab, extension settings, etc.) cannot use this extension.'
  }
};

const isInternal = url => url && ['chrome://', 'edge://', 'about:', 'chrome-extension://', 'file://'].some(p => url.startsWith(p));

let lang = 'zh';

async function init() {
  const { vts_settings: s = {}, vts_lang: l } = await chrome.storage.local.get(['vts_settings', 'vts_lang']);
  lang = l || (navigator.language.startsWith('zh') ? 'zh' : 'en');
  
  const optThumb = document.getElementById('optThumb');
  const optPreview = document.getElementById('optPreview');
  const langBtn = document.getElementById('langBtn');
  
  function applyState() {
    const hasThumb = s.showThumbnailsInList ?? true;
    const hasPreview = s.showSidePreview ?? true;
    optThumb.classList.toggle('on', hasThumb);
    optPreview.classList.toggle('on', hasPreview);
    optThumb.querySelector('.option-text').textContent = hasThumb ? i18n[lang].thumbOn : i18n[lang].thumbOff;
    optPreview.querySelector('.option-text').textContent = hasPreview ? i18n[lang].previewOn : i18n[lang].previewOff;
    langBtn.textContent = lang === 'zh' ? '中文 / EN' : 'EN / 中文';
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && isInternal(tab.url)) {
    document.body.classList.add('unsupported');
    document.getElementById('unsupportedTitle').textContent = i18n[lang].unsupportedTitle;
    document.getElementById('unsupportedMessage').textContent = i18n[lang].unsupportedMessage;
    applyState();
    langBtn.onclick = () => {
      lang = lang === 'zh' ? 'en' : 'zh';
      chrome.storage.local.set({ vts_lang: lang });
      document.getElementById('unsupportedTitle').textContent = i18n[lang].unsupportedTitle;
      document.getElementById('unsupportedMessage').textContent = i18n[lang].unsupportedMessage;
      applyState();
    };
    return;
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
  
  langBtn.onclick = () => {
    lang = lang === 'zh' ? 'en' : 'zh';
    chrome.storage.local.set({ vts_lang: lang });
    applyState();
  };
  
  applyState();
}

init();