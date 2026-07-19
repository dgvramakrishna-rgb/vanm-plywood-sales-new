import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, Crosshair, Map as MapIcon, Layers, Phone, Calendar, User, Home, CheckCircle, Edit2, Maximize2, X, MessageCircle, History, ZoomIn, ZoomOut, Compass, ChevronRight, Search, Target, Radio, Sliders, BellRing } from 'lucide-react';
import { sendLocalNotification, playProximityBeep } from '../utils/notifications';
import { calculateDistance } from '../utils/geoUtils';
import { SiteVisit } from '../types';
import { SitePhotoItem } from './SitePhotoItem';

// ... (marker icons remain the same)

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

const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [35, 57], // Larger
  iconAnchor: [17, 57],
  popupAnchor: [1, -48],
  shadowSize: [57, 57]
});

// Custom carpenter icons using divIcon with emoji inside
const carpenterIcon = new L.DivIcon({
  className: 'custom-carpenter-pin',
  html: `
    <div class="relative flex flex-col items-center">
      <div class="w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-md flex items-center justify-center text-sm">
        🪚
      </div>
      <div class="w-1.5 h-1.5 bg-amber-500 transform rotate-45 -mt-1 shadow-sm"></div>
    </div>
  `,
  iconSize: [32, 38],
  iconAnchor: [16, 38],
  popupAnchor: [0, -38]
});

const carpenterIconSelected = new L.DivIcon({
  className: 'custom-carpenter-pin-selected',
  html: `
    <div class="relative flex flex-col items-center scale-110 animate-fade-in">
      <div class="w-9 h-9 rounded-full bg-amber-600 border-2 border-white shadow-lg flex items-center justify-center text-base animate-pulse">
        🪚
      </div>
      <div class="w-2 h-2 bg-amber-600 transform rotate-45 -mt-1 shadow-md"></div>
    </div>
  `,
  iconSize: [36, 42],
  iconAnchor: [18, 42],
  popupAnchor: [0, -42]
});

// Custom completed icons using divIcon
const completedIcon = new L.DivIcon({
  className: 'custom-completed-pin',
  html: `
    <div class="relative flex flex-col items-center">
      <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center text-xs">
        ✅
      </div>
      <div class="w-1.5 h-1.5 bg-emerald-500 transform rotate-45 -mt-1 shadow-sm"></div>
    </div>
  `,
  iconSize: [32, 38],
  iconAnchor: [16, 38],
  popupAnchor: [0, -38]
});

// Custom interior icons using divIcon
const interiorIcon = new L.DivIcon({
  className: 'custom-interior-pin',
  html: `
    <div class="relative flex flex-col items-center">
      <div class="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white shadow-md flex items-center justify-center text-sm">
        🛋️
      </div>
      <div class="w-1.5 h-1.5 bg-indigo-500 transform rotate-45 -mt-1 shadow-sm"></div>
    </div>
  `,
  iconSize: [32, 38],
  iconAnchor: [16, 38],
  popupAnchor: [0, -38]
});

const interiorIconSelected = new L.DivIcon({
  className: 'custom-interior-pin-selected',
  html: `
    <div class="relative flex flex-col items-center scale-110 animate-fade-in">
      <div class="w-9 h-9 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-base animate-pulse">
        🛋️
      </div>
      <div class="w-2 h-2 bg-indigo-600 transform rotate-45 -mt-1 shadow-md"></div>
    </div>
  `,
  iconSize: [36, 42],
  iconAnchor: [18, 42],
  popupAnchor: [0, -42]
});

// Custom builder icons using divIcon
const builderIcon = new L.DivIcon({
  className: 'custom-builder-pin',
  html: `
    <div class="relative flex flex-col items-center">
      <div class="w-8 h-8 rounded-full bg-sky-500 border-2 border-white shadow-md flex items-center justify-center text-sm">
        🏗️
      </div>
      <div class="w-1.5 h-1.5 bg-sky-500 transform rotate-45 -mt-1 shadow-sm"></div>
    </div>
  `,
  iconSize: [32, 38],
  iconAnchor: [16, 38],
  popupAnchor: [0, -38]
});

const builderIconSelected = new L.DivIcon({
  className: 'custom-builder-pin-selected',
  html: `
    <div class="relative flex flex-col items-center scale-110 animate-fade-in">
      <div class="w-9 h-9 rounded-full bg-sky-600 border-2 border-white shadow-lg flex items-center justify-center text-base animate-pulse">
        🏗️
      </div>
      <div class="w-2 h-2 bg-sky-600 transform rotate-45 -mt-1 shadow-md"></div>
    </div>
  `,
  iconSize: [36, 42],
  iconAnchor: [18, 42],
  popupAnchor: [0, -42]
});

// Component to handle map centering, zoom, and maintaining interaction states
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  
  const y = Math.sin(dLon) * Math.cos(rLat2);
  const x = Math.cos(rLat1) * Math.sin(rLat2) - Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon);
  
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function MapFitBounds({ visits, userLocation }: { visits: SiteVisit[], userLocation: [number, number] | null }) {
  const map = useMap();
  const hasFitted = useRef(false);
  
  useEffect(() => {
    if (hasFitted.current) return;
    
    const coords = [
        ...visits
          .filter(v => v.latitude !== null && v.longitude !== null)
          .map(v => [v.latitude!, v.longitude!] as [number, number]),
        ...(userLocation ? [userLocation] : [])
    ];
    if (coords.length > 0) {
      map.fitBounds(coords, { padding: [50, 50] });
      hasFitted.current = true;
    }
  }, [map, visits, userLocation]);
  return null;
}

function MapController({ 
  center, 
  zoom, 
  setCenter, 
  setZoom, 
  followMode, 
  setFollowMode 
}: { 
  center: [number, number]; 
  zoom: number; 
  setCenter: (c: [number, number]) => void; 
  setZoom: (z: number) => void;
  followMode: boolean;
  setFollowMode: (f: boolean) => void;
}) {
  const map = useMap();
  
  // Track zoom/drag events to maintain state without resetting unexpectedly
  useMapEvents({
    dragstart: () => {
      // Suspend follow mode when user manually drags the map
      setFollowMode(false);
    },
    moveend: () => {
      const currentCenter = map.getCenter();
      if (!followMode) {
        setCenter([currentCenter.lat, currentCenter.lng]);
      }
    },
    zoomend: () => {
      setZoom(map.getZoom());
      const currentCenter = map.getCenter();
      if (!followMode) {
        setCenter([currentCenter.lat, currentCenter.lng]);
      }
    }
  });

  useEffect(() => {
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const distance = Math.sqrt(
      Math.pow(currentCenter.lat - center[0], 2) + Math.pow(currentCenter.lng - center[1], 2)
    );
    if (distance > 0.0001 || currentZoom !== zoom) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);

  return null;
}

function MapRotator({ heading, autoRotate }: { heading: number; autoRotate: boolean }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    if (container) {
      container.style.transition = 'transform 0.4s ease-out';
      if (autoRotate) {
        container.style.transform = `rotate(${-heading}deg)`;
      } else {
        container.style.transform = 'rotate(0deg)';
      }
    }
  }, [heading, autoRotate, map]);
  return null;
}

interface SiteVisitsOSMMapProps {
  visits: SiteVisit[];
  onEditVisit?: (visit: SiteVisit) => void;
  onCompleteVisit?: (visit: SiteVisit) => void;
  onDeleteVisit?: (visit: SiteVisit) => void;
  onViewHistory?: (mobile: string) => void;
  onWhatsApp?: (mobile: string, name: string) => void;
}

export default function SiteVisitsOSMMap({ 
  visits, 
  onEditVisit, 
  onCompleteVisit, 
  onDeleteVisit,
  onViewHistory, 
  onWhatsApp
}: SiteVisitsOSMMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default center of India
  const [zoom, setZoom] = useState(5);
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [showClientList, setShowClientList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapViewMode, setMapViewMode] = useState<'clients' | 'carpenters' | 'interiors' | 'builders'>('clients');
  const notifiedVisits = useRef<Set<string>>(new Set());

  // Geofencing options for OpenStreetMap
  const [isGeofenceEnabled, setIsGeofenceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('osm_geofence_enabled');
    return saved !== 'false';
  });
  const [geofenceRadius, setGeofenceRadius] = useState<number>(() => {
    const saved = localStorage.getItem('osm_geofence_radius');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [isSettingsExpanded, setIsSettingsExpanded] = useState<boolean>(true);

  useEffect(() => {
    localStorage.setItem('osm_geofence_enabled', isGeofenceEnabled.toString());
  }, [isGeofenceEnabled]);

  useEffect(() => {
    localStorage.setItem('osm_geofence_radius', geofenceRadius.toString());
  }, [geofenceRadius]);

  // Follow Mode and Heading Auto-rotate states
  const [followMode, setFollowMode] = useState(true);
  const [heading, setHeading] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const prevLocRef = useRef<[number, number] | null>(null);
  const followModeRef = useRef(followMode);

  useEffect(() => {
    followModeRef.current = followMode;
  }, [followMode]);

  useEffect(() => {
    if (userLocation) {
      const activeRadiusKm = isGeofenceEnabled ? (geofenceRadius / 1000) : 0.05;
      visits.forEach(visit => {
        if (visit.latitude && visit.longitude) {
          const distance = calculateDistance(
            userLocation[0],
            userLocation[1],
            visit.latitude,
            visit.longitude
          );
          
          if (distance < activeRadiusKm && !notifiedVisits.current.has(visit.id)) {
            sendLocalNotification('Proximity Alert', `You are near ${visit.clientName}!`);
            playProximityBeep();
            notifiedVisits.current.add(visit.id);
          } else if (distance >= activeRadiusKm) {
            notifiedVisits.current.delete(visit.id);
          }
        }
      });
    }
  }, [userLocation, visits, isGeofenceEnabled, geofenceRadius]);

  // Real-time device orientation / compass tracking
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!autoRotate) return;
      const webkitHeading = (e as any).webkitCompassHeading;
      if (webkitHeading !== undefined && webkitHeading !== null) {
        setHeading(webkitHeading);
      } else if (e.alpha !== null && e.alpha !== undefined) {
        setHeading(360 - e.alpha);
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [autoRotate]);

  useEffect(() => {
    let watchId: number;
    
    if (navigator.geolocation) {
      // Get initial position
      handleDetectLocation();

      // Watch position for real-time tracking
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          
          if (followModeRef.current) {
            setMapCenter(loc);
          }

          // Track movement heading
          let newHeading = heading;
          if (position.coords.heading !== null && !isNaN(position.coords.heading)) {
            newHeading = position.coords.heading;
          } else if (prevLocRef.current) {
            const dist = calculateDistance(prevLocRef.current[0], prevLocRef.current[1], loc[0], loc[1]);
            if (dist > 0.005) { // Moved > 5 meters
              newHeading = calculateBearing(prevLocRef.current[0], prevLocRef.current[1], loc[0], loc[1]);
            }
          }
          setHeading(newHeading);
          prevLocRef.current = loc;
        },
        (error) => {
          console.warn("Geolocation watch error (OSM):", error.message);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 5000 
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const handleDetectLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc);
          setZoom(14);
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

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 1, 19));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 1, 3));

  const handleSelectVisit = (visit: SiteVisit) => {
    if (visit.latitude && visit.longitude) {
      setMapCenter([visit.latitude, visit.longitude]);
      setZoom(16);
      setSelectedVisitId(visit.id);
      setShowClientList(false);
    }
  };

  const carpentersVisits = visits.filter(v => 
    (v.carpenterName && v.carpenterName.trim().length > 0) || 
    (v.contractorType === 'carpenter' && v.contractorName && v.contractorName.trim().length > 0)
  );

  const interiorsVisits = visits.filter(v => 
    (v.interiorName && v.interiorName.trim().length > 0) || 
    (v.contractorType === 'interior' && v.contractorName && v.contractorName.trim().length > 0)
  );

  const buildersVisits = visits.filter(v => 
    (v.builderName && v.builderName.trim().length > 0) || 
    (v.contractorType === 'builder' && v.contractorName && v.contractorName.trim().length > 0)
  );

  const visitsToMap = 
    mapViewMode === 'carpenters' ? carpentersVisits :
    mapViewMode === 'interiors' ? interiorsVisits :
    mapViewMode === 'builders' ? buildersVisits :
    visits;

  const filteredVisits = visitsToMap.filter(v => {
    let contractorSearchName = '';
    if (mapViewMode === 'carpenters') {
      contractorSearchName = v.carpenterName || (v.contractorType === 'carpenter' ? v.contractorName : '') || '';
    } else if (mapViewMode === 'interiors') {
      contractorSearchName = v.interiorName || (v.contractorType === 'interior' ? v.contractorName : '') || '';
    } else if (mapViewMode === 'builders') {
      contractorSearchName = v.builderName || (v.contractorType === 'builder' ? v.contractorName : '') || '';
    }

    return v.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractorSearchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.address || v.location || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleNavigate = (visit: SiteVisit) => {
    if (visit.latitude && visit.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${visit.latitude},${visit.longitude}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  const getMarkerIcon = (visit: SiteVisit) => {
    if (visit.isCompleted) return completedIcon;
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

  const visitsWithCoords = visitsToMap.filter(v => v.latitude && v.longitude);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>
            <span className="text-[11px] font-black uppercase text-slate-500 font-mono tracking-wider">
              Site Map Section
            </span>
          </div>

          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-extrabold animate-fade-in">
            {visitsWithCoords.length} on Map
          </span>
        </div>
        
        <button
          onClick={handleDetectLocation}
          disabled={isLocating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer w-fit animate-fade-in"
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
          zoomControl={false} // Disable default zoom control
        >
          <MapController 
            center={mapCenter} 
            zoom={zoom} 
            setCenter={setMapCenter}
            setZoom={setZoom}
            followMode={followMode}
            setFollowMode={setFollowMode}
          />
          <MapFitBounds visits={visits} userLocation={userLocation} />
          <MapRotator heading={heading} autoRotate={autoRotate} />
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
          {visitsWithCoords.map((visit) => {
            const carpName = visit.carpenterName || (visit.contractorType === 'carpenter' ? visit.contractorName : '') || 'No Carpenter';
            const carpMobile = visit.carpenterMobile || (visit.contractorType === 'carpenter' ? visit.contractorMobile : '') || '';
            const carpPlace = visit.carpenterPlace || (visit.contractorType === 'carpenter' ? visit.contractorAddress : '') || 'N/A';

            const interiorName = visit.interiorName || (visit.contractorType === 'interior' ? visit.contractorName : '') || 'No Interior Designer';
            const interiorMobile = visit.interiorMobile || (visit.contractorType === 'interior' ? visit.contractorMobile : '') || '';
            const interiorPlace = visit.interiorPlace || (visit.contractorType === 'interior' ? visit.contractorAddress : '') || 'N/A';

            const builderName = visit.builderName || (visit.contractorType === 'builder' ? visit.contractorName : '') || 'No Builder';
            const builderMobile = visit.builderMobile || (visit.contractorType === 'builder' ? visit.contractorMobile : '') || '';
            const builderPlace = visit.builderPlace || (visit.contractorType === 'builder' ? visit.contractorAddress : '') || 'N/A';

            const isInside = userLocation && visit.latitude && visit.longitude && (
              calculateDistance(userLocation[0], userLocation[1], visit.latitude, visit.longitude) * 1000 <= geofenceRadius
            );

            return (
              <React.Fragment key={visit.id}>
                {isGeofenceEnabled && visit.latitude && visit.longitude && (
                  <></>
                )}
                <Marker 
                  position={[visit.latitude!, visit.longitude!]}
                icon={
                  visit.isCompleted
                    ? completedIcon
                    : mapViewMode === 'carpenters'
                      ? (selectedVisitId === visit.id ? carpenterIconSelected : carpenterIcon)
                      : mapViewMode === 'interiors'
                        ? (selectedVisitId === visit.id ? interiorIconSelected : interiorIcon)
                        : mapViewMode === 'builders'
                          ? (selectedVisitId === visit.id ? builderIconSelected : builderIcon)
                          : (selectedVisitId === visit.id ? selectedIcon : getMarkerIcon(visit))
                }
                eventHandlers={{
                  click: () => setSelectedVisitId(visit.id),
                }}
              >
                <Popup className="custom-osm-popup">
                  <div className="w-[240px] p-0.5 font-sans max-h-[300px] overflow-y-auto">
                    {visit.photo && (
                      <div className="mb-2">
                        <SitePhotoItem 
                          visit={visit} 
                          onEnlarge={(photo) => setFullPhoto(photo)}
                          className="relative w-full h-20 rounded-lg overflow-hidden shadow-inner cursor-zoom-in group bg-slate-50 border border-slate-100"
                          imageClassName="w-full h-full object-cover group-hover:scale-105 duration-200"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      {mapViewMode === 'carpenters' && (
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

                      {mapViewMode === 'interiors' && (
                        <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-200">
                          <p className="text-[9px] font-black uppercase text-indigo-800 tracking-wider font-mono">Associated Interior Designer</p>
                          <h4 className="text-xs font-black text-slate-900 m-0 leading-tight flex items-center gap-1.5 mt-0.5">
                            <span>🛋️</span> {interiorName}
                          </h4>
                          {interiorPlace && (
                            <p className="text-[8px] text-slate-500 font-medium m-0 mt-0.5">Base: {interiorPlace}</p>
                          )}
                        </div>
                      )}

                      {mapViewMode === 'builders' && (
                        <div className="bg-sky-50/70 p-2.5 rounded-xl border border-sky-200">
                          <p className="text-[9px] font-black uppercase text-sky-800 tracking-wider font-mono">Associated Builder</p>
                          <h4 className="text-xs font-black text-slate-900 m-0 leading-tight flex items-center gap-1.5 mt-0.5">
                            <span>🏗️</span> {builderName}
                          </h4>
                          {builderPlace && (
                            <p className="text-[8px] text-slate-500 font-medium m-0 mt-0.5">Base: {builderPlace}</p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider font-mono">Client Details</p>
                          <p className="text-xs font-black text-slate-900 leading-tight m-0 mt-0.5">{visit.clientName}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin size={8} className="text-slate-400" />
                            <p className="text-[9px] text-slate-500 font-medium m-0 truncate">{visit.address || visit.location}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => onEditVisit?.(visit)}
                          className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-indigo-50 hover:text-indigo-600 transition shrink-0"
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

                      {/* Carpenter Action Panel in Carpenters view */}
                      {mapViewMode === 'carpenters' && carpMobile && (
                        <div className="p-2 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-between gap-1.5">
                          <div className="min-w-0">
                            <p className="text-[8px] font-extrabold uppercase text-orange-700 tracking-wider">Carpenter Mobile</p>
                            <p className="text-[9px] font-bold text-slate-800 font-mono m-0">{carpMobile}</p>
                          </div>
                          <div className="flex gap-1">
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
                                const text = encodeURIComponent(`Hello ${carpName} garu, this is regarding the ${visit.buildingType || 'site'} woodwork at ${visit.clientName}'s site.`);
                                window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                              }}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-xs"
                              title="WhatsApp Carpenter"
                            >
                              <MessageCircle size={10} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Interior Action Panel in Interiors view */}
                      {mapViewMode === 'interiors' && interiorMobile && (
                        <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-between gap-1.5">
                          <div className="min-w-0">
                            <p className="text-[8px] font-extrabold uppercase text-indigo-700 tracking-wider">Interior Mobile</p>
                            <p className="text-[9px] font-bold text-slate-800 font-mono m-0">{interiorMobile}</p>
                          </div>
                          <div className="flex gap-1">
                            <a 
                              href={`tel:${interiorMobile}`}
                              className="p-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-xs"
                              title="Call Interior"
                            >
                              <Phone size={10} />
                            </a>
                            <button 
                              type="button"
                              onClick={() => {
                                const cleanPhone = interiorMobile.replace(/\D/g, '').length === 10 ? '91' + interiorMobile.replace(/\D/g, '') : interiorMobile.replace(/\D/g, '');
                                const text = encodeURIComponent(`Hello ${interiorName} garu, this is regarding the interior design at ${visit.clientName}'s site.`);
                                window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                              }}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-xs"
                              title="WhatsApp Interior"
                            >
                              <MessageCircle size={10} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Builder Action Panel in Builders view */}
                      {mapViewMode === 'builders' && builderMobile && (
                        <div className="p-2 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-between gap-1.5">
                          <div className="min-w-0">
                            <p className="text-[8px] font-extrabold uppercase text-sky-700 tracking-wider">Builder Mobile</p>
                            <p className="text-[9px] font-bold text-slate-800 font-mono m-0">{builderMobile}</p>
                          </div>
                          <div className="flex gap-1">
                            <a 
                              href={`tel:${builderMobile}`}
                              className="p-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-xs"
                              title="Call Builder"
                            >
                              <Phone size={10} />
                            </a>
                            <button 
                              type="button"
                              onClick={() => {
                                const cleanPhone = builderMobile.replace(/\D/g, '').length === 10 ? '91' + builderMobile.replace(/\D/g, '') : builderMobile.replace(/\D/g, '');
                                const text = encodeURIComponent(`Hello ${builderName} garu, this is regarding the building construction work at ${visit.clientName}'s site.`);
                                window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                              }}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-xs"
                              title="WhatsApp Builder"
                            >
                              <MessageCircle size={10} />
                            </button>
                          </div>
                        </div>
                      )}

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
                          <button 
                            onClick={() => onEditVisit?.(visit)}
                            className="flex-1 bg-amber-500 text-white py-1.5 rounded text-[9px] font-bold hover:bg-amber-600 transition flex items-center justify-center gap-1"
                          >
                            <Edit2 size={10} />
                            Edit
                          </button>
                          <a 
                            href={`tel:${visit.clientMobile}`}
                            className="w-8 bg-slate-100 text-slate-700 flex items-center justify-center rounded hover:bg-slate-200 transition"
                          >
                            <Phone size={11} />
                          </a>
                        </div>

                        <div className="flex gap-1.5">
                          <button 
                            type="button"
                            onClick={() => {
                              if (onWhatsApp) {
                                onWhatsApp(visit.clientMobile, visit.clientName);
                              } else {
                                const mobile = visit.clientMobile || '';
                                const cleanPhone = mobile.replace(/\D/g, '').length === 10 ? '91' + mobile.replace(/\D/g, '') : mobile.replace(/\D/g, '');
                                const text = encodeURIComponent(`Hello ${visit.clientName} garu, I recently visited your site, work progress is good 👍. Thank you sir.`);
                                window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                              }
                            }}
                            className="flex-1 bg-emerald-600 text-white py-1.5 rounded text-[9px] font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1 shadow-sm"
                          >
                            <MessageCircle size={10} />
                            WhatsApp Client
                          </button>
                          <button 
                            onClick={() => onViewHistory?.(visit.clientMobile)}
                            className="flex-1 bg-indigo-50 text-indigo-700 py-1.5 rounded text-[9px] font-bold border border-indigo-100 hover:bg-indigo-100 transition flex items-center justify-center gap-1 shadow-sm"
                          >
                            <History size={10} />
                            Visit Log
                          </button>
                        </div>
                      </div>
                        
                      {visit.isCompleted ? (
                        <div className="flex gap-1.5 w-full">
                          <div className="flex-1 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-black flex items-center justify-center gap-1.5">
                            <CheckCircle size={12} className="text-emerald-500" />
                            Completed
                          </div>
                          <button 
                            onClick={() => {
                              if (confirm('Delete this visit?')) {
                                onDeleteVisit?.(visit);
                              }
                            }}
                            className="py-1.5 px-3 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[9px] font-black flex items-center justify-center gap-1.5 hover:bg-rose-100 transition"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5 w-full">
                          <button 
                            onClick={() => {
                              if (confirm('Mark this visit as completed?')) {
                                onCompleteVisit?.(visit);
                              }
                            }}
                            className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-black flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition"
                          >
                            <CheckCircle size={12} />
                            Complete
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Delete this visit?')) {
                                onDeleteVisit?.(visit);
                              }
                            }}
                            className="py-1.5 px-3 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[9px] font-black flex items-center justify-center gap-1.5 hover:bg-rose-100 transition"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
        </MapContainer>

        {/* Floating Geofencing Control Panel (Top-Left) */}
        {(() => {
          const enteredSites = visitsWithCoords.filter(visit => {
            if (!userLocation || !visit.latitude || !visit.longitude || visit.isCompleted) return false;
            const distInKm = calculateDistance(
              userLocation[0],
              userLocation[1],
              visit.latitude,
              visit.longitude
            );
            return distInKm * 1000 <= geofenceRadius;
          });

          return (
            <div className="hidden absolute top-4 left-4 z-[1000] flex flex-col items-start gap-2 max-w-[280px] sm:max-w-[320px]">
              {!isSettingsExpanded ? (
                <button
                  onClick={() => setIsSettingsExpanded(true)}
                  className="p-3 bg-slate-900/95 hover:bg-slate-800 text-white rounded-full shadow-2xl border border-slate-700/80 flex items-center justify-center cursor-pointer transition relative group"
                  title="Expand Geofence Settings"
                >
                  <Radio size={18} className={`${isGeofenceEnabled ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                  {isGeofenceEnabled && enteredSites.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[9px] font-black flex items-center justify-center text-white border border-slate-900">
                      {enteredSites.length}
                    </span>
                  )}
                </button>
              ) : (
                <div className="bg-slate-900/95 text-white backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-2xl w-72 sm:w-80 flex flex-col gap-3 animate-fade-in relative">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                        <Radio size={14} className={isGeofenceEnabled ? 'animate-pulse' : ''} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black tracking-tight text-white uppercase font-mono">Geofencing</h3>
                        <p className="text-[9px] text-slate-400 font-medium">OSM boundary analysis</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isGeofenceEnabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`}></span>
                      <button 
                        onClick={() => setIsSettingsExpanded(false)}
                        className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition cursor-pointer"
                        title="Minimize"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-300 font-mono">OSM GEOFENCE LAYER</span>
                    <button
                      onClick={() => setIsGeofenceEnabled(!isGeofenceEnabled)}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                        isGeofenceEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        isGeofenceEnabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {isGeofenceEnabled && (
                    <>
                      {/* Slider Control */}
                      <div className="space-y-1.5 bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                            <Sliders size={11} className="text-indigo-400" />
                            <span>FENCE RADIUS</span>
                          </span>
                          <span className="text-[10px] font-black text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {geofenceRadius} meters
                          </span>
                        </div>
                        <input 
                          type="range"
                          min="50"
                          max="1000"
                          step="50"
                          value={geofenceRadius}
                          onChange={(e) => setGeofenceRadius(parseInt(e.target.value, 10))}
                          className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                        />
                        <div className="flex justify-between text-[8px] text-slate-500 font-semibold font-mono">
                          <span>50m</span>
                          <span>200m</span>
                          <span>500m</span>
                          <span>1km</span>
                        </div>
                      </div>

                      {/* Breach List */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                          <BellRing size={10} className="text-emerald-400" />
                          <span>Active Entries ({enteredSites.length})</span>
                        </span>

                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                          {enteredSites.length === 0 ? (
                            <div className="text-[10px] text-slate-500 py-3 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 leading-relaxed font-medium">
                              No active geofence entries.<br/>Move closer to client locations.
                            </div>
                          ) : (
                            enteredSites.map(visit => {
                              const dist = userLocation ? Math.round(calculateDistance(userLocation[0], userLocation[1], visit.latitude!, visit.longitude!) * 1000) : 0;
                              return (
                                <div key={visit.id} className="bg-emerald-950/30 border border-emerald-500/20 hover:border-emerald-500/40 p-2 rounded-xl transition flex flex-col gap-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <h4 className="text-[10px] font-black text-slate-100 truncate leading-tight flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                        <span>{visit.clientName}</span>
                                      </h4>
                                      <p className="text-[8px] text-emerald-400 font-mono mt-0.5 font-bold flex items-center gap-1">
                                        <Navigation size={8} />
                                        <span>{dist}m away (Inside fence)</span>
                                      </p>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setMapCenter([visit.latitude!, visit.longitude!]);
                                        setZoom(17);
                                        setSelectedVisitId(visit.id);
                                      }}
                                      className="text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2 py-1 rounded-lg border border-slate-700 font-bold transition cursor-pointer"
                                    >
                                      Locate
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                    <button
                                      onClick={() => {
                                        if (onWhatsApp) {
                                          onWhatsApp(visit.clientMobile, visit.clientName);
                                        } else if (visit.clientMobile) {
                                          window.open(`https://wa.me/${visit.clientMobile}`, '_blank');
                                        }
                                      }}
                                      className="py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1"
                                    >
                                      <MessageCircle size={10} />
                                      <span>WhatsApp</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Mark ${visit.clientName} as completed?`)) {
                                          onCompleteVisit?.(visit);
                                        }
                                      }}
                                      className="py-1 bg-white hover:bg-slate-100 text-slate-900 text-[9px] font-black rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1 border border-slate-200 shadow-sm"
                                    >
                                      <CheckCircle size={10} className="text-emerald-500" />
                                      <span>Complete</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Custom Map Controls Overlay */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          {/* Zoom Controls */}
          <div className="flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <button 
              onClick={handleZoomIn}
              className="p-2.5 hover:bg-slate-50 text-slate-700 transition border-b border-slate-100"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button 
              onClick={handleZoomOut}
              className="p-2.5 hover:bg-slate-50 text-slate-700 transition"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
          </div>

          {/* Compass / Orientation & Auto-rotate */}
          <button 
            onClick={() => {
              if (autoRotate) {
                setAutoRotate(false);
                setHeading(0);
              } else {
                setAutoRotate(true);
              }
            }}
            className={`p-2.5 rounded-xl shadow-lg border transition flex items-center justify-center relative group cursor-pointer ${
              autoRotate ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={autoRotate ? "Lock North Up" : "Enable Auto-Rotate Heading"}
          >
            <div style={{ transform: `rotate(${autoRotate ? heading : 0}deg)`, transition: 'transform 1s ease-out' }}>
              <Compass size={18} className={autoRotate ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'} />
            </div>
            <div className="absolute -left-20 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-[2000]">
              {autoRotate ? "Lock North Up" : "Auto-Rotate Heading"}
            </div>
            {/* NESW Indicator labels */}
            <span className="absolute -top-1 text-[8px] font-black text-slate-400">N</span>
            <span className="absolute -bottom-1 text-[8px] font-black text-slate-400">S</span>
            <span className="absolute -left-1 text-[8px] font-black text-slate-400">W</span>
            <span className="absolute -right-1 text-[8px] font-black text-slate-400">E</span>
          </button>

          {/* Follow Mode Toggle */}
          <button 
            onClick={() => setFollowMode(!followMode)}
            className={`p-2.5 rounded-xl shadow-lg border transition flex items-center justify-center relative group cursor-pointer ${
              followMode ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={followMode ? "Disable Follow Mode" : "Enable Follow Mode"}
          >
            <Navigation size={18} className={`${followMode ? 'text-emerald-600' : 'text-slate-400'}`} />
            <div className="absolute -left-20 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-[2000]">
              {followMode ? "Free Nav" : "Follow Me"}
            </div>
          </button>

          {/* Client List Toggle */}
          <button 
            onClick={() => setShowClientList(!showClientList)}
            className={`p-2.5 rounded-xl shadow-lg border transition flex items-center justify-center ${
              showClientList ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Client Selection"
          >
            <Search size={18} />
          </button>

          {/* Recenter on Me */}
          <button 
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-lg text-slate-700 hover:bg-slate-50 transition flex items-center justify-center"
            title="Recenter on My Location"
          >
            <Target size={18} className={isLocating ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Client Selection Panel */}
        {showClientList && (
          <div className="absolute top-4 right-16 z-[1001] w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder={
                    mapViewMode === 'carpenters' 
                      ? "Search carpenters or clients..." 
                      : mapViewMode === 'interiors'
                        ? "Search interiors or clients..."
                        : mapViewMode === 'builders'
                          ? "Search builders or clients..."
                          : "Search clients or sites..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[350px] overflow-y-auto p-1 custom-scrollbar">
              {filteredVisits.length > 0 ? (
                filteredVisits.map(visit => {
                  const carpName = visit.carpenterName || (visit.contractorType === 'carpenter' ? visit.contractorName : '') || 'No Carpenter';
                  const interiorName = visit.interiorName || (visit.contractorType === 'interior' ? visit.contractorName : '') || 'No Interior';
                  const builderName = visit.builderName || (visit.contractorType === 'builder' ? visit.contractorName : '') || 'No Builder';
                  
                  const isCarp = mapViewMode === 'carpenters';
                  const isInterior = mapViewMode === 'interiors';
                  const isBuilder = mapViewMode === 'builders';

                  return (
                    <button
                      key={visit.id}
                      onClick={() => handleSelectVisit(visit)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-indigo-50 rounded-xl transition text-left group"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isCarp 
                          ? 'bg-amber-100 text-amber-700' 
                          : isInterior
                            ? 'bg-indigo-100 text-indigo-700'
                            : isBuilder
                              ? 'bg-sky-100 text-sky-700'
                              : (visit.leadStatus === 'hot' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600')
                      }`}>
                        {isCarp ? <span className="text-sm">🪚</span> : isInterior ? <span className="text-sm">🛋️</span> : isBuilder ? <span className="text-sm">🏗️</span> : <MapPin size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-900 truncate group-hover:text-indigo-700 transition">
                          {isCarp ? carpName : isInterior ? interiorName : isBuilder ? builderName : visit.clientName}
                        </p>
                        <p className="text-[9px] text-slate-500 truncate">
                          {isCarp ? `Client: ${visit.clientName}` : isInterior ? `Client: ${visit.clientName}` : isBuilder ? `Client: ${visit.clientName}` : (visit.address || visit.location || 'No address')}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
                    </button>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Search size={16} className="text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">No results found</p>
                </div>
              )}
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


      </div>
    </div>
  );
}
