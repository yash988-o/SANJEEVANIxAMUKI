import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import TransactionCard from '../components/TransactionCard';

export default function Summary() {
  const [filter, setFilter] = useState('Today'); // 'Today', 'This Month', '3 Months', 'This Year', 'Custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auto trigger for predefined filters
  useEffect(() => {
    if (filter !== 'Custom') {
      fetchData();
    } else if (customStart && customEnd) {
      fetchData();
    }
  }, [filter, customStart, customEnd]);

  const fetchData = async () => {
    setLoading(true);
    let fetchStart = new Date();
    fetchStart.setFullYear(fetchStart.getFullYear() - 1); // Buffer for normal filters

    // If Custom, we could query specific dates, but for simplicity we can just fetch 1 yr unless custom is older.
    let queryStart = fetchStart;
    if (filter === 'Custom' && customStart) {
      const cStart = new Date(customStart);
      if (cStart < queryStart) queryStart = cStart;
    }

    const { data } = await supabase
      .from('transactions')
      .select('*, profiles(name, mobile)')
      .gte('transaction_at', queryStart.toISOString())
      .is('is_cleared', false)
      .eq('is_deleted', false)
      .order('transaction_at', { ascending: false });

    const allRecent = data || [];
    let filtered = [];
    const now = new Date();

    if (filter === 'Today') {
      filtered = allRecent.filter(t => {
        const tDate = new Date(t.transaction_at);
        return tDate.getFullYear() === now.getFullYear() &&
               tDate.getMonth() === now.getMonth() &&
               tDate.getDate() === now.getDate();
      });
    } else if (filter === 'This Month') {
      filtered = allRecent.filter(t => {
        const tDate = new Date(t.transaction_at);
        return tDate.getFullYear() === now.getFullYear() &&
               tDate.getMonth() === now.getMonth();
      });
    } else if (filter === '3 Months') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0,0,0,0);
      filtered = allRecent.filter(t => {
        const tDate = new Date(t.transaction_at);
        return tDate >= threeMonthsAgo;
      });
    } else if (filter === 'This Year') {
      filtered = allRecent.filter(t => {
        const tDate = new Date(t.transaction_at);
        return tDate.getFullYear() === now.getFullYear();
      });
    } else if (filter === 'Custom') {
      if (customStart && customEnd) {
        const start = new Date(customStart).getTime();
        const end = new Date(customEnd + 'T23:59:59').getTime();
        filtered = allRecent.filter(t => {
          const tDate = new Date(t.transaction_at).getTime();
          return tDate >= start && tDate <= end;
        });
      }
    }

    setTransactions(filtered);
    setLoading(false);
  };

  let totalDeposited = 0; let cashDeposited = 0; let upiDeposited = 0;
  let totalWithdrawn = 0; let cashWithdrawn = 0; let upiWithdrawn = 0;

  transactions.forEach(t => {
    const amt = Number(t.amount);
    const isUpi = t.payment_mode === 'UPI';
    if (t.type === 'receive') {
      totalDeposited += amt;
      if (isUpi) upiDeposited += amt; else cashDeposited += amt;
    }
    if (t.type === 'give') {
      totalWithdrawn += amt;
      if (isUpi) upiWithdrawn += amt; else cashWithdrawn += amt;
    }
  });

  const netBalance = totalDeposited - totalWithdrawn;

  // Chart Data Processing
  const processChartData = () => {
    const dataMap = {}; 
    const initMap = (label) => {
      dataMap[label] = { label, deposited_cash: 0, deposited_upi: 0, withdrawn_cash: 0, withdrawn_upi: 0 };
    };

    if (filter === 'Today') {
      for (let i = 0; i < 24; i++) initMap(`${i}:00`);
    } else if (filter === '3 Months') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for(let i=3; i>=0; i--) {
         const d = new Date(); d.setMonth(d.getMonth() - i);
         initMap(`${d.getFullYear()}-${d.getMonth()}`);
         dataMap[`${d.getFullYear()}-${d.getMonth()}`].label = months[d.getMonth()];
      }
    } else if (filter === 'This Year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(m => initMap(m));
    } else if (filter === 'This Month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        initMap(d.getDate().toString());
      }
    } else if (filter === 'Custom' && customStart && customEnd) {
      // Group by day for simple custom range
      let curr = new Date(customStart);
      const e = new Date(customEnd);
      while (curr <= e) {
        initMap(curr.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
        curr.setDate(curr.getDate() + 1);
      }
    }

    transactions.forEach(t => {
      let label = '';
      const d = new Date(t.transaction_at);
      if (filter === 'Today') label = `${d.getHours()}:00`;
      else if (filter === '3 Months' || filter === 'This Year') label = d.toLocaleDateString('en-IN', { month: 'short' });
      else if (filter === 'This Month') label = d.getDate().toString();
      else if (filter === 'Custom') label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      // For 3 Months we initialized with YYYY-MM key mapping to month label. We need to find the correct object.
      let targetNode = dataMap[label];
      if (filter === '3 Months') targetNode = dataMap[`${d.getFullYear()}-${d.getMonth()}`];

      if (targetNode) {
        const amt = Number(t.amount);
        const mode = t.payment_mode === 'UPI' ? 'upi' : 'cash';
        if (t.type === 'receive') targetNode[`deposited_${mode}`] += amt;
        if (t.type === 'give') targetNode[`withdrawn_${mode}`] += amt;
      }
    });

    return Object.values(dataMap);
  };

  const chartData = processChartData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-borderBlue p-3 rounded-lg shadow-md text-[12px]">
          <p className="font-bold text-navyDark mb-1">{label}</p>
          <div className="flex flex-col space-y-1">
            <span className="text-[#0FAB6E] font-bold">Dep (Cash): ₹{Number(payload.find(p => p.dataKey === 'deposited_cash')?.value || 0).toLocaleString('en-IN')}</span>
            <span className="text-[#3B82F6] font-bold">Dep (UPI): ₹{Number(payload.find(p => p.dataKey === 'deposited_upi')?.value || 0).toLocaleString('en-IN')}</span>
            <span className="text-[#E03A3A] font-bold">Wth (Cash): ₹{Number(payload.find(p => p.dataKey === 'withdrawn_cash')?.value || 0).toLocaleString('en-IN')}</span>
            <span className="text-[#F59E0B] font-bold">Wth (UPI): ₹{Number(payload.find(p => p.dataKey === 'withdrawn_upi')?.value || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-6">
      <h1 className="font-bold text-[28px] text-navyDark leading-none pt-2">Summary</h1>

      {/* Time Filter Pills */}
      <div className="flex bg-white/40 backdrop-blur-md rounded-[12px] p-1 border border-white/50 mb-4 flex-wrap gap-1">
        {['Today', 'This Month', '3 Months', 'This Year', 'Custom'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-[13px] font-bold rounded-[10px] transition-all active:scale-95 ${
              filter === f ? 'bg-white text-royal shadow-sm border border-borderBlue' : 'text-muted hover:text-navyDark'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filter === 'Custom' && (
        <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-[12px] border border-borderBlue mb-4">
          <div>
            <label className="block text-[12px] text-muted font-bold mb-1">From</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[14px]" />
          </div>
          <div>
            <label className="block text-[12px] text-muted font-bold mb-1">To</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[14px]" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-royal animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-receiveBg border border-receive rounded-[16px] p-5 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="text-receive/80 text-[13px] font-medium tracking-wide mb-1">Total Deposited</div>
                <div className="text-receive font-bold text-[28px]">₹{totalDeposited.toLocaleString('en-IN')}</div>
              </div>
              <div className="mt-3 flex justify-between text-[11px] font-bold opacity-80 border-t border-receive/20 pt-2">
                <span className="text-[#0FAB6E]">Cash: ₹{cashDeposited.toLocaleString()}</span>
                <span className="text-[#3B82F6]">UPI: ₹{upiDeposited.toLocaleString()}</span>
              </div>
              <TrendingDown className="text-receive w-6 h-6 absolute top-5 right-5 opacity-80" />
            </div>

            <div className="bg-giveBg border border-give rounded-[16px] p-5 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="text-give/80 text-[13px] font-medium tracking-wide mb-1">Total Withdrawn</div>
                <div className="text-give font-bold text-[28px]">₹{totalWithdrawn.toLocaleString('en-IN')}</div>
              </div>
              <div className="mt-3 flex justify-between text-[11px] font-bold opacity-80 border-t border-give/20 pt-2">
                <span className="text-[#E03A3A]">Cash: ₹{cashWithdrawn.toLocaleString()}</span>
                <span className="text-[#F59E0B]">UPI: ₹{upiWithdrawn.toLocaleString()}</span>
              </div>
              <TrendingUp className="text-give w-6 h-6 absolute top-5 right-5 opacity-80" />
            </div>
          </div>

          <div className={`rounded-[16px] p-5 border text-center ${
            netBalance > 0 ? 'bg-receiveBg border-receive text-receive' : 
            netBalance < 0 ? 'bg-giveBg border-give text-give' : 
            'bg-gray-100 border-gray-300 text-gray-700'
          }`}>
            <div className="font-bold text-[18px]">
              {netBalance > 0 ? `Net: You are owed ₹${Math.abs(netBalance).toLocaleString('en-IN')}` : 
               netBalance < 0 ? `Net: You owe ₹${Math.abs(netBalance).toLocaleString('en-IN')} net` : 
               'Net: Fully balanced ₹0'}
            </div>
            <div className="text-[13px] mt-2 opacity-80 font-medium">
              {transactions.length} transactions in this period
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white border border-borderBlue rounded-[16px] p-4 sm:p-6">
             <div className="h-[260px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#D6E4F7" vertical={false} />
                   <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7FA8' }} axisLine={false} tickLine={false} dy={10} />
                   <YAxis tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} tick={{ fontSize: 11, fill: '#6B7FA8' }} axisLine={false} tickLine={false} />
                   <Tooltip content={<CustomTooltip />} cursor={{ fill: '#EEF4FF' }} />
                   <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} iconType="circle" />
                   <Bar dataKey="deposited_cash" name="Dep. Cash" stackId="dep" fill="#0FAB6E" />
                   <Bar dataKey="deposited_upi" name="Dep. UPI" stackId="dep" fill="#3B82F6" radius={[4,4,0,0]} />
                   <Bar dataKey="withdrawn_cash" name="Wth. Cash" stackId="wth" fill="#E03A3A" />
                   <Bar dataKey="withdrawn_upi" name="Wth. UPI" stackId="wth" fill="#F59E0B" radius={[4,4,0,0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Breakdown List */}
          <div>
            <h2 className="font-bold text-[18px] text-navyDark mb-4">Transactions in this period</h2>
            {transactions.length === 0 ? (
              <div className="text-center p-8 text-muted border border-dashed border-borderBlue rounded-[16px] bg-white">
                <p>No transactions found for this period.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((t) => (
                  <TransactionCard key={t.id} transaction={t} variant="compact" />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
