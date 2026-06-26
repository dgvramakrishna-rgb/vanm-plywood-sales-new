export interface SiteVisit {
  id: string;
  clientName: string;
  clientMobile: string;
  address: string;
  location?: string; // Locality / Area / Town
  latitude: number | null;
  longitude: number | null;
  photo: string | null; // Base64 data URL
  video?: string | null; // Base64 data URL or link representing recorded video
  contractorType: 'carpenter' | 'interior' | 'architect' | 'builder' | 'none';
  contractorName: string;
  contractorMobile: string;
  contractorRemarks?: string;
  contractorAddress?: string;
  carpenterName?: string;
  carpenterMobile?: string;
  carpenterPlace?: string;
  interiorName?: string;
  interiorMobile?: string;
  interiorPlace?: string;
  architectName?: string;
  architectMobile?: string;
  architectPlace?: string;
  builderName?: string;
  builderMobile?: string;
  builderPlace?: string;
  visitingDate: string; // YYYY-MM-DD
  nextFollowUpDate?: string; // YYYY-MM-DD (next follow up appointment date)
  isCompleted?: boolean; // Completed site status
  buildingStatus: string;
  buildingType?: 'Home' | 'Apartment' | 'Duplex' | string;
  leadStatus: 'hot' | 'cold';
  notes?: string;
  customerNotAvailable?: boolean;
  nearestLandmark?: string;
  pincode?: string;
  createdAt: string; // ISO String
  synced?: boolean;
}

export type BuildingStatusOption = 
  | 'Excavation & Footing'
  | 'Brickwork & Masonry'
  | 'Plastering & Wiring'
  | 'Flooring & Tiling'
  | 'Woodwork & Carpentry'
  | 'Interior Designing'
  | 'Finished & Handover';

export interface DashboardStats {
  totalVisits: number;
  hotLeads: number;
  coldLeads: number;
  visitsToday: number;
  visitsThisWeek: number;
}

export interface Dealer {
  id: string;
  name: string;
  dealerPointName: string;
  place: string;
  mobile: string;
  createdAt: string;
  synced?: boolean;
}

