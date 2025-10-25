// Demo override: intercept fetch & XHR for static GitHub Pages
(function () {
  try {
    function urlIncludes(target, needle) {
      if (!target) return false;
      if (typeof target === "string") return target.includes(needle);
      if (typeof target === "object" && target.url) return String(target.url).includes(needle);
      try { return String(target).includes(needle); } catch { return false; }
    }

    const roomsData = [
      { id:"STD", name:"Standard Garden", description:"Habitación cómoda con vista al jardín. Cama Queen.", price:65, currency:"USD", images:["img/hotel-1.jpg"] },
      { id:"DLX", name:"Deluxe Ocean",    description:"Vista al mar, balcón privado. Cama King.",            price:95, currency:"USD", images:["img/hotel-2.jpg"] },
      { id:"SUITE", name:"Suite Tropics", description:"Sala de estar + dormitorio, ideal familias.",         price:140, currency:"USD", images:["img/hotel-3.jpg"] }
    ];

    function okJson(data) {
      return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // FETCH OVERRIDE
    const ORIG_FETCH = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      if (urlIncludes(input, "/api/web/rooms") || urlIncludes(input, "api/web/rooms")) {
        return okJson({ ok:true, rooms: roomsData });
      }
      if (urlIncludes(input, "/api/web/consulta") || urlIncludes(input, "api/web/consulta")) {
        return okJson({ ok:true, message: "Consulta recibida (demo)." });
      }
      return ORIG_FETCH(input, init);
    };

    // XHR OVERRIDE
    const ORIG_XHR = window.XMLHttpRequest;
    function XHROverride() {
      const xhr = new ORIG_XHR();
      let _url = "";
      const _open = xhr.open;
      xhr.open = function(method, url, ...rest) {
        _url = typeof url === "string" ? url : String(url || "");
        return _open.call(xhr, method, url, ...rest);
      };
      const _send = xhr.send;
      xhr.send = function(body) {
        if (_url.includes("/api/web/rooms") || _url.includes("api/web/rooms")) {
          const response = JSON.stringify({ ok:true, rooms: roomsData });
          setTimeout(() => {
            xhr.status = 200;
            xhr.readyState = 4;
            xhr.responseText = response;
            xhr.onreadystatechange && xhr.onreadystatechange();
            xhr.onload && xhr.onload();
          }, 0);
          return;
        }
        if (_url.includes("/api/web/consulta") || _url.includes("api/web/consulta")) {
          const response = JSON.stringify({ ok:true, message:"Consulta recibida (demo)." });
          setTimeout(() => {
            xhr.status = 200;
            xhr.readyState = 4;
            xhr.responseText = response;
            xhr.onreadystatechange && xhr.onreadystatechange();
            xhr.onload && xhr.onload();
          }, 0);
          return;
        }
        return _send.call(xhr, body);
      };
      return xhr;
    }
    window.XMLHttpRequest = XHROverride;

    console.log("[demo_override] ACTIVO: interceptando /api/web/* via fetch + XHR");
  } catch (e) {
    console.error("[demo_override] Error activando override:", e);
  }
})();
