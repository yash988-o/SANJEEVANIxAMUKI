import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import TransactionCard from '../components/TransactionCard';

export default function Summary() {
  const [filter, setFilter] = useState('Today'); // 'Today', 'This Month', 'This Year'
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    let fetchStart = new Date();
    // Fetch a large buffer to ensure we have the whole year if needed
    fetchStart.setFullYear(fetchStart.getFullYear() - 1); 

    const { data } = await supabase
      .from('transactions')
      .select('*, profiles(name, mobile)')
      .gte('transaction_at', fetchStart.toISOString())
      .is('is_cleared', false)
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
    }

    setTransactions(filtered);
    setLoading(false);
  };

  let totalDeposited = 0;
  let totalWithdrawn = 0;

  transactions.forEach(t => {
    if (t.type === 'receive') totalDeposited += Number(t.amount);
    if (t.type === 'give') totalWithdrawn += Number(t.amount);
  });

  const netBalance = totalDeposited - totalWithdrawn;

  // Chart Data Processing
  const processChartData = () => {
    const dataMap = {}; // label -> { deposited, withdrawn }

    if (filter === 'Today') {
      for (let i = 0; i < 24; i++) {
        dataMap[`${i}:00`] = { label: `${i}:00`, deposited: 0, withdrawn: 0 };
      }
      transactions.forEach(t => {
        const h = new Date(t.transaction_at).getHours();
        const label = `${h}:00`;
        if (t.type === 'receive') dataMap[label].deposited += Number(t.amount);
        if (t.type === 'give') dataMap[label].withdrawn += Number(t.amount);
      });
    } else if (filter === '3 Months') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for(let i=3; i>=0; i--) {
         const d = new Date();
         d.setMonth(d.getMonth() - i);
         const key = `${d.getFullYear()}-${d.getMonth()}`;
         dataMap[key] = { label: months[d.getMonth()], deposited: 0, withdrawn: 0 };
      }
      transactions.forEach(t => {
        const d = new Date(t.transaction_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (dataMap[key]) {
          if (t.type === 'receive') dataMap[key].deposited += Number(t.amount);
          if (t.type === 'give') dataMap[key].withdrawn += Number(t.amount);
        }
      });
    } else if (filter === 'This Year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(m => {
        dataMap[m] = { label: m, deposited: 0, withdrawn: 0 };
      });
      transactions.forEach(t => {
        const d = new Date(t.transaction_at);
        const label = months[d.getMonth()];
        if (t.type === 'receive') dataMap[label].deposited += Number(t.amount);
        if (t.type === 'give') dataMap[label].withdrawn += Number(t.amount);
      });
    } else if (filter === 'This Month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.getDate().toString();
        dataMap[label] = { label, deposited: 0, withdrawn: 0 };
      }
      transactions.forEach(t => {
        const d = new Date(t.transaction_at);
        const label = d.getDate().toString();
        if (dataMap[label]) {
          if (t.type === 'receive') dataMap[label].deposited += Number(t.amount);
          if (t.type === 'give') dataMap[label].withdrawn += Number(t.amount);
        }
      });
    }

    return Object.values(dataMap);
  };

  const chartData = processChartData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-borderBlue p-3 rounded-lg shadow-md text-[12px]">
          <p className="font-bold text-navyDark mb-1">{label}</p>
          <div className="flex flex-col space-y-1">
            <span className="text-receive font-bold">Dep: ₹{Number(payload[0].value).toLocaleString('en-IN')}</span>
            <span className="text-give font-bold">Wth: ₹{Number(payload[1].value).toLocaleString('en-IN')}</span>
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
        <div className="flex bg-white/40 backdrop-blur-md rounded-[12px] p-1 border border-white/50 mb-6 flex-wrap md:flex-nowrap gap-1 md:gap-0">
          {['Today', 'This Month', '3 Months', 'This Year'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-[14px] font-bold rounded-[10px] transition-all active:scale-95 ${
                filter === f ? 'bg-white text-royal shadow-sm border border-borderBlue' : 'text-muted hover:text-navyDark'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-royal animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-receiveBg border border-receive rounded-[16px] p-5 relative overflow-hidden">
              <div className="text-receive/80 text-[13px] font-medium tracking-wide mb-1">Total Deposited</div>
              <div className="text-receive font-bold text-[28px]">₹{totalDeposited.toLocaleString('en-IN')}</div>
              <TrendingDown className="text-receive w-6 h-6 absolute top-5 right-5 opacity-80" />
            </div>

            <div className="bg-giveBg border border-give rounded-[16px] p-5 relative overflow-hidden">
              <div className="text-give/80 text-[13px] font-medium tracking-wide mb-1">Total Withdrawn</div>
              <div className="text-give font-bold text-[28px]">₹{totalWithdrawn.toLocaleString('en-IN')}</div>
              <TrendingUp className="text-give w-6 h-6 absolute top-5 right-5 opacity-80" />
            </div>
          </div>

          {/* Net Balance Card */}
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
                   <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} iconType="circle" />
                   <Bar dataKey="deposited" name="Deposited" fill="#0FAB6E" radius={[4,4,0,0]} maxBarSize={40} />
                   <Bar dataKey="withdrawn" name="Withdrawn" fill="#E03A3A" radius={[4,4,0,0]} maxBarSize={40} />
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
