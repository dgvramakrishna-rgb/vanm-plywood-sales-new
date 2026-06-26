import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Navigation, MapPin, Info, Crosshair } from 'lucide-react';
import { SiteVisit } from '../types';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim().length > 10;

// Helper component to render a circle on the map
function MapCircle({ center, radius, options }: { center: google.maps.LatLngLiteral, radius: number, options?: google.maps.CircleOptions }) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center,
        radius,
        ...options
      });
    } else {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radius);
      if (options) circleRef.current.setOptions(options);
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [map, center, radius, options]);

  return null;
}

interface SiteVisitsMapProps {
  visits: SiteVisit[];
}

export default function SiteVisitsMap({ visits }: SiteVisitsMapProps) {
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: 20.5937, lng: 78.9629 }); // Default center of India
  const [zoom, setZoom] = useState(5);

  useEffect(() => {
    handleDetectLocation();
  }, []);

  const handleDetectLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          setMapCenter(loc);
          setZoom(13);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error detecting location:", error);
          setIsLocating(false);
          // If geolocation fails, center on first visit with coords
          const firstWithCoords = visits.find(v => v.latitude && v.longitude);
          if (firstWithCoords) {
            setMapCenter({ lat: firstWithCoords.latitude!, lng: firstWithCoords.longitude! });
            setZoom(12);
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleNavigate = (visit: SiteVisit) => {
    if (visit.latitude && visit.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${visit.latitude},${visit.longitude}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  if (!hasValidKey) {
    return (
      <div className="w-full h-[500px] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center">
        <div className="p-4 rounded-full bg-indigo-50 text-indigo-600 mb-4">
          <MapPin size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Google Maps API Key Required</h3>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          To view client sites on a live map, please configure your <code>GOOGLE_MAPS_PLATFORM_KEY</code> in the app settings.
        </p>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-left w-full max-w-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Setup Instructions:</p>
          <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4">
            <li>Open <strong>Settings</strong> (⚙️ icon)</li>
            <li>Go to <strong>Secrets</strong></li>
            <li>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
            <li>Paste your key and save</li>
          </ol>
        </div>
      </div>
    );
  }

  const visitsWithCoords = visits.filter(v => v.latitude && v.longitude);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
          <span className="text-[11px] font-black uppercase text-slate-500 font-mono tracking-wider">
            Site Location Dashboard
          </span>
          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
            {visitsWithCoords.length} Marked
          </span>
        </div>
        <button
          onClick={handleDetectLocation}
          disabled={isLocating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
        >
          <Crosshair size={12} className={isLocating ? 'animate-spin' : ''} />
          {isLocating ? 'Locating...' : 'My Location'}
        </button>
      </div>

      <div className="flex-1 relative min-h-[500px]">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={mapCenter}
            defaultZoom={zoom}
            mapId="SITE_VISITS_MAP"
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* User current location marker */}
            {userLocation && (
              <AdvancedMarker position={userLocation} title="Your Location">
                <div className="relative flex items-center justify-center">
                   <div className="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
                   <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md z-10"></div>
                </div>
              </AdvancedMarker>
            )}

            {/* 5km Radius Circle around user */}
            {userLocation && (
              <MapCircle 
                center={userLocation} 
                radius={5000} 
                options={{
                  fillColor: '#6366f1',
                  fillOpacity: 0.1,
                  strokeColor: '#4f46e5',
                  strokeOpacity: 0.3,
                  strokeWeight: 1,
                  clickable: false
                }}
              />
            )}

            {/* Site markers */}
            {visitsWithCoords.map((visit) => (
              <AdvancedMarker 
                key={visit.id} 
                position={{ lat: visit.latitude!, lng: visit.longitude! }}
                onClick={() => handleNavigate(visit)}
              >
                <div className="group relative cursor-pointer">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded shadow-lg border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    <p className="text-[10px] font-bold text-slate-900">{visit.clientName}</p>
                    <p className="text-[8px] text-slate-500">{visit.location}</p>
                  </div>
                  <Pin 
                    background={visit.leadStatus === 'hot' ? '#ef4444' : '#4f46e5'} 
                    glyphColor="#ffffff" 
                    borderColor={visit.leadStatus === 'hot' ? '#991b1b' : '#3730a3'}
                    scale={0.9} 
                  />
                </div>
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>

        {/* Legend Overlay */}
        <div className="absolute bottom-6 left-4 bg-white/95 backdrop-blur-sm border border-slate-200 p-3 rounded-xl shadow-xl z-10 space-y-2">
          <p className="text-[9px] font-black uppercase text-slate-400 font-mono tracking-widest mb-1">Map Legend</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm border border-rose-600"></div>
            <span className="text-[10px] font-bold text-slate-700">Hot Lead Site</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-sm border border-indigo-700"></div>
            <span className="text-[10px] font-bold text-slate-700">Regular Site</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm border border-white"></div>
            <span className="text-[10px] font-bold text-slate-700">Your Current Pos.</span>
          </div>
          <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-100">
            <div className="w-3 h-3 bg-indigo-500/10 border border-indigo-500/30 rounded-sm"></div>
            <span className="text-[10px] font-bold text-slate-700">5km Coverage Zone</span>
          </div>
          <p className="text-[8px] text-slate-400 font-medium italic mt-1">Tip: Click marker to navigate</p>
        </div>
      </div>
    </div>
  );
}
