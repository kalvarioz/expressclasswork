/**
 * Brandon Calvario
 * CST 336
 */
function initMap(quakes, fitBounds = false) {
  const map = L.map("map", { zoomControl: true }).setView([20, 0], 2);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxZoom: 18,
  }).addTo(map);
  quakes.forEach((q) => {
    const mag = parseFloat(q.magnitude);
    const radius = Math.max(5, mag * 3.5);
    const color = mag >= 6 ? "#ff4444" : mag >= 5 ? "#ff9900" : "#f5c518";
    L.circleMarker([q.lat, q.lon], {
      radius,
      fillColor: color,
      color:color,
      weight:1,
      opacity:0.9,
      fillOpacity: 0.5,
    })
      .addTo(map)
      .bindPopup(`
        <div class="popup-inner">
          <strong class="popup-mag" style="color:${color}">M${q.magnitude}</strong>
          <span class="popup-place">${q.place}</span>
          <span class="popup-meta">${q.timeAgo}</span>
          <span class="popup-meta">Depth: ${q.depth} km</span>
        </div>
      `);
  });
 
  if (fitBounds && quakes.length > 1) {
    const bounds = quakes.map((q) => [q.lat, q.lon]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}