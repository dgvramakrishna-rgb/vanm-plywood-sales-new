import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Crosshair, Map as MapIcon, Layers, Phone, Calendar, User, Home, CheckCircle, Edit2, Maximize2, X } from 'lucide-react';
import { SiteVisit } from '../types';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', // Fallback
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const absentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const villasIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const duplexIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const apartmentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const homeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const shopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map centering
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

interface SiteVisitsOSMMapProps {
  visits: SiteVisit[];
  onEditVisit?: (visit: SiteVisit) => void;
  onCompleteVisit?: (visit: SiteVisit) => void;
}

export default function SiteVisitsOSMMap({ visits, onEditVisit, onCompleteVisit }: SiteVisitsOSMMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default center of India
  const [zoom, setZoom] = useState(5);
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);

  useEffect(() => {
    handleDetectLocation();
  }, []);

  const handleDetectLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc);
          setZoom(13);
          setIsLocating(false);
        },
        (error) => {
          console.warn("Geolocation warning (OSM):", error.message);
          setIsLocating(false);
          const firstWithCoords = visits.find(v => v.latitude && v.longitude);
          if (firstWithCoords) {
            setMapCenter([firstWithCoords.latitude!, firstWithCoords.longitude!]);
            setZoom(11);
          }
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 60000 
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

  const getMarkerIcon = (visit: SiteVisit) => {
    if (visit.customerNotAvailable) return absentIcon;
    
    const type = visit.buildingType?.toLowerCase();
    switch (type) {
      case 'villas': return villasIcon;
      case 'duplex': return duplexIcon;
      case 'apartment': return apartmentIcon;
      case 'home': return homeIcon;
      case 'shop': return shopIcon;
      default: return visit.leadStatus === 'hot' ? absentIcon : defaultIcon;
    }
  };

  const visitsWithCoords = visits.filter(v => v.latitude && v.longitude);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
          <span className="text-[11px] font-black uppercase text-slate-500 font-mono tracking-wider">
            OpenStreetMap View
          </span>
          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
            {visitsWithCoords.length} Sites
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

      <div className="flex-1 relative min-h-[500px] z-0">
        <MapContainer 
          center={mapCenter} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <ChangeView center={mapCenter} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User Location */}
          {userLocation && (
            <>
              <Marker position={userLocation} icon={userIcon}>
                <Popup>Your Current Location</Popup>
              </Marker>
              <Circle 
                center={userLocation} 
                radius={5000}
                pathOptions={{ 
                  fillColor: '#6366f1', 
                  fillOpacity: 0.1, 
                  color: '#4f46e5', 
                  weight: 1 
                }}
              />
            </>
          )}

          {/* Site Markers */}
          {visitsWithCoords.map((visit) => (
            <Marker 
              key={visit.id} 
              position={[visit.latitude!, visit.longitude!]}
              icon={getMarkerIcon(visit)}
            >
              <Popup className="custom-osm-popup">
                <div className="w-[280px] p-0.5 font-sans">
                  {visit.photo && (
                    <div className="relative h-24 mb-2 rounded-lg overflow-hidden group">
                      <img 
                        src={visit.photo} 
                        alt="Site" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <button 
                          onClick={() => setFullPhoto(visit.photo || null)}
                          className="p-1.5 bg-white/90 rounded-full text-slate-900 shadow-md transform scale-90"
                        >
                          <Maximize2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-slate-900 leading-tight m-0">{visit.clientName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={8} className="text-slate-400" />
                          <p className="text-[9px] text-slate-500 font-medium m-0 truncate">{visit.address || visit.location}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onEditVisit?.(visit)}
                        className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-y border-slate-100">
                      <div className="flex items-center gap-1">
                        <Home size={9} className="text-indigo-500" />
                        <span className="text-[9px] font-bold text-slate-700">{visit.buildingType || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone size={9} className="text-emerald-500" />
                        <span className="text-[9px] font-bold text-slate-700">{visit.clientMobile || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Calendar size={9} className="text-slate-400" />
                        <span className="text-[9px] text-slate-600 font-bold">{visit.visitingDate}</span>
                      </div>
                      <span className={`text-[7px] px-1 py-0.5 rounded font-black uppercase ${
                        visit.leadStatus === 'hot' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {visit.leadStatus}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => handleNavigate(visit)}
                          className="flex-1 bg-indigo-600 text-white py-1.5 rounded text-[9px] font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-1"
                        >
                          <Navigation size={10} />
                          Navigate
                        </button>
                        <a 
                          href={`tel:${visit.clientMobile}`}
                          className="w-8 bg-slate-100 text-slate-700 flex items-center justify-center rounded hover:bg-slate-200 transition"
                        >
                          <Phone size={11} />
                        </a>
                      </div>
                      
                      <button 
                        onClick={() => {
                          if (confirm('Mark this visit as completed?')) {
                            onCompleteVisit?.(visit);
                          }
                        }}
                        className="w-full py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-black flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition"
                      >
                        <CheckCircle size={12} />
                        Mark Completed
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

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
        <div className="absolute bottom-6 left-4 bg-white/95 backdrop-blur-sm border border-slate-200 p-3 rounded-xl shadow-xl z-[1000] space-y-2 max-w-[140px]">
          <p className="text-[9px] font-black uppercase text-slate-400 font-mono tracking-widest mb-1">Site Types (OSM)</p>
          <div className="grid grid-cols-1 gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#a855f7] shadow-sm border border-[#7e22ce]"></div>
              <span className="text-[9px] font-bold text-slate-700">Villa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#fcd34d] shadow-sm border border-[#b45309]"></div>
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
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-sm border border-white"></div>
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
