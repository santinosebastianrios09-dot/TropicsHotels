// mvp_AGENTS/src/web/public/room-previews.js
(function () {
  // 🔗 Backend en Render (no pongas / al final)
  const API = 'https://hotels-tropics.onrender.com';

  // Imágenes y amenities por defecto (se aplican si en Sheets no vienen)
  const ROOM_INFO = {
    "Doble estándar": {
      imageUrl: "img/doble-estandar.jpg",
      amenities: ["1 cama doble grande", "Wi-Fi gratis", "Baño privado", "Aire acondicionado"]
    },
    "Simple estándar": {
      imageUrl: "img/simple-estandar-1.jpg",
      amenities: ["1 cama simple", "Wi-Fi gratis", "Baño privado", "Aire acondicionado"]
    },
    "Suite premium": {
      imageUrl: "img/suite-premium.jpg",
      amenities: ["Cama king", "Wi-Fi gratis", "Baño privado", "Aire acondicionado", "Vista"]
    }
  };

  // Utilidades DOM
  const esc = (x) => String(x).replace(/[&<>\"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  const q = (sel, root = document) => root.querySelector(sel);
  const ce = (tag, cls) => { const el = document.createElement(tag); if (cls) el.className = cls; return el; };
  const body = () => q('#cw-body');

  const normalizeKey = (x) => String(x || '').trim().toLowerCase();

  function decorateRoom(r) {
    // Toma info por defecto si el nombre coincide (ignorando mayúsculas/acentos básicos)
    const roomsMapKey = Object.keys(ROOM_INFO).find(k => normalizeKey(k) === normalizeKey(r.name || r.id));
    const info = roomsMapKey ? ROOM_INFO[roomsMapKey] : {};

    // Asegurar array de amenities
    let amenities = r.amenities;
    if (typeof amenities === 'string') {
      amenities = amenities.split(/[,•\n]+/).map(s => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(amenities)) amenities = info?.amenities || [];

    // Soportar múltiples imágenes separadas por coma
    let imageUrl = r.imageUrl || r.images;
    if (typeof imageUrl === 'string' && imageUrl.includes(',')) {
      imageUrl = imageUrl.split(',')[0].trim();
    }

    return {
      ...r,
      imageUrl: imageUrl || info?.imageUrl || 'img/hotel-1.jpg',
      amenities
    };
  }

  async function fetchRooms() {
    try {
      // cache-busting para evitar la pantalla negra de Render y caches de GitHub Pages
      const url = `${API}/api/web/rooms?nocache=${Date.now()}`;

      const r = await fetch(url, {
        // credentials omitidas; si alguna vez activás auth por cookie, cambiá a 'include'
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      // Si Render todavía despierta o devuelve HTML, evitamos romper la UI
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        console.warn('[rooms] respuesta no JSON (Render despertando o error intermedio).');
        return [];
      }

      const j = await r.json();

      // Soporta dos formatos: {ok:true, data:[...]} y {rooms:[...]}
      const items = Array.isArray(j?.data) ? j.data
                  : Array.isArray(j?.rooms) ? j.rooms
                  : [];

      return items.map(decorateRoom);
    } catch (err) {
      console.error('[rooms] fetchRooms error:', err);
      return [];
    }
  }

  function openRoomModal(room) {
    const r = decorateRoom(room || {});
    const ov = ce('div', 'cw-overlay');
    const box = ce('div', 'cw-modal cw-modal-room');
    const am = (r.amenities || []).map(a => `<li>${esc(a)}</li>`).join('') || '<li class="muted">Información próximamente</li>';
    box.innerHTML = `
      <div class="cw-modal-head">${esc(r.name || 'Habitación')}</div>
      <div class="cw-modal-body">
        <img class="cw-room-img" src="${esc(r.imageUrl || '')}" alt="${esc(r.name || 'Habitación')}" />
        <ul class="cw-amenities">${am}</ul>
      </div>
      <div class="cw-modal-actions">
        <button class="cw-btn" id="cw-room-close">Cerrar</button>
      </div>`;
    ov.appendChild(box);
    document.body.appendChild(ov);
    function close() { ov.remove(); }
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    q('#cw-room-close', box).onclick = close;
  }

  // Simula “elegir habitación” dentro del widget
  function chooseRoomFromContext(container, roomName) {
    const reservarBtn = container.querySelector('.cw-right button[data-room]') || container.querySelector('button[data-room]');
    if (reservarBtn) { reservarBtn.click(); return; }

    const input = q('#cw-text');
    const send = q('#cw-send');
    if (input && send) {
      input.value = roomName || '';
      send.click();
    }
  }

  // Inyecta botones en items de disponibilidad
  function injectViewButtons(node) {
    if (!node || !node.classList) return;
    if (node.classList.contains('cw-room-item')) {
      const actions = q('.cw-actions', node) || q('.cw-right', node) || node;

      // “Ver habitación”
      let viewBtn = q('.cw-view-room', node);
      if (!viewBtn) {
        viewBtn = ce('button', 'cw-btn cw-sec cw-view-room');
        viewBtn.textContent = 'Ver habitación';
        viewBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const name = (q('.cw-room-name', node)?.textContent || '').trim();
          const rooms = await fetchRooms();
          const r = rooms.find(x => normalizeKey(x.name) === normalizeKey(name)) || { name, imageUrl: '', amenities: [] };
          openRoomModal(r);
        });
        actions.insertBefore(viewBtn, actions.firstChild);
      }

      // “Elegir esta habitación”
      if (!q('.cw-choose', node)) {
        const chooseBtn = ce('button', 'cw-btn cw-choose');
        chooseBtn.textContent = 'Elegir esta habitación';
        chooseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const name = (q('.cw-room-name', node)?.textContent || '').trim();
          chooseRoomFromContext(node, name);
        });
        if (viewBtn.nextSibling) actions.insertBefore(chooseBtn, viewBtn.nextSibling);
        else actions.appendChild(chooseBtn);
      }
    }
  }

  // Renderiza un grid compacto en el paso de selección
  async function renderRoomsGridIfNeeded() {
    const b = body();
    if (!b) return;
    const title = q('#cw-title')?.textContent || '';
    if (/Hacer una reserva/i.test(title) && /Seleccione el tipo de habitación/i.test(b.textContent || '')) {
      if (q('.cw-room-grid', b)) return; // ya renderizado
      const rooms = await fetchRooms();
      if (!rooms.length) return; // si no hay datos, no pintamos nada

      const grid = ce('div', 'cw-room-grid');
      rooms.slice(0, 4).forEach(r => {
        const d = decorateRoom(r);
        const card = ce('div', 'cw-room-card');
        card.innerHTML = `
          <img src="${esc(d.imageUrl || '')}" alt="${esc(d.name)}" />
          <div class="cw-room-name">${esc(d.name)}</div>
          <div class="cw-actions">
            <button class="cw-btn cw-sec cw-view-room">Ver habitación</button>
            <button class="cw-btn cw-choose">Elegir esta habitación</button>
          </div>
        `;
        q('.cw-view-room', card).onclick = () => openRoomModal(d);
        q('.cw-choose', card).onclick = () => {
          const input = q('#cw-text');
          const send = q('#cw-send');
          if (input && send) { input.value = d.name || ''; send.click(); }
        };
        grid.appendChild(card);
      });
      b.appendChild(grid);
    }
  }

  // Observer para resultados de disponibilidad y pasos del wizard
  const obs = new MutationObserver((muts) => {
    muts.forEach(m => {
      m.addedNodes && m.addedNodes.forEach(n => {
        if (n.nodeType === 1) {
          injectViewButtons(n);
          n.querySelectorAll && n.querySelectorAll('.cw-room-item').forEach(injectViewButtons);
        }
      });
    });
    renderRoomsGridIfNeeded();
  });

  const startObserver = () => { const b = body(); if (b) obs.observe(b, { childList: true, subtree: true }); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
})();
