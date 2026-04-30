/**
 * content-script.js - Vertical Tab Switcher v1.1.2
 * Overlay UI with keyboard/mouse navigation and preview
 */

;(function () {
  'use strict';
  if (window.__VTS) return;
  window.__VTS = true;

  const S = { visible: false, busy: false, tabs: [], sel: 0, active: 0, settings: { thumbs: true, preview: true }, altHeld: false, initialized: false };
  const on = (el, types, fn, opt) => types.split(' ').forEach(t => el.addEventListener(t, fn, opt));
  
  function calcLayout() {
    const thumbH = S.settings.thumbs ? Math.max(52, Math.min(190, innerHeight * 0.09)) : 0;
    document.documentElement.style.setProperty('--vts-h', (thumbH || 44) + 'px');
  }

  function getImageNaturalSize(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = dataUrl;
    });
  }

  const DOM = {
    overlay: null, list: null, preview: null,
    savedPosition: '', savedTop: '', savedWidth: '', savedScrollY: 0,
    _handler: null, _container: null,
    
    create() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'vts-overlay';
      this.list = document.createElement('div');
      this.list.className = 'vts-tab-list';
      this.preview = document.createElement('div');
      this.preview.className = 'vts-preview-popup';
      this.preview.innerHTML = '<img><div class="vts-preview-title"></div>';
      this.overlay.appendChild(this.list);
      this._container = document.fullscreenElement || document.body;
      this._container.append(this.overlay, this.preview);
      if (!document.fullscreenElement) {
        this.savedScrollY = window.scrollY;
        this.savedPosition = document.body.style.position;
        this.savedTop = document.body.style.top;
        this.savedWidth = document.body.style.width;
        document.body.style.position = 'fixed';
        document.body.style.top = -this.savedScrollY + 'px';
        document.body.style.width = '100%';
      }
      this.overlay.onclick = e => e.target === this.overlay && close();
      this._handler = onItemEvent;
      on(this.list, 'click mousedown mousemove mouseup mouseover mouseout', this._handler, true);
    },
    
    destroy() {
      if (this._handler && this.list) {
        ['click', 'mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout'].forEach(t => this.list.removeEventListener(t, this._handler, true));
      }
      this.overlay?.remove(), this.preview?.remove();
      if (this._container === document.body) {
        document.body.style.position = this.savedPosition;
        document.body.style.top = this.savedTop;
        document.body.style.width = this.savedWidth;
        window.scrollTo(0, this.savedScrollY);
      }
      this.overlay = this.list = this.preview = this._handler = this._container = null;
    }
  };

  const api = {
    send: msg => new Promise((res, rej) => chrome.runtime.sendMessage(msg, r => chrome.runtime.lastError ? rej() : res(r))),
    getTabs: () => api.send({ action: 'getTabsAndCapture' }).then(r => r?.tabs || [])
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
    el.className = 'vts-tab-item' + (tab.active ? ' vts-active-tab' : '') + (hasThumb ? ' vts-overlay-mode' : ' vts-native-mode');
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
    showPreview(S.tabs[S.sel]);
  }

  function positionList(previewSize = null) {
    if (!DOM.list) return;
    if (S.settings.preview && previewSize?.w > 0) {
      const edge = Math.max(32, innerWidth * 0.03);
      const gap = 32;
      const listW = 280;
      const titleH = 28;
      const availW = innerWidth - edge * 2 - listW - gap;
      const availH = innerHeight - edge * 2 - titleH;
      const ratio = previewSize.w / previewSize.h;
      let w = Math.min(availW, availH * ratio);
      let h = w / ratio;
      if (h > availH) { h = availH; w = h * ratio; }
      const totalW = listW + gap + w;
      const listX = (innerWidth - totalW) / 2;
      DOM.list.style.cssText = `position:absolute;left:${listX}px;top:50%;transform:translateY(-50%)`;
    } else if (S.settings.preview) {
      const edge = Math.max(32, innerWidth * 0.03);
      const gap = 32;
      const listW = 280;
      const previewW = Math.min(innerWidth * 0.35, innerHeight * 0.6);
      const listX = (innerWidth - listW - gap - previewW) / 2;
      DOM.list.style.cssText = `position:absolute;left:${listX}px;top:50%;transform:translateY(-50%)`;
    } else {
      DOM.list.style.cssText = '';
    }
  }

  function showPreview(tab) {
    if (!S.settings.preview || !tab?.thumbnail) {
      DOM.preview?.classList.remove('vts-visible');
      return;
    }
    const img = DOM.preview.querySelector('img');
    DOM.preview.querySelector('.vts-preview-title').textContent = tab.title;
    img.onload = () => {
      const edge = Math.max(32, innerWidth * 0.03);
      const gap = 32;
      const listW = 280;
      const titleH = 28;
      const availW = innerWidth - edge * 2 - listW - gap;
      const availH = innerHeight - edge * 2 - titleH;
      const ratio = img.naturalWidth / img.naturalHeight;
      let w = Math.min(availW, availH * ratio);
      let h = w / ratio;
      if (h > availH) { h = availH; w = h * ratio; }
      const listRect = DOM.list.getBoundingClientRect();
      const previewX = listRect.right + gap;
      const previewY = (innerHeight - h - titleH) / 2;
      Object.assign(DOM.preview.style, { width: w + 'px', height: h + titleH + 'px', left: previewX + 'px', top: previewY + 'px' });
      DOM.preview.classList.add('vts-visible');
    };
    img.src = tab.thumbnail;
  }

  async function open() {
    if (S.visible) return close();
    if (S.busy) return;
    S.busy = true;
    S.altHeld = true;
    try {
      const { vts_settings: s = {} } = await chrome.storage.local.get('vts_settings');
      S.settings.thumbs = s.showThumbnailsInList ?? true;
      S.settings.preview = s.showSidePreview ?? true;
      S.tabs = await api.getTabs();
      if (!S.tabs.length) return;
      S.sel = S.active = Math.max(0, S.tabs.findIndex(t => t.active));

      let initialPreviewSize = null;
      if (S.settings.preview && S.tabs[S.sel]?.thumbnail) {
        initialPreviewSize = await getImageNaturalSize(S.tabs[S.sel].thumbnail);
      }

      calcLayout();
      DOM.create();
      render();
      positionList(initialPreviewSize);
      DOM.overlay.classList.add('vts-active');
      S.visible = true;
      S.initialized = false;
    } finally { S.busy = false; }
  }

  function close() {
    if (!S.visible) return;
    DOM.preview?.classList.remove('vts-visible');
    S.visible = S.busy = false;
    S.altHeld = S.initialized = false;
    if (DOM.list) DOM.list.style.cssText = '';
    DOM.overlay.classList.add('vts-fading-out');
    DOM.overlay.classList.remove('vts-active');
    setTimeout(() => { DOM.list.innerHTML = ''; DOM.destroy(); }, 150);
  }

  async function closeTab(id) {
    DOM.preview?.classList.remove('vts-visible');
    await api.send({ action: 'closeTab', tabId: id });
    const idx = S.tabs.findIndex(t => t.id === id);
    if (idx < 0) return;
    S.tabs.splice(idx, 1);
    if (!S.tabs.length) return close();
    if (S.sel >= S.tabs.length) S.sel = S.tabs.length - 1;
    else if (idx < S.sel) S.sel--;
    calcLayout();
    render();
  }

  let timer, pressing, lastItem = null;
  
  function onItemEvent(e) {
    if (!S.visible) return;
    if (e.type === 'mousemove') return S.initialized = true, clearTimeout(timer);
    if (e.type === 'mouseover' && !S.initialized) return;
    const item = e.target.closest('.vts-tab-item');
    
    if (e.type === 'mouseover') {
      if (!item || item === lastItem) return;
      lastItem = item;
      const idx = +item.dataset.idx, tab = S.tabs[idx];
      if (!tab) return;
      S.sel = idx;
      updateSel();
      return;
    }
    
    if (e.type === 'mouseout') {
      if (!item) return;
      const related = e.relatedTarget?.closest('.vts-tab-item');
      if (related === item) return;
      if (item === lastItem) lastItem = null;
      clearTimeout(timer);
      if (!related) {
        S.sel = S.active;
        updateSel();
      }
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
      timer = setTimeout(() => pressing = true, 400);
    }
  }

  on(document, 'keydown', e => {
    if (!S.visible) return;
    if (e.key === 'ArrowUp') S.sel = (S.sel - 1 + S.tabs.length) % S.tabs.length, updateSel(1);
    else if (e.key === 'ArrowDown') S.sel = (S.sel + 1) % S.tabs.length, updateSel(1);
    else if (e.key === 'Enter' && S.tabs[S.sel]) { close(); api.send({ action: 'switchTab', tabId: S.tabs[S.sel].id }); }
    else if ((e.key === 'Backspace' || e.key === 'Delete') && S.tabs[S.sel]) closeTab(S.tabs[S.sel].id);
    else if (e.key === 'Escape') close();
    else return;
    e.preventDefault();
  }, true);

  on(document, 'keyup', e => {
    if (e.key === 'Alt' && S.visible && S.altHeld) {
      S.altHeld = false;
      if (S.tabs[S.sel]) api.send({ action: 'switchTab', tabId: S.tabs[S.sel].id });
      close();
    }
  }, true);

  chrome.runtime.onMessage.addListener((msg, _, send) => {
    if (msg.action === 'trigger') {
      if (S.visible) S.sel = (S.sel + 1) % S.tabs.length, updateSel(1);
      else open();
      send({ ok: true });
    }
    if (msg.action === 'navigateUp') {
      if (S.visible) S.sel = (S.sel - 1 + S.tabs.length) % S.tabs.length, updateSel(1);
      else open();
      send({ ok: true });
    }
    return true;
  });
})();