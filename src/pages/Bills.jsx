import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Download, Send, Search, Loader2 } from 'lucide-react';
import { generateBillPDF, sendBillToTelegram } from '../lib/billUtils';
import { useToast } from '../context/ToastContext';

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [processing, setProcessing] = useState(null); // stores transaction ID being processed
  const { showToast } = useToast();

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    let query = supabase
      .from('transactions')
      .select(`
        *,
        profiles ( name, mobile )
      `)
      .eq('type', 'receive')
      .order('transaction_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
       console.error(error);
       showToast('Error loading bills', 'error');
    } else {
       setBills(data || []);
    }
    setLoading(false);
  };

  const handleDownload = (transaction) => {
    try {
      const doc = generateBillPDF(transaction);
      doc.save(`Bill_${transaction.profiles?.name || 'Customer'}_${transaction.id.substring(0,6)}.pdf`);
      showToast('Bill downloaded successfully', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error generating PDF', 'error');
    }
  };

  const handleSendTelegram = async (transaction) => {
    setProcessing(transaction.id);
    try {
      await sendBillToTelegram(transaction);
      showToast('Bill sent to Telegram successfully!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to send to Telegram', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const filteredBills = bills.filter(b => {
    const matchName = b.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMobile = b.profiles?.mobile?.includes(searchTerm);
    const searchMatch = matchName || matchMobile;

    let dateMatch = true;
    if (dateFilter) {
      const bDate = new Date(b.transaction_at).toISOString().split('T')[0];
      dateMatch = (bDate === dateFilter);
    }

    return searchMatch && dateMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-bold text-[22px] text-navyDark">Generated Bills</h2>
      </div>

      <div className="bg-white border border-borderBlue rounded-[16px] p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by name or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-[10px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[14px]"
          />
        </div>
        <div className="w-full md:w-[200px]">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-[10px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[14px]"
          />
        </div>
      </div>

      <div className="bg-white border border-borderBlue rounded-[16px] overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 text-royal animate-spin" />
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center p-8 text-muted">
            <p>No bills found criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] text-left">
              <thead className="bg-royal/5 text-navyMid font-bold border-b border-borderBlue">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map(b => (
                  <tr key={b.id} className="border-b border-borderBlue last:border-0 hover:bg-bgPage/50">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>{new Date(b.transaction_at).toLocaleDateString()}</div>
                      <div className="text-[12px] text-muted">{new Date(b.transaction_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-navyDark">{b.profiles?.name}</div>
                      <div className="text-[12px] text-muted">{b.profiles?.mobile}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-receive">
                      ₹{b.amount}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDownload(b)}
                          title="Download PDF"
                          className="p-2 rounded-lg bg-royal/10 text-royal hover:bg-royal hover:text-white transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSendTelegram(b)}
                          disabled={processing === b.id}
                          title="Send to Telegram"
                          className="p-2 rounded-lg bg-receive/10 text-receive hover:bg-receive hover:text-white transition-colors disabled:opacity-50"
                        >
                          {processing === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
