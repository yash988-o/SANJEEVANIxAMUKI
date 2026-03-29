import React, { useState } from 'react';
import { Phone, Settings, X, Loader2, Edit3, ChevronDown } from 'lucide-react';
import { calculateInterest } from '../lib/interestUtils';
import { supabase } from '../lib/supabaseClient';

export default function ProfileHeader({ profile, familyProfiles, transactions, selectedSubProfileId, setSelectedSubProfileId, onProfileUpdate }) {
  const [showSettings, setShowSettings] = useState(false);
  const [irate, setIrate] = useState(profile?.interest_rate || '');
  const [ifreq, setIfreq] = useState(profile?.interest_freq || 'monthly');
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeProfile = selectedSubProfileId === 'all' 
    ? profile 
    : (familyProfiles || []).find(p => p.id === selectedSubProfileId) || profile;

  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editData, setEditData] = useState({
    name: activeProfile?.name || '',
    mobile: activeProfile?.mobile || '',
    age: activeProfile?.age || '',
    gender: activeProfile?.gender || '',
    guardian: activeProfile?.guardian || '',
    guardian_age: activeProfile?.guardian_age || '',
    guardian_gender: activeProfile?.guardian_gender || ''
  });

  React.useEffect(() => {
    setEditData({
      name: activeProfile?.name || '',
      mobile: activeProfile?.mobile || '',
      age: activeProfile?.age || '',
      gender: activeProfile?.gender || '',
      guardian: activeProfile?.guardian || '',
      guardian_age: activeProfile?.guardian_age || '',
      guardian_gender: activeProfile?.guardian_gender || ''
    });
  }, [activeProfile, isEditing]);

  if (!profile) return null;

  const handleSaveInterest = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
       interest_rate: irate ? Number(irate) : null,
       interest_freq: ifreq
    }).eq('id', profile.id);
    
    if (!error && onProfileUpdate) {
      await onProfileUpdate();
    }
    setSaving(false);
    setShowSettings(false);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    const updObj = {
       name: editData.name,
       mobile: editData.mobile,
       age: editData.age ? Number(editData.age) : null,
       gender: editData.gender || null,
       guardian: editData.guardian || null,
       guardian_age: editData.guardian_age ? Number(editData.guardian_age) : null,
       guardian_gender: editData.guardian_gender || null
    };
    
    // Update active specific profile
    const { error } = await supabase.from('profiles').update(updObj).eq('id', activeProfile.id);
    
    // keep family guardian fields in sync
    if (familyProfiles && familyProfiles.length > 0) {
       const familyIds = familyProfiles.map(p => p.id);
       await supabase.from('profiles').update({
         guardian: editData.guardian || null,
         guardian_age: editData.guardian_age ? Number(editData.guardian_age) : null,
         guardian_gender: editData.guardian_gender || null
       }).in('id', familyIds);
    }
    
    if (!error && onProfileUpdate) {
      await onProfileUpdate();
    }
    setSavingEdit(false);
    setIsEditing(false);
  };

  const fatherName = profile?.guardian || 'Family Group';

  let totalGiven = 0;
  let totalReceived = 0;

  const activeTx = (transactions || []).filter(t => !t.is_cleared);
  activeTx.forEach(t => {
    if (t.type === 'give') totalGiven += Number(t.amount);
    if (t.type === 'receive') totalReceived += Number(t.amount);
  });

  const { principal, interest, total } = calculateInterest(activeTx, profile.interest_rate, profile.interest_freq);

  return (
    <div className="flex flex-col space-y-4 mb-6 relative">
      <div className="bg-white border border-borderBlue rounded-[16px] p-5 flex flex-col items-center text-center relative">
        <div className="absolute top-4 right-4 flex space-x-2">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-royal text-white' : 'bg-gray-50 text-gray-400 hover:text-royal hover:bg-royal/10'}`}
            title="Edit Profile"
          >
            <Edit3 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-royal text-white' : 'bg-gray-50 text-gray-400 hover:text-royal hover:bg-royal/10'}`}
            title="Configure Interest"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {isEditing ? (
          <div className="w-full text-left mt-10 space-y-3 px-2">
            <h3 className="font-bold text-[14px] text-navyDark border-b pb-1">Father / Main Profile Info</h3>
            <div>
              <label className="block text-[12px] font-bold text-navyDark mb-1">Father Name</label>
              <input type="text" value={editData.guardian} onChange={e => setEditData({...editData, guardian: e.target.value})} className="w-full h-10 px-3 rounded-[8px] border border-borderBlue focus:border-royal outline-none text-[14px]" placeholder="e.g. Ramesh" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-navyDark mb-1">Father Age</label>
                <input type="number" value={editData.guardian_age} onChange={e => setEditData({...editData, guardian_age: e.target.value})} className="w-full h-10 px-3 rounded-[8px] border border-borderBlue focus:border-royal outline-none text-[14px]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-navyDark mb-1">Father Gender</label>
                <select value={editData.guardian_gender} onChange={e => setEditData({...editData, guardian_gender: e.target.value})} className="w-full h-10 px-3 bg-white rounded-[8px] border border-borderBlue focus:border-royal outline-none text-[14px]">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <h3 className="font-bold text-[14px] text-navyDark border-b pb-1 mt-4 pt-4">Sub Name / Dependent Info</h3>
            <div>
              <label className="block text-[12px] font-bold text-navyDark mb-1">Sub Name</label>
              <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full h-10 px-3 rounded-[8px] border border-borderBlue focus:border-royal outline-none text-[14px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-navyDark mb-1">Sub Name Age</label>
                <input type="number" value={editData.age} onChange={e => setEditData({...editData, age: e.target.value})} className="w-full h-10 px-3 rounded-[8px] border border-borderBlue focus:border-royal outline-none text-[14px]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-navyDark mb-1">Sub Name Gender</label>
                <select value={editData.gender} onChange={e => setEditData({...editData, gender: e.target.value})} className="w-full h-10 px-3 bg-white rounded-[8px] border border-borderBlue focus:border-royal outline-none text-[14px]">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-navyDark mb-1">Mobile</label>
              <input type="text" value={editData.mobile} onChange={e => setEditData({...editData, mobile: e.target.value})} className="w-full h-10 px-3 rounded-[8px] border border-borderBlue focus:border-royal outline-none text-[14px]" />
            </div>
            <div className="flex space-x-2 pt-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 h-10 bg-gray-100 text-gray-600 font-bold rounded-[8px]">Cancel</button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 h-10 bg-royal text-white font-bold rounded-[8px] flex items-center justify-center">
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Info'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-[60px] h-[60px] bg-royal rounded-full flex items-center justify-center text-white font-bold text-[24px] mb-3 mt-4">
              {fatherName.charAt(0).toUpperCase()}
            </div>
            
            <div className="relative mb-2">
              <div 
                onClick={() => setDropdownOpen(!dropdownOpen)} 
                className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1 rounded-full border border-borderBlue hover:bg-gray-50 transition-colors"
                title="Select Profile View"
              >
                <h2 className="font-bold text-[20px] text-navyDark leading-none">{fatherName}</h2>
                <span className="text-muted text-[14px] font-medium hidden sm:inline">({selectedSubProfileId === 'all' ? 'Overview' : activeProfile.name})</span>
                <ChevronDown className="w-5 h-5 text-muted" />
              </div>
              
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white border border-borderBlue rounded-[12px] shadow-lg overflow-hidden z-50">
                     <div 
                       className={`px-4 py-3 cursor-pointer text-left text-[14px] hover:bg-bgPage transition-colors border-b border-borderBlue ${selectedSubProfileId === 'all' ? 'font-bold text-royal' : 'text-navyDark'}`}
                       onClick={() => { setSelectedSubProfileId('all'); setDropdownOpen(false); }}
                     >
                       Overview (All)
                     </div>
                     {(familyProfiles || []).map(p => (
                       <div 
                         key={p.id}
                         className={`px-4 py-3 cursor-pointer text-left text-[14px] hover:bg-bgPage transition-colors border-b border-borderBlue last:border-0 ${selectedSubProfileId === p.id ? 'font-bold text-royal' : 'text-navyDark'}`}
                         onClick={() => { setSelectedSubProfileId(p.id); setDropdownOpen(false); }}
                       >
                         {p.name}
                       </div>
                     ))}
                  </div>
                </>
              )}
            </div>

            {selectedSubProfileId !== 'all' && (
              <div className="text-[14px] font-bold text-royal mb-2 bg-royal/10 px-3 py-[2px] rounded-full">
                Viewing: {activeProfile.name}
              </div>
            )}

            <div className="flex items-center text-muted text-[14px] space-x-1 mb-3">
              <Phone className="w-4 h-4" />
              <span>{profile.mobile}</span>
            </div>

        
            <div className={`text-[16px] font-bold rounded-[20px] px-3 py-[6px] ${
          total > 0 ? 'bg-receiveBg text-receive' :
          total < 0 ? 'bg-giveBg text-give' :
          'bg-gray-100 text-gray-500'
        }`}>
          {total > 0 ? `Owes you ₹${Math.abs(total).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` :
           total < 0 ? `You owe ₹${Math.abs(total).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` :
           'All settled ₹0'}
        </div>
            {Math.abs(interest) > 0 && (
               <div className="text-[12px] text-muted mt-2 font-medium bg-gray-50 px-2 py-1 rounded-[6px]">
                 Includes <span className="font-bold text-navyDark">₹{Math.abs(interest).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span> interest
               </div>
            )}
          </>
        )}
      </div>

      {showSettings && (
        <div className="bg-white border border-borderBlue rounded-[16px] p-5 animate-fade-in shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[16px] text-navyDark">Interest Settings</h3>
            <button onClick={() => setShowSettings(false)} className="text-muted hover:text-navyDark">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[12px] font-bold text-navyDark mb-1">Rate (%)</label>
              <input 
                type="number" step="0.1" value={irate} onChange={(e) => setIrate(e.target.value)} 
                className="w-full h-10 px-3 flex items-center rounded-[8px] border border-borderBlue focus:border-royal outline-none text-[14px]"
                placeholder="e.g. 1.5"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-navyDark mb-1">Frequency</label>
              <select 
                value={ifreq} onChange={(e) => setIfreq(e.target.value)}
                className="w-full h-10 px-3 bg-white flex items-center rounded-[8px] border border-borderBlue focus:border-royal outline-none text-[14px]"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <button 
            onClick={handleSaveInterest} disabled={saving}
            className="w-full h-10 bg-royal hover:bg-royalDark text-white font-bold rounded-[8px] transition-colors flex items-center justify-center disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Interest Config'}
          </button>
        </div>
      )}

      {/* Summary Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-giveBg border border-give/20 rounded-[12px] p-4 text-center">
          <div className="text-give/80 text-[13px] mb-1 font-medium tracking-wide">Total Given</div>
          <div className="font-bold text-give text-[18px]">₹{totalGiven.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-receiveBg border border-receive/20 rounded-[12px] p-4 text-center">
          <div className="text-receive/80 text-[13px] mb-1 font-medium tracking-wide">Total Received</div>
          <div className="font-bold text-receive text-[18px]">₹{totalReceived.toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
}
