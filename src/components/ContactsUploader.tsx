import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  User, 
  Phone, 
  MapPin, 
  Check, 
  CheckCircle2, 
  Users, 
  Trash2, 
  MessageCircle, 
  FileText, 
  Smartphone,
  CheckSquare,
  Square
} from 'lucide-react';
import { SiteVisit } from '../types';

export type ContactGroup = 'Carpenter' | 'Interior' | 'Builder' | 'Other';

export interface ContactItem {
  id: string;
  name: string;
  mobile: string;
  address: string;
  group?: ContactGroup;
}

interface ContactsUploaderProps {
  onImportToVisits?: (contacts: ContactItem[]) => void;
  existingVisits?: SiteVisit[];
  onTriggerToast?: (msg: string, type?: 'success' | 'info') => void;
}

export default function ContactsUploader({ onImportToVisits, existingVisits = [], onTriggerToast }: ContactsUploaderProps) {
  const [contacts, setContacts] = useState<ContactItem[]>(() => {
    const saved = localStorage.getItem('fieldconnect_uploaded_contacts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [parsedContacts, setParsedContacts] = useState<ContactItem[]>([]);
  const [importGroup, setImportGroup] = useState<ContactGroup>('Carpenter');
  const [selectedParsedIds, setSelectedParsedIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('fieldconnect_uploaded_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Handle native Contact Picker API if supported
  const handleNativeContactPicker = async () => {
    // Check if in iframe
    if (window.self !== window.top) {
      if (onTriggerToast) onTriggerToast('Device Contact Picker is not available in the embedded environment. Please use file upload.', 'info');
      return;
    }

    const nav = navigator as any;
    if (nav.contacts && nav.contacts.select) {
      try {
        const props = ['name', 'tel', 'address'];
        const options = { multiple: true };
        const deviceContacts = await nav.contacts.select(props, options);
        
        if (deviceContacts && deviceContacts.length > 0) {
          const formatted: ContactItem[] = deviceContacts.map((c: any, index: number) => {
            const rawPhone = c.tel && c.tel[0] ? c.tel[0] : '';
            // Sanitize phone number to standard 10 digit or prefix
            const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
            const rawAddress = c.address && c.address[0] ? (typeof c.address[0] === 'string' ? c.address[0] : JSON.stringify(c.address[0])) : '';
            
            return {
              id: `native-${Date.now()}-${index}`,
              name: c.name && c.name[0] ? c.name[0] : 'Unnamed Contact',
              mobile: cleanPhone || 'No Mobile',
              address: rawAddress || 'No Address Listed',
              group: importGroup // Assign default group
            };
          });

          setParsedContacts(formatted);
          setSelectedParsedIds(new Set(formatted.map(f => f.id)));
          if (onTriggerToast) onTriggerToast(`Fetched ${formatted.length} contacts from device successfully!`, 'success');
        }
      } catch (err: any) {
        console.error('Contact Picker API Error:', err);
        if (onTriggerToast) onTriggerToast('Device contact picker was closed or not allowed.', 'info');
      }
    } else {
      // Direct user-friendly fallback simulation/dialog if native Contact Picker is unavailable in iframe sandbox
      if (onTriggerToast) onTriggerToast('Device Contact Picker not supported by browser. Using demo contacts!', 'info');
      
      const demoContacts: ContactItem[] = [
        { id: 'demo-1', name: 'Arun Kumar', mobile: '9876543210', address: 'Plot 42, Jubilee Hills, Hyderabad', group: importGroup },
        { id: 'demo-2', name: 'Sanjay Sharma', mobile: '8765432109', address: 'Flat 102, Shanti Kunj, New Delhi', group: importGroup },
        { id: 'demo-3', name: 'Priya Patel', mobile: '7654321098', address: 'B-405, Safal Residency, Ahmedabad', group: importGroup },
        { id: 'demo-4', name: 'Vikram Singh', mobile: '9123456780', address: 'H.No. 12, Sector 15, Chandigarh', group: importGroup }
      ];
      setParsedContacts(demoContacts);
      setSelectedParsedIds(new Set(demoContacts.map(d => d.id)));
    }
  };

  // VCF and CSV Parsing Logic
  const parseVCF = (text: string): ContactItem[] => {
    const contactsList: ContactItem[] = [];
    const vcards = text.split(/BEGIN:VCARD/gi);
    
    vcards.forEach((vcard, index) => {
      if (!vcard.trim()) return;
      
      // Extract Full Name
      let name = 'Unnamed Contact';
      const fnMatch = vcard.match(/FN:(.+)/i);
      const nMatch = vcard.match(/N:(.+)/i);
      if (fnMatch && fnMatch[1]) {
        name = fnMatch[1].trim();
      } else if (nMatch && nMatch[1]) {
        // Parse N:Last;First;;; format
        const parts = nMatch[1].split(';');
        const first = parts[1] ? parts[1].trim() : '';
        const last = parts[0] ? parts[0].trim() : '';
        name = `${first} ${last}`.trim() || 'Unnamed Contact';
      }
      
      // Extract Telephone
      let mobile = 'No Mobile';
      const telMatches = [...vcard.matchAll(/TEL[^:]*:(.+)/gi)];
      if (telMatches.length > 0) {
        // Try to find cell/mobile or use first number
        const cellMatch = telMatches.find(m => m[0].toLowerCase().includes('cell') || m[0].toLowerCase().includes('pref'));
        const activeMatch = cellMatch || telMatches[0];
        mobile = activeMatch[1].replace(/[^\d+]/g, '').trim();
      }
      
      // Extract Address
      let address = 'No Address Listed';
      const adrMatch = vcard.match(/ADR[^:]*:(.+)/i);
      if (adrMatch && adrMatch[1]) {
        // Clean vCard address separators (;;)
        address = adrMatch[1]
          .split(';')
          .filter(Boolean)
          .map(p => p.trim())
          .join(', ');
      }
      
      if (name !== 'Unnamed Contact' || mobile !== 'No Mobile') {
        contactsList.push({
          id: `vcf-${Date.now()}-${index}`,
          name,
          mobile,
          address,
          group: importGroup // Assign current import group
        });
      }
    });
    
    return contactsList;
  };

  const parseCSV = (text: string): ContactItem[] => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];
    
    const header = lines[0].toLowerCase().split(/,|;/);
    const contactsList: ContactItem[] = [];
    
    // Find column indexes
    const nameIdx = header.findIndex(h => h.includes('name') || h.includes('first') || h.includes('full'));
    const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('tel') || h.includes('number'));
    const addressIdx = header.findIndex(h => h.includes('address') || h.includes('location') || h.includes('adr') || h.includes('street'));
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple comma splitting, handling quotes could be added but keep it fast & neat
      const cols = line.split(/,|;/);
      
      const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx].replace(/^["']|["']$/g, '').trim() : 'Unnamed Contact';
      const rawPhone = phoneIdx !== -1 && cols[phoneIdx] ? cols[phoneIdx].replace(/^["']|["']$/g, '').trim() : '';
      const mobile = rawPhone.replace(/[^\d+]/g, '') || 'No Mobile';
      const address = addressIdx !== -1 && cols[addressIdx] ? cols[addressIdx].replace(/^["']|["']$/g, '').trim() : 'No Address Listed';
      
      if (name !== 'Unnamed Contact' || mobile !== 'No Mobile') {
        contactsList.push({
          id: `csv-${Date.now()}-${i}`,
          name,
          mobile,
          address,
          group: importGroup // Assign current import group
        });
      }
    }
    
    return contactsList;
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      
      let parsed: ContactItem[] = [];
      if (extension === 'vcf') {
        parsed = parseVCF(text);
      } else if (extension === 'csv' || extension === 'txt') {
        parsed = parseCSV(text);
      } else {
        if (onTriggerToast) onTriggerToast('Unsupported file format. Please upload .vcf or .csv contacts files.', 'info');
        return;
      }
      
      if (parsed.length > 0) {
        setParsedContacts(parsed);
        setSelectedParsedIds(new Set(parsed.map(p => p.id)));
        if (onTriggerToast) onTriggerToast(`Loaded ${parsed.length} contacts! Select and click import below.`, 'success');
      } else {
        if (onTriggerToast) onTriggerToast('No valid contacts could be parsed from this file.', 'info');
      }
    };
    
    reader.readAsText(file);
  };

  const toggleSelectAllParsed = () => {
    if (selectedParsedIds.size === parsedContacts.length) {
      setSelectedParsedIds(new Set());
    } else {
      setSelectedParsedIds(new Set(parsedContacts.map(p => p.id)));
    }
  };

  const toggleSelectParsed = (id: string) => {
    const updated = new Set(selectedParsedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedParsedIds(updated);
  };

  const importSelectedContacts = () => {
    const toImport = parsedContacts.filter(p => selectedParsedIds.has(p.id));
    if (toImport.length === 0) {
      if (onTriggerToast) onTriggerToast('No contacts selected.', 'info');
      return;
    }

    // Add to imported list
    const newContacts = [...contacts];
    toImport.forEach(item => {
      // Avoid duplicate mobile number imports
      if (!newContacts.some(c => c.mobile === item.mobile)) {
        newContacts.push({
          ...item,
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        });
      }
    });

    setContacts(newContacts);
    setParsedContacts([]);
    setSelectedParsedIds(new Set());

    // Trigger outer import to Visits database if callback is available
    if (onImportToVisits) {
      onImportToVisits(toImport);
    }

    if (onTriggerToast) onTriggerToast(`Successfully imported ${toImport.length} contacts to your client list!`, 'success');
  };

  const deleteContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
    if (onTriggerToast) onTriggerToast('Contact removed.', 'info');
  };

  const clearAllContacts = () => {
    if (confirm('Are you sure you want to clear all imported contacts?')) {
      setContacts([]);
      if (onTriggerToast) onTriggerToast('All contacts cleared.', 'info');
    }
  };

  // Build standard WhatsApp click-to-chat url for India country prefix
  const getWhatsAppLink = (mobile: string) => {
    const cleanNum = mobile.replace(/\D/g, '');
    const numWithCountry = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    return `https://wa.me/${numWithCountry}`;
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.mobile.includes(searchQuery) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full" id="contacts-upload-manager">
      <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">Client Contacts</h3>
            <p className="text-[10px] text-slate-300 font-medium">Upload, import, and chat with mobile phone contacts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {contacts.length > 0 && (
            <button
              onClick={clearAllContacts}
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 size={11} />
              Clear List
            </button>
          )}

          <select
            value={importGroup}
            onChange={(e) => setImportGroup(e.target.value as ContactGroup)}
            className="px-2.5 py-1.5 bg-white text-slate-800 rounded-lg text-[10px] font-bold border border-slate-300 shadow-sm cursor-pointer"
          >
            <option value="Carpenter">Carpenter</option>
            <option value="Interior">Interior</option>
            <option value="Builder">Builder</option>
            <option value="Other">Other</option>
          </select>

          <button
            onClick={handleNativeContactPicker}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm border border-indigo-500/30"
          >
            <Smartphone size={11} />
            Fetch Device Contacts
          </button>
        </div>
      </div>

      <div className="p-4 bg-slate-50/50 border-b border-slate-200 shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Drag & Drop Upload Zone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
            isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.vcf,.csv,.txt';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFileUpload(file);
            };
            input.click();
          }}
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <Upload size={14} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-700">Drag or Click to upload Contacts File</p>
            <p className="text-[9px] text-slate-400 font-bold">Supports vCard (.vcf) or Excel/Phone Contacts (.csv)</p>
          </div>
        </div>

        {/* Search & Statistics */}
        <div className="flex flex-col justify-between gap-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input 
              type="text" 
              placeholder="Search imported contacts by name, mobile, address..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>

          <div className="bg-indigo-50 border border-indigo-100/60 p-2.5 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-indigo-800 uppercase font-mono tracking-wider">Storage Statistics</span>
              <p className="text-[11px] font-extrabold text-slate-700">Total Imported: {contacts.length} Client contacts</p>
            </div>
            <span className="text-xs font-black text-indigo-700 bg-white border border-indigo-100 px-2 py-1 rounded-lg">
              {contacts.length} Active
            </span>
          </div>
        </div>
      </div>

      {/* Parse Preview Container */}
      {parsedContacts.length > 0 && (
        <div className="bg-amber-50/50 border-b border-amber-200 p-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest font-mono">Select contacts to import</span>
              <p className="text-xs font-extrabold text-slate-700">Parsed {parsedContacts.length} contacts from source</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAllParsed}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-[10px] font-black text-slate-700 flex items-center gap-1 transition"
              >
                {selectedParsedIds.size === parsedContacts.length ? <Square size={11} /> : <CheckSquare size={11} />}
                {selectedParsedIds.size === parsedContacts.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={importSelectedContacts}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-black shadow-sm flex items-center gap-1 transition"
              >
                <Check size={11} />
                Import Selected ({selectedParsedIds.size})
              </button>
            </div>
          </div>

          <div className="max-h-[160px] overflow-y-auto border border-amber-200/60 rounded-xl bg-white grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 custom-scrollbar">
            {parsedContacts.map(p => {
              const isSelected = selectedParsedIds.has(p.id);
              return (
                <div 
                  key={p.id}
                  onClick={() => toggleSelectParsed(p.id)}
                  className={`p-2 rounded-lg border transition flex items-center gap-3 cursor-pointer text-left ${
                    isSelected ? 'bg-indigo-50/55 border-indigo-300 shadow-xs' : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                  }`}>
                    {isSelected && <Check size={10} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[9px] font-mono text-slate-400">{p.mobile}</p>
                    <p className="text-[9px] text-slate-400 truncate mt-0.5">{p.address}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Display List wise showing contacts */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredContacts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredContacts.map((c, idx) => (
              <div 
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-slate-50/50 transition gap-3"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black font-mono">{idx + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[11px] font-extrabold text-slate-900 truncate">{c.name}</p>
                      <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm font-bold shrink-0">
                        {c.mobile}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 shrink-0 pl-11 sm:pl-0">
                  {/* WhatsApp click to message link */}
                  <a
                    href={getWhatsAppLink(c.mobile)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg text-emerald-600 transition flex items-center justify-center cursor-pointer hover:shadow-xs"
                    title="Send WhatsApp Message"
                  >
                    <MessageCircle size={14} className="fill-emerald-500/10" />
                  </a>

                  <button
                    onClick={() => deleteContact(c.id)}
                    className="p-1.5 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg text-rose-500 transition cursor-pointer"
                    title="Delete Contact"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-800">No imported contacts yet</p>
              <p className="text-[10px] text-slate-400 font-medium">Use the drag-and-drop file uploader or click Device Contacts to import client lists.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
