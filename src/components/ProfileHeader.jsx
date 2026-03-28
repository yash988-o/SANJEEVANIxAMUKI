import React from 'react';
import { Phone } from 'lucide-react';
import { calculateInterest } from '../lib/interestUtils';

export default function ProfileHeader({ profile, transactions, interestConfig }) {
  if (!profile) return null;

  let totalGiven = 0;
  let totalReceived = 0;

  const activeTx = (transactions || []).filter(t => !t.is_cleared);
  activeTx.forEach(t => {
    if (t.type === 'give') totalGiven += Number(t.amount);
    if (t.type === 'receive') totalReceived += Number(t.amount);
  });

  const { principal, interest, total } = calculateInterest(activeTx, interestConfig);

  return (
    <div className="flex flex-col space-y-4 mb-6">
      {/* Header Card */}
      <div className="bg-white border border-borderBlue rounded-[16px] p-5 flex flex-col items-center text-center">
        <div className="w-[60px] h-[60px] bg-royal rounded-full flex items-center justify-center text-white font-bold text-[24px] mb-3">
          {profile.name?.charAt(0).toUpperCase()}
        </div>
        <h2 className="font-bold text-[22px] text-navyDark leading-none mb-2">{profile.name}</h2>
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
