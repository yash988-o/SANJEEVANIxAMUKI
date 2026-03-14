import React from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-[72px] left-0 right-0 z-[9999] flex flex-col items-center space-y-2 pointer-events-none px-4 md:pl-[220px]">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isInfo = toast.type === 'info';

        return (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex items-center shadow-lg rounded-[10px] p-3 w-full max-w-[400px] border-l-[4px] border border-borderBlue transition-all ease-out duration-250 ${
              isSuccess ? 'border-l-receive bg-receiveBg' :
              isError ? 'border-l-give bg-giveBg' :
              'border-l-royal bg-white'
            }`}
            style={{
              animation: 'toast-slide-down 250ms ease forwards'
            }}
          >
            <div className="mr-3 shrink-0">
              {isSuccess && <CheckCircle className="w-5 h-5 text-receive" />}
              {isError && <XCircle className="w-5 h-5 text-give" />}
              {isInfo && <Info className="w-5 h-5 text-royal" />}
            </div>
            
            <div className="flex-1 text-[14px] text-navyDark font-medium leading-snug">
              {toast.message}
            </div>

            <button 
              onClick={() => removeToast(toast.id)}
              className="ml-3 shrink-0 text-muted hover:text-navyDark p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes toast-slide-down {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
