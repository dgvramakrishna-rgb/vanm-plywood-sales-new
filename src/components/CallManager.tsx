import React, { useState } from 'react';
import { Phone, Calendar, MessageSquare, Plus } from 'lucide-react';
import ContactsUploader, { ContactItem, ContactGroup } from './ContactsUploader';

interface CallManagerProps {
  // Add necessary props
}

export default function CallManager({}: CallManagerProps) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  
  // Modal state for post-call logging
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [remark, setRemark] = useState('');

  const handleCall = (contact: ContactItem) => {
    window.location.href = `tel:${contact.mobile}`;
    setSelectedContact(contact);
  };

  const handleLogCall = () => {
    console.log('Logging call:', selectedContact, followUpDate, remark);
    setSelectedContact(null);
    setFollowUpDate('');
    setRemark('');
  };

  const updateContactGroup = (id: string) => {
    setContacts(prev => prev.map(c => {
      if (c.id === id) {
        const currentIndex = groups.indexOf(c.group || 'Other');
        const nextIndex = (currentIndex + 1) % groups.length;
        return { ...c, group: groups[nextIndex] };
      }
      return c;
    }));
  };

  const getGroupColor = (group: ContactGroup) => {
    switch (group) {
      case 'Carpenter': return 'bg-amber-500';
      case 'Interior': return 'bg-indigo-500';
      case 'Builder': return 'bg-sky-500';
      default: return 'bg-slate-400';
    }
  };

  const groups: ContactGroup[] = ['Carpenter', 'Interior', 'Builder', 'Other'];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Contact Management</h2>
        <ContactsUploader onImportToVisits={setContacts} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Contacts to Call</h2>
        <div className="space-y-6">
          {groups.map(group => {
            const groupContacts = contacts.filter(c => (c.group || 'Other') === group);
            if (groupContacts.length === 0) return null;
            return (
              <div key={group}>
                <h3 className="text-xs font-black text-indigo-700 uppercase tracking-wide mb-2">{group}s</h3>
                <div className="space-y-2">
                  {groupContacts.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateContactGroup(contact.id)}
                          className={`w-2 h-2 rounded-full ${getGroupColor(contact.group || 'Other')}`}
                          title={`Group: ${contact.group || 'Other'}`}
                        />
                        <p className="text-xs font-bold">{contact.name}</p>
                      </div>
                      <button 
                        onClick={() => handleCall(contact)}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100"
                      >
                        <Phone size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedContact && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm space-y-4">
            <h3 className="text-sm font-bold">Log Call Follow-up</h3>
            <p className="text-xs text-slate-500">Contact: {selectedContact.name}</p>
            <input 
              type="date" 
              value={followUpDate} 
              onChange={e => setFollowUpDate(e.target.value)}
              className="w-full text-xs border p-2 rounded-lg"
            />
            <textarea 
              value={remark} 
              onChange={e => setRemark(e.target.value)}
              placeholder="Call remarks..."
              className="w-full text-xs border p-2 rounded-lg"
            />
            <div className="flex gap-2">
              <button onClick={() => setSelectedContact(null)} className="flex-1 py-2 text-xs border rounded-lg">Cancel</button>
              <button onClick={handleLogCall} className="flex-1 py-2 text-xs bg-indigo-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
