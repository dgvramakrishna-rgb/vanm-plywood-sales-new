import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary, InfoWindow } from '@vis.gl/react-google-maps';
import { Navigation, MapPin, Info, Crosshair, Phone, Calendar, User, Home, CheckCircle, Edit2, Maximize2, X, MessageCircle, History } from 'lucide-react';
import { SiteVisit } from '../types';
import { SitePhotoItem } from './SitePhotoItem';

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
  onEditVisit?: (visit: SiteVisit) => void;
  onCompleteVisit?: (visit: SiteVisit) => void;
  onViewHistory?: (mobile: string) => void;
  onWhatsApp?: (mobile: string, name: string) => void;
}

export default function SiteVisitsMap({ visits, onEditVisit, onCompleteVisit, onViewHistory, onWhatsApp }: SiteVisitsMapProps) {
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: 20.5937, lng: 78.9629 }); // Default center of India
  const [zoom, setZoom] = useState(5);
  const [selectedVisit, setSelectedVisit] = useState<SiteVisit | null>(null);
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);

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
          console.warn("Geolocation warning:", error.message);
          setIsLocating(false);
          
          // Fallback logic: center on first visit with coords if available
          const firstWithCoords = visits.find(v => v.latitude && v.longitude);
          if (firstWithCoords) {
            setMapCenter({ lat: firstWithCoords.latitude!, lng: firstWithCoords.longitude! });
            setZoom(11);
          }
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 60000 // 1 minute cache
        }
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

  const getMarkerColor = (visit: SiteVisit) => {
    if (visit.customerNotAvailable) {
      return { bg: '#ef4444', border: '#991b1b' }; // Red for absent
    }
    
    const type = visit.buildingType?.toLowerCase();
    switch (type) {
      case 'villas':
        return { bg: '#a855f7', border: '#7e22ce' }; // Purple for Villas
      case 'duplex':
        return { bg: '#f59e0b', border: '#b45309' }; // Yellow
      case 'apartment':
        return { bg: '#10b981', border: '#047857' }; // Green
      case 'home':
        return { bg: '#3b82f6', border: '#1d4ed8' }; // Blue
      case 'shop':
        return { bg: '#f97316', border: '#c2410c' }; // Orange
      default:
        return { 
          bg: visit.leadStatus === 'hot' ? '#ef4444' : '#4f46e5', 
          border: visit.leadStatus === 'hot' ? '#991b1b' : '#3730a3' 
        };
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
                onClick={() => setSelectedVisit(visit)}
              >
                <div className="group relative cursor-pointer">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded shadow-lg border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    <p className="text-[10px] font-bold text-slate-900">{visit.clientName}</p>
                    <p className="text-[8px] text-slate-500">{visit.location}</p>
                  </div>
                  <Pin 
                    background={getMarkerColor(visit).bg} 
                    glyphColor="#ffffff" 
                    borderColor={getMarkerColor(visit).border}
                    scale={0.9} 
                  />
                </div>
              </AdvancedMarker>
            ))}

            {/* Info Window for selected visit */}
            {selectedVisit && (
              <InfoWindow
                position={{ lat: selectedVisit.latitude!, lng: selectedVisit.longitude! }}
                onCloseClick={() => setSelectedVisit(null)}
                headerContent={
                  <div className="flex items-center gap-2 pr-4">
                    <div className={`w-2 h-2 rounded-full ${getMarkerColor(selectedVisit).bg === '#ef4444' ? 'bg-rose-500' : 'bg-indigo-600'}`}></div>
                    <span className="text-xs font-black uppercase text-slate-500 font-mono tracking-tight">Visit Details</span>
                  </div>
                }
              >
                <div className="w-[300px] p-1 font-sans">
                  {selectedVisit.photo && (
                    <div className="mb-3">
                      <SitePhotoItem 
                        visit={selectedVisit} 
                        onEnlarge={(photo) => setFullPhoto(photo)}
                        className="relative w-full h-32 rounded-xl overflow-hidden shadow-inner cursor-zoom-in group bg-slate-50 border border-slate-100"
                        imageClassName="w-full h-full object-cover group-hover:scale-105 duration-200"
                      />
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 leading-tight">
                          {selectedVisit.clientName}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-slate-400" />
                          <p className="text-[10px] text-slate-500 font-medium">{selectedVisit.address || selectedVisit.location}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onEditVisit?.(selectedVisit)}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition"
                        title="Edit Visit"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100">
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Building Type</p>
                        <div className="flex items-center gap-1">
                          <Home size={10} className="text-indigo-500" />
                          <span className="text-[10px] font-bold text-slate-700">{selectedVisit.buildingType || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Contact No.</p>
                        <div className="flex items-center justify-end gap-1">
                          <Phone size={10} className="text-emerald-500" />
                          <span className="text-[10px] font-bold text-slate-700">{selectedVisit.clientMobile || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={10} className="text-slate-400" />
                          <span className="text-[10px] text-slate-600 font-bold">{selectedVisit.visitingDate}</span>
                        </div>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                          selectedVisit.leadStatus === 'hot' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {selectedVisit.leadStatus} Lead
                        </span>
                      </div>
                      {selectedVisit.customerNotAvailable && (
                        <div className="flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded border border-rose-100 mt-1">
                          <User size={10} className="text-rose-500" />
                          <span className="text-[9px] font-bold text-rose-700">Customer was absent</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleNavigate(selectedVisit)}
                          className="flex-1 bg-indigo-600 text-white py-1.5 rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <Navigation size={12} />
                          Navigate
                        </button>
                        <a 
                          href={`tel:${selectedVisit.clientMobile}`}
                          className="w-10 bg-slate-100 text-slate-700 flex items-center justify-center rounded-lg hover:bg-slate-200 transition"
                        >
                          <Phone size={14} />
                        </a>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            if (onWhatsApp) {
                              onWhatsApp(selectedVisit.clientMobile, selectedVisit.clientName);
                            } else {
                              const mobile = selectedVisit.clientMobile || '';
                              const cleanPhone = mobile.replace(/\D/g, '').length === 10 ? '91' + mobile.replace(/\D/g, '') : mobile.replace(/\D/g, '');
                              const text = encodeURIComponent(`Hello ${selectedVisit.clientName} garu, I recently visited your site, work progress is good 👍. Thank you sir.`);
                              window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                            }
                          }}
                          className="flex-1 bg-emerald-600 text-white py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <MessageCircle size={12} />
                          WhatsApp
                        </button>
                        <button 
                          onClick={() => onViewHistory?.(selectedVisit.clientMobile)}
                          className="flex-1 bg-indigo-50 text-indigo-700 py-1.5 rounded-lg text-[10px] font-bold border border-indigo-100 hover:bg-indigo-100 transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <History size={12} />
                          Visit Log
                        </button>
                      </div>
                    </div>
                      
                      <button 
                        onClick={() => {
                          if (confirm('Mark this visit as completed and remove from active list?')) {
                            onCompleteVisit?.(selectedVisit);
                            setSelectedVisit(null);
                          }
                        }}
                        className="w-full py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-2 hover:bg-emerald-100 transition shadow-sm"
                      >
                        <CheckCircle size={14} />
                        Mark as Completed
                      </button>
                    </div>
                  </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* Full Photo Modal */}
        {fullPhoto && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 animate-fade-in backdrop-blur-md">
            <button 
              onClick={() => setFullPhoto(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
            >
              <X size={24} />
            </button>
            <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
              <img 
                src={fullPhoto} 
                alt="Full preview" 
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}

        {/* Legend Overlay */}
        <div className="absolute bottom-6 left-4 bg-white/95 backdrop-blur-sm border border-slate-200 p-3 rounded-xl shadow-xl z-10 space-y-2 max-w-[140px]">
          <p className="text-[9px] font-black uppercase text-slate-400 font-mono tracking-widest mb-1">Site Types</p>
          <div className="grid grid-cols-1 gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#a855f7] shadow-sm border border-[#7e22ce]"></div>
              <span className="text-[9px] font-bold text-slate-700">Villa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-sm border border-[#b45309]"></div>
              <span className="text-[9px] font-bold text-slate-700">Duplex</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-sm border border-[#047857]"></div>
              <span className="text-[9px] font-bold text-slate-700">Apartment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-sm border border-[#1d4ed8]"></div>
              <span className="text-[9px] font-bold text-slate-700">Home</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-sm border border-[#c2410c]"></div>
              <span className="text-[9px] font-bold text-slate-700">Shop</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-sm border border-[#991b1b]"></div>
              <span className="text-[9px] font-bold text-slate-700">Client Absent</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm border border-white"></div>
              <span className="text-[9px] font-bold text-slate-700">You</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-sm"></div>
              <span className="text-[9px] font-bold text-slate-700">5km Zone</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
