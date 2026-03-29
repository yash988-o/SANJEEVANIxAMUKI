import React, { useState, useEffect } from 'react';
import { Phone, Calendar, Clock, MessageSquare, ChevronDown, CheckCircle2, Download, Trash2, RefreshCcw, Edit3, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import { calculateInterest } from '../lib/interestUtils';

export default function TransactionCard({ transaction, variant = 'full', isTrashView = false, onRestore }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isCleared, setIsCleared] = useState(transaction.is_cleared || false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleted, setIsDeleted] = useState(transaction.is_deleted || false);
  const [interestAccrued, setInterestAccrued] = useState(0);

  const tDateInitial = new Date(transaction.transaction_at || transaction.created_at);
  const tzOffset = tDateInitial.getTimezoneOffset() * 60000;
  const localIsoString = new Date(tDateInitial - tzOffset).toISOString().slice(0, 16);

  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editData, setEditData] = useState({
    amount: transaction.amount || '',
    type: transaction.type || 'receive',
    note: transaction.note || '',
    payment_mode: transaction.payment_mode || 'Cash',
    category: transaction.category || 'Standard',
    transaction_at: localIsoString,
    profile_name: transaction.profiles?.name || '',
    father_name: transaction.profiles?.guardian || '',
    age: transaction.profiles?.age || '',
    gender: transaction.profiles?.gender || ''
  });

  const handleSaveEdit = async (e) => {
    e.stopPropagation();
    setSavingEdit(true);
    
    const { error: tError } = await supabase.from('transactions').update({
      amount: Number(editData.amount),
      type: editData.type,
      note: editData.note || null,
      payment_mode: editData.payment_mode,
      category: editData.category,
      transaction_at: new Date(editData.transaction_at).toISOString()
    }).eq('id', transaction.id);
    
    const { error: pError } = await supabase.from('profiles').update({
      name: editData.profile_name,
      guardian: editData.father_name || null,
      age: editData.age ? Number(editData.age) : null,
      gender: editData.gender || null
    }).eq('id', transaction.profile_id);
    
    if (!tError && !pError) {
      window.location.reload();
    } else {
      console.error(tError || pError);
      alert("Error updating transaction/profile");
    }
    setSavingEdit(false);
  };

  const toggleClear = (e) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmClear = async () => {
    setShowConfirm(false);
    
    const newValue = !isCleared;
    setIsCleared(newValue);
    
    const { error } = await supabase
      .from('transactions')
      .update({ is_cleared: newValue })
      .eq('id', transaction.id);
      
    if (error) {
      setIsCleared(!newValue);
    }
  };

  const handleSoftDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this transaction? It will be moved to the Trash.")) return;
    
    const { error } = await supabase
      .from('transactions')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id 
      })
      .eq('id', transaction.id);
      
    if (!error) setIsDeleted(true);
  };

  const handleRestoreAction = async (e) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('transactions')
      .update({ 
        is_deleted: false, 
        deleted_at: null,
        deleted_by: null 
      })
      .eq('id', transaction.id);
      
    if (!error) {
      if (onRestore) onRestore(transaction.id);
      setIsDeleted(false);
    }
  };

  // If deleted and not in trash view, hide it
  if (isDeleted && !isTrashView) return null;

  // robust parsing of date
  const tDate = new Date(transaction.transaction_at || transaction.created_at);
  const formattedDate = tDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = tDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const isReceive = transaction.type === 'receive';
  const amountText = `₹${Number(transaction.amount).toLocaleString('en-IN')}`;
  
  // Compact variant for Main Page
  if (variant === 'compact') {
    return (
      <div 
        onClick={() => navigate(`/profile/${transaction.profile_id}`)}
        className={`bg-white border text-left rounded-[12px] p-[14px] flex items-center justify-between cursor-pointer hover:bg-bgPage transition-colors ${isCleared ? 'border-green-200 bg-green-50/20' : 'border-borderBlue'}`}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[16px] ${isCleared ? 'bg-royal/60' : 'bg-royal'}`}>
            {transaction.profiles?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <div className={`font-bold text-[15px] truncate ${isCleared ? 'text-navyDark/60 line-through decoration-1' : 'text-navyDark'}`}>{transaction.profiles?.name}</div>
            <div className="text-muted text-[12px]">{formattedDate} • {formattedTime}</div>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <div className={`font-bold pb-[2px] tracking-tight ${isReceive ? 'text-receive' : 'text-give'} ${isCleared ? 'opacity-50 line-through decoration-1' : ''}`}>
            {amountText}
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleClear} 
              className={`p-1 rounded-full border shadow-sm transition-all active:scale-95 ${isCleared ? 'text-green-600 bg-green-100 border-green-300' : 'text-gray-400 bg-gray-50 border-gray-200 hover:text-green-600 hover:bg-green-50'}`}
              title={isCleared ? "Mark as unsettled" : "Mark as settled"}
            >
              <CheckCircle2 className="w-[18px] h-[18px] stroke-[2.5]" />
            </button>
            <div className={`px-2 py-[2px] rounded-full text-[11px] font-bold ${
              isReceive ? 'bg-receiveBg text-receive' : 'bg-giveBg text-give'
            }`}>
              {isReceive ? 'DEPOSIT' : 'WITHDRAWAL'}
            </div>
            {transaction.payment_mode && (
              <div className="px-2 py-[2px] rounded-full text-[10px] font-bold bg-navyDark/10 text-navyDark uppercase">
                {transaction.payment_mode}
              </div>
            )}
            {transaction.category && transaction.category !== 'Standard' && (
              <div className={`px-2 py-[2px] rounded-full text-[10px] font-bold uppercase shrink-0 ${
                transaction.category === 'Committee' ? 'bg-purple-100 text-purple-700' :
                transaction.category === 'Society' ? 'bg-blue-100 text-blue-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {transaction.category}
              </div>
            )}
          </div>
        </div>
      <ConfirmModal 
        isOpen={showConfirm}
        title="Confirm Status Change"
        message={`Are you sure you want to mark this transaction as ${isCleared ? 'Pending' : 'Cleared'}?`}
        onConfirm={handleConfirmClear}
        onCancel={(e) => { e?.stopPropagation(); setShowConfirm(false); }}
      />
      </div>
    );
  }

  // Profile variant for Profile Page
  if (variant === 'profile') {
    return (
      <div className={`bg-white border text-left rounded-[12px] p-4 flex flex-col space-y-2 ${isCleared ? 'border-green-200 bg-green-50/20' : 'border-borderBlue'}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleClear} 
              className={`p-1 rounded-full border shadow-sm transition-all active:scale-95 shrink-0 ${isCleared ? 'text-green-600 bg-green-100 border-green-300' : 'text-gray-400 bg-gray-50 border-gray-200 hover:text-green-600 hover:bg-green-50'}`}
              title={isCleared ? "Mark as unsettled" : "Mark as settled"}
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="flex items-center text-muted text-[12px] space-x-2">
               <span>{formattedDate}</span>
               <span>•</span>
               <span>{formattedTime}</span>
            </div>
          </div>
          <div className={`font-bold text-[16px] ${isReceive ? 'text-receive' : 'text-give'} ${isCleared ? 'opacity-50 line-through decoration-1' : ''}`}>
            {amountText}
          </div>
        </div>
        <div className="flex justify-between items-end pl-8 mt-1">
          <div className="flex space-x-2">
            <div className={`px-2 py-[2px] rounded-full text-[11px] font-bold ${
              isReceive ? 'bg-receiveBg text-receive' : 'bg-giveBg text-give'
            }`}>
              {isReceive ? 'DEPOSIT' : 'WITHDRAWAL'}
            </div>
            {transaction.payment_mode && (
              <div className="px-2 py-[2px] rounded-full text-[10px] font-bold bg-navyDark/10 text-navyDark uppercase">
                {transaction.payment_mode}
              </div>
            )}
          </div>
          {transaction.note && (
             <div className="italic text-[13px] text-muted flex items-center space-x-1 max-w-[70%] text-right">
               <span className="truncate">{transaction.note}</span>
             </div>
          )}
        </div>
      <ConfirmModal 
        isOpen={showConfirm}
        title="Confirm Status Change"
        message={`Are you sure you want to mark this transaction as ${isCleared ? 'Pending' : 'Cleared'}?`}
        onConfirm={handleConfirmClear}
        onCancel={(e) => { e?.stopPropagation(); setShowConfirm(false); }}
      />
      </div>
    );
  }

  // Full variant (History/Summary)
  useEffect(() => {
    if (expanded && history.length === 0) {
      loadHistory();
    }
  }, [expanded]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data: allT } = await supabase
      .from('transactions')
      .select('type, amount, transaction_at, profiles(interest_rate, interest_freq)')
      .eq('profile_id', transaction.profile_id)
      .order('transaction_at', { ascending: false });
      
    if (allT) {
      setHistory(allT.slice(0, 5));
      
      const profileInfo = allT[0]?.profiles || {};
      const { principal, interest, total } = calculateInterest(allT, profileInfo.interest_rate, profileInfo.interest_freq);
      setBalance(total);
      setInterestAccrued(interest);
    }
    setLoadingHistory(false);
  };

  return (
    <div className={`bg-white border text-left rounded-[12px] p-4 flex flex-col overflow-hidden transition-all duration-300 ${isCleared ? 'border-green-200 bg-green-50/20' : 'border-borderBlue'}`}>
      <div 
        className="flex justify-between items-start cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className={`font-bold text-[16px] mb-1 truncate ${isCleared ? 'text-navyDark/60 line-through decoration-1' : 'text-navyDark'}`}>{transaction.profiles?.name}</div>
          <div className="flex items-center text-[13px] text-muted mb-3 space-x-1">
            <Phone className="w-[14px] h-[14px]" />
            <span className="truncate">{transaction.profiles?.mobile}</span>
          </div>
          
          <div className="flex flex-col space-y-[2px]">
            <div className="flex items-center text-[12px] text-muted space-x-1">
              <Calendar className="w-[12px] h-[12px]" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center text-[12px] text-muted space-x-1">
              <Clock className="w-[12px] h-[12px]" />
              <span>{formattedTime}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-2 shrink-0">
          <div className="flex items-center space-x-2">
            <div className={`font-bold text-[20px] tracking-tight ${isReceive ? 'text-receive' : 'text-give'} ${isCleared ? 'opacity-50 line-through decoration-1' : ''}`}>
              {amountText}
            </div>
            <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleClear} 
              className={`p-1 rounded-full border shadow-sm transition-all active:scale-95 ${isCleared ? 'text-green-600 bg-green-100 border-green-300' : 'text-gray-400 bg-gray-50 border-gray-200 hover:text-green-600 hover:bg-green-50'}`}
              title={isCleared ? "Mark as unsettled" : "Mark as settled"}
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className={`px-2 py-[2px] rounded-full text-[11px] font-bold ${
              isReceive ? 'bg-receiveBg text-receive' : 'bg-giveBg text-give'
            }`}>
              {isReceive ? 'DEPOSIT' : 'WITHDRAWAL'}
            </div>
            {transaction.payment_mode && (
              <div className="px-2 py-[2px] rounded-full text-[10px] font-bold bg-navyDark/10 text-navyDark uppercase hidden sm:block">
                {transaction.payment_mode}
              </div>
            )}
            {transaction.category && transaction.category !== 'Standard' && (
              <div className={`px-2 py-[2px] rounded-full text-[10px] font-bold uppercase shrink-0 ${
                transaction.category === 'Committee' ? 'bg-purple-100 text-purple-700' :
                transaction.category === 'Society' ? 'bg-blue-100 text-blue-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {transaction.category}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {transaction.note && (
        <div className="mt-3 flex items-start text-[13px] text-muted italic space-x-2 bg-bgPage/50 p-2 rounded-lg">
          <MessageSquare className="w-[14px] h-[14px] shrink-0 mt-[2px]" />
          <span className="break-words line-clamp-2">{transaction.note}</span>
        </div>
      )}

      {/* Expanded Section */}
      <div 
        className={`transition-all duration-300 overflow-hidden flex flex-col ${expanded ? 'opacity-100 mt-4 pt-4 border-t border-borderBlue' : 'max-h-0 opacity-0 mt-0 pt-0 border-transparent'}`}
        style={{ maxHeight: expanded ? '500px' : '0px' }}
      >
        {loadingHistory ? (
          <div className="text-center text-muted text-[13px] py-4">Loading history...</div>
        ) : (
          <div className="flex flex-col space-y-4">
            <div>
              <div className="text-[11px] font-bold text-navyDark mb-2 uppercase tracking-wide">Last 5 Transactions</div>
              <div className="space-y-[6px]">
                {history.map((h, i) => (
                  <div key={i} className="flex justify-between items-center text-[13px]">
                    <div className="text-muted text-[12px]">
                      {new Date(h.transaction_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className={`font-bold ${h.type === 'receive' ? 'text-receive' : 'text-give'}`}>
                      {h.type === 'receive' ? '+' : '-'}₹{Number(h.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col bg-bgPage p-3 rounded-[10px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-navyDark">Current Balance</span>
                <div className={`px-2 py-1 rounded-full text-[11px] font-bold ${
                  balance > 0 ? 'bg-receiveBg text-receive' : 
                  balance < 0 ? 'bg-giveBg text-give' : 
                  'bg-gray-200 text-gray-500'
                }`}>
                  {balance > 0 ? `Owes ₹${Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 
                   balance < 0 ? `You owe ₹${Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0'}
                </div>
              </div>
              
              {Math.abs(interestAccrued) > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-borderBlue">
                  <span className="text-[12px] text-muted font-medium pr-2">Calculated Interest</span>
                  <span className={`text-[12px] font-bold ${interestAccrued > 0 ? 'text-receive' : 'text-give'}`}>
                    {interestAccrued > 0 ? '+' : '-'}₹{Math.abs(interestAccrued).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <button 
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${transaction.profile_id}`); }}
                className="w-full text-royal font-bold text-[14px] text-center py-2.5 bg-royal/10 rounded-[10px] hover:bg-royal/20 transition-colors"
                title="View Full Profile"
              >
                View Profile →
              </button>

              <div className="flex justify-between gap-2 w-full mt-2">
                {isEditing ? (
                  <div className="bg-white p-3 border border-borderBlue rounded-[10px] space-y-3 w-full relative" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                       <div className="font-bold text-navyDark text-[14px]">Edit Transaction</div>
                       <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="text-muted hover:text-navyDark" title="Close">
                         <X className="w-5 h-5" />
                       </button>
                    </div>
                    
                    <div className="text-[12px] font-bold text-royal bg-royal/10 px-2 py-1 rounded inline-block">Transaction Details</div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-navyDark mb-1">Amount</label>
                        <input type="number" step="any" value={editData.amount} onChange={e => setEditData({...editData, amount: e.target.value})} className="w-full h-9 px-2 rounded-[6px] border border-borderBlue focus:border-royal outline-none text-[13px]" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-navyDark mb-1">Type</label>
                        <select value={editData.type} onChange={e => setEditData({...editData, type: e.target.value})} className="w-full h-9 px-2 bg-white rounded-[6px] border border-borderBlue focus:border-royal outline-none text-[13px]">
                          <option value="receive">Deposit</option>
                          <option value="give">Withdraw</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-navyDark mb-1">Date & Time</label>
                        <input type="datetime-local" value={editData.transaction_at} onChange={e => setEditData({...editData, transaction_at: e.target.value})} className="w-full h-9 px-2 rounded-[6px] border border-borderBlue focus:border-royal outline-none text-[13px]" />
                      </div>
                      <div>
                         <label className="block text-[11px] font-bold text-navyDark mb-1">Payment</label>
                         <select value={editData.payment_mode} onChange={e => setEditData({...editData, payment_mode: e.target.value})} className="w-full h-9 px-2 bg-white rounded-[6px] border border-borderBlue focus:border-royal outline-none text-[13px]">
                           <option value="Cash">Cash</option>
                           <option value="UPI">UPI</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-[11px] font-bold text-navyDark mb-1">Category</label>
                         <select value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})} className="w-full h-9 px-2 bg-white rounded-[6px] border border-borderBlue focus:border-royal outline-none text-[13px]">
                           <option value="Standard">Standard</option>
                           <option value="Committee">Committee</option>
                           <option value="Society">Society</option>
                           <option value="Lucky Draw">Lucky Draw</option>
                         </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-navyDark mb-1">Note</label>
                      <input type="text" value={editData.note} onChange={e => setEditData({...editData, note: e.target.value})} className="w-full h-9 px-2 rounded-[6px] border border-borderBlue focus:border-royal outline-none text-[13px]" />
                    </div>

                    <div className="text-[12px] font-bold text-royal bg-royal/10 px-2 py-1 rounded inline-block mt-3">Customer Profile</div>
                    <div className="grid grid-cols-2 gap-3">
                       <div>
                         <label className="block text-[11px] font-bold text-navyDark mb-1">Name</label>
                         <input type="text" value={editData.profile_name} onChange={e => setEditData({...editData, profile_name: e.target.value})} className="w-full h-9 px-2 rounded-[6px] border border-borderBlue focus:border-royal outline-none text-[13px]" />
                       </div>
                       <div>
                         <label className="block text-[11px] font-bold text-navyDark mb-1">Father Name</label>
                         <input type="text" value={editData.father_name} onChange={e => setEditData({...editData, father_name: e.target.value})} className="w-full h-9 px-2 rounded-[6px] border border-borderBlue focus:border-royal outline-none text-[13px]" />
                       </div>
                       <div>
                         <label className="block text-[11px] font-bold text-navyDark mb-1">Age</label>
                         <input type="number" value={editData.age} onChange={e => setEditData({...editData, age: e.target.value})} className="w-full h-9 px-2 rounded-[6px] border border-borderBlue focus:border-royal outline-none text-[13px]" />
                       </div>
                       <div>
                         <label className="block text-[11px] font-bold text-navyDark mb-1">Gender</label>
                         <select value={editData.gender} onChange={e => setEditData({...editData, gender: e.target.value})} className="w-full h-9 px-2 bg-white rounded-[6px] border border-borderBlue focus:border-royal outline-none text-[13px]">
                           <option value="">Select</option>
                           <option value="Male">Male</option>
                           <option value="Female">Female</option>
                           <option value="Other">Other</option>
                         </select>
                       </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="flex-1 h-9 bg-gray-100 text-gray-600 font-bold rounded-[6px] text-[13px]">Cancel</button>
                      <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 h-9 bg-royal text-white font-bold rounded-[6px] flex items-center justify-center text-[13px]">
                        {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : isTrashView ? (
                  <button
                    onClick={handleRestoreAction}
                    className="px-4 py-2 rounded-[10px] bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors flex items-center justify-center space-x-2 w-full"
                    title="Restore Transaction"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    <span className="text-[13px] font-bold">Restore</span>
                  </button>
                ) : null}
                
                {!isEditing && !isTrashView && (
                  <div className="flex justify-start gap-2 h-9">
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                      className="px-3 py-1 rounded-[10px] bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center space-x-1 shrink-0"
                      title="Edit Transaction"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="text-[12px] font-bold hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={handleSoftDelete}
                      className="px-3 py-1 rounded-[10px] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center space-x-1 shrink-0"
                      title="Delete Transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-[12px] font-bold hidden sm:inline">Delete</span>
                    </button>
                  </div>
                )}
                
                {!isEditing && !isTrashView && (
                  <div className="flex justify-end gap-2 shrink-0">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const { generateBillPDF } = await import('../lib/billUtils');
                          const doc = generateBillPDF(transaction);
                          doc.save(`Bill_${transaction.profiles?.name || 'Customer'}_${transaction.id.substring(0,6)}.pdf`);
                        } catch (err) {
                          console.error(err);
                          window.alert('❌ Failed to download Bill');
                        }
                      }}
                      className="px-4 py-2 rounded-[10px] bg-white border border-borderBlue text-navyDark hover:bg-bgPage transition-colors flex items-center justify-center shrink-0"
                      title="Download Bill as PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const { sendBillToTelegram } = await import('../lib/billUtils');
                          e.target.disabled = true;
                          e.target.innerHTML = 'Sending...';
                          await sendBillToTelegram(transaction);
                          window.alert('✅ Bill successfully sent to Telegram!');
                        } catch (err) {
                          console.error(err);
                          window.alert('❌ Failed to send Bill ' + err.message);
                        } finally {
                          e.target.disabled = false;
                          e.target.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path></svg><span class="text-[13px] font-bold whitespace-nowrap ml-2">Telegram</span>`;
                        }
                      }}
                      className={`px-5 py-2 rounded-[10px] border transition-colors flex items-center justify-center space-x-2 shrink-0 ${
                        isReceive 
                          ? 'bg-receiveBg border-receive/30 text-receive hover:bg-receive hover:text-white' 
                          : 'bg-giveBg border-give/30 text-give hover:bg-give hover:text-white'
                      }`}
                      title="Generate & Send Bill to Telegram"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[13px] font-bold whitespace-nowrap">Telegram</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={showConfirm}
        title="Confirm Status Change"
        message={`Are you sure you want to mark this transaction as ${isCleared ? 'Pending' : 'Cleared'}?`}
        onConfirm={handleConfirmClear}
        onCancel={(e) => { e?.stopPropagation(); setShowConfirm(false); }}
      />
    </div>
  );
}
