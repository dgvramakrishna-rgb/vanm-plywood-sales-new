import React from 'react';
import { Share2, Maximize2 } from 'lucide-react';
import { useLongPress } from '../hooks/useLongPress';
import { shareVisitDetails } from '../utils/shareUtils';
import { SiteVisit } from '../types';

interface SitePhotoItemProps {
  visit: SiteVisit;
  onEnlarge?: (photo: string) => void;
  className?: string;
  imageClassName?: string;
}

export const SitePhotoItem: React.FC<SitePhotoItemProps> = ({ 
  visit, 
  onEnlarge, 
  className = "relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shadow-inner cursor-zoom-in group bg-slate-50 border border-slate-100",
  imageClassName = "w-full h-full object-cover group-hover:scale-105 duration-200"
}) => {
  const handleShare = (e: any) => {
    e.stopPropagation();
    const mapUrl = visit.latitude && visit.longitude 
      ? `https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`
      : `https://www.google.com/maps?q=${encodeURIComponent(visit.address)}`;
    
    shareVisitDetails({
      title: 'Site Photo',
      text: `*Site Photo Share*\n\n*Client:* ${visit.clientName}\n*Mobile:* ${visit.clientMobile}\n*Address:* ${visit.address}`,
      url: mapUrl,
      photo: visit.photo,
      photoOnly: true
    });
  };

  const longPressProps = useLongPress({
    onLongPress: handleShare,
    onClick: (e) => {
      if (onEnlarge && visit.photo) {
        onEnlarge(visit.photo);
      }
    }
  });

  if (!visit.photo) return null;

  return (
    <div 
      {...longPressProps}
      className={className}
      title="Tap to enlarge, hold to share JPG photo"
    >
      <img 
        src={visit.photo} 
        alt={visit.clientName} 
        className={imageClassName} 
      />
      
      {/* Visual Indicator for Share Action */}
      <div className="absolute top-0 right-0 p-1">
        <button
          onClick={handleShare}
          className="bg-emerald-600/90 text-white p-1 rounded shadow-md hover:bg-emerald-700 transition cursor-pointer"
          title="Share photo via WhatsApp"
        >
          <Share2 size={10} />
        </button>
      </div>

      <span className="absolute bottom-1 right-1 bg-slate-900/80 text-[8px] text-white px-1 py-0.5 rounded font-bold uppercase tracking-wider font-sans">
        Photo
      </span>
      
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center text-white">
        <Maximize2 size={12} />
      </div>
    </div>
  );
};
