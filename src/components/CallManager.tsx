import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  MessageCircle, 
  Plus, 
  Search, 
  Trash2, 
  Users, 
  Upload, 
  UserPlus, 
  Folder, 
  Calendar, 
  X, 
  Check, 
  CheckSquare, 
  Square,
  Smartphone,
  Info,
  Layers,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export type ContactGroup = 'Customer' | 'Carpenter' | 'Interior' | 'Architect' | 'Builder' | 'Other';

export interface FollowUpContact {
  id: string;
  name: string;
  mobile: string;
  group: ContactGroup;
  interior: string;
  remarks: string;
  nextFollowUp: string;
  address?: string;
  createdAt?: string;
}

interface CallManagerProps {
  onTriggerToast?: (msg: string, type?: 'success' | 'info') => void;
}

export default function CallManager({ onTriggerToast }: CallManagerProps) {
  // Main contacts list state
  const [contacts, setContacts] = useState<FollowUpContact[]>(() => {
    const saved = localStorage.getItem('fieldconnect_followup_contacts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved follow-up contacts', e);
      }
    }
    // Return some beautiful initial demo contacts if none exist
    return [
      {
        id: 'demo-c1',
        name: 'Ramesh Kumar (Carpenter)',
        mobile: '9848022338',
        group: 'Carpenter',
        interior: 'Venkata Sai Interiors',
        remarks: 'Discussed wardrobe measurements. Promised to start work on Friday.',
        nextFollowUp: '12/07/2026',
        address: 'Plot 104, Miyapur, Hyderabad'
      },
      {
        id: 'demo-c2',
        name: 'Anitha Reddy (Customer)',
        mobile: '9440123456',
        group: 'Customer',
        interior: 'Elegant Spaces Studio',
        remarks: 'Requires quotation for duplex villa TV unit and modular kitchen.',
        nextFollowUp: '09/07/2026',
        address: 'Flat 402, Gachibowli, Hyderabad'
      },
      {
        id: 'demo-c3',
        name: 'Suresh Carpenter',
        mobile: '8885567890',
        group: 'Carpenter',
        interior: 'Suresh Designs',
        remarks: 'Asked for ply wood recommendation. Prefers Gurjan ply.',
        nextFollowUp: '10/07/2026',
        address: 'Kukatpally Housing Board, Hyderabad'
      },
      {
        id: 'demo-c4',
        name: 'Vikas Sharma (Interior)',
        mobile: '9123456780',
        group: 'Interior',
        interior: 'Self Designed',
        remarks: 'Regular designer partner. Has 2 new projects in Kondapur.',
        nextFollowUp: '15/07/2026',
        address: 'Hitech City, Hyderabad'
      }
    ];
  });

  // UI state filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroupTab, setActiveGroupTab] = useState<'All' | ContactGroup>('All');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  
  // Pop-up modal state for logging remarks
  const [activeCallContact, setActiveCallContact] = useState<FollowUpContact | null>(null);
  const [popupRemarks, setPopupRemarks] = useState('');
  const [popupNextFollowUp, setPopupNextFollowUp] = useState('');
  const [popupGroup, setPopupGroup] = useState<ContactGroup>('Customer');
  const [popupInterior, setPopupInterior] = useState('');

  // Bulk operation states
  const [bulkGroupTarget, setBulkGroupTarget] = useState<ContactGroup>('Customer');
  const [showBulkPanel, setShowBulkPanel] = useState(false);

  // Manual contact addition form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactMobile, setNewContactMobile] = useState('');
  const [newContactGroup, setNewContactGroup] = useState<ContactGroup>('Customer');
  const [newContactInterior, setNewContactInterior] = useState('');
  const [newContactRemarks, setNewContactRemarks] = useState('');
  const [newContactNextFollow, setNewContactNextFollow] = useState('');

  // Save contacts whenever updated
  useEffect(() => {
    localStorage.setItem('fieldconnect_followup_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Handle native Contact Picker API if supported
  const handleNativeContactPicker = async () => {
    if (window.self !== window.top) {
      triggerToast('Device Contact Picker is not available in the embedded preview frame. Please use File Upload or Demo Contacts.', 'info');
      return;
    }

    const nav = navigator as any;
    if (nav.contacts && nav.contacts.select) {
      try {
        const props = ['name', 'tel'];
        const options = { multiple: true };
        const deviceContacts = await nav.contacts.select(props, options);
        
        if (deviceContacts && deviceContacts.length > 0) {
          const formatted: FollowUpContact[] = deviceContacts.map((c: any, index: number) => {
            const rawPhone = c.tel && c.tel[0] ? c.tel[0] : '';
            const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
            const rawName = c.name && c.name[0] ? c.name[0] : 'Unnamed Contact';
            
            // Try to auto-detect if the name implies Carpenter, Interior etc.
            let detectedGroup: ContactGroup = 'Customer';
            const lowerName = rawName.toLowerCase();
            if (lowerName.includes('carpenter') || lowerName.includes('carp')) {
              detectedGroup = 'Carpenter';
            } else if (lowerName.includes('interior') || lowerName.includes('design')) {
              detectedGroup = 'Interior';
            } else if (lowerName.includes('builder') || lowerName.includes('contractor')) {
              detectedGroup = 'Builder';
            } else if (lowerName.includes('architect') || lowerName.includes('arch')) {
              detectedGroup = 'Architect';
            }

            return {
              id: `native-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
              name: rawName,
              mobile: cleanPhone || 'No Mobile',
              group: detectedGroup,
              interior: detectedGroup === 'Interior' ? rawName : '',
              remarks: '',
              nextFollowUp: '',
              createdAt: new Date().toISOString()
            };
          });

          // Filter out existing phone numbers to prevent duplicates
          const uniqueNewContacts = formatted.filter(
            newC => !contacts.some(existingC => existingC.mobile === newC.mobile && newC.mobile !== 'No Mobile')
          );

          if (uniqueNewContacts.length > 0) {
            setContacts(prev => [...uniqueNewContacts, ...prev]);
            triggerToast(`Successfully imported ${uniqueNewContacts.length} new contacts from device!`, 'success');
          } else {
            triggerToast('All selected device contacts are already in your Follow-Up list.', 'info');
          }
        }
      } catch (err: any) {
        console.error('Contact Picker API Error:', err);
        triggerToast('Device contact picker was cancelled or not allowed.', 'info');
      }
    } else {
      triggerToast('Device Contact Picker not supported by your browser. Populating mock phone contacts instead!', 'info');
      loadSimulationContacts();
    }
  };

  // Populate realistic contacts for testing
  const loadSimulationContacts = () => {
    const demoList: FollowUpContact[] = [
      {
        id: `demo-${Date.now()}-1`,
        name: 'Srinivas Achary (Carpenter)',
        mobile: '9849552101',
        group: 'Carpenter',
        interior: 'Pranavi Decors',
        remarks: 'Wants to meet tomorrow for discussing hardware accessories.',
        nextFollowUp: '08/07/2026',
        address: 'Nizampet Road, Hyderabad'
      },
      {
        id: `demo-${Date.now()}-2`,
        name: 'Pradeep Interior Designer',
        mobile: '7799512345',
        group: 'Interior',
        interior: 'Pradeep Concepts',
        remarks: 'Requested material catalogues for luxury laminate sheets.',
        nextFollowUp: '11/07/2026',
        address: 'Madhapur Metro Station, Hyderabad'
      },
      {
        id: `demo-${Date.now()}-3`,
        name: 'Venkatesh Babu (Architect)',
        mobile: '9490158223',
        group: 'Architect',
        interior: 'V-Studio Architects',
        remarks: 'Shared site layout plans. Need to verify wood thickness requirements.',
        nextFollowUp: '14/07/2026',
        address: 'Banjara Hills Rd 12, Hyderabad'
      },
      {
        id: `demo-${Date.now()}-4`,
        name: 'Balaji Builders & Developers',
        mobile: '9000123488',
        group: 'Builder',
        interior: 'In-house Architects',
        remarks: 'Project structure ready. Carpentry starting next fortnight.',
        nextFollowUp: '20/07/2026',
        address: 'Pragathi Nagar, Hyderabad'
      }
    ];

    // Filter duplicates
    const finalNew = demoList.filter(d => !contacts.some(c => c.mobile === d.mobile));
    if (finalNew.length > 0) {
      setContacts(prev => [...finalNew, ...prev]);
      triggerToast(`Uploaded ${finalNew.length} phone contacts successfully!`, 'success');
    } else {
      triggerToast('Demo contacts already uploaded and exist in the tracker list.', 'info');
    }
  };

  // Helper trigger notifications toast
  const triggerToast = (msg: string, type: 'success' | 'info' = 'info') => {
    if (onTriggerToast) {
      onTriggerToast(msg, type);
    } else {
      alert(`${type.toUpperCase()}: ${msg}`);
    }
  };

  // File parsers
  const parseVCF = (text: string): FollowUpContact[] => {
    const contactsList: FollowUpContact[] = [];
    const vcards = text.split(/BEGIN:VCARD/gi);
    
    vcards.forEach((vcard, index) => {
      if (!vcard.trim()) return;
      
      let name = '';
      const fnMatch = vcard.match(/FN:(.+)/i);
      const nMatch = vcard.match(/N:(.+)/i);
      if (fnMatch && fnMatch[1]) {
        name = fnMatch[1].trim();
      } else if (nMatch && nMatch[1]) {
        const parts = nMatch[1].split(';');
        const first = parts[1] ? parts[1].trim() : '';
        const last = parts[0] ? parts[0].trim() : '';
        name = `${first} ${last}`.trim();
      }
      if (!name) name = 'Phone Contact';

      let mobile = '';
      const telMatches = [...vcard.matchAll(/TEL[^:]*:(.+)/gi)];
      if (telMatches.length > 0) {
        const cellMatch = telMatches.find(m => m[0].toLowerCase().includes('cell') || m[0].toLowerCase().includes('pref'));
        const activeMatch = cellMatch || telMatches[0];
        mobile = activeMatch[1].replace(/[^\d+]/g, '').trim();
      }

      if (name && mobile) {
        let group: ContactGroup = 'Customer';
        const ln = name.toLowerCase();
        if (ln.includes('carpenter') || ln.includes('carp')) group = 'Carpenter';
        else if (ln.includes('interior') || ln.includes('design')) group = 'Interior';
        else if (ln.includes('architect') || ln.includes('arch')) group = 'Architect';
        else if (ln.includes('builder')) group = 'Builder';

        contactsList.push({
          id: `vcf-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
          name,
          mobile,
          group,
          interior: group === 'Interior' ? name : '',
          remarks: '',
          nextFollowUp: '',
          createdAt: new Date().toISOString()
        });
      }
    });
    return contactsList;
  };

  const parseCSV = (text: string): FollowUpContact[] => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];
    
    const header = lines[0].toLowerCase().split(/,|;/);
    const contactsList: FollowUpContact[] = [];
    
    const nameIdx = header.findIndex(h => h.includes('name') || h.includes('first') || h.includes('full'));
    const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('tel') || h.includes('number'));
    const interiorIdx = header.findIndex(h => h.includes('interior') || h.includes('designer') || h.includes('firm'));
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(/,|;/);
      const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx].replace(/^["']|["']$/g, '').trim() : 'Phone Contact';
      const rawPhone = phoneIdx !== -1 && cols[phoneIdx] ? cols[phoneIdx].replace(/^["']|["']$/g, '').trim() : '';
      const mobile = rawPhone.replace(/[^\d+]/g, '') || '';
      const interior = interiorIdx !== -1 && cols[interiorIdx] ? cols[interiorIdx].replace(/^["']|["']$/g, '').trim() : '';
      
      if (name && mobile) {
        let group: ContactGroup = 'Customer';
        const ln = name.toLowerCase();
        if (ln.includes('carpenter') || ln.includes('carp')) group = 'Carpenter';
        else if (ln.includes('interior') || ln.includes('design') || interior) group = 'Interior';
        else if (ln.includes('architect') || ln.includes('arch')) group = 'Architect';
        else if (ln.includes('builder')) group = 'Builder';

        contactsList.push({
          id: `csv-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          name,
          mobile,
          group,
          interior: interior || (group === 'Interior' ? name : ''),
          remarks: '',
          nextFollowUp: '',
          createdAt: new Date().toISOString()
        });
      }
    }
    return contactsList;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      let parsed: FollowUpContact[] = [];
      if (extension === 'vcf') {
        parsed = parseVCF(text);
      } else if (extension === 'csv' || extension === 'txt') {
        parsed = parseCSV(text);
      } else {
        triggerToast('Unsupported file format. Please upload .vcf or .csv contact lists.', 'info');
        return;
      }

      if (parsed.length > 0) {
        const uniqueNew = parsed.filter(
          newC => !contacts.some(existingC => existingC.mobile === newC.mobile)
        );

        if (uniqueNew.length > 0) {
          setContacts(prev => [...uniqueNew, ...prev]);
          triggerToast(`Parsed ${parsed.length} contacts! Imported ${uniqueNew.length} new records.`, 'success');
        } else {
          triggerToast(`Parsed ${parsed.length} contacts, but all already exist in your directory.`, 'info');
        }
      } else {
        triggerToast('Could not find any valid contact name & mobile pairs in the file.', 'info');
      }
    };
    reader.readAsText(file);
  };

  // Add a new contact manually
  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      triggerToast('Please enter a Contact Name', 'info');
      return;
    }
    if (!newContactMobile.trim() || newContactMobile.replace(/\D/g, '').length < 8) {
      triggerToast('Please enter a valid mobile number', 'info');
      return;
    }

    const cleanNum = newContactMobile.replace(/[^\d+]/g, '');
    const newContact: FollowUpContact = {
      id: `manual-${Date.now()}`,
      name: newContactName.trim(),
      mobile: cleanNum,
      group: newContactGroup,
      interior: newContactInterior.trim(),
      remarks: newContactRemarks.trim(),
      nextFollowUp: newContactNextFollow.trim(),
      createdAt: new Date().toISOString()
    };

    setContacts(prev => [newContact, ...prev]);
    triggerToast(`Added contact "${newContact.name}" to Follow-Up directory!`, 'success');

    // Reset form
    setNewContactName('');
    setNewContactMobile('');
    setNewContactGroup('Customer');
    setNewContactInterior('');
    setNewContactRemarks('');
    setNewContactNextFollow('');
    setShowAddForm(false);
  };

  // Handle Action Trigger for Calling
  const triggerPhoneCall = (contact: FollowUpContact) => {
    // Open Dialer natively
    window.location.href = `tel:${contact.mobile}`;
    
    // Auto trigger the requested modal popup
    setActiveCallContact(contact);
    setPopupRemarks(contact.remarks || '');
    setPopupNextFollowUp(contact.nextFollowUp || '');
    setPopupGroup(contact.group);
    setPopupInterior(contact.interior || '');
  };

  // Save the post-call follow-up remarks
  const savePostCallRemarks = () => {
    if (!activeCallContact) return;

    setContacts(prev => prev.map(c => {
      if (c.id === activeCallContact.id) {
        return {
          ...c,
          remarks: popupRemarks,
          nextFollowUp: popupNextFollowUp,
          group: popupGroup,
          interior: popupInterior
        };
      }
      return c;
    }));

    triggerToast(`Updated follow-up details for ${activeCallContact.name}`, 'success');
    setActiveCallContact(null);
  };

  // Delete a contact
  const handleDeleteContact = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from your follow up lists?`)) {
      setContacts(prev => prev.filter(c => c.id !== id));
      setSelectedContactIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      triggerToast(`Removed "${name}"`, 'info');
    }
  };

  // Bulk operation checktoggle
  const toggleSelectAll = (filteredContacts: FollowUpContact[]) => {
    const allSelectedInFiltered = filteredContacts.every(c => selectedContactIds.has(c.id));
    const next = new Set(selectedContactIds);
    if (allSelectedInFiltered) {
      filteredContacts.forEach(c => next.delete(c.id));
    } else {
      filteredContacts.forEach(c => next.add(c.id));
    }
    setSelectedContactIds(next);
  };

  const toggleSelectContact = (id: string) => {
    const next = new Set(selectedContactIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedContactIds(next);
  };

  // Apply group to all selected contacts
  const applyBulkGroup = () => {
    if (selectedContactIds.size === 0) {
      triggerToast('Please select contacts first using the checkboxes.', 'info');
      return;
    }

    setContacts(prev => prev.map(c => {
      if (selectedContactIds.has(c.id)) {
        return { ...c, group: bulkGroupTarget };
      }
      return c;
    }));

    triggerToast(`Moved ${selectedContactIds.size} contacts to group: ${bulkGroupTarget}!`, 'success');
    setSelectedContactIds(new Set());
    setShowBulkPanel(false);
  };

  // Delete all selected contacts
  const deleteSelectedContacts = () => {
    if (selectedContactIds.size === 0) return;
    if (confirm(`Are you sure you want to delete all ${selectedContactIds.size} selected contacts?`)) {
      setContacts(prev => prev.filter(c => !selectedContactIds.has(c.id)));
      setSelectedContactIds(new Set());
      triggerToast('Selected contacts deleted.', 'info');
    }
  };

  // WhatsApp helper
  const openWhatsApp = (contact: FollowUpContact) => {
    const cleanNum = contact.mobile.replace(/\D/g, '');
    const numWithCountry = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    const text = `Hello ${contact.name} garu, hope you are doing well. Please share project update.`;
    const url = `https://wa.me/${numWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Filtering list based on search and selected tab
  const filteredContacts = contacts.filter(contact => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      contact.name.toLowerCase().includes(query) ||
      contact.mobile.includes(query) ||
      (contact.interior || '').toLowerCase().includes(query) ||
      (contact.remarks || '').toLowerCase().includes(query);

    const matchesTab = activeGroupTab === 'All' || contact.group === activeGroupTab;

    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="call-manager-root">
      
      {/* Upper Action Banner - Options & Tools */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-lg relative overflow-hidden" id="call-manager-header">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-48 h-48 rounded-full bg-indigo-600/10 blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 z-10">
            <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase font-mono bg-indigo-500/10 px-2 py-1 rounded">
              📱 CONTACTS TRACKER & BULK ASSIGNER
            </span>
            <h2 className="text-lg font-black tracking-tight font-sans">Mobile Contacts Follow-Ups</h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl font-medium">
              Import entire client lists from phone storage. Categorize, search, trigger calls, and instantly record talking updates to keep subsequent calls context-aware.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0 z-10">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              Manual Contact
            </button>

            <button
              onClick={handleNativeContactPicker}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Select contacts directly from your mobile address book"
            >
              <Smartphone size={14} className="text-indigo-400" />
              Upload Contacts
            </button>

            <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer">
              <Upload size={14} className="text-emerald-400" />
              <span>Import VCF/CSV</span>
              <input 
                type="file" 
                accept=".csv,.vcf,.txt" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* Info Strip */}
        <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Users size={12} className="text-indigo-400" />
            <strong>Total Directory Size:</strong> {contacts.length} Contacts
          </span>
          <span className="flex items-center gap-1">
            <CheckCircleIcon size={12} className="text-emerald-400" />
            <strong>With Remarks:</strong> {contacts.filter(c => c.remarks).length} Records logged
          </span>
          <span className="text-slate-500 font-mono hidden sm:inline">|</span>
          <button 
            onClick={loadSimulationContacts} 
            className="text-indigo-400 hover:text-indigo-300 transition text-[11px] font-black underline decoration-indigo-500/30 cursor-pointer flex items-center gap-1"
          >
            <Sparkles size={11} /> Load Demo Phone List
          </button>
        </div>
      </div>

      {/* Manual Addition Slide-Out Form */}
      {showAddForm && (
        <form onSubmit={handleAddContactSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-slide-down" id="add-contact-form">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <UserPlus size={14} className="text-indigo-600" />
              Add New Follow-Up Contact
            </h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Contact Name</label>
              <input
                type="text"
                placeholder="e.g. Anand Kumar (Carpenter)"
                value={newContactName}
                onChange={e => setNewContactName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. 98480xxxxx"
                value={newContactMobile}
                onChange={e => setNewContactMobile(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assign Group</label>
              <select
                value={newContactGroup}
                onChange={e => setNewContactGroup(e.target.value as ContactGroup)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-slate-700"
              >
                <option value="Customer">Customer</option>
                <option value="Carpenter">Carpenter</option>
                <option value="Interior">Interior</option>
                <option value="Architect">Architect</option>
                <option value="Builder">Builder</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Interior Designer / Details</label>
              <input
                type="text"
                placeholder="e.g. Creative Spaces Studio"
                value={newContactInterior}
                onChange={e => setNewContactInterior(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">First Conversation Remarks (Optional)</label>
              <textarea
                placeholder="Enter talk details, wood preferences, quote requests..."
                rows={2}
                value={newContactRemarks}
                onChange={e => setNewContactRemarks(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Next Follow-Up Update (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 15/07/2026 or Next Monday"
                value={newContactNextFollow}
                onChange={e => setNewContactNextFollow(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-black hover:bg-slate-800 transition cursor-pointer shadow-xs"
            >
              Add to Directory
            </button>
          </div>
        </form>
      )}

      {/* Main Filter & Navigation Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs" id="directory-list-container">
        
        {/* Search, Filter Tabs and Bulk Tools Header */}
        <div className="p-4 bg-slate-50/75 border-b border-slate-200 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search Bar */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search phone numbers, customer/carpenter names, or interiors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition shadow-3xs"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Bulk Actions Button Trigger */}
            <div className="flex items-center gap-2.5 self-end lg:self-auto">
              {selectedContactIds.size > 0 && (
                <div className="flex items-center gap-2 animate-scale-up">
                  <span className="text-[10px] font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">
                    {selectedContactIds.size} SELECTED
                  </span>
                  
                  <button
                    onClick={() => setShowBulkPanel(!showBulkPanel)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Layers size={11} />
                    Group Selected
                  </button>

                  <button
                    onClick={deleteSelectedContacts}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 rounded-lg transition"
                    title="Delete Selected Contacts"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Group Tabs selection */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap gap-1.5" id="group-tabs">
              {(['All', 'Customer', 'Carpenter', 'Interior', 'Architect', 'Builder', 'Other'] as const).map(tab => {
                const count = tab === 'All' ? contacts.length : contacts.filter(c => c.group === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveGroupTab(tab)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      activeGroupTab === tab
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-950 hover:bg-slate-100/50 border border-slate-200'
                    }`}
                  >
                    <span>{tab === 'All' ? '🌐 All Contacts' : tab}</span>
                    <span className={`text-[9px] font-mono font-black rounded-full px-1.5 py-0.25 ${
                      activeGroupTab === tab ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] font-mono text-slate-500 font-bold">
              Showing {filteredContacts.length} of {contacts.length} entries
            </p>
          </div>

          {/* Bulk Update panel */}
          {showBulkPanel && selectedContactIds.size > 0 && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-slide-down">
              <div className="flex items-center gap-1.5">
                <Info size={13} className="text-indigo-600" />
                <p className="text-xs font-bold text-slate-700">
                  Bulk edit group for the <strong className="text-indigo-700">{selectedContactIds.size} selected</strong> contacts:
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={bulkGroupTarget}
                  onChange={e => setBulkGroupTarget(e.target.value as ContactGroup)}
                  className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 outline-none shadow-3xs cursor-pointer"
                >
                  <option value="Customer">Customer</option>
                  <option value="Carpenter">Carpenter</option>
                  <option value="Interior">Interior</option>
                  <option value="Architect">Architect</option>
                  <option value="Builder">Builder</option>
                  <option value="Other">Other</option>
                </select>

                <button
                  onClick={applyBulkGroup}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-lg transition cursor-pointer"
                >
                  Apply Group
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Contacts Table List */}
        {filteredContacts.length > 0 ? (
          <div className="divide-y divide-slate-100" id="follow-up-contacts-table">
            
            {/* Header column line for Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono shrink-0">
              <div className="col-span-1 flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => toggleSelectAll(filteredContacts)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {filteredContacts.every(c => selectedContactIds.has(c.id)) ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} />}
                </button>
                <span>Select</span>
              </div>
              <div className="col-span-3">Contact Detail</div>
              <div className="col-span-2">Interior Designer</div>
              <div className="col-span-4">Latest Spoke Remarks</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* List Row Items */}
            {filteredContacts.map((contact, idx) => {
              const isSelected = selectedContactIds.has(contact.id);
              return (
                <div 
                  key={contact.id} 
                  className={`grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 py-4 md:px-6 items-start transition-colors ${
                    isSelected ? 'bg-indigo-50/20' : 'hover:bg-slate-50/50'
                  }`}
                  id={`contact-row-${contact.id}`}
                >
                  
                  {/* Col 1: Checkbox Selection and Number Order */}
                  <div className="col-span-1 flex items-center justify-between md:justify-start gap-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectContact(contact.id)}
                        className="text-slate-400 hover:text-indigo-600 transition"
                      >
                        {isSelected ? <CheckSquare size={15} className="text-indigo-600" /> : <Square size={15} />}
                      </button>
                      <span className="text-[10px] font-bold font-mono text-slate-400">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Group tag for mobile */}
                    <span className={`md:hidden px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${getGroupColors(contact.group)}`}>
                      {contact.group}
                    </span>
                  </div>

                  {/* Col 2: Name & Phone Number */}
                  <div className="col-span-3 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        {contact.name}
                      </h4>
                      
                      {/* Group badge for desktop */}
                      <span className={`hidden md:inline px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${getGroupColors(contact.group)}`}>
                        {contact.group}
                      </span>
                    </div>

                    {/* Phone Number Display */}
                    <p className="text-xs font-mono font-bold text-indigo-700 flex items-center gap-1">
                      <Phone size={11} className="text-slate-400" />
                      {contact.mobile}
                    </p>

                    {contact.address && (
                      <p className="text-[10px] text-slate-400 leading-tight truncate">
                        📍 {contact.address}
                      </p>
                    )}
                  </div>

                  {/* Col 3: Interior Designer Category */}
                  <div className="col-span-2 space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block md:hidden">Interior Designer:</span>
                    {contact.interior ? (
                      <div className="inline-flex items-center gap-1 bg-teal-50 border border-teal-100/60 px-2.5 py-1 rounded-lg text-teal-800 text-[11px] font-extrabold shadow-3xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                        <span className="truncate max-w-[120px]" title={contact.interior}>{contact.interior}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No designer set</span>
                    )}
                  </div>

                  {/* Col 4: Last Spoke Remarks & Next Follow Up */}
                  <div className="col-span-4 space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block md:hidden">Talk Remarks:</span>
                    
                    {contact.remarks ? (
                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl space-y-1">
                        <p className="text-[11px] text-slate-700 leading-snug font-medium italic">
                          "{contact.remarks}"
                        </p>
                        
                        {contact.nextFollowUp && (
                          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 text-[10px] font-bold text-indigo-700">
                            <Calendar size={11} className="text-slate-400" />
                            <span>Next update: {contact.nextFollowUp}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic flex items-center gap-1">
                        <Info size={11} className="text-slate-300" />
                        <span>No conversation logged yet. Tap the phone call icon to start!</span>
                      </div>
                    )}
                  </div>

                  {/* Col 5: Actions: Call and WhatsApp buttons */}
                  <div className="col-span-2 flex items-center justify-end gap-2 pt-2 md:pt-0">
                    
                    {/* Call Symbol */}
                    <button
                      onClick={() => triggerPhoneCall(contact)}
                      className="p-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-100 hover:border-indigo-600 rounded-xl transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold"
                      title="Initiate phone call & log remarks"
                    >
                      <Phone size={13} className="fill-current" />
                      <span className="md:hidden">Call Now</span>
                    </button>

                    {/* WhatsApp Symbol */}
                    <button
                      onClick={() => openWhatsApp(contact)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-100 hover:border-emerald-600 rounded-xl transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold"
                      title="Send WhatsApp update message"
                    >
                      <MessageCircle size={13} className="fill-current" />
                      <span className="md:hidden">WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleDeleteContact(contact.id, contact.name)}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition cursor-pointer"
                      title="Delete contact"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Users size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-800">No contacts match the filter</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No results for "{searchQuery}" under group tab {activeGroupTab}. Clear the filter or add simulated mock contacts to test immediately!
              </p>
            </div>
            <button
              onClick={() => { setSearchQuery(''); setActiveGroupTab('All'); }}
              className="px-3.5 py-1.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Pop-Up Modal: "Contact [X] spoke. Remarks should be written." */}
      {activeCallContact && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-fade-in" id="post-call-remarks-modal">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Header matching exact user format requirements */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 relative">
              <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-32 h-32 rounded-full bg-white/5 blur-xl pointer-events-none"></div>
              
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-indigo-300 font-mono tracking-widest uppercase bg-indigo-400/10 px-2 py-0.5 rounded">
                    POST-CALL LOGGING popup
                  </span>
                  <h3 className="text-sm md:text-base font-black tracking-tight leading-snug">
                    Contact "{activeCallContact.name}" spoke. Remarks should be written.
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCallContact(null)}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              
              {/* Contact mini header display */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Contact Name</span>
                  <p className="font-extrabold text-slate-800 truncate">{activeCallContact.name}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Phone Number</span>
                  <p className="font-mono font-bold text-indigo-700">{activeCallContact.mobile}</p>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Category Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Group Category</label>
                    <select
                      value={popupGroup}
                      onChange={e => setPopupGroup(e.target.value as ContactGroup)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="Customer">Customer</option>
                      <option value="Carpenter">Carpenter</option>
                      <option value="Interior">Interior</option>
                      <option value="Architect">Architect</option>
                      <option value="Builder">Builder</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Interior designer Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Interior Designer / Details</label>
                    <input
                      type="text"
                      placeholder="e.g. Elegant Woodwork Studio"
                      value={popupInterior}
                      onChange={e => setPopupInterior(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Talk Remarks */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Talk Remarks <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    placeholder="Enter what the contact spoke. e.g. Wants 20mm plywood quotation, agreed to visit store next Tuesday..."
                    rows={3}
                    value={popupRemarks}
                    onChange={e => setPopupRemarks(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none font-medium leading-relaxed"
                    required
                  />
                </div>

                {/* Next Follow-Up Date/Instructions */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Next Follow-Up Update / Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type="text"
                      placeholder="e.g. 15/07/2026 or Friday afternoon"
                      value={popupNextFollowUp}
                      onChange={e => setPopupNextFollowUp(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setActiveCallContact(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Dismiss / Cancel
              </button>
              
              <button
                onClick={savePostCallRemarks}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
              >
                Save & Close Popup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline custom mini components for style alignment
function CheckCircleIcon({ size = 14, className = "" }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

// Group tag styling colors mapping helper
function getGroupColors(group: ContactGroup) {
  switch (group) {
    case 'Customer':
      return 'bg-blue-50 text-blue-800 border border-blue-100/50';
    case 'Carpenter':
      return 'bg-amber-50 text-amber-800 border border-amber-100/50';
    case 'Interior':
      return 'bg-teal-50 text-teal-800 border border-teal-100/50';
    case 'Architect':
      return 'bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-100/50';
    case 'Builder':
      return 'bg-sky-50 text-sky-800 border border-sky-100/50';
    default:
      return 'bg-slate-50 text-slate-700 border border-slate-100';
  }
}
