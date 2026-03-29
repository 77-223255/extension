/**
 * content-script.js - 竖直标签预览切换器 v1.0.0
 */

;(function () {
  'use strict';
  if (window.__VTS) return;
  window.__VTS = true;

  const S = { visible: false, busy: false, tabs: [], sel: 0, active: 0, settings: { thumbs: true, preview: true, overlay: true } };
  const on = (el, types, fn, opt) => types.split(' ').forEach(t => el.addEventListener(t, fn, opt));

  const DOM = {
    overlay: null, list: null, preview: null, savedOverflow: '',
    _handler: null,
    
    create() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'vts-overlay';
      this.list = document.createElement('div');
      this.list.className = 'vts-tab-list';
      this.preview = document.createElement('div');
      this.preview.className = 'vts-preview-popup';
      this.preview.innerHTML = '<img><div class="vts-preview-title"></div>';
      this.overlay.appendChild(this.list);
      document.body.append(this.overlay, this.preview);
      this.savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      this.overlay.onclick = e => e.target === this.overlay && close();
      this._handler = onItemEvent;
      on(this.list, 'click mousedown mousemove mouseup', this._handler, true);
      this.list.addEventListener('mouseover', this._handler, true);
      this.list.addEventListener('mouseout', this._handler, true);
    },
    
    destroy() {
      if (this._handler && this.list) {
        this.list.removeEventListener('click', this._handler, true);
        this.list.removeEventListener('mousedown', this._handler, true);
        this.list.removeEventListener('mousemove', this._handler, true);
        this.list.removeEventListener('mouseup', this._handler, true);
        this.list.removeEventListener('mouseover', this._handler, true);
        this.list.removeEventListener('mouseout', this._handler, true);
      }
      this.overlay?.remove(), this.preview?.remove();
      document.body.style.overflow = this.savedOverflow;
      this.overlay = this.list = this.preview = this._handler = null;
    }
  };

  const api = {
    send: msg => new Promise((res, rej) => chrome.runtime.sendMessage(msg, r => chrome.runtime.lastError ? rej() : res(r))),
    getTabs: async () => {
      const r = await api.send({ action: 'getTabsAndCapture' });
      return r?.tabs || [];
    }
  };

  function render() {
    DOM.list.innerHTML = '';
    if (!S.tabs.length) return DOM.list.innerHTML = '<div class="vts-empty-message">没有标签页</div>';
    const frag = document.createDocumentFragment();
    S.tabs.forEach((t, i) => frag.appendChild(createItem(t, i)));
    DOM.list.appendChild(frag);
    updateSel();
  }

  function createItem(tab, idx) {
    const hasThumb = S.settings.thumbs && tab.thumbnail;
    const el = document.createElement('div');
    el.className = 'vts-tab-item' + (tab.active ? ' vts-active-tab' : '') + (hasThumb ? '' : ' vts-native-mode') + (hasThumb && S.settings.overlay ? ' vts-overlay-mode' : '');
    el.dataset.idx = idx;
    
    const bar = document.createElement('div');
    bar.className = 'vts-tab-title-bar';
    if (tab.favIconUrl) {
      const ico = document.createElement('img');
      ico.className = 'vts-tab-favicon';
      ico.src = tab.favIconUrl;
      ico.onerror = () => ico.style.display = 'none';
      bar.appendChild(ico);
    }
    const title = document.createElement('span');
    title.className = 'vts-tab-title';
    title.textContent = tab.title;
    bar.appendChild(title);
    const close = document.createElement('div');
    close.className = 'vts-close-btn';
    close.textContent = '×';
    bar.appendChild(close);
    
    if (hasThumb) {
      const thumb = document.createElement('div');
      thumb.className = 'vts-tab-thumbnail';
      const img = document.createElement('img');
      img.src = tab.thumbnail;
      img.loading = 'lazy';
      thumb.appendChild(img);
      thumb.appendChild(bar);
      el.appendChild(thumb);
    } else {
      el.appendChild(bar);
    }
    return el;
  }

  function updateSel(scroll) {
    const items = DOM.list?.querySelectorAll('.vts-tab-item');
    if (!items?.length) return;
    items.forEach((el, i) => el.classList.toggle('vts-selected', i === S.sel));
    if (scroll) items[S.sel]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function showPreview(tab) {
    if (!S.settings.preview || !tab?.thumbnail) return hidePreview();
    const img = DOM.preview.querySelector('img');
    DOM.preview.querySelector('.vts-preview-title').textContent = tab.title;
    img.onload = () => {
      const gap = Math.max(8, innerWidth * 0.02);
      const listL = DOM.list.getBoundingClientRect().left;
      const maxW = listL - gap * 2, maxH = innerHeight - gap * 2 - 28;
      const ratio = img.naturalWidth / img.naturalHeight;
      const w = Math.min(maxW, maxH * ratio), h = w / ratio;
      Object.assign(DOM.preview.style, { width: w + 'px', height: h + 28 + 'px', left: gap + 'px', top: (innerHeight - h - 28) / 2 + 'px' });
      DOM.preview.classList.add('vts-visible');
    };
    img.src = tab.thumbnail;
  }

  function hidePreview() { DOM.preview?.classList.remove('vts-visible'); }

  async function open() {
    if (S.visible) return close();
    if (S.busy) return;
    S.busy = true;
    try {
      const { vts_settings: s = {} } = await chrome.storage.local.get('vts_settings');
      S.settings.thumbs = s.showThumbnailsInList ?? true;
      S.settings.preview = s.showSidePreview ?? true;
      S.settings.overlay = s.titleOverlay ?? true;
      S.tabs = await api.getTabs();
      if (!S.tabs.length) return;
      S.sel = Math.max(0, S.tabs.findIndex(t => t.active));
      S.active = S.sel;
      DOM.create();
      render();
      DOM.overlay.classList.add('vts-active');
      S.visible = true;
    } finally { S.busy = false; }
  }

  function close() {
    if (!S.visible) return;
    hidePreview();
    S.visible = S.busy = false;
    DOM.overlay.classList.add('vts-fading-out');
    DOM.overlay.classList.remove('vts-active');
    setTimeout(() => { DOM.list.innerHTML = ''; DOM.destroy(); }, 150);
  }

  async function closeTab(id) {
    hidePreview();
    await api.send({ action: 'closeTab', tabId: id });
    const idx = S.tabs.findIndex(t => t.id === id);
    if (idx < 0) return;
    S.tabs.splice(idx, 1);
    if (!S.tabs.length) return close();
    if (S.sel >= S.tabs.length) S.sel = S.tabs.length - 1;
    else if (idx < S.sel) S.sel--;
    render();
  }

  let timer, pressing, lastItem = null;
  
  function onItemEvent(e) {
    const item = e.target.closest('.vts-tab-item');
    
    if (e.type === 'mouseover') {
      if (!item || item === lastItem) return;
      lastItem = item;
      const idx = +item.dataset.idx, tab = S.tabs[idx];
      if (!tab) return;
      S.sel = idx;
      updateSel();
      showPreview(tab);
      return;
    }
    
    if (e.type === 'mouseout') {
      if (!item) return;
      const related = e.relatedTarget?.closest('.vts-tab-item');
      if (related === item) return;
      if (item === lastItem) lastItem = null;
      hidePreview();
      clearTimeout(timer);
      if (S.sel !== S.active) { S.sel = S.active; updateSel(); }
      return;
    }
    
    if (!item) return;
    const idx = +item.dataset.idx, tab = S.tabs[idx];
    if (!tab) return;
    const isClose = e.target.closest('.vts-close-btn');
    
    if (e.type === 'click') {
      if (isClose) return e.stopImmediatePropagation(), closeTab(tab.id);
      if (!pressing) { close(); api.send({ action: 'switchTab', tabId: tab.id }); }
      pressing = false;
    }
    if (e.type === 'mousedown' && e.button === 0 && !isClose) {
      timer = setTimeout(() => { pressing = true; showPreview(tab); }, 400);
    }
    if (e.type === 'mousemove') clearTimeout(timer);
  }

  on(document, 'keydown', e => {
    if (e.key === ' ' && e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      return S.visible ? close() : open();
    }
    if (!S.visible) return;
    if (e.key === 'ArrowUp') S.sel = (S.sel - 1 + S.tabs.length) % S.tabs.length, updateSel(1);
    else if (e.key === 'ArrowDown') S.sel = (S.sel + 1) % S.tabs.length, updateSel(1);
    else if (e.key === 'Enter' && S.tabs[S.sel]) { close(); api.send({ action: 'switchTab', tabId: S.tabs[S.sel].id }); }
    else if ((e.key === 'Backspace' || e.key === 'Delete') && S.tabs[S.sel]) closeTab(S.tabs[S.sel].id);
    else if (e.key === 'Escape') close();
    else return;
    e.preventDefault();
  }, true);

  chrome.runtime.onMessage.addListener((msg, _, send) => {
    if (msg.action === 'trigger') open(), send({ ok: true });
    return true;
  });
})();