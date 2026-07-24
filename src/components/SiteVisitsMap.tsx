import React, { useEffect, useState, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Navigation, MapPin, Phone, Calendar, User, Home, CheckCircle, Edit2, X, MessageCircle, History, Crosshair } from 'lucide-react';
import { SiteVisit } from '../types';
import { SitePhotoItem } from './SitePhotoItem';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  'AIzaSyAuc9SjTV5c7XMt7_AQHWW_jd2VVrEC5a4';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim().length > 10;

interface SiteVisitsMapProps {
  visits: SiteVisit[];
  onEditVisit?: (visit: SiteVisit) => void;
  onCompleteVisit?: (visit: SiteVisit) => void;
  onViewHistory?: (mobile: string) => void;
  onWhatsApp?: (mobile: string, name: string) => void;
}

export default function SiteVisitsMap({ visits, onEditVisit, onCompleteVisit, onViewHistory, onWhatsApp }: SiteVisitsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 20.5937, lng: 78.9629 });
  const [zoom, setZoom] = useState(5);
  const [selectedVisit, setSelectedVisit] = useState<SiteVisit | null>(null);
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);
  const [mapViewMode, setMapViewMode] = useState<'clients' | 'carpenters'>('clients');
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initialize Google Maps API
  useEffect(() => {
    if (!hasValidKey || !mapRef.current) return;

    setOptions({
      key: API_KEY,
      v: 'weekly',
    });

    importLibrary('maps').then(({ Map }) => {
      if (!mapRef.current) return;

      const map = new Map(mapRef.current, {
        center: mapCenter,
        zoom: zoom,
        gestureHandling: 'greedy',
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      mapInstanceRef.current = map;
      setIsMapLoaded(true);

      // Auto detect user location
      handleDetectLocation();
    }).catch(err => {
      console.error('Failed to load Google Maps:', err);
    });
  }, []);

  // Center map on center update
  useEffect(() => {
    if (mapInstanceRef.current && isMapLoaded) {
      mapInstanceRef.current.setCenter(mapCenter);
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [mapCenter, zoom, isMapLoaded]);

  // Handle user location marker & 5km circle
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded || !window.google) return;

    if (userLocation) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          position: userLocation,
          map: mapInstanceRef.current,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          }
        });
      } else {
        userMarkerRef.current.setPosition(userLocation);
      }

      if (!circleRef.current) {
        circleRef.current = new google.maps.Circle({
          map: mapInstanceRef.current,
          center: userLocation,
          radius: 5000,
          fillColor: '#6366f1',
          fillOpacity: 0.1,
          strokeColor: '#4f46e5',
          strokeOpacity: 0.3,
          strokeWeight: 1,
          clickable: false
        });
      } else {
        circleRef.current.setCenter(userLocation);
      }
    }
  }, [userLocation, isMapLoaded]);

  // Handle site markers update
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const carpentersVisits = visits.filter(v => 
      (v.carpenterName && v.carpenterName.trim().length > 0) || 
      (v.contractorType === 'carpenter' && v.contractorName && v.contractorName.trim().length > 0)
    );

    const visitsToMap = mapViewMode === 'clients' ? visits : carpentersVisits;
    const visitsWithCoords = visitsToMap.filter(v => v.latitude && v.longitude);

    visitsWithCoords.forEach((visit) => {
      const isCarpMode = mapViewMode === 'carpenters';
      const color = getMarkerColor(visit);

      const marker = new google.maps.Marker({
        position: { lat: visit.latitude!, lng: visit.longitude! },
        map: mapInstanceRef.current,
        title: visit.clientName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: isCarpMode ? '#f59e0b' : color.bg,
          fillOpacity: 0.95,
          strokeColor: isCarpMode ? '#b45309' : color.border,
          strokeWeight: 3,
        }
      });

      marker.addListener('click', () => {
        setSelectedVisit(visit);
      });

      markersRef.current.push(marker);
    });

  }, [visits, mapViewMode, isMapLoaded]);

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
          const firstWithCoords = visits.find(v => v.latitude && v.longitude);
          if (firstWithCoords) {
            setMapCenter({ lat: firstWithCoords.latitude!, lng: firstWithCoords.longitude! });
            setZoom(11);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
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
      return { bg: '#ef4444', border: '#991b1b' };
    }
    
    const type = visit.buildingType?.toLowerCase();
    switch (type) {
      case 'villas':
        return { bg: '#a855f7', border: '#7e22ce' };
      case 'duplex':
        return { bg: '#f59e0b', border: '#b45309' };
      case 'apartment':
        return { bg: '#10b981', border: '#047857' };
      case 'home':
        return { bg: '#3b82f6', border: '#1d4ed8' };
      case 'shop':
        return { bg: '#f97316', border: '#c2410c' };
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
      </div>
    );
  }

  const carpentersVisits = visits.filter(v => 
    (v.carpenterName && v.carpenterName.trim().length > 0) || 
    (v.contractorType === 'carpenter' && v.contractorName && v.contractorName.trim().length > 0)
  );

  const visitsToMap = mapViewMode === 'clients' ? visits : carpentersVisits;
  const visitsWithCoords = visitsToMap.filter(v => v.latitude && v.longitude);

  const carpName = selectedVisit ? (selectedVisit.carpenterName || (selectedVisit.contractorType === 'carpenter' ? selectedVisit.contractorName : '') || 'No Carpenter') : '';
  const carpMobile = selectedVisit ? (selectedVisit.carpenterMobile || (selectedVisit.contractorType === 'carpenter' ? selectedVisit.contractorMobile : '') || '') : '';
  const carpPlace = selectedVisit ? (selectedVisit.carpenterPlace || (selectedVisit.contractorType === 'carpenter' ? selectedVisit.contractorAddress : '') || 'N/A') : '';
  const isCarpMode = mapViewMode === 'carpenters';

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>
            <span className="text-[11px] font-black uppercase text-slate-500 font-mono tracking-wider">
              Site Location Dashboard
            </span>
          </div>

          <div className="flex bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/40">
            <button
              type="button"
              onClick={() => setMapViewMode('clients')}
              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                mapViewMode === 'clients' 
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100/50' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👤</span> Clients ({visits.length})
            </button>
            <button
              type="button"
              onClick={() => setMapViewMode('carpenters')}
              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                mapViewMode === 'carpenters' 
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100/50' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🪚</span> Carpenters ({carpentersVisits.length})
            </button>
          </div>

          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-extrabold">
            {visitsWithCoords.length} on Map
          </span>
        </div>
        <button
          onClick={handleDetectLocation}
          disabled={isLocating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer w-fit"
        >
          <Crosshair size={12} className={isLocating ? 'animate-spin' : ''} />
          {isLocating ? 'Locating...' : 'My Location'}
        </button>
      </div>

      <div className="flex-1 relative min-h-[500px]">
        {/* Google Map Container */}
        <div ref={mapRef} className="w-full h-full min-h-[500px]" />

        {/* Custom Info Popup Card */}
        {selectedVisit && (
          <div className="absolute top-4 right-4 z-20 w-[320px] bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-200 animate-fade-in font-sans">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isCarpMode ? 'bg-amber-500' : (getMarkerColor(selectedVisit).bg === '#ef4444' ? 'bg-rose-500' : 'bg-indigo-600')}`}></div>
                <span className="text-xs font-black uppercase text-slate-700 font-mono tracking-tight">
                  {isCarpMode ? 'Carpenter & Client Details' : 'Visit Details'}
                </span>
              </div>
              <button 
                onClick={() => setSelectedVisit(null)} 
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

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
              {isCarpMode && (
                <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                  <p className="text-[9px] font-black uppercase text-amber-800 tracking-wider font-mono">Associated Carpenter</p>
                  <h4 className="text-xs font-black text-slate-900 m-0 leading-tight flex items-center gap-1.5 mt-0.5">
                    <span>🪚</span> {carpName}
                  </h4>
                  {carpPlace && (
                    <p className="text-[8px] text-slate-500 font-medium m-0 mt-0.5">Base: {carpPlace}</p>
                  )}
                </div>
              )}

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider font-mono">Client Details</p>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 leading-tight mt-0.5">
                    {selectedVisit.clientName}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="text-slate-400" />
                    <p className="text-[10px] text-slate-500 font-medium">{selectedVisit.address || selectedVisit.location}</p>
                  </div>
                </div>
                {selectedVisit.contractorName && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider font-mono">Site Partner</p>
                    <h4 className="text-xs font-black text-slate-900 m-0 leading-tight flex items-center gap-1.5 mt-0.5">
                      {selectedVisit.contractorName}
                    </h4>
                    <div className="flex items-center gap-1 mt-0.5 text-emerald-600">
                      <Phone size={10} />
                      <p className="text-[10px] font-bold">{selectedVisit.contractorMobile}</p>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => onEditVisit?.(selectedVisit)}
                  className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition shrink-0 cursor-pointer"
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

              {isCarpMode && carpMobile && (
                <div className="p-2 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-between gap-1.5">
                  <div className="min-w-0">
                    <p className="text-[8px] font-extrabold uppercase text-orange-700 tracking-wider">Carpenter Mobile</p>
                    <p className="text-[9px] font-bold text-slate-800 font-mono m-0">{carpMobile}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <a 
                      href={`tel:${carpMobile}`}
                      className="p-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-xs"
                      title="Call Carpenter"
                    >
                      <Phone size={10} />
                    </a>
                    <button 
                      type="button"
                      onClick={() => {
                        const cleanPhone = carpMobile.replace(/\D/g, '').length === 10 ? '91' + carpMobile.replace(/\D/g, '') : carpMobile.replace(/\D/g, '');
                        const text = encodeURIComponent(`Hello ${carpName} garu, this is regarding the ${selectedVisit.buildingType || 'site'} woodwork at ${selectedVisit.clientName}'s site.`);
                        window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                      }}
                      className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                      title="WhatsApp Carpenter"
                    >
                      <MessageCircle size={10} />
                    </button>
                  </div>
                </div>
              )}

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
                    className="flex-1 bg-indigo-600 text-white py-1.5 rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
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
                    className="flex-1 bg-emerald-600 text-white py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <MessageCircle size={12} />
                    WhatsApp Client
                  </button>
                  <button 
                    onClick={() => onViewHistory?.(selectedVisit.clientMobile)}
                    className="flex-1 bg-indigo-50 text-indigo-700 py-1.5 rounded-lg text-[10px] font-bold border border-indigo-100 hover:bg-indigo-100 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
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
                className="w-full py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-2 hover:bg-emerald-100 transition shadow-sm cursor-pointer"
              >
                <CheckCircle size={14} />
                Mark as Completed
              </button>
            </div>
          </div>
        )}

        {/* Full Photo Modal */}
        {fullPhoto && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 animate-fade-in backdrop-blur-xl"
            onClick={() => setFullPhoto(null)}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setFullPhoto(null);
              }}
              className="absolute top-6 left-6 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition flex items-center gap-2 px-6 shadow-2xl border border-white/20 z-[10000] cursor-pointer"
            >
              <X size={24} />
              <span className="font-bold text-base">Close Image</span>
            </button>
            <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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
