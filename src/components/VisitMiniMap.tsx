import React from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin, Info } from 'lucide-react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim().length > 10;

interface VisitMiniMapProps {
  latitude: number;
  longitude: number;
  clientName?: string;
}

export default function VisitMiniMap({ latitude, longitude, clientName }: VisitMiniMapProps) {
  if (!hasValidKey) {
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
            Live Mini Map View Available
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed leading-normal">
            To view visit coordinates on a live Google Map here, configure your <strong>GOOGLE_MAPS_PLATFORM_KEY</strong> in AI Studio:
          </p>
        </div>

        <div className="text-[9px] font-bold text-indigo-755 dark:text-indigo-400 bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 px-3 py-1.5 rounded-lg max-w-[280px] z-10 text-left space-y-0.5">
          <div className="flex items-center gap-1">
            <Info size={10} className="text-indigo-600 shrink-0" />
            <span className="font-extrabold uppercase font-mono tracking-wider">How to enable:</span>
          </div>
          <p className="font-semibold text-slate-600 dark:text-slate-400 leading-normal pl-3">
            Open <strong>Settings (⚙️ Gear icon)</strong> → <strong>Secrets</strong> → add <code>GOOGLE_MAPS_PLATFORM_KEY</code> and save.
          </p>
        </div>
      </div>
    );
  }

  const mapCenter = { lat: latitude, lng: longitude };

  return (
    <div 
      id="visit-live-mini-map"
      className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs"
    >
      <div className="bg-slate-50 dark:bg-slate-900/40 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 font-mono tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block"></span>
          Live Site Geolocation Map
        </span>
        <span className="text-[9px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100/50 dark:border-indigo-900/40 px-2 py-0.5 rounded-md">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </span>
      </div>

      <div 
        className="w-full h-[180px] relative dark:brightness-[0.9] dark:contrast-[1.1]" 
        style={{ height: '180px' }}
      >
        <APIProvider apiKey={API_KEY} version="weekly">
          <GoogleMap
            key={`${latitude}-${longitude}`} // Forces re-mount when target coordinate updates
            defaultCenter={mapCenter}
            defaultZoom={15}
            mapId="COORDINATES_MINI_MAP"
            gestureHandling="cooperative"
            disableDefaultUI={true}
            zoomControl={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <AdvancedMarker position={mapCenter} title={clientName || "Visit Location"}>
              <Pin background="#4338ca" glyphColor="#ffffff" borderColor="#312e81" scale={1.05} />
            </AdvancedMarker>
          </GoogleMap>
        </APIProvider>
      </div>
    </div>
  );
}
