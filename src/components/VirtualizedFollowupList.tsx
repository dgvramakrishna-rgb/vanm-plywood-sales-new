import React, { useState, useEffect, useRef, useMemo } from 'react';
import FollowUpContactCard from './FollowUpContactCard';

interface Contact {
  name: string;
  mobile: string;
  remarks?: string;
  nextFollowUp?: string;
  [key: string]: any;
}

interface VirtualItem {
  id: string;
  type: 'header' | 'item';
  title?: string;
  count?: number;
  item?: Contact;
  index?: number;
}

interface VirtualizedFollowupListProps {
  filteredFollowups: Contact[];
  groupedFollowups: {
    type: string;
    data: Record<string, Contact[]>;
  } | null;
  activeFollowupSubTab: string;
  followupGroupMode: string;
  onCall: (item: Contact) => void;
  onWhatsApp: (item: Contact) => void;
}

export default function VirtualizedFollowupList({
  filteredFollowups,
  groupedFollowups,
  activeFollowupSubTab,
  followupGroupMode,
  onCall,
  onWhatsApp
}: VirtualizedFollowupListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500); // default height fallback

  // Flatten the grouped/ungrouped list into a single array for unified virtualization
  const virtualRows = useMemo<VirtualItem[]>(() => {
    const rows: VirtualItem[] = [];

    if (activeFollowupSubTab === 'client') {
      if (followupGroupMode === 'buildingwise' && groupedFollowups?.type === 'buildingwise') {
        const groupedData = groupedFollowups.data;
        const buildingKeys = Object.keys(groupedData).filter(k => groupedData[k].length > 0);
        buildingKeys.forEach((buildingName, gIdx) => {
          rows.push({
            id: `header-building-${buildingName}-${gIdx}`,
            type: 'header',
            title: buildingName,
            count: groupedData[buildingName].length
          });
          groupedData[buildingName].forEach((item, idx) => {
            rows.push({
              id: `item-${item.mobile || item.name}-${idx}`,
              type: 'item',
              item,
              index: idx + 1
            });
          });
        });
        return rows;
      }

      if (followupGroupMode === 'placewise' && groupedFollowups?.type === 'placewise') {
        const groupedData = groupedFollowups.data;
        const sortedPlaces = Object.keys(groupedData).sort();
        sortedPlaces.forEach((placeName, gIdx) => {
          rows.push({
            id: `header-place-${placeName}-${gIdx}`,
            type: 'header',
            title: placeName,
            count: groupedData[placeName].length
          });
          groupedData[placeName].forEach((item, idx) => {
            rows.push({
              id: `item-${item.mobile || item.name}-${idx}`,
              type: 'item',
              item,
              index: idx + 1
            });
          });
        });
        return rows;
      }
    }

    // Single Grid / Ungrouped
    filteredFollowups.forEach((item, idx) => {
      rows.push({
        id: `item-${item.mobile || item.name}-${idx}`,
        type: 'item',
        item,
        index: idx + 1
      });
    });

    return rows;
  }, [activeFollowupSubTab, followupGroupMode, groupedFollowups, filteredFollowups]);

  // Pre-calculate exact heights and vertical offsets for every virtual item
  const { rowOffsets, totalHeight } = useMemo(() => {
    const offsets: number[] = [];
    let currentTop = 0;
    
    for (let i = 0; i < virtualRows.length; i++) {
      offsets.push(currentTop);
      const row = virtualRows[i];
      if (row.type === 'header') {
        currentTop += 46; // header height including padding & border
      } else {
        currentTop += 54; // card height + gap space
      }
    }
    
    return { offsets, totalHeight: currentTop };
  }, [virtualRows]);

  // Handle scroll listener on the container
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      // Measure initial height
      setContainerHeight(container.getBoundingClientRect().height || 500);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [virtualRows]);

  // Handle container resizing to update viewport calculations
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height || 500);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Binary search to find start index
  const startIndex = useMemo(() => {
    let low = 0;
    let high = rowOffsets.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (rowOffsets[mid] === scrollTop) {
        return mid;
      } else if (rowOffsets[mid] < scrollTop) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return Math.max(0, low - 1);
  }, [rowOffsets, scrollTop]);

  // Calculate visible items with a generous buffer for buttery smooth scroll
  const BUFFER_BEFORE = 8;
  const BUFFER_AFTER = 12;

  const { visibleRows, renderStartIndex, renderEndIndex } = useMemo(() => {
    const actualStart = Math.max(0, startIndex - BUFFER_BEFORE);
    
    // Find where the visible window ends
    let actualEnd = startIndex;
    const viewBottom = scrollTop + containerHeight;
    while (actualEnd < rowOffsets.length && rowOffsets[actualEnd] < viewBottom) {
      actualEnd++;
    }
    actualEnd = Math.min(rowOffsets.length - 1, actualEnd + BUFFER_AFTER);

    const visible = virtualRows.slice(actualStart, actualEnd + 1).map((row, i) => ({
      row,
      top: rowOffsets[actualStart + i],
      indexInAll: actualStart + i
    }));

    return {
      visibleRows: visible,
      renderStartIndex: actualStart,
      renderEndIndex: actualEnd
    };
  }, [virtualRows, startIndex, rowOffsets, scrollTop, containerHeight]);

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-lg mx-auto overflow-y-auto relative bg-slate-50/10 rounded-2xl border border-slate-100 p-2 scroll-smooth"
      style={{ height: '520px' }}
      id="followup-virtualized-container"
    >
      {/* Absolute spacer to simulate the complete scroll height */}
      <div 
        style={{ 
          height: `${totalHeight}px`, 
          width: '100%', 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          pointerEvents: 'none' 
        }} 
      />

      {/* Absolute container that translates to place visible items exactly in view */}
      <div 
        className="w-full flex flex-col gap-1.5"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '8px',
          transform: `translateY(${rowOffsets[renderStartIndex] || 0}px)`
        }}
      >
        {visibleRows.map(({ row }) => {
          if (row.type === 'header') {
            const isPlaceHeader = row.title?.includes('📍') || activeFollowupSubTab === 'client' && followupGroupMode === 'placewise';
            return (
              <div 
                key={row.id} 
                className="pt-2.5 pb-1.5 border-b border-slate-100 flex items-center justify-between bg-white px-2.5 rounded-lg shadow-3xs"
                style={{ height: '38px' }}
              >
                <h3 className="text-[11px] font-black text-slate-800 font-sans tracking-tight flex items-center gap-1">
                  {isPlaceHeader ? (
                    <span className="flex items-center justify-center w-4.5 h-4.5 rounded-md bg-indigo-50 text-indigo-600 text-[9px]">📍</span>
                  ) : (
                    <span className="flex items-center justify-center w-4.5 h-4.5 rounded-md bg-indigo-50 text-indigo-600 text-[9px]">🏢</span>
                  )}
                  <span>{row.title}</span>
                  <span className="text-[9px] bg-indigo-100/60 text-indigo-850 px-1 py-0.5 rounded font-mono font-bold ml-1.5">
                    {row.count} {row.count === 1 ? 'Customer' : 'Customers'}
                  </span>
                </h3>
              </div>
            );
          }

          if (row.item) {
            return (
              <FollowUpContactCard 
                key={row.id}
                index={row.index || 1}
                item={row.item}
                onCall={onCall}
                onWhatsApp={onWhatsApp}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
