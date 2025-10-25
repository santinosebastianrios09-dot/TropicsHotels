// Demo override: intercept fetch for static GitHub Pages
(function () {
  try {
    const ORIG_FETCH = window.fetch.bind(window);
    console.log("[demo_override] ACTIVO: interceptando /api/web/rooms y /api/web/consulta");
    const roomsData = [
      {
        id: "STD",
        name: "Standard Garden",
        description: "Habitación cómoda con vista al jardín. Cama Queen.",
        price: 65,
        currency: "USD",
        images: ["img/hotel-1.webp","img/hotel-1.jpeg","img/hotel-1.jpg"]
      },
      {
        id: "DLX",
        name: "Deluxe Ocean",
        description: "Vista al mar, balcón privado. Cama King.",
        price: 95,
        currency: "USD",
        images: ["img/hotel-2.webp","img/hotel-2.jpeg","img/hotel-2.jpg"]
      },
      {
        id: "SUITE",
        name: "Suite Tropics",
        description: "Sala de estar + dormitorio, ideal familias.",
        price: 140,
        currency: "USD",
        images: ["img/hotel-3.webp","img/hotel-3.jpeg","img/hotel-3.jpg"]
      }
    ];

    function okJson(data) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    window.fetch = async function(input, init) {
      const url = typeof input === "string" ? input : (input?.url || "");
      if (url.includes("/api/web/rooms")) {
        return okJson({ ok: true, rooms: roomsData });
      }
      if (url.includes("/api/web/consulta")) {
        // Devuelve una respuesta de "OK" para el formulario de consulta demo
        return okJson({ ok: true, message: "Consulta recibida (demo)." });
      }
      return ORIG_FETCH(input, init);
    };
  } catch (e) {
    console.error("[demo_override] Error activando override:", e);
  }
})();
