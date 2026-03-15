import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, FileX, Loader2, CalendarSearch, ArrowLeft } from 'lucide-react';
import TransactionCard from '../components/TransactionCard';
import { Link } from 'react-router-dom';

export default function RangeSearch() {
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeResults, setRangeResults] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeTotals, setRangeTotals] = useState({ deposits: 0, withdrawals: 0, net: 0 });
  const [hasSearchedRange, setHasSearchedRange] = useState(false);

  const handleRangeSearch = async () => {
    if (!rangeStart || !rangeEnd) return;
    
    setRangeLoading(true);
    setHasSearchedRange(true);
    
    try {
      // Fetch results for the range
      const { data, error } = await supabase
        .from('transactions')
        .select('*, profiles(name, mobile)')
        .gte('transaction_at', new Date(rangeStart).toISOString())
        .lte('transaction_at', new Date(rangeEnd + 'T23:59:59').toISOString())
        .order('transaction_at', { ascending: false });

      if (error) throw error;

      setRangeResults(data || []);

      // Calculate totals
      let dep = 0;
      let wth = 0;
      (data || []).forEach(t => {
        if (t.type === 'receive') dep += Number(t.amount);
        if (t.type === 'give') wth += Number(t.amount);
      });

      setRangeTotals({
        deposits: dep,
        withdrawals: wth,
        net: dep - wth
      });
    } catch (err) {
      console.error('Range search error:', err);
    } finally {
      setRangeLoading(false);
    }
  };

  const clearRangeSearch = () => {
    setRangeStart('');
    setRangeEnd('');
    setRangeResults([]);
    setHasSearchedRange(false);
    setRangeTotals({ deposits: 0, withdrawals: 0, net: 0 });
  };

  return (
    <div className="space-y-6 pb-6 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-[28px] text-navyDark leading-none">Search by Range</h1>
        {hasSearchedRange && (
          <button 
            onClick={clearRangeSearch}
            className="text-[13px] font-bold text-red-500 hover:text-red-600 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <p className="text-muted text-[15px] max-w-[500px]">
        Select a custom date range to view transactions and see total deposits and withdrawals for that period.
      </p>

      <div className="bg-white/60 backdrop-blur-md rounded-[20px] p-6 border border-white/50 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-muted uppercase ml-1">From Date</label>
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="w-full h-12 px-4 bg-white rounded-[12px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[15px] font-medium transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-muted uppercase ml-1">To Date</label>
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="w-full h-12 px-4 bg-white rounded-[12px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[15px] font-medium transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleRangeSearch}
          disabled={rangeLoading || !rangeStart || !rangeEnd}
          className="w-full h-[52px] bg-royal text-white font-bold rounded-[14px] flex items-center justify-center gap-2 hover:bg-royal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-md shadow-royal/20"
        >
          {rangeLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          {rangeLoading ? 'Calculating...' : 'Search Range & Show Analytics'}
        </button>
      </div>

      {hasSearchedRange && !rangeLoading && (
        <div className="space-y-6 animate-fade-in">
          {/* Analytics Summary Card */}
          <div className="bg-navyDark text-white rounded-[24px] p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-royal/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <p className="text-white/60 text-[13px] font-bold uppercase tracking-[2px]">Period Summary</p>
                <div className="bg-white/10 px-3 py-1 rounded-full text-[12px] font-medium text-white/80 backdrop-blur-md">
                   {new Date(rangeStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(rangeEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="border-l-2 border-receive/30 pl-4">
                  <p className="text-white/50 text-[12px] font-medium mb-1">Total Deposits</p>
                  <p className="text-receive text-[28px] font-bold leading-tight">₹{rangeTotals.deposits.toLocaleString('en-IN')}</p>
                </div>
                <div className="border-l-2 border-give/30 pl-4">
                  <p className="text-white/50 text-[12px] font-medium mb-1">Total Withdrawals</p>
                  <p className="text-[#FF6B6B] text-[28px] font-bold leading-tight">₹{rangeTotals.withdrawals.toLocaleString('en-IN')}</p>
                </div>
                <div className="border-l-2 border-white/20 pl-4">
                  <p className="text-white/50 text-[12px] font-medium mb-1">Net Balance</p>
                  <p className={`text-[28px] font-bold leading-tight ${rangeTotals.net >= 0 ? 'text-receive' : 'text-[#FF6B6B]'}`}>
                    ₹{Math.abs(rangeTotals.net).toLocaleString('en-IN')}
                    <span className="text-[14px] ml-1 opacity-60">
                      {rangeTotals.net >= 0 ? '(Owed)' : '(Owe)'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Range Results List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-navyDark text-[18px]">Transactions ({rangeResults.length})</h3>
            </div>
            
            {rangeResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 bg-white/40 rounded-[28px] border border-dashed border-borderBlue shadow-inner">
                <FileX className="w-12 h-12 text-muted opacity-20 mb-4" />
                <p className="text-muted text-[15px] font-medium">No transactions found in this date range.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rangeResults.map(t => (
                  <TransactionCard key={t.id} transaction={t} variant="full" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-8 border-t border-borderBlue/30">
        <Link
          to="/history"
          className="w-full h-[52px] bg-white border border-borderBlue text-royal font-bold rounded-[14px] flex items-center justify-center gap-2 hover:bg-bgPage transition-all active:scale-[0.98]"
        >
          <ArrowLeft className="w-5 h-5" />
          View Full History
        </Link>
      </div>
    </div>
  );
}
