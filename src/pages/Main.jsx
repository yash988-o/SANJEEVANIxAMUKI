import React, { useState, useEffect, useRef } from 'react';
import { Phone, Loader2, IndianRupee, Plus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import TransactionCard from '../components/TransactionCard';

export default function Main() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('receive');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [category, setCategory] = useState('Standard');
  const [datetime, setDatetime] = useState('');
  const [note, setNote] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const [errors, setErrors] = useState({});
  const { showToast } = useToast();
  const suggestionsRef = useRef(null);

  useEffect(() => {
    // Current local datetime for input
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDatetime(now.toISOString().slice(0, 16));
    
    fetchRecentTransactions();

    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!name.trim()) {
      setNameSuggestions([]);
      if (selectedProfileId) setSelectedProfileId(null);
      return;
    }

    if (selectedProfileId) return; // if already selected from list, don't search again unless name changed outside list

    const delayDebounceFn = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, mobile, age, gender')
        .ilike('name', `%${name}%`)
        .limit(5);

      if (data) setNameSuggestions(data);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [name, selectedProfileId]);

  const fetchRecentTransactions = async () => {
    setLoadingRecent(true);
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles ( name, mobile, age, gender )
      `)
      .eq('is_deleted', false)
      .order('transaction_at', { ascending: false })
      .limit(20);
      
    if (!error && data) {
      setRecentTransactions(data);
    }
    setLoadingRecent(false);
  };

  const handleSelectSuggestion = (profile) => {
    setName(profile.name);
    setMobile(profile.mobile);
    setAge(profile.age || '');
    setGender(profile.gender || '');
    setSelectedProfileId(profile.id);
    setShowSuggestions(false);
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    setSelectedProfileId(null);
    setShowSuggestions(true);
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Customer Name is required.';
    if (!mobile.trim() || !/^\d{10}$/.test(mobile.replace(/\D/g, ''))) newErrors.mobile = 'Exactly 10 digits required.';
    if (!amount || Number(amount) <= 0) newErrors.amount = 'Valid positive amount is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    
    try {
      let pid = selectedProfileId;
      
      // Create new profile if not selected
      if (!pid) {
        // Check if mobile already exists
        const { data: existing } = await supabase.from('profiles').select('id, name').eq('mobile', mobile).single();
        if (existing) {
          pid = existing.id;
          if (existing.name !== name) {
            showToast(`Mobile already registered to ${existing.name}. Transaction added to them.`, 'info');
          }
        } else {
          const { data: newProfile, error: profileErr } = await supabase
            .from('profiles')
            .insert({ name: name.trim(), mobile: mobile.trim(), age: age ? Number(age) : null, gender: gender || null })
            .select('id')
            .single();
            
          if (profileErr) throw profileErr;
          pid = newProfile.id;
        }
      }

      // Insert transaction
      const { error: tErr } = await supabase
        .from('transactions')
        .insert({
          profile_id: pid,
          type,
          amount: Number(amount),
          note: note.trim() || null,
          payment_mode: paymentMode,
          category,
          transaction_at: datetime ? new Date(datetime).toISOString() : new Date().toISOString()
        });

      if (tErr) throw tErr;

      showToast('✓ Transaction saved successfully!', 'success');
      
      // Reset form
      setName('');
      setMobile('');
      setAge('');
      setGender('');
      setAmount('');
      setNote('');
      setType('receive');
      setPaymentMode('Cash');
      setCategory('Standard');
      setSelectedProfileId(null);
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setDatetime(now.toISOString().slice(0, 16));
      setErrors({});
      
      fetchRecentTransactions();
      
    } catch (err) {
      showToast(err.message || 'Error saving transaction', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Quick Add Form */}
      <div className="bg-white border border-borderBlue rounded-[16px] p-5">
        <h2 className="font-bold text-[18px] text-navyDark mb-4">New Transaction</h2>
        
        <div className="space-y-4">
          
          {/* Name & Mobile in 1 row on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative" ref={suggestionsRef}>
              <label className="block text-[13px] font-bold text-navyDark mb-1">Customer Name</label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                onFocus={() => setShowSuggestions(true)}
                className={`w-full h-12 px-4 rounded-[10px] border ${errors.name ? 'border-give' : 'border-borderBlue'} focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[15px]`}
                placeholder="Enter name"
              />
              {errors.name && <p className="text-give text-[12px] mt-1">{errors.name}</p>}
              
              {showSuggestions && nameSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-borderBlue rounded-[10px] shadow-lg max-h-[200px] overflow-y-auto no-scrollbar">
                   {nameSuggestions.map(s => (
                     <div 
                       key={s.id} 
                       onClick={() => handleSelectSuggestion(s)}
                       className="px-4 py-3 hover:bg-bgPage cursor-pointer border-b border-borderBlue last:border-0 flex items-center justify-between"
                     >
                       <div>
                         <div className="font-bold text-navyDark text-[14px]">{s.name}</div>
                         <div className="text-muted text-[12px]">{s.mobile}</div>
                       </div>
                       <div className="p-1 rounded-full bg-royal/10 text-royal hover:bg-royal hover:text-white transition-colors">
                         <Plus className="w-5 h-5 pointer-events-none" />
                       </div>
                     </div>
                   ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-bold text-navyDark mb-1">Mobile Number</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className={`w-full h-12 pl-10 pr-4 rounded-[10px] border ${errors.mobile ? 'border-give' : 'border-borderBlue'} focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[15px]`}
                  placeholder="e.g. 9876543210"
                />
              </div>
              {errors.mobile && <p className="text-give text-[12px] mt-1">{errors.mobile}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-navyDark mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full h-12 px-4 rounded-[10px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[15px]"
                placeholder="e.g. 35"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-navyDark mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-12 px-4 rounded-[10px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[15px] bg-white"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-navyDark mb-1">Amount (₹)</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">
                  ₹
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full h-12 pl-8 pr-4 rounded-[10px] border ${errors.amount ? 'border-give' : 'border-borderBlue'} focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[15px] font-bold`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && <p className="text-give text-[12px] mt-1">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-[13px] font-bold text-navyDark mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                className="w-full h-12 px-4 rounded-[10px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[15px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-navyDark mb-1">Transaction Type</label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setType('give')}
                  className={`flex-1 flex items-center justify-center min-h-[56px] rounded-[12px] border transition-all active:scale-95 ${
                    type === 'give' ? 'bg-give text-white font-bold border-give ring-2 ring-royal ring-offset-2' : 'bg-giveBg text-give border-transparent hover:border-give/30 outline-none'
                  }`}
                >
                  ↑ Withdraw / Give
                </button>
                <button
                  type="button"
                  onClick={() => setType('receive')}
                  className={`flex-1 flex items-center justify-center min-h-[56px] rounded-[12px] border transition-all active:scale-95 ${
                    type === 'receive' ? 'bg-receive text-white font-bold border-receive ring-2 ring-royal ring-offset-2' : 'bg-receiveBg text-receive border-transparent hover:border-receive/30 outline-none'
                  }`}
                >
                  ↓ Deposit / Receive
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-[13px] font-bold text-navyDark mb-1">Payment Mode</label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('Cash')}
                  className={`flex-1 flex items-center justify-center min-h-[56px] rounded-[12px] border transition-all active:scale-95 ${
                    paymentMode === 'Cash' ? 'bg-navyDark text-white font-bold border-navyDark ring-2 ring-royal ring-offset-2' : 'bg-bgPage text-navyDark border-transparent hover:border-navyDark/30 outline-none'
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI')}
                  className={`flex-1 flex items-center justify-center min-h-[56px] rounded-[12px] border transition-all active:scale-95 ${
                    paymentMode === 'UPI' ? 'bg-royal text-white font-bold border-royal ring-2 ring-royal ring-offset-2' : 'bg-royal/10 text-royal border-transparent hover:border-royal/30 outline-none'
                  }`}
                >
                  📱 UPI
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-navyDark mb-1">Category</label>
            <div className="grid grid-cols-2 sm:flex space-y-2 sm:space-y-0 sm:space-x-2 gap-2 sm:gap-0">
              {['Standard', 'Committee', 'Society', 'Lucky Draw'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex-1 flex items-center justify-center min-h-[44px] rounded-[10px] border transition-all active:scale-95 text-[12px] whitespace-nowrap px-1 ${
                    category === cat ? 'bg-royal/10 text-royal font-bold border-royal ring-1 ring-royal' : 'bg-white text-muted border-borderBlue hover:border-royal/30 hover:bg-bgPage outline-none'
                  }`}
                >
                  {cat === 'Standard' ? '🏷️ ' : cat === 'Committee' ? '👥 ' : cat === 'Society' ? '🏘️ ' : '🎫 '} {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-[13px] font-bold text-navyDark">Note (optional)</label>
              <span className="text-[12px] text-muted">{note.length}/100</span>
            </div>
            <input
              type="text"
              maxLength={100}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-12 px-4 rounded-[10px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[15px]"
              placeholder="e.g., rent, emergency, travel..."
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-[52px] mt-2 bg-royal hover:bg-royalDark text-white font-bold rounded-[12px] transition-all active:scale-95 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Info'}
          </button>
        </div>
      </div>

      {/* Recent Transactions Feed */}
      <div>
        <h2 className="font-bold text-[18px] text-navyDark mb-4">Recent Transactions</h2>
        {loadingRecent ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 text-royal animate-spin" />
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="text-center p-8 text-muted border border-dashed border-borderBlue rounded-[16px] bg-white">
            <p>No recent transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((t) => (
              <TransactionCard key={t.id} transaction={t} variant="compact" />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
