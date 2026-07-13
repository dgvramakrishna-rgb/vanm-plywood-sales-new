import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const miniMapIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface VisitMiniMapProps {
  latitude: number;
  longitude: number;
  clientName?: string;
}

export default function VisitMiniMap({ latitude, longitude, clientName }: VisitMiniMapProps) {
  const hasValidCoords = latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined;

  if (!hasValidCoords) {
    return (
      <div 
        id="mini-map-placeholder"
        className="w-full bg-slate-100 dark:bg-slate-950 rounded-xl p-4 border border-slate-200/60 dark:border-slate-850 text-slate-700 dark:text-slate-350 space-y-2.5 shadow-2xs relative overflow-hidden flex flex-col justify-center items-center min-h-[190px] text-center"
      >
        {/* Abstract pattern to mimic a map grid */}
        <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none select-none bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="p-2.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0 z-10">
          <MapPin size={20} className="animate-bounce" />
        </div>
        
        <div className="space-y-1 max-w-[280px] z-10">
          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">
            Location Details Not Available
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-normal">
            This visit record does not have valid GPS coordinates to display on a map.
          </p>
        </div>
      </div>
    );
  }

  const mapCenter: [number, number] = [latitude, longitude];

  return (
    <div 
      id="visit-live-mini-map"
      className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs"
    >
      <div className="bg-slate-50 dark:bg-slate-900/40 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 font-mono tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block animate-pulse"></span>
          Live Site Geolocation Map (OSM)
        </span>
        <span className="text-[9px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100/50 dark:border-indigo-900/40 px-2 py-0.5 rounded-md">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </span>
      </div>

      <div 
        className="w-full h-[180px] relative dark:brightness-[0.9] dark:contrast-[1.1] z-10" 
        style={{ height: '180px' }}
      >
        <MapContainer
          key={`${latitude}-${longitude}`} // Forces re-mount when target coordinate updates
          center={mapCenter}
          zoom={15}
          zoomControl={true}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={mapCenter} icon={miniMapIcon}>
            <Popup>
              <div className="text-xs font-sans">
                <p className="font-extrabold text-slate-900">{clientName || "Visit Location"}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
