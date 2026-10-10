// ===== Защита: не запускаемся внутри iframe =====
if (window.top === window.self) {

  // Убираем старые элементы (если расширение перезагрузилось)
  document.querySelectorAll('#my-search-trigger, #google-search-popup, #my-search-glow').forEach(el => el.remove());

  // =========================================
  // 1. СЛОЙ ПОДСВЕТКИ (жёлто-зелёные волны)
  // =========================================
  const glow = document.createElement('div');
  glow.id = 'my-search-glow';
  document.body.appendChild(glow);

  // =========================================
  // 2. ПОЛОСКА ВНИЗУ ЭКРАНА
  // =========================================
  const trigger = document.createElement('div');
  trigger.id = 'my-search-trigger';
  trigger.innerHTML = `<div class="trigger-pill"></div>`;
  document.body.appendChild(trigger);

  // =========================================
  // 3. ОКНО ПОИСКА
  // =========================================
  const popup = document.createElement('div');
  popup.id = 'google-search-popup';
  popup.innerHTML = `
    <div class="popup-resize-top"></div>
    <div class="popup-resize-left"></div>
    <div class="popup-resize-right"></div>
    <div class="popup-header">
      <span class="popup-title">Поиск Google</span>
      <button class="popup-close">✕</button>
    </div>
    <div class="popup-content">
      <iframe id="google-iframe" src="about:blank"></iframe>
    </div>
    <div class="popup-resize-corner"></div>
  `;
  document.body.appendChild(popup);

  const iframe = document.getElementById('google-iframe');
  const closeBtn = popup.querySelector('.popup-close');
  const resizeTop = popup.querySelector('.popup-resize-top');
  const resizeLeft = popup.querySelector('.popup-resize-left');
  const resizeRight = popup.querySelector('.popup-resize-right');
  const resizeCorner = popup.querySelector('.popup-resize-corner');

  // =========================================
  // 4. ОТСЛЕЖИВАНИЕ ВЫДЕЛЕНИЯ ТЕКСТА
  // =========================================
  document.addEventListener('mouseup', () => {
    setTimeout(() => {
      const selection = window.getSelection().toString().trim();
      if (selection.length > 0) {
        trigger.classList.add('active');
        trigger.dataset.text = selection;
      }
    }, 10);
  });

  document.addEventListener('touchend', () => {
    setTimeout(() => {
      const selection = window.getSelection().toString().trim();
      if (selection.length > 0) {
        trigger.classList.add('active');
        trigger.dataset.text = selection;
      }
    }, 200);
  });

  // =========================================
  // 5. ОТКРЫТИЕ ОКНА ПО КЛИКУ НА ПОЛОСКУ
  // =========================================
  trigger.addEventListener('click', () => {
    const selection = trigger.dataset.text || window.getSelection().toString().trim();
    
    if (!selection || selection.length === 0) {
      trigger.classList.add('shake');
      setTimeout(() => trigger.classList.remove('shake'), 400);
      return;
    }

    glow.classList.add('active');
    const query = encodeURIComponent(selection);
    iframe.src = `https://www.google.com/search?q=${query}&igu=1`;

    // Сброс размера при каждом открытии — половина экрана
    popup.style.width = '100vw';
    popup.style.height = '50vh';
    popup.style.left = '0';
    popup.style.right = 'auto';

    popup.classList.add('visible');
    trigger.classList.add('hidden');
  });

  // =========================================
  // 6. ЗАКРЫТИЕ ОКНА
  // =========================================
  function closePopup() {
    popup.classList.remove('visible');
    glow.classList.remove('active');
    setTimeout(() => {
      iframe.src = 'about:blank';
      trigger.classList.remove('hidden');
      trigger.classList.remove('active');
      trigger.dataset.text = '';
    }, 300);
  }
  closeBtn.addEventListener('click', closePopup);

  // =========================================
  // 7. РЕСАЙЗ ОКНА (жёсткая версия с overlay)
  // =========================================
  let activeResize = null;
  let startX = 0, startY = 0;
  let startW = 0, startH = 0, startL = 0;
  let overlay = null;

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'resize-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 999;
      cursor: inherit;
      background: transparent;
    `;
    popup.appendChild(overlay);
  }

  function removeOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  function beginResize(type, clientX, clientY) {
    activeResize = type;
    startX = clientX;
    startY = clientY;
    const rect = popup.getBoundingClientRect();
    startW = rect.width;
    startH = rect.height;
    startL = rect.left;

    createOverlay();
    iframe.style.pointerEvents = 'none';
    document.body.style.userSelect = 'none';
    document.documentElement.style.userSelect = 'none';

    document.body.style.cursor =
      type === 'top' ? 'ns-resize' :
      type === 'left' || type === 'right' ? 'ew-resize' : 'nwse-resize';
  }

  function doResize(clientX, clientY) {
    if (!activeResize) return;

    const deltaX = clientX - startX;
    const deltaY = startY - clientY;

    let newW = startW, newH = startH, newL = startL;

    if (activeResize === 'top') {
      newH = Math.min(Math.max(startH + deltaY, 150), window.innerHeight * 0.95);
    } 
    else if (activeResize === 'left') {
      newW = Math.min(Math.max(startW - deltaX, 200), window.innerWidth);
      newL = startL + (startW - newW);
      if (newL < 0) { newL = 0; newW = startL + startW; }
    } 
    else if (activeResize === 'right') {
      newW = Math.min(Math.max(startW + deltaX, 200), window.innerWidth - startL);
    } 
    else if (activeResize === 'corner') {
      newW = Math.min(Math.max(startW - deltaX, 200), window.innerWidth);
      newH = Math.min(Math.max(startH + deltaY, 150), window.innerHeight * 0.95);
      newL = startL + (startW - newW);
      if (newL < 0) { newL = 0; newW = startL + startW; }
    }

    popup.style.width = newW + 'px';
    popup.style.height = newH + 'px';
    popup.style.left = newL + 'px';
    popup.style.right = 'auto';
  }

  function endResize() {
    if (!activeResize) return;
    activeResize = null;
    removeOverlay();
    iframe.style.pointerEvents = 'auto';
    document.body.style.userSelect = '';
    document.documentElement.style.userSelect = '';
    document.body.style.cursor = '';
  }

  // Навешиваем mouse + touch на каждую ручку
  function attachResize(el, type) {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      beginResize(type, e.clientX, e.clientY);
    });
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const t = e.touches[0];
      beginResize(type, t.clientX, t.clientY);
    }, { passive: false });
  }

  attachResize(resizeTop, 'top');
  attachResize(resizeLeft, 'left');
  attachResize(resizeRight, 'right');
  attachResize(resizeCorner, 'corner');

  // Глобальные обработчики (capture = true, чтобы поймать раньше всех)
  document.addEventListener('mousemove', (e) => {
    doResize(e.clientX, e.clientY);
  }, true);

  document.addEventListener('touchmove', (e) => {
    if (!activeResize) return;
    const t = e.touches[0];
    doResize(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false, capture: true });

  document.addEventListener('mouseup', endResize, true);
  document.addEventListener('touchend', endResize, true);
  document.addEventListener('touchcancel', endResize, true);

}