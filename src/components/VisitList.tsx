import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Wrench, 
  Building2, 
  Calendar, 
  Flame, 
  Snowflake, 
  Trash2, 
  Edit2,
  Download, 
  Maximize2, 
  X, 
  Compass, 
  Share2,
  FileSpreadsheet,
  AlertCircle,
  User,
  Clock,
  ArrowRight,
  ChevronRight,
  Info,
  Map
} from 'lucide-react';
import { SiteVisit, BuildingStatusOption } from '../types';
import VisitMiniMap from './VisitMiniMap';
import { exportToCsv } from '../utils/fileExporter';
import { shareVisitDetails } from '../utils/shareUtils';
import { SitePhotoItem } from './SitePhotoItem';

// Helper to open URLs externally in Capacitor or native contexts gracefully
const openExternalUrl = (url: string) => {
  const isCapacitor = (window as any).Capacitor !== undefined;
  if (isCapacitor) {
    window.open(url, '_system');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

interface VisitListProps {
  visits: SiteVisit[];
  onDelete: (id: string) => void;
  onEdit: (visit: SiteVisit) => void;
}

export default function VisitList({ visits, onDelete, onEdit }: VisitListProps) {
  // Only customer present and customer absent sites
  const customerVisitsOnly = React.useMemo(() => {
    return visits.filter(v => v.contractorType === 'none' || !v.contractorType);
  }, [visits]);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [leadFilter, setLeadFilter] = useState<'all' | 'hot' | 'cold'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>(''); // YYYY-MM-DD
  const [endDateFilter, setEndDateFilter] = useState<string>(''); // YYYY-MM-DD
  const [activePreset, setActivePreset] = useState<string>('all');
  const [showOnlyUnavailableCustomers, setShowOnlyUnavailableCustomers] = useState<boolean>(false);
  const [entityTab, setEntityTab] = useState<'all' | 'customer_present' | 'customer_absent'>('all');

  // Quick Range Presets Handler
  const applyPresetQuery = (preset: string) => {
    setActivePreset(preset);
    // Current date based on standard local Time
    const baseDate = new Date();
    const getFormatted = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDateFilter('');
      setEndDateFilter('');
    } else if (preset === 'today') {
      const todayStr = getFormatted(baseDate);
      setStartDateFilter(todayStr);
      setEndDateFilter(todayStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(baseDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = getFormatted(yesterday);
      setStartDateFilter(yestStr);
      setEndDateFilter(yestStr);
    } else if (preset === '7days') {
      const past7 = new Date(baseDate);
      past7.setDate(past7.getDate() - 7);
      setStartDateFilter(getFormatted(past7));
      setEndDateFilter(getFormatted(baseDate));
    } else if (preset === '30days') {
      const past30 = new Date(baseDate);
      past30.setDate(past30.getDate() - 30);
      setStartDateFilter(getFormatted(past30));
      setEndDateFilter(getFormatted(baseDate));
    } else if (preset === 'this_month') {
      const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      setStartDateFilter(getFormatted(startOfMonth));
      setEndDateFilter(getFormatted(endOfMonth));
    }
  };

  // Count by entity type matching current search/filters (excluding entityTab itself)
  const countsByEntity = React.useMemo(() => {
    let all = 0;
    let present = 0;
    let absent = 0;

    customerVisitsOnly.forEach((v) => {
      const matchesSearch = 
        v.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.contractorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.clientMobile.includes(searchTerm) ||
        (v.pincode && v.pincode.includes(searchTerm)) ||
        (v.location && v.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.notes && v.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesLead = leadFilter === 'all' || v.leadStatus === leadFilter;
      const matchesStatus = statusFilter === 'all' || v.buildingStatus === statusFilter;
      
      const matchesDateRange = (() => {
        const dateVal = v.visitingDate; // YYYY-MM-DD
        if (startDateFilter && dateVal < startDateFilter) return false;
        if (endDateFilter && dateVal > endDateFilter) return false;
        return true;
      })();
      
      const matchesUnavailable = !showOnlyUnavailableCustomers || v.customerNotAvailable === true;

      if (matchesSearch && matchesLead && matchesStatus && matchesDateRange && matchesUnavailable) {
        all++;
        if (v.customerNotAvailable === true) {
          absent++;
        } else {
          present++;
        }
      }
    });

    return { all, present, absent };
  }, [customerVisitsOnly, searchTerm, leadFilter, statusFilter, startDateFilter, endDateFilter, showOnlyUnavailableCustomers]);
  
  // Persistent sorting preference (Default to newest first)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>(() => {
    return (localStorage.getItem('visit_list_sort_order') as 'newest' | 'oldest') || 'newest';
  });

  const handleSortOrderChange = (order: 'newest' | 'oldest') => {
    setSortOrder(order);
    localStorage.setItem('visit_list_sort_order', order);
  };

  // Image Enlargement Modal state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Drawer slider state for full visit details
  const [selectedVisitForDetail, setSelectedVisitForDetail] = useState<SiteVisit | null>(null);

  // Filter lists dynamically
  const filteredVisits = customerVisitsOnly.filter((visit) => {
    const matchesSearch = 
      visit.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (visit.contractorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.clientMobile.includes(searchTerm) ||
      (visit.notes && visit.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLead = leadFilter === 'all' || visit.leadStatus === leadFilter;
    
    const matchesStatus = statusFilter === 'all' || visit.buildingStatus === statusFilter;
    
    const matchesDateRange = (() => {
      const dateVal = visit.visitingDate; // YYYY-MM-DD
      if (startDateFilter && dateVal < startDateFilter) return false;
      if (endDateFilter && dateVal > endDateFilter) return false;
      return true;
    })();

    // customerNotAvailable toggle is still a secondary fallback filter
    const matchesUnavailable = !showOnlyUnavailableCustomers || visit.customerNotAvailable === true;

    const matchesEntity = 
      entityTab === 'all' ||
      (entityTab === 'customer_present' && visit.customerNotAvailable !== true) ||
      (entityTab === 'customer_absent' && visit.customerNotAvailable === true);

    return matchesSearch && matchesLead && matchesStatus && matchesDateRange && matchesUnavailable && matchesEntity;
  });

  // Sort visits based on selected order (using createdAt, fallback to visitingDate)
  const sortedVisits = React.useMemo(() => {
    return [...filteredVisits].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.visitingDate).getTime();
      const timeB = new Date(b.createdAt || b.visitingDate).getTime();
      if (sortOrder === 'newest') {
        return timeB - timeA;
      } else {
        return timeA - timeB;
      }
    });
  }, [filteredVisits, sortOrder]);

  // Extract unique building statuses recorded to populate clean dropdown filter
  const uniqueRecordedStatuses = Array.from(new Set(customerVisitsOnly.map(v => v.buildingStatus)));

  // Simple CSV Exporter for daily work reporting
  const handleExportCSV = () => {
    if (customerVisitsOnly.length === 0) return;

    // Headers
    const headers = [
      'Visiting Date',
      'Client Name',
      'Client Mobile',
      'Address',
      'Contractor Type',
      'Contractor Name',
      'Contractor Mobile',
      'Building Status',
      'Lead Status',
      'Carpenter Name',
      'Carpenter Mobile',
      'Carpenter Place',
      'Interior Designer Partner Name',
      'Interior Designer Mobile',
      'Interior Designer Place',
      'Builder Name',
      'Builder Mobile',
      'Builder Place',
      'Architect Name',
      'Architect Mobile',
      'Architect Place',
      'Notes'
    ];

    // Data Map
    const dataRows = filteredVisits.map((v) => [
      v.visitingDate,
      v.clientName,
      v.clientMobile,
      v.address,
      v.contractorType,
      v.contractorName,
      v.contractorMobile,
      v.buildingStatus,
      v.leadStatus.toUpperCase(),
      v.carpenterName || '',
      v.carpenterMobile || '',
      v.carpenterPlace || '',
      v.interiorName || '',
      v.interiorMobile || '',
      v.interiorPlace || '',
      v.builderName || '',
      v.builderMobile || '',
      v.builderPlace || '',
      v.architectName || '',
      v.architectMobile || '',
      v.architectPlace || '',
      v.notes || ''
    ]);

    const todayStr = new Date().toISOString().split('T')[0];
    exportToCsv(`Daily_Visits_Report_${todayStr}.csv`, headers, dataRows);
  };

  const handleShareGoogleMaps = (visit: SiteVisit) => {
    if (visit.latitude && visit.longitude) {
      openExternalUrl(`https://www.google.com/maps/dir/?api=1&destination=${visit.latitude},${visit.longitude}`);
    } else {
      openExternalUrl(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(visit.address)}`);
    }
  };

  return (
    <div className="space-y-4" id="visit-list-container">
      {/* Search & Filter Header card */}
      <div className="bg-white rounded-xl border border-slate-150 shadow-[0_4px_16px_rgba(0,0,0,0.02)] p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-base font-extrabold font-sans tracking-tight text-slate-900 flex items-center gap-1.5">
            <span>Visits History Logs</span>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-bold font-mono">
              {filteredVisits.length} recorded
            </span>
          </h2>

          <div className="flex gap-1.5 self-end md:self-auto">
            {filteredVisits.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold tracking-wide transition border border-emerald-150 cursor-pointer"
                id="btn-export-csv"
                title="Download CSV report for excel/sheets"
              >
                <FileSpreadsheet size={13} />
                <span>Export Daily CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Search Bar */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by client name, mobile number, address, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition shadow-sm"
            id="search-input"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters Panel layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
          {/* Lead priority filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
              <Filter size={14} />
            </span>
            <select
              value={leadFilter}
              onChange={(e) => setLeadFilter(e.target.value as any)}
              className="w-full pl-8.5 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 cursor-pointer appearance-none font-sans"
              id="filter-lead-status"
            >
              <option value="all">All Lead Priorities</option>
              <option value="hot">🔥 Hot Leads Only</option>
              <option value="cold">❄️ Cold Leads Only</option>
            </select>
          </div>

          {/* Construction phase status */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
              <Building2 size={14} />
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 cursor-pointer appearance-none font-sans"
              id="filter-building-status"
            >
              <option value="all">All Building Phases</option>
              {uniqueRecordedStatuses.map((stat) => (
                <option key={stat} value={stat}>{stat}</option>
              ))}
            </select>
          </div>

          {/* Range presets selector */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 font-sans">
              📅
            </span>
            <select
              value={activePreset}
              onChange={(e) => applyPresetQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 cursor-pointer appearance-none font-sans"
              id="filter-date-preset"
            >
              <option value="all">Custom Range</option>
              <option value="today">Today Only</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

          {/* FROM Date Range Filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-2 flex items-center text-indigo-600 font-mono text-[9px] font-black tracking-tighter leading-none select-none uppercase">
              From
            </span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setActivePreset('custom');
              }}
              className="w-full pl-9 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition font-mono"
              id="filter-start-date"
              title="Start Date"
            />
          </div>

          {/* TO Date Range Filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-2 flex items-center text-rose-500 font-mono text-[9px] font-black tracking-tighter leading-none select-none uppercase">
              To
            </span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setActivePreset('custom');
              }}
              className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition font-mono"
              id="filter-end-date"
              title="End Date"
            />
          </div>
        </div>

        {/* Dynamic special filter option bar with persistent Sort Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100/80">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Special Status Option:</span>
            <button
              onClick={() => setShowOnlyUnavailableCustomers(!showOnlyUnavailableCustomers)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition border cursor-pointer ${
                showOnlyUnavailableCustomers
                  ? 'bg-orange-50 text-orange-850 border-orange-200 shadow-xs'
                  : 'bg-slate-55/70 text-slate-600 border-slate-200/80 hover:bg-slate-100'
              }`}
              id="filter-unavailable-toggle"
            >
              <span className="text-orange-600 font-bold">👤</span>
              <span>Customer Not Available Only ({visits.filter(v => v.customerNotAvailable).length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Sort Order:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50" id="sort-toggle-container">
              <button
                onClick={() => handleSortOrderChange('newest')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  sortOrder === 'newest'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/30'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
                id="sort-newest-btn"
                title="Sort logs showing newest entries at the top"
              >
                <span>🆕 Newest First</span>
              </button>
              <button
                onClick={() => handleSortOrderChange('oldest')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  sortOrder === 'oldest'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/30 font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
                id="sort-oldest-btn"
                title="Sort logs showing oldest entries at the top"
              >
                <span>⏳ Oldest First</span>
              </button>
            </div>
          </div>
        </div>

        {/* Clear active filters button display */}
        {(searchTerm || leadFilter !== 'all' || statusFilter !== 'all' || startDateFilter || endDateFilter || showOnlyUnavailableCustomers || entityTab !== 'all') && (
          <div className="flex justify-between items-center bg-indigo-50/50 px-3 py-2.5 rounded-lg border border-indigo-100/60">
            <p className="text-xs text-indigo-950 font-semibold font-sans">Active filters are hiding some entries.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setLeadFilter('all');
                setStatusFilter('all');
                setStartDateFilter('');
                setEndDateFilter('');
                setActivePreset('all');
                setShowOnlyUnavailableCustomers(false);
                setEntityTab('all');
              }}
              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 border-b border-indigo-700 cursor-pointer transition uppercase tracking-wide"
              id="clear-filters-btn"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Entity Tabs Navigation */}
      <div className="flex border-b border-slate-200/80 gap-2 pb-px overflow-x-auto scrollbar-none" id="entity-tab-navigation">
        <button
          onClick={() => setEntityTab('all')}
          className={`flex-shrink-0 pb-3 px-4 text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer -mb-[1px] ${
            entityTab === 'all'
              ? 'border-indigo-600 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab-all"
        >
          <span>📋</span>
          <span>All Sites</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold font-mono ${entityTab === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
            {countsByEntity.all}
          </span>
        </button>

        <button
          onClick={() => setEntityTab('customer_present')}
          className={`flex-shrink-0 pb-3 px-4 text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer -mb-[1px] ${
            entityTab === 'customer_present'
              ? 'border-indigo-600 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab-customer-present"
        >
          <span>👥</span>
          <span>Customer Present</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold font-mono ${entityTab === 'customer_present' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
            {countsByEntity.present}
          </span>
        </button>

        <button
          onClick={() => setEntityTab('customer_absent')}
          className={`flex-shrink-0 pb-3 px-4 text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer -mb-[1px] ${
            entityTab === 'customer_absent'
              ? 'border-indigo-600 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="tab-customer-absent"
        >
          <span>✨</span>
          <span>Customer Absent</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold font-mono ${entityTab === 'customer_absent' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
            {countsByEntity.absent}
          </span>
        </button>
      </div>

      {/* Main Grid View of Visits */}
      {filteredVisits.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-12 text-center" id="empty-state">
          <AlertCircle size={32} className="mx-auto text-slate-400 mb-3 animate-pulse" />
          <p className="text-slate-800 font-bold font-sans text-sm">No matching site records found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your active filters and search queries, or tap the button to register a new site visit.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="visits-bento-grid">
          {sortedVisits.map((visit) => {
            const isHot = visit.leadStatus === 'hot';
            return (
              <motion.div
                layout
                key={visit.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedVisitForDetail(visit)}
                className={`bg-white rounded-2xl border flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_25px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition duration-200 relative cursor-pointer group/card ${
                  isHot 
                    ? 'border-orange-200 bg-gradient-to-br from-white to-orange-50/10' 
                    : 'border-slate-150'
                }`}
                id={`visit-card-${visit.id}`}
                title="Click anywhere to see full client and site details"
              >
                {/* Hot/Cold header badge & Customer Absent tags - rounded tag */}
                <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5 font-sans">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm ${
                    isHot 
                    ? 'bg-orange-100 text-orange-900 border border-orange-200' 
                    : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                  }`}>
                    {isHot ? <Flame size={11} className="text-orange-600 fill-orange-500" /> : <Snowflake size={11} className="text-indigo-600" />}
                    <span>{visit.leadStatus} Priority</span>
                  </span>

                  {visit.synced === false ? (
                    <span 
                      className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shadow-xs"
                      title="Offline record held locally on your device. Will automatically sync once internet is detected."
                      id={`badge-unsynced-visit-${visit.id}`}
                    >
                      <span>☁️</span>
                      <span>Unsynced</span>
                    </span>
                  ) : (
                    <span 
                      className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs"
                      title="Synced with Cloud Firestore database."
                      id={`badge-synced-visit-${visit.id}`}
                    >
                      <span>✓</span>
                      <span>Synced</span>
                    </span>
                  )}

                  {visit.customerNotAvailable && (
                    <span 
                      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shadow-xs animate-pulse"
                      title="Customer/Client was absent or unavailable at the site during this specific log."
                      id={`badge-unavailable-${visit.id}`}
                    >
                      <span>👤</span>
                      <span>Customer Absent</span>
                    </span>
                  )}
                </div>

                {/* Visit Top Content layout with image & video optionally */}
                <div className="flex border-b border-slate-100 p-5 gap-4 items-start">
                  
                  {/* Photo & Video representation */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {visit.photo ? (
                        <SitePhotoItem 
                          visit={visit} 
                          onEnlarge={setSelectedImage} 
                        />
                      ) : null}

                    {!visit.photo ? (
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 border border-slate-150">
                        <div className="text-[9px] font-extrabold font-mono tracking-wider text-slate-500 text-center px-1">NO MEDIA</div>
                      </div>
                    ) : null}
                  </div>

                  {/* Core details layout */}
                  <div className="space-y-1.5 flex-1 min-w-0 pr-12">
                    <p className="text-[10px] text-indigo-600 font-extrabold font-mono tracking-widest flex items-center gap-1">
                      <Calendar size={11} />
                      {visit.visitingDate}
                    </p>
                    <h3 className="text-base font-extrabold text-slate-900 truncate group-hover/card:text-indigo-700 transition" title={visit.clientName}>
                      {visit.clientName}
                    </h3>

                    <a 
                      href={`tel:${visit.clientMobile}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-650 hover:text-indigo-900 font-bold transition mt-0.5 bg-indigo-50/50 hover:bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100/40 cursor-pointer"
                    >
                      <Phone size={11} />
                      <span>{visit.clientMobile}</span>
                    </a>

                    <div className="text-xs text-slate-650 font-sans mt-2 flex flex-wrap gap-1.5 items-center">
                      <div className="bg-slate-100/60 p-1 px-2 rounded flex items-center gap-1.5 w-fit border border-slate-150">
                        <Building2 size={11} className="text-slate-400" />
                        <span>Stage: <strong className="text-slate-800 font-semibold">{visit.buildingStatus}</strong></span>
                      </div>
                      {visit.buildingType && (
                        <div className="bg-amber-50 border border-amber-200/50 text-amber-800 font-extrabold px-1.5 py-0.5 rounded text-[9.5px] uppercase flex items-center gap-1">
                          <span>{visit.buildingType === 'Home' ? '🏠' : visit.buildingType === 'Apartment' ? '🏢' : '🏡'}</span>
                          <span>{visit.buildingType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Extended Details Body */}
                <div className="p-5 flex-1 space-y-4 text-xs">
                  {/* Address */}
                  <div className="space-y-1 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block">Visit Site Address</span>
                    <p className="text-slate-700 font-sans leading-relaxed font-medium">{visit.address}</p>
                    {visit.location && (
                      <p className="text-[11px] text-indigo-755 font-sans mt-1">
                        <span className="font-extrabold text-[9px] uppercase font-mono text-slate-400 tracking-wider">Location:</span>{" "}
                        <span className="font-semibold text-slate-755">{visit.location}</span>
                        {visit.pincode && (
                          <>
                            <span className="mx-1 text-slate-300">|</span>
                            <span className="font-extrabold text-[9px] uppercase font-mono text-slate-400 tracking-wider">Pin:</span>{" "}
                            <span className="font-semibold text-slate-755">{visit.pincode}</span>
                          </>
                        )}
                      </p>
                    )}
                    {!visit.location && visit.pincode && (
                      <p className="text-[11px] text-indigo-755 font-sans mt-1">
                        <span className="font-extrabold text-[9px] uppercase font-mono text-slate-400 tracking-wider">Pincode:</span>{" "}
                        <span className="font-semibold text-slate-755">{visit.pincode}</span>
                      </p>
                    )}
                    {visit.latitude && visit.longitude && (
                      <span className="text-[9px] font-mono text-teal-655 font-bold block mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block animate-pulse"></span>
                        GPS coordinates verified: {visit.latitude.toFixed(6)}, {visit.longitude.toFixed(6)}
                      </span>
                    )}
                    {visit.nearestLandmark && (
                      <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-start gap-1.5 text-slate-800">
                        <span className="text-orange-500 text-xs select-none">🧭</span>
                        <div>
                          <span className="block text-[8px] font-bold text-slate-400 font-mono uppercase tracking-wider">Nearest Landmark</span>
                          <span className="font-semibold block text-xs leading-normal text-slate-705">{visit.nearestLandmark}</span>
                        </div>
                      </div>
                    )}

                    {/* Highly-styled Static Map Image Placeholder & Interactive Google Maps button */}
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 relative group/map" id={`gmaps-placeholder-card-${visit.id}`}>
                      {/* SVG/CSS Map Grid Styling Placeholder */}
                      <div className="h-28 w-full bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] bg-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                        {/* Map Grid Lines SVG decoration to simulate streets/roads */}
                        <svg className="absolute inset-0 w-full h-full text-slate-200 stroke-2" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <path d="M 0 30 Q 50 10 100 30 M 0 70 Q 50 90 100 70 M 25 0 Q 35 50 25 100 M 75 0 Q 65 50 75 100 M -10 50 Q 50 50 110 50" stroke="currentColor" strokeWidth="0.5" fill="none" />
                        </svg>
                        
                        {/* Area circle and pulsation */}
                        <div className="absolute w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/35 flex items-center justify-center animate-pulse"></div>
                        <div className="absolute w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
                          <MapPin size={18} className="text-indigo-600 animate-bounce" />
                        </div>
                        
                        {/* Text labels */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200/70 shadow-2xs">
                          <Map size={10} className="text-slate-500" />
                          <span className="text-[9px] font-bold text-slate-700 tracking-tight">Interactive Map Pin</span>
                        </div>

                        <div className="absolute bottom-2 right-2 bg-slate-900/85 text-[8px] font-mono text-slate-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          {visit.latitude && visit.longitude ? `GPS: ${visit.latitude.toFixed(4)}, ${visit.longitude.toFixed(4)}` : 'Address Map'}
                        </div>
                      </div>

                      {/* Launch Button overlay & hover effect */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (visit.latitude && visit.longitude) {
                            openExternalUrl(`https://www.google.com/maps/search/?api=1&query=${visit.latitude},${visit.longitude}`);
                          } else {
                            openExternalUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.address)}`);
                          }
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-950 hover:bg-indigo-900 transition-colors duration-155 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                        title="Open this location on Google Maps"
                        id={`btn-open-gmaps-${visit.id}`}
                      >
                        <Compass size={11} className="text-slate-300" />
                        <span>Open Coordinates in Google Maps</span>
                      </button>
                    </div>
                  </div>

                  {/* Carpenter/Interior */}
                  {visit.contractorType !== 'none' ? (
                    <div className="grid grid-cols-2 gap-2 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                      <div className="col-span-2 text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1 font-mono">
                        {visit.contractorType === 'carpenter' ? <Wrench size={11} className="text-indigo-650" /> : <Building2 size={11} className="text-indigo-650" />}
                        <span>Contact ({visit.contractorType})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans">Name</span>
                        <p className="font-bold text-slate-800 truncate">{visit.contractorName}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans">Mobile</span>
                        <a 
                          href={`tel:${visit.contractorMobile}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block font-sans font-bold text-indigo-700 hover:underline cursor-pointer"
                        >
                          {visit.contractorMobile}
                        </a>
                      </div>
                      {visit.contractorRemarks && (
                        <div className="col-span-2 mt-1.5 pt-1.5 border-t border-slate-200/50">
                          <span className="text-[10px] text-slate-400 font-sans block capitalize">{visit.contractorType} Remarks</span>
                          <p className="text-slate-700 font-sans font-medium">{visit.contractorRemarks}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic bg-slate-50/30 p-2.5 rounded-lg border border-slate-100/50 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-slate-350 rounded-full"></span>
                      No woodworkers/carpenters listed.
                    </div>
                  )}

                  {/* Notes & Remarks */}
                  {visit.notes && (
                    <div className="space-y-1 border-l-2 border-indigo-400 pl-3">
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 font-mono tracking-wider">Follow up Notes</span>
                      <p className="text-slate-600 font-sans leading-relaxed italic">"{visit.notes}"</p>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareGoogleMaps(visit);
                    }}
                    className="text-indigo-700 hover:text-indigo-900 border border-indigo-200 hover:border-indigo-300 bg-white shadow-xs px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer font-sans"
                    id={`btn-directions-${visit.id}`}
                    title="Navigate to this site address using Google Maps Directions"
                  >
                    <Compass size={13} className="text-indigo-500 animate-spin-slow" />
                    <span>Navigate GPS</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const mapUrl = visit.latitude && visit.longitude 
                        ? `https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`
                        : `https://www.google.com/maps?q=${encodeURIComponent(visit.address)}`;
                      
                      shareVisitDetails({
                        title: 'Site Location',
                        text: `*Client Site Location Details*\n\n*Client:* ${visit.clientName}\n*Mobile:* ${visit.clientMobile}\n*Address:* ${visit.address}`,
                        url: mapUrl,
                        photo: visit.photo
                      });
                    }}
                    className="text-emerald-700 hover:text-emerald-900 border border-emerald-200 hover:border-emerald-300 bg-white shadow-xs px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer font-sans"
                    id={`btn-share-location-${visit.id}`}
                    title="Share site location with details and photo"
                  >
                    <Share2 size={13} className="text-emerald-500" />
                    <span>Share Location</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(visit);
                      }}
                      className="px-2.5 py-1.5 text-indigo-650 hover:text-indigo-850 hover:bg-indigo-50/60 rounded-md transition font-bold flex items-center gap-1 cursor-pointer"
                      id={`btn-edit-${visit.id}`}
                      title="Edit Visit Record"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(visit.id);
                      }}
                      className="px-2.5 py-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50/60 rounded-md transition font-bold flex items-center gap-1 cursor-pointer"
                      id={`btn-delete-${visit.id}`}
                      title="Delete Visit Record"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* Slide-Over Drawer for Full Visit Details */}
      <AnimatePresence>
        {selectedVisitForDetail && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVisitForDetail(null)}
              className="fixed inset-0 bg-slate-950/40 z-40 backdrop-blur-xs"
            />

            {/* Slide-Over Menu */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
              className="fixed inset-y-0 right-0 z-50 w-full md:max-w-xl bg-slate-50 shadow-2xl flex flex-col border-l border-slate-200/85"
            >
              {/* Drawer Header */}
              <div className="bg-white border-b border-slate-150 p-5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-wider font-mono block">Site visit report</span>
                    <h2 className="text-base font-extrabold text-slate-900 leading-tight font-sans">Client & Construction Details</h2>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVisitForDetail(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
                  title="Close detailed view"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Photo Section */}
                {selectedVisitForDetail.photo ? (
                  <div className="space-y-2">
                     <span className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block">Captured Site Evidence</span>
                     <div 
                       onClick={() => setSelectedImage(selectedVisitForDetail.photo)}
                       className="relative w-full h-48 md:h-56 rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-slate-100 cursor-zoom-in group"
                     >
                       <img
                         src={selectedVisitForDetail.photo}
                         alt={selectedVisitForDetail.clientName}
                         className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                       />
                       <div className="absolute inset-0 bg-slate-900/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                         <span className="bg-white/95 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                           <Maximize2 size={12} className="text-indigo-600" />
                           View Larger Photo
                         </span>
                       </div>
                     </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-indigo-50/80 to-slate-50/50 rounded-2xl p-5 border border-indigo-100/50 flex flex-col items-center justify-center text-center space-y-2.5">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                      <MapPin size={22} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">No Site Photo Provided</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto mt-0.5">Please capture a physical photograph during your next site survey to log visual confirmation.</p>
                    </div>
                  </div>
                )}

                {/* Key Information Summary Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-150 shadow-2xs">
                    <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block mb-1">Lead Priority Status</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      selectedVisitForDetail.leadStatus === 'hot' 
                        ? 'bg-orange-100 text-orange-950 border border-orange-200' 
                        : 'bg-indigo-100 text-indigo-950 border border-indigo-200'
                    }`}>
                      {selectedVisitForDetail.leadStatus === 'hot' ? <Flame size={12} className="fill-orange-505 text-orange-600" /> : <Snowflake size={12} className="text-indigo-600" />}
                      <span className="capitalize">{selectedVisitForDetail.leadStatus} Priority</span>
                    </span>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-150 shadow-2xs">
                    <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block mb-1">Visiting Timeline</span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mt-0.5">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{selectedVisitForDetail.visitingDate}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Absence Warning if applicable */}
                {selectedVisitForDetail.customerNotAvailable && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-start gap-2.5 font-sans">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs">Customer Was Unreachable / Absent</h5>
                      <p className="text-[11px] text-amber-800 leading-normal mt-0.5 font-medium">
                        Logged during report checklist. Note down for followups to re-verify physical building dimensions.
                      </p>
                    </div>
                  </div>
                )}

                {/* Physical Site & Address Segment */}
                <div className="bg-white rounded-xl p-4 border border-slate-150 shadow-2xs space-y-3.5">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block">Customer / Building Name</span>
                      <h3 className="font-extrabold text-slate-900 mt-0.5 truncate" title={selectedVisitForDetail.clientName}>{selectedVisitForDetail.clientName}</h3>
                    </div>
                    {selectedVisitForDetail.clientMobile && (
                      <a 
                        href={`tel:${selectedVisitForDetail.clientMobile}`}
                        className="flex items-center gap-1 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 font-bold px-2.5 py-1 rounded-md transition cursor-pointer shrink-0"
                      >
                        <Phone size={11} />
                        <span>Call Client</span>
                      </a>
                    )}
                  </div>

                  <div>
                     <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block">Physical Site Address</span>
                     <p className="font-medium text-slate-700 text-sm tracking-tight leading-relaxed mt-0.5">{selectedVisitForDetail.address || "N/A"}</p>
                  </div>

                  {/* Landmark & Area section */}
                  <div className="grid grid-cols-3 gap-3 pt-2.5 border-t border-slate-100/70 text-xs text-slate-755">
                     <div>
                       <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block font-sans">Area</span>
                       <span className="font-semibold text-slate-750 block mt-0.5">{selectedVisitForDetail.location || 'N/A'}</span>
                     </div>
                     <div>
                       <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block font-sans">Pincode</span>
                       <span className="font-semibold text-slate-750 block mt-0.5">{selectedVisitForDetail.pincode || 'N/A'}</span>
                     </div>
                     <div>
                       <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block font-sans">Landmark</span>
                       <span className="font-semibold text-slate-750 block mt-0.5">{selectedVisitForDetail.nearestLandmark || 'N/A'}</span>
                     </div>
                  </div>

                  {/* GPS Location Section */}
                  {selectedVisitForDetail.latitude && selectedVisitForDetail.longitude ? (
                    <>
                      <div className="pt-2.5 border-t border-slate-100/70 flex items-center justify-between text-xs font-semibold text-teal-700">
                        <span className="flex items-center gap-1.5 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block animate-pulse"></span>
                          GPS: {selectedVisitForDetail.latitude.toFixed(6)}, {selectedVisitForDetail.longitude.toFixed(6)}
                        </span>
                        <button
                          onClick={() => handleShareGoogleMaps(selectedVisitForDetail)}
                          className="text-[10px] bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-850 px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer font-bold"
                          title="Share GPS directions on Google Maps"
                        >
                          <Compass size={11} className="text-teal-600" />
                          <span>Route Location</span>
                        </button>
                      </div>

                      <div className="pt-2">
                        <VisitMiniMap 
                          latitude={selectedVisitForDetail.latitude}
                          longitude={selectedVisitForDetail.longitude}
                          clientName={selectedVisitForDetail.clientName}
                        />
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Construction Phase Progress */}
                <div className="bg-white rounded-xl p-4 border border-slate-150 shadow-2xs space-y-2 font-sans">
                  <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block font-sans">Logged Construction stage</span>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-extrabold text-slate-800 px-2.5 py-1 bg-slate-100/80 rounded-md border border-slate-200/50">
                      {selectedVisitForDetail.buildingStatus}
                    </span>
                    {selectedVisitForDetail.buildingType && (
                      <span className="text-xs text-slate-500 font-medium">
                        Type: <strong className="text-slate-800">{selectedVisitForDetail.buildingType}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Next follow-up schedule */}
                <div className="bg-white rounded-xl p-4 border border-slate-150 shadow-2xs flex items-center justify-between font-sans">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block font-sans">Target Follow-Up Date</span>
                    <span className="text-xs text-slate-800 font-bold block">
                      {selectedVisitForDetail.nextFollowUpDate || "No target appointment scheduler"}
                    </span>
                  </div>
                  <div className="p-2 bg-indigo-50/50 text-indigo-600 rounded-lg">
                    <Clock size={16} />
                  </div>
                </div>

                {/* Subcontractor Associates (Active Professionals) */}
                {(selectedVisitForDetail.carpenterName || 
                  selectedVisitForDetail.interiorName || 
                  selectedVisitForDetail.architectName || 
                  selectedVisitForDetail.builderName ||
                  (selectedVisitForDetail.contractorName && selectedVisitForDetail.contractorType !== 'none')) && (
                  <div className="space-y-2.5 font-sans">
                    <span className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block font-sans">Assigned Site Contractors & Specialists</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Contractor Type General */}
                      {selectedVisitForDetail.contractorType && selectedVisitForDetail.contractorType !== 'none' && selectedVisitForDetail.contractorName && (
                        <div className="bg-white rounded-xl p-3.5 border border-slate-150 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[8px] font-extrabold text-indigo-605 font-mono uppercase tracking-widest block">{selectedVisitForDetail.contractorType} associate</span>
                            <h4 className="font-extrabold text-xs text-slate-900 mt-1">{selectedVisitForDetail.contractorName}</h4>
                            {selectedVisitForDetail.contractorAddress && (
                              <span className="text-[10px] text-slate-500 block truncate mt-0.5" title={selectedVisitForDetail.contractorAddress}>📍 {selectedVisitForDetail.contractorAddress}</span>
                            )}
                          </div>
                          
                          {selectedVisitForDetail.contractorMobile && (
                            <a 
                              href={`tel:${selectedVisitForDetail.contractorMobile}`}
                              className="inline-flex mt-3.5 items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 py-1 px-2.5 rounded border border-indigo-150/45 w-fit cursor-pointer"
                            >
                              <Phone size={10} />
                              <span>Call Operator</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Carpenter Details */}
                      {selectedVisitForDetail.carpenterName && (
                        <div className="bg-white rounded-xl p-3.5 border border-slate-150 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[8px] font-extrabold text-indigo-605 font-mono uppercase tracking-widest block font-sans">Carpenter specialist</span>
                            <h4 className="font-extrabold text-xs text-slate-900 mt-1">{selectedVisitForDetail.carpenterName}</h4>
                            {selectedVisitForDetail.carpenterPlace && (
                              <span className="text-[10px] text-slate-500 block truncate mt-0.5" title={selectedVisitForDetail.carpenterPlace}>📍 {selectedVisitForDetail.carpenterPlace}</span>
                            )}
                          </div>
                          
                          {selectedVisitForDetail.carpenterMobile && (
                            <a 
                              href={`tel:${selectedVisitForDetail.carpenterMobile}`}
                              className="inline-flex mt-3.5 items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 py-1 px-2.5 rounded border border-indigo-150/45 w-fit cursor-pointer"
                            >
                              <Phone size={10} />
                              <span>Call Specialty</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Interior Designer Details */}
                      {selectedVisitForDetail.interiorName && (
                        <div className="bg-white rounded-xl p-3.5 border border-slate-150 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[8px] font-extrabold text-indigo-605 font-mono uppercase tracking-widest block font-sans">Interior designer</span>
                            <h4 className="font-extrabold text-xs text-slate-900 mt-1">{selectedVisitForDetail.interiorName}</h4>
                            {selectedVisitForDetail.interiorPlace && (
                              <span className="text-[10px] text-slate-500 block truncate mt-0.5" title={selectedVisitForDetail.interiorPlace}>📍 {selectedVisitForDetail.interiorPlace}</span>
                            )}
                          </div>
                          
                          {selectedVisitForDetail.interiorMobile && (
                            <a 
                              href={`tel:${selectedVisitForDetail.interiorMobile}`}
                              className="inline-flex mt-3.5 items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 py-1 px-2.5 rounded border border-indigo-150/45 w-fit cursor-pointer"
                            >
                              <Phone size={10} />
                              <span>Call Designer</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Architect Details */}
                      {selectedVisitForDetail.architectName && (
                        <div className="bg-white rounded-xl p-3.5 border border-slate-150 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[8px] font-extrabold text-indigo-605 font-mono uppercase tracking-widest block font-sans">Structural architect</span>
                            <h4 className="font-extrabold text-xs text-slate-900 mt-1">{selectedVisitForDetail.architectName}</h4>
                            {selectedVisitForDetail.architectPlace && (
                              <span className="text-[10px] text-slate-500 block truncate mt-0.5" title={selectedVisitForDetail.architectPlace}>📍 {selectedVisitForDetail.architectPlace}</span>
                            )}
                          </div>
                          
                          {selectedVisitForDetail.architectMobile && (
                            <a 
                              href={`tel:${selectedVisitForDetail.architectMobile}`}
                              className="inline-flex mt-3.5 items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 py-1 px-2.5 rounded border border-indigo-150/45 w-fit cursor-pointer"
                            >
                              <Phone size={10} />
                              <span>Call Architect</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Builder Details */}
                      {selectedVisitForDetail.builderName && (
                        <div className="bg-white rounded-xl p-3.5 border border-slate-150 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[8px] font-extrabold text-indigo-650 font-mono uppercase tracking-widest block font-sans">Contractor Builder</span>
                            <h4 className="font-extrabold text-xs text-slate-900 mt-1">{selectedVisitForDetail.builderName}</h4>
                            {selectedVisitForDetail.builderPlace && (
                              <span className="text-[10px] text-slate-500 block truncate mt-0.5" title={selectedVisitForDetail.builderPlace}>📍 {selectedVisitForDetail.builderPlace}</span>
                            )}
                          </div>
                          
                          {selectedVisitForDetail.builderMobile && (
                            <a 
                              href={`tel:${selectedVisitForDetail.builderMobile}`}
                              className="inline-flex mt-3.5 items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 py-1 px-2.5 rounded border border-indigo-150/45 w-fit cursor-pointer"
                            >
                              <Phone size={10} />
                              <span>Call Builder</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Visit Remarks & Notes */}
                <div className="bg-white rounded-xl p-4 border border-slate-150 shadow-2xs font-sans">
                  <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block mb-2">Field Remarks / Progress Notes</span>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap">
                    {selectedVisitForDetail.notes?.trim() || "No custom remarks entered for this physical site survey report."}
                  </div>
                </div>
              </div>

              {/* Drawer Controls Footer */}
              <div className="bg-white border-t border-slate-150 p-4 grid grid-cols-2 gap-3 font-sans">
                <button
                  onClick={() => handleShareGoogleMaps(selectedVisitForDetail)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold transition text-xs shadow-xs hover:shadow cursor-pointer"
                  title="Open Google Maps Directions Navigate"
                >
                  <Compass size={13} className="animate-spin-slow" />
                  <span>Navigate GPS Route</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                     onClick={() => {
                       const visitToEdit = selectedVisitForDetail;
                       setSelectedVisitForDetail(null);
                       onEdit(visitToEdit);
                     }}
                     className="flex items-center justify-center gap-1 py-2.5 px-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl font-bold transition text-xs cursor-pointer text-slate-700"
                     title="Edit current visit record details"
                  >
                    <Edit2 size={12} className="text-slate-500" />
                    <span>Edit</span>
                  </button>
                  <button
                     onClick={() => {
                       const idToDelete = selectedVisitForDetail.id;
                       setSelectedVisitForDetail(null);
                       onDelete(idToDelete);
                     }}
                     className="flex items-center justify-center gap-1 py-2.5 px-3 border border-rose-150 hover:border-rose-250 text-rose-600 hover:bg-rose-50/50 rounded-xl font-bold transition text-xs cursor-pointer"
                     title="Delete this visit entry permanently"
                  >
                    <Trash2 size={12} className="text-rose-500" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Enlarged Image Modal Layer */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
            id="image-enlarge-modal"
          >
            <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 p-2 bg-slate-800/80 hover:bg-slate-800 text-white rounded-full transition shadow"
                id="btn-close-enlarge"
              >
                <X size={20} />
              </button>
              <img
                src={selectedImage}
                alt="Enlarged site evidence"
                className="rounded-2xl max-h-[80vh] w-full object-contain mx-auto shadow-2xl bg-slate-900/40 border border-slate-800"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
