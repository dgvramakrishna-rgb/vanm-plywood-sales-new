import React, { useState, useRef } from 'react';
import { Phone, MessageCircle, Info, Calendar } from 'lucide-react';

interface Contact {
  name: string;
  mobile: string;
  remarks?: string;
  nextFollowUp?: string;
  [key: string]: any;
}

interface FollowUpContactCardProps {
  key?: React.Key;
  index: number;
  item: Contact;
  onCall: (item: Contact) => void;
  onWhatsApp: (item: Contact) => void;
}

export default React.memo(function FollowUpContactCard({ index, item, onCall, onWhatsApp }: FollowUpContactCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    timerRef.current = setTimeout(() => {
      setShowDetails(prev => !prev);
    }, 500); // 500ms for long press
  };

  const endPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div 
      className="p-1.5 rounded-lg border border-slate-100 bg-white hover:border-indigo-100 transition-all shadow-sm flex flex-col gap-0 cursor-pointer"
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
    >
      {/* 2. Name + Number + Icons */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onCall(item);
            }} 
            className="text-indigo-600 p-1.5 rounded-full hover:bg-indigo-50 cursor-pointer transition-colors" 
            title="Call"
          >
             <Phone size={15} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp(item);
            }} 
            className="text-emerald-600 p-1.5 rounded-full hover:bg-emerald-50 cursor-pointer transition-colors" 
            title="WhatsApp"
          >
             <MessageCircle size={15} />
          </button>
        </div>
        <div className="flex flex-col gap-0 flex-1 min-w-0">
          <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
          <span className="text-[10px] font-mono text-slate-500 truncate">{item.mobile}</span>
        </div>
      </div>

      {/* 4. Remarks + Next FollowUp (Hidden by default, shown on long press) */}
      {showDetails && (
        <div className="pt-1 border-t border-slate-50 mt-0.5 space-y-0.5 animate-fade-in w-full text-center">
          <div className="flex items-start gap-1.5 justify-center">
            <Info size={10} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-slate-600 font-medium leading-snug">
              <span className="font-bold text-slate-800">Remark: </span>
              {item.remarks || "No remarks"}
            </p>
          </div>
          {item.nextFollowUp && (
            <div className="flex items-start gap-1.5 justify-center">
              <Calendar size={10} className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-indigo-700 font-bold leading-snug">
                Next Follow-up: {item.nextFollowUp}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
