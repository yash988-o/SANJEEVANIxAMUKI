import React, { useState, useEffect } from 'react';
import { Phone, Settings, X, Loader2, ChevronDown } from 'lucide-react';
import { calculateInterest } from '../lib/interestUtils';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function ProfileHeader({ profile, transactions, onProfileUpdate }) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [irate, setIrate] = useState(profile?.interest_rate || '');
  const [ifreq, setIfreq] = useState(profile?.interest_freq || 'monthly');
  const [saving, setSaving] = useState(false);
  const [siblings, setSiblings] = useState([]);

  useEffect(() => {
    if (profile?.mobile) {
      supabase.from('profiles')
        .select('id, name')
        .eq('mobile', profile.mobile)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 1) {
            setSiblings(data);
          }
        });
    }
  }, [profile]);

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
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-4 right-4 p-2 bg-gray-50 text-gray-400 hover:text-royal hover:bg-royal/10 rounded-full transition-colors"
          title="Configure Interest"
        >
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-[60px] h-[60px] bg-royal rounded-full flex items-center justify-center text-white font-bold text-[24px] mb-3">
          {profile.name?.charAt(0).toUpperCase()}
        </div>
        
        {siblings.length > 1 ? (
          <div className="relative mb-2 flex items-center justify-center min-w-[150px]">
            <select 
               value={profile.id}
               onChange={(e) => navigate(`/profile/${e.target.value}`)}
               className="appearance-none font-bold text-[22px] text-navyDark bg-transparent pr-6 cursor-pointer outline-none focus:ring-0 text-center"
            >
               {siblings.map(sib => (
                 <option key={sib.id} value={sib.id}>{sib.name}</option>
               ))}
            </select>
            <ChevronDown className="w-5 h-5 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-navyDark" />
          </div>
        ) : (
          <h2 className="font-bold text-[22px] text-navyDark leading-none mb-2">{profile.name}</h2>
        )}

        <div className="flex items-center text-muted text-[14px] space-x-1 mb-4">
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
