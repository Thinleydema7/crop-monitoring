// Leaflet is served locally; only background tiles are requested from OpenStreetMap.
const valid = r => Number.isFinite(r.location?.latitude) && Number.isFinite(r.location?.longitude) && Math.abs(r.location.latitude)<=90 && Math.abs(r.location.longitude)<=180;
export function createReportMap(element, message) {
  if (!window.L) { message.textContent="Map unavailable. Report coordinates remain available below."; return null; }
  const L=window.L;
  const map=L.map(element,{scrollWheelZoom:false}).setView([27.5,90.4],7);
  const tiles=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  tiles.on("tileerror",()=>{message.textContent="Map background unavailable. Check your internet connection; pins and coordinates are still available.";});
  const layers=L.layerGroup().addTo(map);
  let points=[];
  function fit() {map.invalidateSize();if(points.length)map.fitBounds(L.latLngBounds(points),{padding:[32,32],maxZoom:16});else map.setView([27.5,90.4],7);}
  function render(reports,onOpen,detail=false) {
    layers.clearLayers();message.textContent="";
    const located=reports.filter(valid);points=located.map(r=>[r.location.latitude,r.location.longitude]);
    for(const r of located) {
      const color=r.status==="reviewed"?"#28674c":"#d98a28";
      const icon=L.divIcon({className:"crop-map-marker",html:`<span style="background:${color}"></span>`,iconSize:[26,32],iconAnchor:[13,32],popupAnchor:[0,-28]});
      const popup=document.createElement("div");popup.className="map-popup";
      const nearby=detail?[r]:located.filter(other=>map.distance([r.location.latitude,r.location.longitude],[other.location.latitude,other.location.longitude])<25);
      const title=document.createElement("strong");title.textContent=detail?`${r.crop} · reported crop`:(nearby.length>1?`${nearby.length} reports near this location`:`${r.crop} · reported crop`);popup.append(title);
      for(const item of nearby) {
        const line=document.createElement("p");line.textContent=`${item.crop} · ${item.id.slice(0,8)} · ${item.status==="reviewed"?"Advice sent":"Pending review"}`;popup.append(line);
        if(onOpen) {const button=document.createElement("button");button.type="button";button.textContent=`Open ${item.crop} report`;button.onclick=()=>onOpen(item);popup.append(button);}
      }
      const coords=document.createElement("p");coords.textContent=`${r.location.latitude.toFixed(6)}, ${r.location.longitude.toFixed(6)}`;popup.append(coords);
      L.marker([r.location.latitude,r.location.longitude],{icon,title:`${r.crop} report ${r.id.slice(0,8)}`,alt:`Reported ${r.crop} location`,keyboard:true}).addTo(layers).bindPopup(popup);
      if(detail && Number.isFinite(r.location.accuracy) && r.location.accuracy>=0) L.circle([r.location.latitude,r.location.longitude],{radius:r.location.accuracy,color:"#28674c",weight:1,fillOpacity:0.1,interactive:false}).addTo(layers);
    }
    fit();
    return located.length;
  }
  return {render,fit,remove:()=>map.remove()};
}
