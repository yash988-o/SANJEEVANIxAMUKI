import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import ProfileHeader from '../components/ProfileHeader';
import TransactionCard from '../components/TransactionCard';

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, [id]);

  const fetchProfileData = async () => {
    setLoading(true);
    // Fetch Profile
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (profileData) {
      setProfile(profileData);
      // Fetch Transactions
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .eq('profile_id', id)
        .order('transaction_at', { ascending: false });
        
      if (transData) {
        // Sort so pending (is_cleared=false) are on top, and cleared (is_cleared=true) are at the bottom.
        // It's already sorted by transaction_at descending from the query, so a stable sort keeps newest on top for each group.
        const sorted = [...transData].sort((a, b) => {
          if (a.is_cleared === b.is_cleared) return 0;
          return a.is_cleared ? 1 : -1;
        });
        setTransactions(sorted);
      }
    }
    setLoading(false);
  };

  const handleFabClick = () => {
    // Open modal/bottom sheet or navigate back to main with pre-filled state.
    // For simplicity given the spec, we can use React Router state to pass pre-fill data.
    navigate('/', { state: { prefill: { id: profile.id, name: profile.name, mobile: profile.mobile } } });
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-royal animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8 mt-8 text-muted bg-white rounded-lg border border-borderBlue">
        <p>Customer not found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-royal font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="relative pb-24 h-full min-h-[calc(100vh-160px)]">
      {/* Dynamic Top Bar Override for this specific page could be done cleanly via Layout wrapper, 
          but as per spec we just render a localized top section here that looks like a header override */}
      <div className="flex items-center space-x-4 mb-6 pt-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white text-navyDark transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-[20px] text-navyDark">Customer Profile</h1>
      </div>

      <ProfileHeader profile={profile} transactions={transactions} />

      <div>
        {(() => {
          const activeTx = transactions.filter(t => !t.is_cleared);
          const clearedTx = transactions.filter(t => t.is_cleared);

          if (transactions.length === 0) {
            return (
              <div className="text-center p-8 bg-white border border-borderBlue rounded-[16px] text-muted">
                No transactions found.
              </div>
            );
          }

          return (
            <>
              {activeTx.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <h2 className="font-bold text-[18px] text-navyDark">Active Transactions</h2>
                    <span className="bg-white border border-borderBlue text-muted px-2 py-1 rounded-full text-[12px] font-bold">
                      {activeTx.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {activeTx.map(t => (
                      <TransactionCard key={t.id} transaction={t} variant="profile" />
                    ))}
                  </div>
                </div>
              )}

              {clearedTx.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <h2 className="font-bold text-[18px] text-navyDark/70">Cleared Transactions</h2>
                    <span className="bg-white border border-borderBlue text-muted px-2 py-1 rounded-full text-[12px] font-bold">
                      {clearedTx.length}
                    </span>
                  </div>
                  <div className="space-y-2 opacity-80">
                    {clearedTx.map(t => (
                      <TransactionCard key={t.id} transaction={t} variant="profile" />
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={handleFabClick}
        className="fixed bottom-[88px] md:bottom-8 right-6 w-14 h-14 bg-royal hover:bg-royalDark text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 z-50 focus:outline-none focus:ring-4 focus:ring-royal/30"
      >
        <Plus className="w-8 h-8" />
      </button>

    </div>
  );
}
