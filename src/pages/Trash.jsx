import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Trash2 } from 'lucide-react';
import TransactionCard from '../components/TransactionCard';

export default function Trash() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeleted();
  }, []);

  const fetchDeleted = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*, profiles(name, mobile)')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const handleRestore = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6 pb-6 pt-2">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-red-100 rounded-full text-red-500">
          <Trash2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-[28px] text-navyDark leading-none">Trash</h1>
          <p className="text-[14px] text-muted font-medium mt-1">Recently deleted transactions</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-royal animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-muted bg-white/60 backdrop-blur-md border border-white/50 rounded-[16px]">
          <Trash2 className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-center text-[14px]">Trash is empty.</p>
        </div>
      ) : (
        <div className="space-y-[8px]">
          {transactions.map((t) => (
            <TransactionCard 
              key={t.id} 
              transaction={t} 
              variant="full" 
              isTrashView={true} 
              onRestore={handleRestore} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
