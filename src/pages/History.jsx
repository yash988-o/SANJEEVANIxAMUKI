import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, ArrowUpDown, FileX, Loader2 } from 'lucide-react';
import TransactionCard from '../components/TransactionCard';
import { useNavigate } from 'react-router-dom';

export default function History() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [sortType, setSortType] = useState('date_desc'); // date_desc, date_asc, added_desc
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, cleared
  const [typeFilter, setTypeFilter] = useState('all'); // all, give, receive
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD
  const [allLoaded, setAllLoaded] = useState(false);
  const [page, setPage] = useState(0);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const PAGE_SIZE = 50;


  useEffect(() => {
    // Debounce query
    const delayDebounceFn = setTimeout(() => {
      fetchData(true);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query, sortType, statusFilter, typeFilter, dateFilter]);

  const fetchData = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPage(0);
      setAllLoaded(false);
    } else {
      setLoadingMore(true);
    }

    const currentPage = reset ? 0 : page + 1;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const searching = query.trim().length > 0;
    
    if (reset) {
       setIsSearchMode(searching);
    }

    if (searching) {
      // Search Mode: Fetch from Profiles and join transactions
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, name, mobile, age, gender, created_at,
          transactions(id, amount, type, transaction_at, is_cleared, created_at)
        `)
        .or(`name.ilike.%${query}%,mobile.ilike.%${query}%`)
        .range(from, to);

      if (!error && data) {
        // Filter search results locally
        const processed = data.map(p => {
          let tx = p.transactions || [];
          if (statusFilter === 'pending') tx = tx.filter(t => !t.is_cleared);
          if (statusFilter === 'cleared') tx = tx.filter(t => t.is_cleared);
          if (typeFilter !== 'all') tx = tx.filter(t => t.type === typeFilter);
          if (dateFilter) {
            const start = new Date(dateFilter).getTime();
            const end = start + 86400000; // +1 day ms
            tx = tx.filter(t => {
              const tt = new Date(t.transaction_at).getTime();
              return tt >= start && tt < end;
            });
          }
          return { ...p, transactions: tx };
        }).filter(p => statusFilter === 'all' && typeFilter === 'all' && !dateFilter ? p.transactions.length > 0 || true : p.transactions.length > 0);

        if (reset) setTransactions(processed);
        else setTransactions(prev => [...prev, ...processed]);
        
        if (data.length < PAGE_SIZE) setAllLoaded(true);
        if (!reset) setPage(currentPage);
      }
    } else {
      // Normal Mode: Fetch from Transactions
      let q = supabase
        .from('transactions')
        .select('*, profiles!inner(name, mobile, age, gender)', { count: 'exact' });

      if (statusFilter === 'pending') q = q.is('is_cleared', false);
      if (statusFilter === 'cleared') q = q.is('is_cleared', true);
      if (typeFilter !== 'all') q = q.eq('type', typeFilter);
      if (dateFilter) {
         const start = new Date(dateFilter);
         const end = new Date(dateFilter);
         end.setDate(end.getDate() + 1);
         q = q.gte('transaction_at', start.toISOString()).lt('transaction_at', end.toISOString());
      }

      // Order based on selected dropdown type
      if (sortType === 'date_desc') {
        q = q.order('transaction_at', { ascending: false }).range(from, to);
      } else if (sortType === 'date_asc') {
        q = q.order('transaction_at', { ascending: true }).range(from, to);
      } else if (sortType === 'added_desc') {
        q = q.order('created_at', { ascending: false }).range(from, to);
      }

      const { data, error } = await q;

      if (!error && data) {
        if (reset) setTransactions(data);
        else setTransactions(prev => [...prev, ...data]);
        
        if (data.length < PAGE_SIZE) setAllLoaded(true);
        if (!reset) setPage(currentPage);
      }
    }

    if (reset) setLoading(false);
    else setLoadingMore(false);
  };


  return (
    <div className="space-y-6 pb-6 pt-2">
      <h1 className="font-bold text-[28px] text-navyDark leading-none mb-6">History</h1>

      {/* Controls Row */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-transparent rounded-[10px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[15px]"
              placeholder="Filter by name or mobile..."
            />
          </div>
          
          <div className="flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
            <div className="relative shrink-0">
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value)}
                className="h-12 pl-4 pr-10 bg-transparent border border-borderBlue rounded-[10px] text-navyDark text-[14px] font-bold outline-none focus:border-royal focus:ring-1 focus:ring-royal appearance-none cursor-pointer hover:bg-white/30 transition-colors"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="added_desc">Recently Added</option>
              </select>
              <ArrowUpDown className="w-4 h-4 text-navyDark absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-12 pl-4 pr-10 bg-transparent border border-borderBlue rounded-[10px] text-navyDark text-[14px] font-bold outline-none focus:border-royal focus:ring-1 focus:ring-royal appearance-none cursor-pointer hover:bg-white/30 transition-colors"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
              </select>
              <ArrowUpDown className="w-4 h-4 text-navyDark absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
        
        {/* Row 2 Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:max-w-[200px]">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full h-12 px-4 bg-transparent rounded-[10px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none text-[14px] text-navyDark font-medium"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] bg-red-100 text-red-600 px-2 py-1 rounded-md font-bold"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative flex-1 sm:max-w-[200px]">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-12 pl-4 pr-10 bg-transparent border border-borderBlue rounded-[10px] text-navyDark text-[14px] font-bold outline-none focus:border-royal focus:ring-1 focus:ring-royal appearance-none cursor-pointer hover:bg-white/30 transition-colors"
              >
                <option value="all">All Types</option>
                <option value="receive">Deposit (Receive)</option>
                <option value="give">Withdraw (Give)</option>
              </select>
              <ArrowUpDown className="w-4 h-4 text-navyDark absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-royal animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-muted bg-white/60 backdrop-blur-md border border-white/50 rounded-[16px]">
          <FileX className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-center text-[14px]">No {isSearchMode ? 'profiles' : 'transactions'} found.</p>
        </div>
      ) : (
        <div className="space-y-[8px]">
          {transactions.map((t) => (
             isSearchMode ? (
               <ProfileSearchResultCard key={t.id} profile={t} navigate={navigate} />
             ) : (
               <TransactionCard key={t.id} transaction={t} variant="full" />
             )
          ))}
        </div>
      )}

      {!loading && transactions.length > 0 && (
        <div className="pt-4">
          {allLoaded ? (
            <div className="text-center text-[13px] text-muted font-bold py-4">
              All records loaded ✓
            </div>
          ) : (
            <button
              onClick={() => fetchData(false)}
              disabled={loadingMore}
              className="w-full h-[48px] bg-white border border-borderBlue text-royal font-bold rounded-[12px] flex items-center justify-center hover:bg-bgPage transition-colors"
            >
              {loadingMore ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Load More'}
            </button>
          )}
        </div>
      )}

    </div>
  );
}

const ProfileSearchResultCard = ({ profile, navigate }) => {
  const [expanded, setExpanded] = useState(false);

  // Sort transactions by date descending for the preview
  const sortedTx = [...(profile.transactions || [])].sort((a, b) => new Date(b.transaction_at) - new Date(a.transaction_at));
  const recentTx = sortedTx[0];

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-[16px] overflow-hidden transition-all hover:shadow-sm">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="w-full flex items-center justify-between p-4 focus:outline-none"
      >
        <div className="text-left">
          <h3 className="font-bold text-navyDark text-[16px]">{profile.name}</h3>
          <p className="text-muted text-[13px] flex items-center mt-1">
             {profile.mobile}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {recentTx && (
             <div className="text-right flex flex-col items-end">
               <span className={`font-bold text-[16px] ${recentTx.type === 'receive' ? 'text-receive' : 'text-give'}`}>
                 ₹{Number(recentTx.amount).toLocaleString('en-IN')}
               </span>
               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm mt-1 uppercase ${recentTx.type === 'receive' ? 'bg-receiveBg text-receive' : 'bg-giveBg text-give'}`}>
                 {recentTx.type === 'receive' ? 'Deposit' : 'Withdrawal'}
               </span>
             </div>
          )}
          <ArrowUpDown className={`w-4 h-4 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 animate-fade-in bg-white/50 border-t border-white/50 pt-3">
          <h4 className="text-[12px] font-bold text-navyDark/70 uppercase tracking-wider mb-2">Recent Transactions</h4>
          <div className="space-y-2 mb-4 max-h-[220px] overflow-y-auto no-scrollbar">
            {sortedTx.length === 0 ? (
               <p className="text-[13px] text-muted italic">No transactions.</p>
            ) : (
               sortedTx.slice(0, 4).map(t => {
                 // Inject dummy profile so TransactionCard doesn't crash
                 const txWithProfile = { ...t, profiles: { name: profile.name, mobile: profile.mobile } };
                 return <TransactionCard key={t.id} transaction={txWithProfile} variant="compact" />;
               })
            )}
            {sortedTx.length > 4 && (
               <p className="text-[12px] text-center text-muted font-bold pt-1">+{sortedTx.length - 4} older transactions...</p>
            )}
          </div>
          
          <button 
             onClick={(e) => {
               e.stopPropagation();
               navigate(`/profile/${profile.id}`);
             }}
             className="w-full py-3 bg-white border border-borderBlue text-royal rounded-[10px] font-bold text-[14px] flex items-center justify-center hover:bg-bgPage transition-colors"
          >
            View Full Profile
          </button>
        </div>
      )}
    </div>
  );
}
