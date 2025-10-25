// mvp_AGENTS/src/web/public/room-previews.js
(function(){
  const API = '';
  const ROOM_INFO = {
    "Doble estándar": { imageUrl: "img/doble-estandar.jpg", amenities: ["1 cama doble grande","Wi-Fi gratis","Baño privado","Aire acondicionado"] },
    "Simple estándar": { imageUrl: "img/simple-estandar-1.jpg", amenities: ["1 cama simple","Wi-Fi gratis","Baño privado","Aire acondicionado"] },
    "Suite premium": { imageUrl: "img/suite-premium.jpg", amenities: ["Cama king","Wi-Fi gratis","Baño privado","Aire acondicionado","Vista"] }
  };
  const esc = (x)=>String(x).replace(/[&<>\"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const q = (sel,root=document)=>root.querySelector(sel);
  const ce = (tag, cls)=>{ const el=document.createElement(tag); if(cls) el.className=cls; return el; };
  const body = ()=> q('#cw-body');

  function normalizeKey(x){ return String(x||'').trim().toLowerCase(); }
  function decorateRoom(r){
    const roomsMapKey = Object.keys(ROOM_INFO).find(k => normalizeKey(k) === normalizeKey(r.name||r.id));
    const info = roomsMapKey ? ROOM_INFO[roomsMapKey] : {};
    let amenities = r.amenities;
    if (typeof amenities === 'string') amenities = amenities.split(/[,•\n]+/).map(s=>s.trim()).filter(Boolean);
    if (!Array.isArray(amenities)) amenities = info?.amenities || [];
    return {
      ...r,
      imageUrl: r.imageUrl || info?.imageUrl || 'img/hotel-1.jpg',
      amenities
    };
  }

  async function fetchRooms(){
    try{
      const r = await fetch(API + '/api/web/rooms'); 
      const j = await r.json();
      return (j.rooms||[]).map(decorateRoom);
    }catch{ return []; }
  }

  function openRoomModal(room){
    const r = decorateRoom(room||{});
    const ov = ce('div','cw-overlay');
    const box = ce('div','cw-modal cw-modal-room');
    const am = (r.amenities||[]).map(a=>`<li>${esc(a)}</li>`).join('') || '<li class="muted">Información próximamente</li>';
    box.innerHTML = `
      <div class="cw-modal-head">${esc(r.name||'Habitación')}</div>
      <div class="cw-modal-body">
        <img class="cw-room-img" src="${esc(r.imageUrl||'')}" alt="${esc(r.name||'Habitación')}" />
        <ul class="cw-amenities">${am}</ul>
      </div>
      <div class="cw-modal-actions">
        <button class="cw-btn" id="cw-room-close">Cerrar</button>
      </div>`;
    ov.appendChild(box);
    document.body.appendChild(ov);
    function close(){ ov.remove(); }
    ov.addEventListener('click', (e)=>{ if (e.target===ov) close(); });
    q('#cw-room-close', box).onclick = close;
  }

  /**
   * Simula la acción "elegir habitación" dentro del widget:
   * - Si hay un botón "Reservar" hermano, lo dispara.
   * - De lo contrario, envía el nombre por el input del chat y presiona "Enviar",
   *   lo que hace que el flujo avance como si el usuario hubiera seleccionado por nombre.
   */
  function chooseRoomFromContext(container, roomName){
    // 1) Intento hacer click en el botón "Reservar" del card (si existe)
    const reservarBtn = container.querySelector('.cw-right button[data-room]') || container.querySelector('button[data-room]');
    if (reservarBtn) { reservarBtn.click(); return; }

    // 2) Fallback: enviar el nombre por el input para que handleSend lo procese
    const input = q('#cw-text');
    const send  = q('#cw-send');
    if (input && send){
      input.value = roomName || '';
      // Forzar que el paso esté a la escucha: si estamos en el selector de habitación,
      // el modo es 'reserva_habitacion' y handleSend guardará y pasará al siguiente paso.
      send.click();
    }
  }

  /**
   * Inyecta botones en cards de disponibilidad (.cw-room-item):
   * - "Ver habitación" (si no existe)
   * - "Elegir esta habitación" (nuevo, debajo del "Ver habitación")
   */
  function injectViewButtons(node){
    if (!node || !node.classList) return;
    if (node.classList.contains('cw-room-item')){
      const actions = q('.cw-actions', node) || q('.cw-right', node) || node;

      // Asegurar "Ver habitación"
      let viewBtn = q('.cw-view-room', node);
      if (!viewBtn){
        viewBtn = ce('button','cw-btn cw-sec cw-view-room');
        viewBtn.textContent = 'Ver habitación';
        viewBtn.addEventListener('click', async (e)=>{
          e.stopPropagation();
          const name = (q('.cw-room-name', node)?.textContent || '').trim();
          const rooms = await fetchRooms();
          const r = rooms.find(x => normalizeKey(x.name) === normalizeKey(name)) || { name, imageUrl:'', amenities:[] };
          openRoomModal(r);
        });
        // Insertar primero
        actions.insertBefore(viewBtn, actions.firstChild);
      }

      // NUEVO: "Elegir esta habitación" debajo de "Ver habitación"
      if (!q('.cw-choose', node)){
        const chooseBtn = ce('button','cw-btn cw-choose');
        chooseBtn.textContent = 'Elegir esta habitación';
        chooseBtn.addEventListener('click', (e)=>{
          e.stopPropagation();
          const name = (q('.cw-room-name', node)?.textContent || '').trim();
          chooseRoomFromContext(node, name);
        });
        // Insertar inmediatamente después del verBtn
        if (viewBtn.nextSibling) actions.insertBefore(chooseBtn, viewBtn.nextSibling);
        else actions.appendChild(chooseBtn);
      }
    }
  }

  /**
   * Renderiza el grid del paso "Hacer una reserva → Seleccione el tipo de habitación"
   * y añade "Ver habitación" + "Elegir esta habitación" por tarjeta.
   */
  async function renderRoomsGridIfNeeded(){
    const b = body();
    if (!b) return;
    const title = q('#cw-title')?.textContent || '';
    // buscamos el paso "Hacer una reserva" con la pregunta de selección
    if (/Hacer una reserva/i.test(title) && /Seleccione el tipo de habitación/i.test(b.textContent||'')){
      if (q('.cw-room-grid', b)) return; // ya está
      const rooms = await fetchRooms();
      const grid = ce('div', 'cw-room-grid');
      rooms.slice(0,4).forEach(r => {
        const d = decorateRoom(r);
        const card = ce('div','cw-room-card');
        card.innerHTML = `
          <img src="${esc(d.imageUrl||'')}" alt="${esc(d.name)}" />
          <div class="cw-room-name">${esc(d.name)}</div>
          <div class="cw-actions">
            <button class="cw-btn cw-sec cw-view-room">Ver habitación</button>
            <!-- NUEVO: botón de selección debajo del “Ver habitación” -->
            <button class="cw-btn cw-choose">Elegir esta habitación</button>
          </div>
        `;
        // Ver habitación
        q('.cw-view-room', card).onclick = ()=> openRoomModal(d);
        // Elegir esta habitación → enviar nombre por el input para avanzar el wizard
        q('.cw-choose', card).onclick = ()=>{
          const input = q('#cw-text');
          const send  = q('#cw-send');
          if (input && send){
            input.value = d.name || '';
            send.click();
          }
        };
        grid.appendChild(card);
      });
      b.appendChild(grid);
    }
  }

  // Observador para inyectar en resultados de disponibilidad y pasos
  const obs = new MutationObserver((muts)=>{
    muts.forEach(m=>{
      m.addedNodes && m.addedNodes.forEach(n=>{
        if (n.nodeType===1){
          injectViewButtons(n);
          // También escanear descendientes
          n.querySelectorAll && n.querySelectorAll('.cw-room-item').forEach(injectViewButtons);
        }
      });
    });
    renderRoomsGridIfNeeded();
  });
  const startObserver = ()=>{ const b = body(); if (b) obs.observe(b, { childList:true, subtree:true }); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
})();
