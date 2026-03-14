import React from 'react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-navyDark/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="bg-white rounded-[20px] w-full max-w-[340px] p-6 shadow-2xl transition-transform transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[18px] font-bold text-navyDark mb-2">{title}</h3>
        <p className="text-[14px] text-muted mb-6 leading-relaxed">{message}</p>
        
        <div className="flex space-x-3">
          <button 
            onClick={onCancel}
            className="flex-1 h-12 rounded-[12px] font-bold text-muted bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 h-12 rounded-[12px] font-bold text-white bg-royal hover:bg-royalDark transition-colors active:scale-95 shadow-md shadow-royal/30"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
