import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Users,
  Phone, 
  MapPin, 
  Camera, 
  Calendar, 
  Building2, 
  Flame, 
  Snowflake, 
  Wrench, 
  Paintbrush,
  X, 
  Loader2, 
  CheckCircle,
  HelpCircle,
  Navigation,
  RefreshCw,
  CameraOff
} from 'lucide-react';
import { SiteVisit, BuildingStatusOption } from '../types';
import { compressImage } from '../utils/imageCompressor';

interface VisitFormProps {
  onSave: (visit: Omit<SiteVisit, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => void;
  onCancel: () => void;
  initialData?: SiteVisit | null;
  visits?: SiteVisit[];
}

const BUILDING_STATUSES: BuildingStatusOption[] = [
  'Excavation & Footing',
  'Brickwork & Masonry',
  'Plastering & Wiring',
  'Flooring & Tiling',
  'Woodwork & Carpentry',
  'Interior Designing',
  'Finished & Handover'
];

export default function VisitForm({ onSave, onCancel, initialData, visits = [] }: VisitFormProps) {
  // Form States
  const [clientName, setClientName] = useState(() => {
    if (initialData?.clientName) {
      if (initialData.clientName.startsWith('Site Partner: ')) return '';
      if (initialData.clientName.startsWith('Design Partner: ')) return '';
      return initialData.clientName;
    }
    return '';
  });
  const [clientMobile, setClientMobile] = useState(() => {
    if (initialData?.clientMobile === '0000000000') return '';
    return initialData?.clientMobile || '';
  });
  const [address, setAddress] = useState(initialData?.address || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [pincode, setPincode] = useState(initialData?.pincode || '');
  const [latitude, setLatitude] = useState<number | null>(initialData?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialData?.longitude ?? null);
  const [photo, setPhoto] = useState<string | null>(initialData?.photo || null);
  
  // Hardcoded to none since we are only collecting Customer / Client Site visits now
  const [contractorType] = useState<'carpenter' | 'interior' | 'architect' | 'none'>('none');

  // Initialize carpenter states (from new fields, or legacy editing)
  const [carpenterName, setCarpenterName] = useState(() => {
    if (initialData?.carpenterName) return initialData.carpenterName;
    if (initialData?.contractorType === 'carpenter') return initialData.contractorName || '';
    return '';
  });
  const [carpenterMobile, setCarpenterMobile] = useState(() => {
    if (initialData?.carpenterMobile) return initialData.carpenterMobile;
    if (initialData?.contractorType === 'carpenter') return initialData.contractorMobile || '';
    return '';
  });
  const [carpenterPlace, setCarpenterPlace] = useState(() => {
    if (initialData?.carpenterPlace) return initialData.carpenterPlace;
    if (initialData?.contractorType === 'carpenter') return initialData.contractorAddress || '';
    return '';
  });

  // Initialize interior states (from new fields, or legacy editing)
  const [interiorName, setInteriorName] = useState(() => {
    if (initialData?.interiorName) return initialData.interiorName;
    if (initialData?.contractorType === 'interior') return initialData.contractorName || '';
    return '';
  });
  const [interiorMobile, setInteriorMobile] = useState(() => {
    if (initialData?.interiorMobile) return initialData.interiorMobile;
    if (initialData?.contractorType === 'interior') return initialData.contractorMobile || '';
    return '';
  });
  const [interiorPlace, setInteriorPlace] = useState(() => {
    if (initialData?.interiorPlace) return initialData.interiorPlace;
    if (initialData?.contractorType === 'interior') return initialData.contractorAddress || '';
    return '';
  });

  // Initialize architect states
  const [architectName, setArchitectName] = useState(() => {
    if (initialData?.architectName) return initialData.architectName;
    if (initialData?.contractorType === 'architect') return initialData.contractorName || '';
    return '';
  });
  const [architectMobile, setArchitectMobile] = useState(() => {
    if (initialData?.architectMobile) return initialData.architectMobile;
    if (initialData?.contractorType === 'architect') return initialData.contractorMobile || '';
    return '';
  });
  const [architectPlace, setArchitectPlace] = useState(() => {
    if (initialData?.architectPlace) return initialData.architectPlace;
    if (initialData?.contractorType === 'architect') return initialData.contractorAddress || '';
    return '';
  });

  // Initialize builder states
  const [builderName, setBuilderName] = useState(() => {
    if (initialData?.builderName) return initialData.builderName;
    if (initialData?.contractorType === 'builder') return initialData.contractorName || '';
    return '';
  });
  const [builderMobile, setBuilderMobile] = useState(() => {
    if (initialData?.builderMobile) return initialData.builderMobile;
    if (initialData?.contractorType === 'builder') return initialData.contractorMobile || '';
    return '';
  });
  const [builderPlace, setBuilderPlace] = useState(() => {
    if (initialData?.builderPlace) return initialData.builderPlace;
    if (initialData?.contractorType === 'builder') return initialData.contractorAddress || '';
    return '';
  });

  const [visitingDate, setVisitingDate] = useState(() => {
    if (initialData?.visitingDate) {
      return initialData.visitingDate;
    }
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>(() => {
    return initialData?.nextFollowUpDate || '';
  });
  const [buildingStatus, setBuildingStatus] = useState<BuildingStatusOption>(initialData?.buildingStatus || 'Excavation & Footing');
  const [buildingType, setBuildingType] = useState<string>(initialData?.buildingType || 'Home');
  const [leadStatus, setLeadStatus] = useState<'hot' | 'cold'>(initialData?.leadStatus || 'cold');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [customerNotAvailable, setCustomerNotAvailable] = useState<boolean>(initialData?.customerNotAvailable || false);
  const [nearestLandmark, setNearestLandmark] = useState<string>(initialData?.nearestLandmark || '');

  // Partner selection form visibility states (User-select-wise)
  const [showInteriorForm, setShowInteriorForm] = useState(() => {
    return !!(initialData?.interiorName || (initialData?.contractorType === 'interior' && initialData.contractorName));
  });
  const [showCarpenterForm, setShowCarpenterForm] = useState(() => {
    return !!(initialData?.carpenterName || (initialData?.contractorType === 'carpenter' && initialData.contractorName));
  });
  const [showArchitectForm, setShowArchitectForm] = useState(() => {
    return !!(initialData?.architectName || (initialData?.contractorType === 'architect' && initialData.contractorName));
  });
  const [showBuilderForm, setShowBuilderForm] = useState(() => {
    return !!(initialData?.builderName || (initialData?.contractorType === 'builder' && initialData.contractorName));
  });

  const handlePartnerTypeChange = (type: string) => {
    setShowInteriorForm(type === 'Interior Designer');
    setShowCarpenterForm(type === 'Carpenter Partner');
    setShowArchitectForm(type === 'Architect Specialist');
    setShowBuilderForm(type === 'Builder Partner');
  };

  const getActivePartnerType = () => {
    if (showInteriorForm) return 'Interior Designer';
    if (showCarpenterForm) return 'Carpenter Partner';
    if (showArchitectForm) return 'Architect Specialist';
    if (showBuilderForm) return 'Builder Partner';
    return 'None';
  };

  // Dynamic previous client lookup and autocomplete purely via mobile number matching
  React.useEffect(() => {
    const cleanNum = clientMobile.trim().replace(/\D/g, '');
    if (cleanNum.length === 10) {
      const match = [...visits]
        .reverse()
        .find(v => v.clientMobile?.replace(/\D/g, '') === cleanNum && v.clientName && v.clientName !== 'Client (Absent Visit)');
      
      if (match) {
        if (!clientName) setClientName(match.clientName);
        if (!address) setAddress(match.address);
        if (!location && match.location) setLocation(match.location);
        if (!nearestLandmark && match.nearestLandmark) setNearestLandmark(match.nearestLandmark);
        if (latitude === null && match.latitude !== undefined) setLatitude(match.latitude);
        if (longitude === null && match.longitude !== undefined) setLongitude(match.longitude);
      }
    }
  }, [clientMobile, visits]);

  // Find matching previous entries dynamically to prevent duplicate logging
  const matchingPreviousEntries = React.useMemo(() => {
    if (!visits) return [];
    
    const results: Array<{ visit: SiteVisit; reasons: string[] }> = [];
    const cleanMobile = clientMobile?.trim().replace(/\D/g, '') || '';

    visits.forEach(v => {
      // Don't compare with the current visit being edited
      if (initialData && v.id === initialData.id) return;

      const reasons: string[] = [];

      // 1. Mobile exact match
      if (cleanMobile.length >= 5) {
        const vMobile = v.clientMobile?.trim().replace(/\D/g, '') || '';
        if (vMobile && (vMobile === cleanMobile || (cleanMobile.length >= 10 && vMobile.endsWith(cleanMobile)) || (vMobile.length >= 10 && cleanMobile.endsWith(vMobile)))) {
          reasons.push('Mobile Matches');
        }
      }

      if (reasons.length > 0) {
        results.push({ visit: v, reasons });
      }
    });

    return results;
  }, [visits, clientMobile, initialData]);

  // Extract existing carpenters from historical visits for search suggestions
  const existingCarpenters = React.useMemo(() => {
    const map = new Map<string, { name: string; mobile: string; place: string }>();
    visits.forEach(v => {
      if (v.contractorType === 'carpenter' && v.contractorName && v.contractorMobile) {
        map.set(v.contractorMobile, { 
          name: v.contractorName, 
          mobile: v.contractorMobile,
          place: v.contractorAddress || v.address || ''
        });
      }
      if (v.carpenterName && v.carpenterMobile) {
        map.set(v.carpenterMobile, {
          name: v.carpenterName,
          mobile: v.carpenterMobile,
          place: v.carpenterPlace || v.address || ''
        });
      }
    });
    return Array.from(map.values());
  }, [visits]);

  // Extract existing interior designers from historical visits for search suggestions
  const existingInteriors = React.useMemo(() => {
    const map = new Map<string, { name: string; mobile: string; place: string }>();
    visits.forEach(v => {
      if (v.contractorType === 'interior' && v.contractorName && v.contractorMobile) {
        map.set(v.contractorMobile, { 
          name: v.contractorName, 
          mobile: v.contractorMobile,
          place: v.contractorAddress || v.address || ''
        });
      }
      if (v.interiorName && v.interiorMobile) {
        map.set(v.interiorMobile, {
          name: v.interiorName,
          mobile: v.interiorMobile,
          place: v.interiorPlace || v.address || ''
        });
      }
    });
    return Array.from(map.values());
  }, [visits]);

  // Extract existing architects from historical visits for search suggestions
  const existingArchitects = React.useMemo(() => {
    const map = new Map<string, { name: string; mobile: string; place: string }>();
    visits.forEach(v => {
      if (v.contractorType === 'architect' && v.contractorName && v.contractorMobile) {
        map.set(v.contractorMobile, { 
          name: v.contractorName, 
          mobile: v.contractorMobile,
          place: v.contractorAddress || v.address || ''
        });
      }
      if (v.architectName && v.architectMobile) {
        map.set(v.architectMobile, {
          name: v.architectName,
          mobile: v.architectMobile,
          place: v.architectPlace || v.address || ''
        });
      }
    });
    return Array.from(map.values());
  }, [visits]);

  // Extract existing builders from historical visits for search suggestions
  const existingBuilders = React.useMemo(() => {
    const map = new Map<string, { name: string; mobile: string; place: string }>();
    visits.forEach(v => {
      if (v.contractorType === 'builder' && v.contractorName && v.contractorMobile) {
        map.set(v.contractorMobile, { 
          name: v.contractorName, 
          mobile: v.contractorMobile,
          place: v.contractorAddress || v.address || ''
        });
      }
      if (v.builderName && v.builderMobile) {
        map.set(v.builderMobile, {
          name: v.builderName,
          mobile: v.builderMobile,
          place: v.builderPlace || v.address || ''
        });
      }
    });
    return Array.from(map.values());
  }, [visits]);

  const carpenterSuggestions = React.useMemo(() => {
    const cleanName = carpenterName.trim().toLowerCase();
    const cleanMobile = carpenterMobile.trim().replace(/\D/g, '');
    if (cleanName.length < 2 && cleanMobile.length < 3) return [];

    return existingCarpenters.filter(item => {
      const mName = cleanName ? item.name.toLowerCase().includes(cleanName) : false;
      const mMobile = cleanMobile ? item.mobile.replace(/\D/g, '').includes(cleanMobile) : false;
      return mName || mMobile;
    });
  }, [existingCarpenters, carpenterName, carpenterMobile]);

  const interiorSuggestions = React.useMemo(() => {
    const cleanName = interiorName.trim().toLowerCase();
    const cleanMobile = interiorMobile.trim().replace(/\D/g, '');
    if (cleanName.length < 2 && cleanMobile.length < 3) return [];

    return existingInteriors.filter(item => {
      const mName = cleanName ? item.name.toLowerCase().includes(cleanName) : false;
      const mMobile = cleanMobile ? item.mobile.replace(/\D/g, '').includes(cleanMobile) : false;
      return mName || mMobile;
    });
  }, [existingInteriors, interiorName, interiorMobile]);

  const architectSuggestions = React.useMemo(() => {
    const cleanName = architectName.trim().toLowerCase();
    const cleanMobile = architectMobile.trim().replace(/\D/g, '');
    if (cleanName.length < 2 && cleanMobile.length < 3) return [];

    return existingArchitects.filter(item => {
      const mName = cleanName ? item.name.toLowerCase().includes(cleanName) : false;
      const mMobile = cleanMobile ? item.mobile.replace(/\D/g, '').includes(cleanMobile) : false;
      return mName || mMobile;
    });
  }, [existingArchitects, architectName, architectMobile]);

  const builderSuggestions = React.useMemo(() => {
    const cleanName = builderName.trim().toLowerCase();
    const cleanMobile = builderMobile.trim().replace(/\D/g, '');
    if (cleanName.length < 2 && cleanMobile.length < 3) return [];

    return existingBuilders.filter(item => {
      const mName = cleanName ? item.name.toLowerCase().includes(cleanName) : false;
      const mMobile = cleanMobile ? item.mobile.replace(/\D/g, '').includes(cleanMobile) : false;
      return mName || mMobile;
    });
  }, [existingBuilders, builderName, builderMobile]);

  // Utility States
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = useState('');
  const [gpsCountdown, setGpsCountdown] = useState(60);
  const gpsIntervalRef = useRef<any>(null);
  const isGpsCancelledRef = useRef<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Camera Preview States and Refs
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraInitializing, setCameraInitializing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop camera when component unmounts
  React.useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setCameraInitializing(false);
    setCameraError(null);
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    setCameraInitializing(true);
    setIsCameraActive(true);
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(mediaStream);
      setCameraInitializing(false);
      
      // Delay slightly to ensure video element is mounted and ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraInitializing(false);
      setCameraError('Could not access camera. Please allow camera permissions or try uploading a file instead.');
    }
  };

  const handleCapture = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        
        try {
          const compressed = await compressImage(dataUrl);
          setPhoto(compressed);
          stopCamera();
        } catch (error) {
          console.error('Compression error:', error);
          setPhoto(dataUrl);
          stopCamera();
        }
      }
    }
  };

  const toggleFacingMode = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    if (isCameraActive) {
      startCamera(newMode);
    }
  };

  // Address Geolocation handler
  const cancelGpsSearch = () => {
    isGpsCancelledRef.current = true;
    setIsLocating(false);
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
      }
    };
  }, []);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('idle');
    setGpsCountdown(60);
    isGpsCancelledRef.current = false;

    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
    }

    gpsIntervalRef.current = setInterval(() => {
      setGpsCountdown((prev) => {
        if (prev <= 1) {
          cancelGpsSearch();
          setLocationStatus('error');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (isGpsCancelledRef.current) return;

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        if (gpsIntervalRef.current) {
          clearInterval(gpsIntervalRef.current);
          gpsIntervalRef.current = null;
        }

        // Fetch physical human-friendly place name automatically from OpenStreetMap Nominatim reverse geocoder
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
          headers: {
            'Accept-Language': 'en'
          }
        })
          .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
          })
          .then(data => {
            if (isGpsCancelledRef.current) return;
            if (data && data.display_name) {
              const fullAddress = data.display_name;
              setAddress(fullAddress);

              // Find a good subset for short "Location / Area"
              const addressParts = data.address || {};
              const placeTown = addressParts.suburb || addressParts.neighbourhood || addressParts.city_district || addressParts.town || addressParts.village || addressParts.city || addressParts.county || '';
              if (placeTown) {
                setLocation(placeTown);
              } else {
                setLocation(`Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`);
              }
              
              if (addressParts.postcode) {
                setPincode(addressParts.postcode);
              }
            } else {
              setAddress(`GPS Ref: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
              setLocation(`Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`);
            }
          })
          .catch(error => {
            console.error('Reverse geocoding error:', error);
            if (isGpsCancelledRef.current) return;
            // Fallback gracefully
            setAddress(`GPS Ref: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            setLocation(`Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`);
          })
          .finally(() => {
            if (isGpsCancelledRef.current) return;
            setIsLocating(false);
            setLocationStatus('success');
          });
      },
      (error) => {
        console.error(error);
        if (isGpsCancelledRef.current) return;
        cancelGpsSearch();
        setLocationStatus('error');
      },
      { enableHighAccuracy: true, timeout: 60000 }
    );
  };

  // Automatically trigger location lookup on mount if this is a new visit without preset address
  React.useEffect(() => {
    if (!initialData && !address) {
      handleDetectLocation();
    }
  }, []);

  // Image Upload handler
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      const compressed = await compressImage(rawBase64);
      setPhoto(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        const compressed = await compressImage(rawBase64);
        setPhoto(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  // Pre-submit Validator
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerNotAvailable) {
      if (!clientName.trim()) {
        setValidationError('Client / Site Name is required');
        return;
      }
      if (clientMobile.trim() && !/^\+?[0-9\s-]{10,15}$/.test(clientMobile.trim().replace(/\s+/g, ''))) {
        setValidationError('Please enter a valid Client Mobile Number (at least 10 digits)');
        return;
      }
    }

    if (!address.trim()) {
      setValidationError('Place (City or Main Village Name only) is required');
      return;
    }

    // Customer Absent validations
    if (customerNotAvailable) {
      if (!photo) {
        setValidationError('📸 A snapped photo is required when the customer is not available, to aid revisiting.');
        return;
      }
    }

    // Carpentry mobile check if filled and shown
    if (showCarpenterForm && carpenterMobile.trim() && !/^\+?[0-9\s-]{10,15}$/.test(carpenterMobile.trim().replace(/\s+/g, ''))) {
      setValidationError('Please enter a valid Carpenter Mobile Number (at least 10 digits) or leave it blank');
      return;
    }

    // Interior mobile check if filled and shown
    if (showInteriorForm && interiorMobile.trim() && !/^\+?[0-9\s-]{10,15}$/.test(interiorMobile.trim().replace(/\s+/g, ''))) {
      setValidationError('Please enter a valid Interior Mobile Number (at least 10 digits) or leave it blank');
      return;
    }

    // Architect mobile check if filled and shown
    if (showArchitectForm && architectMobile.trim() && !/^\+?[0-9\s-]{10,15}$/.test(architectMobile.trim().replace(/\s+/g, ''))) {
      setValidationError('Please enter a valid Architect Mobile Number (at least 10 digits) or leave it blank');
      return;
    }

    // Builder mobile check if filled and shown
    if (showBuilderForm && builderMobile.trim() && !/^\+?[0-9\s-]{10,15}$/.test(builderMobile.trim().replace(/\s+/g, ''))) {
      setValidationError('Please enter a valid Builder Mobile Number (at least 10 digits) or leave it blank');
      return;
    }

    // Format final structure
    onSave({
      id: initialData?.id,
      createdAt: initialData?.createdAt,
      clientName: clientName.trim() || 'Client (Absent Visit)',
      clientMobile: clientMobile.trim() || '0000000000',
      address: address.trim(),
      location: location.trim(),
      pincode: pincode.trim(),
      latitude,
      longitude,
      photo,
      video: null,
      contractorType: 'none',
      contractorName: '',
      contractorMobile: '',
      contractorRemarks: '',
      contractorAddress: '',
      carpenterName: showCarpenterForm ? carpenterName.trim() : '',
      carpenterMobile: showCarpenterForm ? carpenterMobile.trim() : '',
      carpenterPlace: showCarpenterForm ? (carpenterPlace.trim() || address.trim()) : '',
      interiorName: showInteriorForm ? interiorName.trim() : '',
      interiorMobile: showInteriorForm ? interiorMobile.trim() : '',
      interiorPlace: showInteriorForm ? (interiorPlace.trim() || address.trim()) : '',
      architectName: showArchitectForm ? architectName.trim() : '',
      architectMobile: showArchitectForm ? architectMobile.trim() : '',
      architectPlace: showArchitectForm ? (architectPlace.trim() || address.trim()) : '',
      builderName: showBuilderForm ? builderName.trim() : '',
      builderMobile: showBuilderForm ? builderMobile.trim() : '',
      builderPlace: showBuilderForm ? (builderPlace.trim() || address.trim()) : '',
      visitingDate,
      nextFollowUpDate: nextFollowUpDate || undefined,
      buildingStatus,
      buildingType,
      leadStatus,
      customerNotAvailable,
      nearestLandmark: nearestLandmark.trim() || undefined,
      notes: notes.trim() || undefined
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden max-w-xl mx-auto"
      id="visit-form-container"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 px-4 py-3.5 text-white flex justify-between items-center border-b border-indigo-900">
        <div>
          <h2 className="text-base font-bold font-sans tracking-tight text-white leading-none font-display">
            {initialData ? 'Edit Site Visit Log' : 'Log New Site Visit'}
          </h2>
          <p className="text-[11px] text-indigo-200 mt-1 font-sans">
            {initialData ? 'Update client details, construction progress, and photo telemetry.' : 'Record precise client details, construction progress, and photo telemetry.'}
          </p>
        </div>
        <button 
          onClick={onCancel}
          className="p-1 px-2.5 bg-white/10 hover:bg-white/20 rounded transition duration-200 text-white text-xs font-semibold cursor-pointer border border-white/10"
          id="btn-cancel-top"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 md:p-5 space-y-4">
        
        {/* Error message card */}
        <AnimatePresence>
          {validationError && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 text-rose-700 text-sm flex items-center justify-between"
              id="error-banner"
            >
              <span>{validationError}</span>
              <button 
                type="button" 
                onClick={() => setValidationError('')}
                className="text-rose-500 hover:text-rose-700 font-bold"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECTION 1: Client & Site Details & Partner Identification */}
        <div className="space-y-4" id="section-client-site-details">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <div className="w-1.5 h-4 bg-indigo-650 rounded-full"></div>
            <h3 className="text-[11px] font-bold tracking-wider font-sans uppercase text-slate-500">
              1. Client & Site Details
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans">
                Client / Site Name {customerNotAvailable ? '(Optional - Client Absent)' : '*'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required={!customerNotAvailable}
                  placeholder={customerNotAvailable ? "Optional" : "e.g. Ramesh Kumar House"}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                  id="inp-client-name"
                />
              </div>

              {/* Building Type Select field */}
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans">
                  Building Type *
                </label>
                <div className="relative font-sans">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Building2 size={16} />
                  </span>
                  <select
                    id="inp-building-type"
                    value={buildingType}
                    onChange={(e) => setBuildingType(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition appearance-none cursor-pointer font-medium text-slate-800 interactive-highlight"
                    required
                  >
                    <option value="Home">🏠 Home</option>
                    <option value="Apartment">🏢 Apartment</option>
                    <option value="Villas">🏘️ Villa</option>
                    <option value="Duplex">🏡 Duplex</option>
                    <option value="Shop">🏬 Shop</option>
                  </select>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans">
                Client Mobile Number (Optional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Phone size={16} />
                </span>
                <input
                  type="text"
                  required={false}
                  placeholder="Optional (e.g. 9876543210)"
                  value={clientMobile}
                  onChange={(e) => setClientMobile(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                  id="inp-client-mobile"
                />
              </div>

              {/* Nearest Landmark Field */}
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans flex justify-between">
                  <span>Nearest Landmark <span className="text-slate-400 font-normal italic lowercase">(Optional)</span></span>
                </label>
                <div className="relative font-sans">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <MapPin size={16} className="text-indigo-600" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Opp Royal Club, near water tank"
                    value={nearestLandmark}
                    onChange={(e) => setNearestLandmark(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition font-sans font-medium"
                    id="inp-nearest-landmark"
                  />
                </div>
              </div>

              {/* Customer Not Available toggle */}
              <div className="mt-4 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between" id="container-customer-avail">
                <div className="pr-2">
                  <span className="block text-[11px] font-bold text-slate-800">👤 Customer Not Available</span>
                  <span className="block text-[9px] text-slate-500 font-sans leading-tight">Check this if the client is absent or unavailable at the site.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={customerNotAvailable} 
                    onChange={(e) => setCustomerNotAvailable(e.target.checked)}
                    className="sr-only peer"
                    id="inp-customer-not-available"
                  />
                  <div className="w-8 h-4.5 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              <AnimatePresence>
                {customerNotAvailable && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 bg-orange-50/60 border border-orange-200/70 p-3 rounded-xl space-y-3 overflow-hidden"
                    id="revisit-landmark-container"
                  >
                    <div className="flex gap-2 items-start text-[11px] text-orange-900 font-medium">
                      <span className="text-sm select-none">🧭</span>
                      <div>
                        <span className="font-bold block text-xs">Revisit Info Required</span>
                        <span className="text-[10px] text-orange-855 block leading-normal mt-0.5">
                          Because the customer is unavailable, you must supply a <strong>Site Photo</strong> below to guide future teams.
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="md:col-span-2 space-y-4">
              {/* Dynamic GPS status alerts and helper cards */}
              <AnimatePresence>
                {isLocating && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse"
                    id="gps-locating-banner"
                  >
                    <div className="flex gap-2.5 items-start">
                      <span className="text-sm select-none">📡</span>
                      <div>
                        <span className="block text-xs font-bold text-indigo-900">Locking Highly Accurate GPS... ({gpsCountdown}s remaining)</span>
                        <span className="block text-[10px] text-indigo-700 leading-normal font-sans">
                          Waiting up to 1 minute to lock satellite telemetry and reverse-lookup the physical village/city name.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={cancelGpsSearch}
                      className="py-1.5 px-3 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold rounded-lg cursor-pointer shadow-xs transition shrink-0 text-center font-sans"
                    >
                      Skip & Enter Manually
                    </button>
                  </motion.div>
                )}

                {locationStatus === 'error' && !isLocating && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-amber-50 border border-amber-150 rounded-xl flex items-start gap-2.5"
                    id="gps-error-banner"
                  >
                    <span className="text-sm select-none">⚠️</span>
                    <div className="space-y-0.5">
                      <span className="block text-xs font-bold text-amber-900 font-sans">GPS Lock Timeout or Denied</span>
                      <span className="block text-[10px] text-amber-700 leading-normal font-sans">
                        Could not lock satellite coordinates within the limit. Don't worry! Please enter the address/landmark manually below.
                      </span>
                    </div>
                  </motion.div>
                )}

                {locationStatus === 'success' && !isLocating && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-teal-50 border border-teal-150 rounded-xl flex items-start gap-2.5"
                    id="gps-success-banner"
                  >
                    <span className="text-sm select-none">🎯</span>
                    <div className="space-y-0.5">
                      <span className="block text-xs font-bold text-teal-900 font-sans">GPS Coordinates Locked Successfully!</span>
                      <span className="block text-[10px] text-teal-700 leading-normal font-sans">
                        Matched location against physical map coordinates. Review/tweak the auto-filled address details below if needed.
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {!isLocating && locationStatus !== 'success' && !address && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mb-4"
                  >
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1 group cursor-pointer"
                      id="btn-main-gps-detect"
                    >
                      <div className="flex items-center gap-2">
                        <Navigation size={18} className="group-hover:animate-bounce" />
                        <span className="text-sm font-bold font-sans">Auto-Detect My Location (GPS)</span>
                      </div>
                      <span className="text-[10px] text-indigo-100 opacity-90 font-medium font-sans">Click to automatically fill City, Area, and Pincode</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pincode Field & Autocomplete */}
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans">
                    Pincode
                  </label>
                  <div className="relative font-sans">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <MapPin size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter 6-digit Pincode"
                      value={pincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPincode(val);
                        if (val.length === 6) {
                          fetch(`https://api.postalpincode.in/pincode/${val}`)
                            .then(res => res.json())
                            .then(data => {
                              if (data && data[0].Status === 'Success') {
                                const po = data[0].PostOffice[0];
                                setAddress(prev => prev ? `${prev}, ${po.Name}, ${po.District}` : `${po.Name}, ${po.District}`);
                                setLocation(po.Taluk);
                              }
                            })
                            .catch(console.error);
                        }
                      }}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition font-sans font-medium"
                    />
                  </div>
                </div>

                {/* Site Address field */}
                <div className="space-y-1.5 mt-3" id="container-site-address">
                  <div className="flex justify-between items-center h-5">
                    <p className="block text-xs font-semibold text-slate-650 font-sans">
                      City / Village (Place) *
                    </p>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={isLocating}
                      className={`text-[10px] flex items-center gap-1 font-semibold transition px-2 py-0.5 rounded cursor-pointer ${
                        locationStatus === 'success' 
                        ? 'text-teal-600 bg-teal-50 border border-teal-150 focus:outline-none focus:ring-1 focus:ring-teal-500' 
                        : locationStatus === 'error'
                        ? 'text-amber-600 bg-amber-50 border border-amber-150 focus:outline-none focus:ring-1 focus:ring-amber-500'
                        : isLocating
                        ? 'text-indigo-600 bg-indigo-50 border border-indigo-150 animate-pulse'
                        : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 focus:outline-none focus:ring-1 focus:ring-indigo-500'
                      }`}
                      id="btn-get-current-address"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          Locating ({gpsCountdown}s)...
                        </>
                      ) : locationStatus === 'success' ? (
                        <>
                          <CheckCircle size={10} />
                          Address Filled
                        </>
                      ) : (
                        <>
                          <Navigation size={10} />
                          Get Current Address
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute top-3.5 left-0 flex items-start pl-3 text-slate-400">
                      <MapPin size={16} />
                    </span>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Tadepalligudem, Gollapudi (City or Village Name only)"
                      value={address}
                      onChange={(e) => {
                        cancelGpsSearch();
                        setAddress(e.target.value);
                      }}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                      id="inp-address"
                    />
                  </div>
                </div>

                {/* Location / Area field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center h-5">
                    <p className="block text-xs font-semibold text-slate-650 font-sans">
                      Location / Area (Town / Ward) <span className="text-slate-400 font-normal italic lowercase">(Optional)</span>
                    </p>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={isLocating}
                      className={`text-[10px] flex items-center gap-1 font-semibold transition px-2 py-0.5 rounded cursor-pointer ${
                        locationStatus === 'success' 
                        ? 'text-teal-600 bg-teal-50 border border-teal-150' 
                        : locationStatus === 'error'
                        ? 'text-amber-655 bg-amber-50 border border-amber-150'
                        : isLocating
                        ? 'text-indigo-600 bg-indigo-50 border border-indigo-150 animate-pulse'
                        : 'text-indigo-610 bg-indigo-55 hover:bg-indigo-100 border border-indigo-150'
                      }`}
                      id="btn-detect-location"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          Locating ({gpsCountdown}s)...
                        </>
                      ) : locationStatus === 'success' ? (
                        <>
                          <CheckCircle size={10} />
                          GPS Locked
                        </>
                      ) : (
                        <>
                          <Navigation size={10} />
                          Lock GPS
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute top-3.5 left-0 flex items-start pl-3 text-slate-400">
                      <Navigation size={16} className="rotate-45" />
                    </span>
                    <textarea
                      rows={2}
                      placeholder="e.g. Gachibowli, Madhapur"
                      value={location}
                      onChange={(e) => {
                        cancelGpsSearch();
                        setLocation(e.target.value);
                      }}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                      id="inp-location"
                    />
                  </div>
                </div>
              {latitude && longitude && (
                <div className="mt-1 text-[11px] font-mono text-indigo-600 flex items-center gap-1.5 bg-indigo-50/50 p-1.5 rounded-md border border-indigo-100/60 font-medium">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  GPS Position Locked: Lat {latitude.toFixed(6)}, Long {longitude.toFixed(6)}
                </div>
              )}

              {/* SECTION: Choose Partners to Associate (dropdown) */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-3 col-span-1 md:col-span-2" id="partner-options-selector">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold tracking-wider font-sans uppercase text-slate-500 flex items-center gap-1.5">
                    <span>🤝</span>
                    <span>Associate Specialized Partner (Optional)</span>
                  </span>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    Select a partner category active at this site to log their contact details.
                  </p>
                </div>
                
                <div className="relative font-sans max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Users size={16} />
                  </span>
                  <select
                    id="inp-site-partner"
                    value={getActivePartnerType()}
                    onChange={(e) => handlePartnerTypeChange(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition appearance-none cursor-pointer font-medium text-slate-800 interactive-highlight"
                  >
                    <option value="None">None / No Partner</option>
                    <option value="Interior Designer">🎨 Interior Designer</option>
                    <option value="Carpenter Partner">🪚 Carpenter Partner</option>
                    <option value="Architect Specialist">🏢 Architect Specialist</option>
                    <option value="Builder Partner">👷 Builder Partner</option>
                  </select>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Integrated Interior Designer / Design Partner details (not shown separately, shown here in client point) */}
              {showInteriorForm && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 col-span-1 md:col-span-2" id="integrated-design-partner-fields">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">📐</span>
                    <span className="text-[11px] font-bold tracking-wider font-sans uppercase text-slate-500">
                      Interior Designer / Design Partner (Optional Profile)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-650 mb-1 font-sans">
                        Interior Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. David Design"
                        value={interiorName}
                        onChange={(e) => setInteriorName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-650 mb-1 font-sans">
                        Interior Mobile
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 7894561230"
                        value={interiorMobile}
                        onChange={(e) => setInteriorMobile(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-650 mb-1 font-sans">
                        Interior Place / Area
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Gachibowli"
                        value={interiorPlace}
                        onChange={(e) => setInteriorPlace(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                      />
                    </div>
                  </div>

                  {/* Autocomplete suggestions list for interior */}
                  {interiorSuggestions.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-24 overflow-y-auto space-y-1">
                      <span className="text-[9px] font-extrabold uppercase text-slate-550 block">Autofill Match:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {interiorSuggestions.map((item) => (
                          <button
                            key={item.mobile}
                            type="button"
                            onClick={() => {
                              setInteriorName(item.name);
                              setInteriorMobile(item.mobile);
                              setInteriorPlace(item.place);
                            }}
                            className="bg-white hover:bg-sky-50 border border-slate-250 hover:border-sky-300 text-[10px] font-bold px-2 py-1 rounded text-slate-755 cursor-pointer"
                          >
                            {item.name} (📞 {item.mobile})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Subsection: Carpenter / Woodwork Partner details */}
          {showCarpenterForm && (
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100 bg-emerald-50/15 p-4 rounded-xl border border-emerald-100/40">
              <div className="flex items-center gap-1.5 pb-1">
                <span className="text-sm">🪚</span>
                <h4 className="text-[11px] font-bold tracking-wider font-sans uppercase text-emerald-800">
                  Carpenter / Woodwork Partner (Optional Profile)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 font-sans">
                    Carpenter Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh Kumar"
                    value={carpenterName}
                    onChange={(e) => setCarpenterName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 font-sans">
                    Carpenter Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9845123456"
                    value={carpenterMobile}
                    onChange={(e) => setCarpenterMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 font-sans">
                    Carpenter Place / Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Guntur"
                    value={carpenterPlace}
                    onChange={(e) => setCarpenterPlace(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>
              </div>

              {/* Autocomplete suggestions list for carpenter */}
              {carpenterSuggestions.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-24 overflow-y-auto space-y-1">
                  <span className="text-[9px] font-extrabold uppercase text-slate-505 block">Autofill Match:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {carpenterSuggestions.map((item) => (
                      <button
                        key={item.mobile}
                        type="button"
                        onClick={() => {
                          setCarpenterName(item.name);
                          setCarpenterMobile(item.mobile);
                          setCarpenterPlace(item.place);
                        }}
                        className="bg-white hover:bg-emerald-50 border border-slate-250 hover:border-emerald-300 text-[10px] font-bold px-2 py-1 rounded text-slate-755 cursor-pointer"
                      >
                        {item.name} (📞 {item.mobile})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subsection: Architect Partner details */}
          {showArchitectForm && (
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100 bg-blue-50/15 p-4 rounded-xl border border-blue-100/40">
              <div className="flex items-center gap-1.5 pb-1">
                <span className="text-sm">🏗️</span>
                <h4 className="text-[11px] font-bold tracking-wider font-sans uppercase text-blue-800">
                  Architect Partner (Optional Profile)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 font-sans">
                    Architect Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ratan Sen"
                    value={architectName}
                    onChange={(e) => setArchitectName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 font-sans">
                    Architect Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9177123456"
                    value={architectMobile}
                    onChange={(e) => setArchitectMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 font-sans">
                    Architect Place / Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vijayawada"
                    value={architectPlace}
                    onChange={(e) => setArchitectPlace(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>
              </div>

              {/* Autocomplete suggestions list for architect */}
              {architectSuggestions.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-24 overflow-y-auto space-y-1">
                  <span className="text-[9px] font-extrabold uppercase text-slate-550 block">Autofill Match:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {architectSuggestions.map((item) => (
                      <button
                        key={item.mobile}
                        type="button"
                        onClick={() => {
                          setArchitectName(item.name);
                          setArchitectMobile(item.mobile);
                          setArchitectPlace(item.place);
                        }}
                        className="bg-white hover:bg-blue-50 border border-slate-250 hover:border-blue-300 text-[10px] font-bold px-2 py-1 rounded text-slate-755 cursor-pointer"
                      >
                        {item.name} (📞 {item.mobile})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subsection: Builder Partner details */}
          {showBuilderForm && (
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100 bg-amber-50/15 p-4 rounded-xl border border-amber-100/40">
              <div className="flex items-center gap-1.5 pb-1">
                <span className="text-sm">👷</span>
                <h4 className="text-[11px] font-bold tracking-wider font-sans uppercase text-amber-800">
                  Builder Partner (Optional Profile)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 font-sans">
                    Builder Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Anand Builders"
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 font-sans">
                    Builder Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={builderMobile}
                    onChange={(e) => setBuilderMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 font-sans">
                    Builder Place / Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hyderabad"
                    value={builderPlace}
                    onChange={(e) => setBuilderPlace(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>
              </div>

              {/* Autocomplete suggestions list for builder */}
              {builderSuggestions.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-24 overflow-y-auto space-y-1">
                  <span className="text-[9px] font-extrabold uppercase text-slate-550 block">Autofill Match:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {builderSuggestions.map((item) => (
                      <button
                        key={item.mobile}
                        type="button"
                        onClick={() => {
                          setBuilderName(item.name);
                          setBuilderMobile(item.mobile);
                          setBuilderPlace(item.place);
                        }}
                        className="bg-white hover:bg-amber-50 border border-slate-250 hover:border-amber-300 text-[10px] font-bold px-2 py-1 rounded text-slate-755 cursor-pointer"
                      >
                        {item.name} (📞 {item.mobile})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

            {/* Dynamic Duplicate Prevention panel to show matching historical entries */}
            {matchingPreviousEntries.length > 0 && (
              <div className="md:col-span-2 bg-amber-50 border border-amber-200/90 rounded-2xl p-4 space-y-3 font-sans transition-all duration-300" id="container-duplicate-prevention">
                <div className="flex gap-2.5 items-start text-amber-900">
                  <span className="text-sm select-none">⚠️</span>
                  <div className="flex-1">
                    <span className="font-extrabold block text-xs uppercase tracking-wider text-amber-950 font-sans">
                      Detected Similar Previous Entries ({matchingPreviousEntries.length})
                    </span>
                    <span className="text-[10.5px] text-amber-800 block mt-0.5 leading-normal font-sans">
                      The entered Name, Mobile, or Place matches the previous records below. Please double-check to avoid logging duplicate entries by mistake.
                    </span>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-amber-100 bg-white/95 rounded-xl border border-amber-200 shadow-sm">
                  {matchingPreviousEntries.map(({ visit, reasons }) => (
                    <div key={visit.id} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/20 transition text-slate-800">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-800">{visit.clientName}</span>
                          {reasons.map(r => (
                            <span key={r} className="text-[8.5px] font-mono font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase tracking-wide">
                              {r}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                          📞 {visit.clientMobile} | 📍 {visit.address}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          Date: {visit.visitingDate} | Phase: {visit.buildingStatus}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setClientName(visit.clientName);
                          setClientMobile(visit.clientMobile);
                          setAddress(visit.address);
                          setLocation(visit.location || '');
                          if (visit.nearestLandmark) {
                            setNearestLandmark(visit.nearestLandmark);
                          }
                          if (visit.latitude !== null) {
                            setLatitude(visit.latitude);
                          }
                          if (visit.longitude !== null) {
                            setLongitude(visit.longitude);
                          }
                          if (visit.carpenterName) setCarpenterName(visit.carpenterName);
                          if (visit.carpenterMobile) setCarpenterMobile(visit.carpenterMobile);
                          if (visit.carpenterPlace) setCarpenterPlace(visit.carpenterPlace);
                          if (visit.interiorName) setInteriorName(visit.interiorName);
                          if (visit.interiorMobile) setInteriorMobile(visit.interiorMobile);
                          if (visit.interiorPlace) setInteriorPlace(visit.interiorPlace);
                          if (visit.architectName) setArchitectName(visit.architectName);
                          if (visit.architectMobile) setArchitectMobile(visit.architectMobile);
                          if (visit.architectPlace) setArchitectPlace(visit.architectPlace);
                          setBuildingStatus(visit.buildingStatus as any);
                          setBuildingType(visit.buildingType || 'Home');
                          setLeadStatus(visit.leadStatus);
                          if (visit.nextFollowUpDate) setNextFollowUpDate(visit.nextFollowUpDate);
                        }}
                        className="self-start sm:self-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-indigo-150 transition cursor-pointer shrink-0"
                      >
                        Copy/Autofill Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Site Photo Evidence */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <div className="w-1.5 h-4 bg-indigo-650 rounded-full"></div>
            <h3 className="text-[11px] font-bold tracking-wider font-sans uppercase text-slate-500">
              2. Site Photo Evidence
            </h3>
          </div>
          
          <div className="max-w-md mx-auto w-full">
            {/* Camera Area / Site Photo */}
            {isCameraActive ? (
              <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800 p-4 space-y-4 relative flex flex-col items-center">
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-705 flex items-center justify-center">
                  
                  {cameraInitializing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 space-y-2 z-10">
                      <Loader2 className="animate-spin text-indigo-500" size={32} />
                      <span className="text-xs font-sans">Starting camera stream...</span>
                    </div>
                  )}

                  {cameraError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-4 text-center space-y-3 z-10">
                      <CameraOff className="text-rose-500" size={28} />
                      <p className="text-xs font-semibold text-rose-300 font-sans">{cameraError}</p>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Camera controls */}
                <div className="flex items-center gap-3 w-full justify-center">
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="p-2 border border-slate-700 bg-slate-805 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Flip Camera (Front/Back)"
                  >
                    <RefreshCw size={14} />
                    <span className="text-[10px] font-sans">Flip</span>
                  </button>

                  <button
                    type="button"
                    disabled={cameraInitializing || !!cameraError}
                    onClick={handleCapture}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-extrabold transition shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>Capture Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-2 border border-slate-700 bg-slate-805 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X size={14} />
                    <span className="text-[10px] font-sans">Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 transition-all text-center flex flex-col items-center justify-center ${
                  photo ? 'border-indigo-500 bg-indigo-50/5' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50/85'
                }`}
                onClick={(e) => {
                  // Only click file input if they didn't click inside specific action buttons
                  const target = e.target as HTMLElement;
                  if (target.closest('.camera-button-action')) {
                    e.stopPropagation();
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                id="photo-drag-container"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="hidden"
                  id="inp-photo-upload"
                />
                
                {photo ? (
                  <div className="relative w-full max-w-xs mx-auto group">
                     <img 
                      src={photo} 
                      alt="Site Evidence" 
                      referrerPolicy="no-referrer"
                      className="rounded-lg h-36 w-full object-cover shadow-sm border border-slate-100"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhoto(null);
                      }}
                      className="absolute -top-2.5 -right-2.5 p-1.5 bg-slate-800 text-white rounded-full hover:bg-rose-600 shadow transition"
                      id="btn-remove-photo"
                    >
                      <X size={14} />
                    </button>
                    <div className="mt-2 text-xs text-slate-400 flex items-center justify-center gap-1 font-sans font-medium">
                      <CheckCircle size={13} className="text-teal-500" /> Click thumbnail to change image
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-2 w-full flex flex-col items-center">
                    <div className="mx-auto w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-sm text-slate-500">
                      <Camera size={18} />
                    </div>
                    
                    <div className="flex flex-col gap-2.5 w-full max-w-[240px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startCamera();
                        }}
                        className="camera-button-action w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Camera size={13} />
                        <span>Use Live Camera</span>
                      </button>

                      <div className="flex items-center justify-center gap-2">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono font-bold select-none">OR</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </div>

                      <span className="text-xs font-semibold text-slate-700 font-sans block select-none">
                        Upload or Drag Photo
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 font-sans font-medium select-none">
                      Select or drag any site progress image
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: Statuses & Scheduling */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <div className="w-1.5 h-4 bg-indigo-650 rounded-full"></div>
            <h3 className="text-[11px] font-bold tracking-wider font-sans uppercase text-slate-500">
              4. Scheduling & Status Markers
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans">
                Visiting Date *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  required
                  value={visitingDate}
                  onChange={(e) => setVisitingDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                  id="inp-visiting-date"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans">
                Building Physical Phase *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Building2 size={16} />
                </span>
                <select
                  value={buildingStatus}
                  onChange={(e) => setBuildingStatus(e.target.value as BuildingStatusOption)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition appearance-none cursor-pointer"
                  id="inp-building-status"
                >
                  {BUILDING_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-2 font-sans mb-1.5">
                Lead Status Code *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Cold lead selector */}
                <button
                  type="button"
                  onClick={() => setLeadStatus('cold')}
                  className={`flex flex-col items-center justify-center p-3 border rounded-xl transition cursor-pointer ${
                    leadStatus === 'cold'
                      ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 font-bold ring-2 ring-indigo-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  id="btn-lead-cold"
                >
                  <div className={`p-1.5 rounded-full mb-1.5 ${
                    leadStatus === 'cold' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Snowflake size={16} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide">Cold Lead</span>
                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">Initial meet / low promptness</span>
                </button>

                {/* Hot lead selector */}
                <button
                  type="button"
                  onClick={() => setLeadStatus('hot')}
                  className={`flex flex-col items-center justify-center p-3 border rounded-xl transition cursor-pointer ${
                    leadStatus === 'hot'
                      ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-bold ring-2 ring-orange-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  id="btn-lead-hot"
                >
                  <div className={`p-1.5 rounded-full mb-1.5 ${
                    leadStatus === 'hot' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Flame size={16} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide">Hot Lead</span>
                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">High woodwork promptness</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans">
                Follow Up Notes / Remarks
              </label>
              <textarea
                rows={3}
                placeholder="Write specific material requirements, follow-up callbacks, or key findings..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                id="inp-notes"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: Submit Actions */}
        <div className="flex gap-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold rounded-lg text-xs tracking-wider uppercase transition cursor-pointer"
            id="btn-form-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs tracking-wider uppercase shadow-md transition cursor-pointer"
            id="btn-form-submit"
          >
            {initialData ? 'Update Visit Log File' : 'Save Visit Log File'}
          </button>
        </div>

      </form>
    </motion.div>
  );
}
