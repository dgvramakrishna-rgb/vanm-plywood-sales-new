import React, { useState, useEffect, useRef } from 'react';
import { SiteVisit } from '../types';
import { calculateDistance } from '../utils/geoUtils';
import { sendLocalNotification, playProximityBeep } from '../utils/notifications';
import { 
  Map as MapIcon, 
  MapPin, 
  Settings2, 
  Sliders, 
  Bell, 
  Plus, 
  Trash2, 
  Zap, 
  History, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  Navigation, 
  Play, 
  Pause, 
  RotateCcw,
  ShieldAlert,
  Info,
  Radio,
  Code,
  Layers,
  Map as LeafletMapIcon,
  Activity,
  UserCheck
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';

// Leaflet interactive map imports
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Import Radar JS SDK
import Radar from 'radar-sdk-js';

// Fix for default Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom markers for visual clarity
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const siteIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const customFenceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface RadarGeofence {
  id: string;
  tag: string;
  externalId: string;
  description: string;
  latitude: number;
  longitude: number;
  radius: number;
  geometryType: 'circle' | 'polygon' | 'isochrone';
  isEnabled: boolean;
}

interface RadarTelemetryLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  requestPayload: any;
  responsePayload: any;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

interface RadarEvent {
  id: string;
  timestamp: string;
  type: 'user.entered_geofence' | 'user.exited_geofence' | 'user.started_trip' | 'user.approaching_geofence';
  geofenceId: string;
  geofenceDescription: string;
  clientName: string;
  distance: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface RadarGeofenceMapProps {
  visits: SiteVisit[];
  onTriggerToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function RadarGeofenceMap({ visits, onTriggerToast }: RadarGeofenceMapProps) {
  const radarKey = (import.meta as any).env.VITE_RADAR_PUBLISHABLE_KEY || '';
  const isRadarConfigured = radarKey.length > 10;

  // Initialize Radar SDK
  useEffect(() => {
    if (isRadarConfigured) {
      try {
        Radar.initialize(radarKey);
        onTriggerToast?.('📡 Radar Location SDK Initialized successfully!', 'success');
      } catch (err) {
        console.error('Radar SDK Initialization failed:', err);
      }
    }
  }, [radarKey, isRadarConfigured]);

  // Manage Virtual Geofences
  const [geofences, setGeofences] = useState<RadarGeofence[]>(() => {
    const saved = localStorage.getItem('fieldconnect_radar_fences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse Radar fences', e);
      }
    }

    // Convert existing visits into default Radar Geofences on first load
    const activeVisits = visits.filter(v => v.latitude !== null && v.longitude !== null && !v.isCompleted);
    return activeVisits.map(v => ({
      id: `gf_${v.id}`,
      tag: 'visit_site',
      externalId: v.id,
      description: v.clientName,
      latitude: v.latitude!,
      longitude: v.longitude!,
      radius: 120, // Default 120 meters for accurate Radar triggers
      geometryType: 'circle',
      isEnabled: true
    }));
  });

  // Track the history of Radar REST API logs & telemetry
  const [telemetryLogs, setTelemetryLogs] = useState<RadarTelemetryLog[]>(() => {
    const saved = localStorage.getItem('fieldconnect_radar_telemetry');
    return saved ? JSON.parse(saved) : [];
  });

  // Track the history of geofencing events
  const [radarEvents, setRadarEvents] = useState<RadarEvent[]>(() => {
    const saved = localStorage.getItem('fieldconnect_radar_events');
    return saved ? JSON.parse(saved) : [];
  });

  // Simulator Coordinates and Configuration
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  
  // Find a reasonable initial coordinate
  const defaultCenter: [number, number] = geofences.length > 0 
    ? [geofences[0].latitude, geofences[0].longitude]
    : [17.4065, 78.4772];

  const [simulatedLat, setSimulatedLat] = useState<number>(defaultCenter[0]);
  const [simulatedLon, setSimulatedLon] = useState<number>(defaultCenter[1]);
  
  const [realLat, setRealLat] = useState<number | null>(null);
  const [realLon, setRealLon] = useState<number | null>(null);

  const currentLat = isSimulating ? simulatedLat : realLat;
  const currentLon = isSimulating ? simulatedLon : realLon;

  // Radar Continuous Tracking status
  const [isContinuousTracking, setIsContinuousTracking] = useState<boolean>(false);
  const [radarUserId, setRadarUserId] = useState<string>('FC_AGENT_007');

  // Track inside/outside transitions for geofencing triggering
  const [insideStatus, setInsideStatus] = useState<Record<string, boolean>>({});

  // Dynamic user-created geofence state helper
  const [newFenceDescription, setNewFenceDescription] = useState('');
  const [newFenceRadius, setNewFenceRadius] = useState<number>(100);
  const [selectedMapPoint, setSelectedMapPoint] = useState<[number, number] | null>(null);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('fieldconnect_radar_fences', JSON.stringify(geofences));
  }, [geofences]);

  useEffect(() => {
    localStorage.setItem('fieldconnect_radar_telemetry', JSON.stringify(telemetryLogs));
  }, [telemetryLogs]);

  useEffect(() => {
    localStorage.setItem('fieldconnect_radar_events', JSON.stringify(radarEvents));
  }, [radarEvents]);

  // Real satellite watchPosition
  useEffect(() => {
    if (isSimulating || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setRealLat(position.coords.latitude);
        setRealLon(position.coords.longitude);
      },
      (error) => {
        console.warn('GPS Sensor offline:', error.message);
        onTriggerToast?.('Satellite GPS offline. Auto-enabling Simulator mode.', 'error');
        setIsSimulating(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isSimulating]);

  // Handle continuous simulation tracking ticker
  useEffect(() => {
    if (!isContinuousTracking || currentLat === null || currentLon === null) return;

    const interval = setInterval(() => {
      // Simulate slight drift/walking in a direction (approx 2 meters drift)
      const driftLat = (Math.random() - 0.5) * 0.00003;
      const driftLon = (Math.random() - 0.5) * 0.00003;
      
      if (isSimulating) {
        setSimulatedLat(prev => prev + driftLat);
        setSimulatedLon(prev => prev + driftLon);
      }
      
      // Perform a simulated or live Radar Tracking API trigger
      triggerRadarTrackAPI();
    }, 5000);

    return () => clearInterval(interval);
  }, [isContinuousTracking, currentLat, currentLon, isSimulating]);

  // Primary Radar Tracking API simulator (Matches Radar HTTP endpoint patterns)
  const triggerRadarTrackAPI = () => {
    if (currentLat === null || currentLon === null) return;

    const requestTime = new Date().toISOString();
    const endpointUrl = isRadarConfigured ? 'https://api.radar.io/v1/track' : 'https://api.radar.io/v1/track (Simulated)';
    
    const requestPayload = {
      userId: radarUserId,
      latitude: currentLat,
      longitude: currentLon,
      accuracy: 5,
      deviceType: Capacitor.getPlatform() === 'web' ? 'Browser' : 'MobileDevice',
      foreground: true,
      stopped: false
    };

    // Prepare simulated response data based on computed boundaries
    const triggeredRadarFences: any[] = [];
    const triggeredEvents: RadarEvent[] = [];
    const updatedInsideStatus = { ...insideStatus };
    const nowStr = new Date().toLocaleTimeString();

    geofences.forEach(fence => {
      if (!fence.isEnabled) return;

      const distance = calculateDistance(currentLat, currentLon, fence.latitude, fence.longitude);
      const isInside = distance <= fence.radius;
      const wasInside = !!insideStatus[fence.id];

      if (isInside) {
        triggeredRadarFences.push({
          id: fence.id,
          tag: fence.tag,
          externalId: fence.externalId,
          description: fence.description,
          distance,
          geometry: {
            type: 'Circle',
            radius: fence.radius
          }
        });
      }

      // Check transitions
      if (isInside && !wasInside) {
        updatedInsideStatus[fence.id] = true;
        const newEvent: RadarEvent = {
          id: `evt_${Date.now()}_${fence.id}`,
          timestamp: nowStr,
          type: 'user.entered_geofence',
          geofenceId: fence.id,
          geofenceDescription: fence.description,
          clientName: fence.description,
          distance,
          confidence: 'HIGH'
        };
        triggeredEvents.push(newEvent);
        
        playProximityBeep(3500);
        sendLocalNotification(
          '📡 Radar Geofence Entry',
          `Entered ${fence.description} zone (${fence.radius}m). Distance: ${Math.round(distance)}m.`
        );
        onTriggerToast?.(`🎯 RADAR: Entered geofence [${fence.description}]`, 'success');

      } else if (!isInside && wasInside) {
        updatedInsideStatus[fence.id] = false;
        const newEvent: RadarEvent = {
          id: `evt_${Date.now()}_${fence.id}`,
          timestamp: nowStr,
          type: 'user.exited_geofence',
          geofenceId: fence.id,
          geofenceDescription: fence.description,
          clientName: fence.description,
          distance,
          confidence: 'HIGH'
        };
        triggeredEvents.push(newEvent);

        sendLocalNotification(
          '🚶 Radar Geofence Exit',
          `Exited ${fence.description} zone. Distance: ${Math.round(distance)}m.`
        );
        onTriggerToast?.(`🚶 RADAR: Exited geofence [${fence.description}]`, 'info');
      } else {
        updatedInsideStatus[fence.id] = isInside;
      }
    });

    setInsideStatus(updatedInsideStatus);

    if (triggeredEvents.length > 0) {
      setRadarEvents(prev => [...triggeredEvents, ...prev].slice(0, 50));
    }

    // Call live SDK if configured, else fall back to beautiful log visualization
    if (isRadarConfigured) {
      try {
        Radar.trackOnce()
          .then((result: any) => {
            const apiLog: RadarTelemetryLog = {
              id: `api_${Date.now()}`,
              timestamp: nowStr,
              endpoint: '/v1/track',
              method: 'POST',
              requestPayload,
              responsePayload: result,
              status: 'SUCCESS'
            };
            setTelemetryLogs(prev => [apiLog, ...prev].slice(0, 40));
          })
          .catch((err: any) => {
            const apiLog: RadarTelemetryLog = {
              id: `api_${Date.now()}`,
              timestamp: nowStr,
              endpoint: '/v1/track',
              method: 'POST',
              requestPayload,
              responsePayload: { error: err.message || err },
              status: 'ERROR'
            };
            setTelemetryLogs(prev => [apiLog, ...prev].slice(0, 40));
          });
      } catch (err: any) {
        console.error('Radar tracking error:', err);
      }
    } else {
      // Elegant simulated API response payload
      const simulatedResponse = {
        meta: {
          code: 200,
          message: 'Simulation Ok'
        },
        location: {
          latitude: currentLat,
          longitude: currentLon,
          accuracy: 5
        },
        user: {
          id: radarUserId,
          geofences: triggeredRadarFences,
          events: triggeredEvents.map(e => ({
            id: e.id,
            type: e.type,
            geofence: { id: e.geofenceId, description: e.geofenceDescription }
          }))
        }
      };

      const apiLog: RadarTelemetryLog = {
        id: `api_${Date.now()}`,
        timestamp: nowStr,
        endpoint: '/v1/track (Simulation)',
        method: 'POST',
        requestPayload,
        responsePayload: simulatedResponse,
        status: 'SUCCESS'
      };

      setTelemetryLogs(prev => [apiLog, ...prev].slice(0, 40));
    }
  };

  // Trigger evaluation whenever current position changes
  useEffect(() => {
    triggerRadarTrackAPI();
  }, [currentLat, currentLon]);

  // Click handler on the Leaflet map to update simulator coordinates
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        if (isSimulating) {
          setSimulatedLat(e.latlng.lat);
          setSimulatedLon(e.latlng.lng);
        } else {
          // If in exact point selection for creating custom virtual geofence
          setSelectedMapPoint([e.latlng.lat, e.latlng.lng]);
          onTriggerToast?.('Set coordinates for a new Radar Geofence point!', 'info');
        }
      }
    });
    return null;
  };

  // Add a fully customized Virtual Geofence directly
  const handleAddCustomGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFenceDescription.trim()) {
      onTriggerToast?.('Please enter a description for this geofence.', 'error');
      return;
    }

    const lat = selectedMapPoint ? selectedMapPoint[0] : currentLat;
    const lon = selectedMapPoint ? selectedMapPoint[1] : currentLon;

    if (lat === null || lon === null) {
      onTriggerToast?.('No coordinate coordinates specified.', 'error');
      return;
    }

    const newFence: RadarGeofence = {
      id: `gf_custom_${Date.now()}`,
      tag: 'custom_virtual',
      externalId: `ext_${Date.now()}`,
      description: newFenceDescription,
      latitude: lat,
      longitude: lon,
      radius: newFenceRadius,
      geometryType: 'circle',
      isEnabled: true
    };

    setGeofences(prev => [newFence, ...prev]);
    setNewFenceDescription('');
    setSelectedMapPoint(null);
    onTriggerToast?.(`Radar Geofence "${newFenceDescription}" added!`, 'success');
  };

  // Remove a Geofence
  const handleRemoveGeofence = (id: string) => {
    setGeofences(prev => prev.filter(f => f.id !== id));
    onTriggerToast?.('Geofence removed.', 'info');
  };

  // Toggle single geofence status
  const handleToggleGeofence = (id: string) => {
    setGeofences(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, isEnabled: !f.isEnabled };
      }
      return f;
    }));
  };

  // Trigger telemetry logs deletion
  const handleClearTelemetry = () => {
    if (confirm('Clear telemetry history logs?')) {
      setTelemetryLogs([]);
      localStorage.removeItem('fieldconnect_radar_telemetry');
      onTriggerToast?.('Telemetry logs cleared.', 'info');
    }
  };

  // Trigger radar events logs deletion
  const handleClearEvents = () => {
    if (confirm('Clear Radar geofencing events history?')) {
      setRadarEvents([]);
      localStorage.removeItem('fieldconnect_radar_events');
      onTriggerToast?.('Events cleared.', 'info');
    }
  };

  // Simulation Teleports helper
  const teleportToFence = (fence: RadarGeofence, offsetMeters = 0) => {
    const latOffset = fence.latitude + (offsetMeters * 0.000009);
    setSimulatedLat(latOffset);
    setSimulatedLon(fence.longitude);
    setIsSimulating(true);
    if (offsetMeters === 0) {
      onTriggerToast?.(`Simulating: Placed pin inside ${fence.description}`, 'info');
    } else {
      onTriggerToast?.(`Simulating: Placed pin ${offsetMeters}m outside ${fence.description}`, 'info');
    }
  };

  const exportEventsToCSV = () => {
    if (radarEvents.length === 0) {
      onTriggerToast?.('No events available to export.', 'error');
      return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Timestamp,Event Type,Geofence ID,Description,Current Distance (m),Confidence\n';
    
    radarEvents.forEach(evt => {
      csvContent += `"${evt.timestamp}","${evt.type}","${evt.geofenceId}","${evt.geofenceDescription}",${Math.round(evt.distance)},"${evt.confidence}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `radar_geofencing_events_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onTriggerToast?.('Event logs exported successfully.', 'success');
  };

  return (
    <div className="space-y-4 font-sans animate-fade-in" id="radar-geofence-service-dashboard">
      
      {/* Dynamic Key configuration info banner */}
      {!isRadarConfigured && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md text-white">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <span>RADAR.COM LOCATION SUITE</span>
                <span className="px-1.5 py-0.5 text-[8px] bg-indigo-500 text-white rounded font-bold uppercase tracking-widest ml-1">Sandbox Simulator</span>
              </h4>
              <p className="text-xs leading-normal text-slate-400 max-w-2xl">
                Operating in simulation sandbox mode. To connect to your live Radar.io dashboard and fire real-time webhooks, simply add your <code>VITE_RADAR_PUBLISHABLE_KEY</code> in your project secrets.
              </p>
            </div>
          </div>
          <a
            href="https://radar.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl border border-indigo-500 transition text-center shrink-0 cursor-pointer"
          >
            Get Free Key
          </a>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Hand: Controller Panel */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Radar User Session Info / Controller */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md text-white space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <h3 className="text-xs font-black tracking-wider font-mono uppercase text-indigo-400 flex items-center gap-1.5">
                <Radio size={14} className="text-amber-400" />
                <span>Radar Device Session</span>
              </h3>
              <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold ${isContinuousTracking ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                {isContinuousTracking ? 'LIVE TRACKING' : 'IDLE'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Device ID / User Identifier</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={radarUserId}
                    onChange={(e) => setRadarUserId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="Enter Device/User Tag..."
                  />
                  <button
                    onClick={() => triggerRadarTrackAPI()}
                    className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer"
                    title="Track Once"
                  >
                    Track Once
                  </button>
                </div>
              </div>

              {/* Toggle Tracking continuous */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-300 block">Continuous Tracking (5s)</span>
                  <p className="text-[9px] text-slate-500">Drift & update position dynamically</p>
                </div>
                <button
                  onClick={() => setIsContinuousTracking(!isContinuousTracking)}
                  className={`p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isContinuousTracking 
                      ? 'bg-rose-600/30 text-rose-300 border-rose-500/40 hover:bg-rose-600/50' 
                      : 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/50'
                  }`}
                >
                  {isContinuousTracking ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isContinuousTracking ? 'Stop' : 'Start'}</span>
                </button>
              </div>

              {/* Selector Mode details */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/50 text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider font-mono">Position Mode</span>
                <div className="flex gap-1.5 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => {
                      setIsSimulating(true);
                      onTriggerToast?.('Switched to Map Simulation mode.', 'info');
                    }}
                    className={`px-2 py-1 rounded font-bold transition ${isSimulating ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    Simulator
                  </button>
                  <button
                    onClick={() => {
                      setIsSimulating(false);
                      if (navigator.geolocation) {
                        onTriggerToast?.('Enabling actual device GPS telemetry...', 'info');
                      } else {
                        onTriggerToast?.('Browser GPS is not supported.', 'error');
                        setIsSimulating(true);
                      }
                    }}
                    className={`px-2 py-1 rounded font-bold transition ${!isSimulating ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    Device GPS
                  </button>
                </div>
              </div>

              {isSimulating ? (
                <div className="space-y-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[9px] font-bold font-mono text-slate-500 tracking-wider block uppercase">Simulation Quick Teleports</span>
                  <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {geofences.map(f => {
                      const isInside = !!insideStatus[f.id];
                      return (
                        <div key={f.id} className="flex items-center justify-between text-[11px] bg-slate-950/80 p-1.5 rounded-lg border border-slate-800/50">
                          <span className="font-extrabold truncate max-w-[120px]">{f.description}</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => teleportToFence(f, 0)}
                              className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-bold transition cursor-pointer"
                            >
                              In
                            </button>
                            <button
                              onClick={() => teleportToFence(f, f.radius + 35)}
                              className="px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded font-bold transition cursor-pointer"
                            >
                              Out
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                realLat && (
                  <div className="text-center py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <span className="text-[9px] font-bold font-mono text-emerald-400 tracking-widest block uppercase">Real GPS coordinates</span>
                    <span className="text-xs font-mono font-extrabold text-emerald-300">
                      {realLat.toFixed(6)}, {realLon?.toFixed(6)}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Add Virtual Radar Geofence form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
              <Plus size={14} className="text-indigo-600" />
              <span>Register Radar Geofence</span>
            </h3>

            <form onSubmit={handleAddCustomGeofence} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Geofence Description / Label</label>
                <input
                  type="text"
                  value={newFenceDescription}
                  onChange={(e) => setNewFenceDescription(e.target.value)}
                  placeholder="e.g. Hyderabad Depot, Client Store"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Fence Radius</label>
                  <span className="text-xs font-extrabold text-indigo-600 font-mono">{newFenceRadius}m</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="1000"
                  step="10"
                  value={newFenceRadius}
                  onChange={(e) => setNewFenceRadius(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 h-1 rounded-lg bg-slate-100 cursor-pointer"
                />
              </div>

              {/* Point coordinate helper indicator */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 text-center text-[10px] text-slate-600">
                {selectedMapPoint ? (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold font-mono text-indigo-600 block">Custom Map Point Selected:</span>
                    <span className="font-mono font-bold">{selectedMapPoint[0].toFixed(5)}, {selectedMapPoint[1].toFixed(5)}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMapPoint(null)}
                      className="text-rose-500 hover:underline block mx-auto mt-0.5 cursor-pointer font-bold"
                    >
                      Use Simulator Position Instead
                    </button>
                  </div>
                ) : (
                  <div className="leading-relaxed">
                    Will use <strong>Simulator position</strong> as geofence coordinates. Or, click anywhere on the map to choose coordinates!
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Plus size={14} />
                <span>Register Geofence</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Hand: Visual Map Canvas & Radar APIs Stream */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Leaflet Map Interactive Area */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <div className="space-y-0.5">
                <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                  <LeafletMapIcon size={18} />
                  <span>Radar Geofencing Map Canvas</span>
                </h2>
                <p className="text-[10px] text-indigo-100 font-medium opacity-90">
                  Interactive visualization of custom and customer geofence perimeters
                </p>
              </div>

              {isSimulating && (
                <span className="bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[10px] font-bold px-2 py-1 rounded-lg animate-pulse font-mono">
                  💡 Drag / Click Map to Teleport simulator
                </span>
              )}
            </div>

            {/* Interactive Leaflet stage */}
            <div className="relative h-[480px] w-full bg-slate-50 border-b border-slate-100 z-10" style={{ height: '480px' }}>
              <MapContainer
                center={defaultCenter}
                zoom={14}
                zoomControl={true}
                scrollWheelZoom={true}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler />

                {/* Render Radar registered geofences (Circles) */}
                {geofences.map(fence => {
                  const isInside = !!insideStatus[fence.id];
                  return (
                    <React.Fragment key={fence.id}>
                      {fence.isEnabled && (
                        <Circle
                          center={[fence.latitude, fence.longitude]}
                          radius={fence.radius}
                          pathOptions={{
                            fillColor: isInside ? '#10b981' : '#6366f1',
                            fillOpacity: 0.16,
                            color: isInside ? '#059669' : '#4f46e5',
                            weight: 1.5,
                            dashArray: isInside ? undefined : '4, 4'
                          }}
                        />
                      )}

                      <Marker
                        position={[fence.latitude, fence.longitude]}
                        icon={fence.tag === 'custom_virtual' ? customFenceIcon : siteIcon}
                      >
                        <Popup>
                          <div className="text-xs font-sans p-1 space-y-1 max-w-[200px]">
                            <h4 className="font-extrabold text-slate-900">{fence.description}</h4>
                            <p className="text-[10px] text-slate-500 font-mono">ID: {fence.id}</p>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                              <span className="text-[10px] text-slate-600 font-bold">Tag:</span>
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1 rounded font-mono uppercase">{fence.tag}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-600 font-bold">Radius:</span>
                              <span className="text-[10px] text-indigo-600 font-black">{fence.radius} meters</span>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}

                {/* User simulated or real GPS Marker */}
                {currentLat !== null && currentLon !== null && (
                  <Marker position={[currentLat, currentLon]} icon={userIcon}>
                    <Popup>
                      <div className="text-xs font-sans text-center">
                        <span className="font-black text-rose-600 block">CURRENT DEVICE LOCATION</span>
                        <span className="text-[10px] text-slate-500 font-mono">{currentLat.toFixed(5)}, {currentLon.toFixed(5)}</span>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>

              {/* Map UI Accents */}
              <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-2.5 z-20 text-[10px] shadow-sm max-w-[200px] pointer-events-none space-y-1 font-mono">
                <span className="font-black uppercase text-slate-400 block tracking-wider text-[8px]">Radar Elements</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium font-sans">Indigo Circle: Geofence Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium font-sans">Green Circle: User Inside</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium font-sans">Red Pin: Live GPS/Sim Pin</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium font-sans">Orange Pin: Custom Geofence</span>
                </div>
              </div>
            </div>

            {/* Render List of registered fences */}
            <div className="p-4 border-t border-slate-100 space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Active Registered Geofences ({geofences.length})</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {geofences.map(f => {
                  const isInside = !!insideStatus[f.id];
                  return (
                    <div key={f.id} className="bg-slate-50 border border-slate-200/70 p-2.5 rounded-xl flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-800 truncate">{f.description}</span>
                          <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${f.tag === 'custom_virtual' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'}`}>
                            {f.tag === 'custom_virtual' ? 'VIRTUAL' : 'SITE'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                          <span className="font-mono">Radius: {f.radius}m</span>
                          <span className={`font-bold ${isInside ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}>
                            {isInside ? '● INSIDE' : '○ OUTSIDE'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleGeofence(f.id)}
                          className={`p-1 rounded border text-xs font-bold transition cursor-pointer ${f.isEnabled ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                          title={f.isEnabled ? 'Disable Geofence' : 'Enable Geofence'}
                        >
                          <Bell size={11} className={f.isEnabled ? 'animate-pulse' : ''} />
                        </button>
                        <button
                          onClick={() => handleRemoveGeofence(f.id)}
                          className="p-1 rounded bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          title="Unregister Geofence"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Radar Telemetry APIs & Webhooks Stream */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Live Webhook / Event Stream */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest font-mono flex items-center gap-1.5">
                    <Activity size={14} className="text-indigo-600" />
                    <span>Radar Event Streams</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Webhook events emitted to your endpoints</p>
                </div>

                {radarEvents.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={exportEventsToCSV}
                      className="p-1 px-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded text-[9px] font-bold transition flex items-center gap-1 cursor-pointer hover:bg-slate-100"
                    >
                      <Download size={10} />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={handleClearEvents}
                      className="p-1 px-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[9px] font-bold transition flex items-center gap-1 cursor-pointer hover:bg-rose-100"
                    >
                      <Trash2 size={10} />
                      <span>Clear</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[160px]">
                {radarEvents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-1 bg-slate-50/50 rounded-xl border border-dashed border-slate-200/80">
                    <Info size={16} className="opacity-40" />
                    <p className="text-[10px] leading-normal max-w-[200px]">
                      No events registered yet. Simulate an entry or exit by teleporting inside/outside geofences.
                    </p>
                  </div>
                ) : (
                  radarEvents.map(evt => {
                    const isEnter = evt.type === 'user.entered_geofence';
                    return (
                      <div key={evt.id} className={`p-2 rounded-xl border text-[11px] flex items-start justify-between gap-3 ${isEnter ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900' : 'bg-rose-50/40 border-rose-100 text-rose-900'}`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono text-white ${isEnter ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                              {isEnter ? 'Entered' : 'Exited'}
                            </span>
                            <span className="font-extrabold">{evt.geofenceDescription}</span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {isEnter 
                              ? `Entered zone radius. Current distance: ${Math.round(evt.distance)}m`
                              : `Exited geofence. Distance cleared.`
                            }
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">{evt.timestamp}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Radar SDK Network payload console */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md text-white space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black tracking-wider font-mono uppercase text-indigo-400 flex items-center gap-1.5">
                    <Code size={14} />
                    <span>Radar API Sandbox Shell</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">Live JSON payload telemetry logs</p>
                </div>
                {telemetryLogs.length > 0 && (
                  <button
                    onClick={handleClearTelemetry}
                    className="p-1 px-1.5 bg-slate-950 text-slate-400 border border-slate-850 rounded text-[9px] font-bold transition cursor-pointer hover:bg-slate-900"
                  >
                    Clear Logs
                  </button>
                )}
              </div>

              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[160px] font-mono text-[10px]">
                {telemetryLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    Waiting for SDK events stream...
                  </div>
                ) : (
                  telemetryLogs.map(log => (
                    <div key={log.id} className="bg-slate-950 rounded-xl p-2.5 border border-slate-850 space-y-2">
                      <div className="flex items-center justify-between text-[9px] border-b border-slate-900 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-indigo-400 font-extrabold font-mono">{log.method}</span>
                          <span className="text-slate-400 font-mono font-bold">{log.endpoint}</span>
                        </div>
                        <span className="text-emerald-400 font-bold">{log.status}</span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="space-y-0.5">
                          <span className="text-slate-500 font-extrabold text-[8px] uppercase">Request:</span>
                          <pre className="p-1 bg-slate-900/60 rounded text-slate-300 font-mono text-[9px] overflow-x-auto">
                            {JSON.stringify(log.requestPayload, null, 2)}
                          </pre>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-500 font-extrabold text-[8px] uppercase">Response body:</span>
                          <pre className="p-1 bg-slate-900/60 rounded text-amber-300 font-mono text-[9px] overflow-x-auto">
                            {JSON.stringify(log.responsePayload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
