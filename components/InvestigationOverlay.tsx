
import React, { useState, useEffect } from 'react';

interface InvestigationOverlayProps {
  charName: string;
  onClose: (result: 'stopped' | 'failed' | 'allowed') => void;
}

const InvestigationOverlay: React.FC<InvestigationOverlayProps> = ({ charName, onClose }) => {
  const [status, setStatus] = useState<'viewing' | 'stopping' | 'failed' | 'success'>('viewing');
  
  // Auto-close if allowed to finish (simulated duration)
  useEffect(() => {
    if (status === 'viewing') {
      const timer = setTimeout(() => {
        onClose('allowed');
      }, 8000); // 8 seconds to view
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  const handleStop = () => {
    setStatus('stopping');
    setTimeout(() => {
      // 50% chance to fail
      const isSuccess = Math.random() > 0.5;
      if (isSuccess) {
        setStatus('success');
        setTimeout(() => onClose('stopped'), 1500);
      } else {
        setStatus('failed');
        setTimeout(() => onClose('failed'), 2000);
      }
    }, 1500);
  };

  // Inject Shake Animation Style when failed
  useEffect(() => {
      if (status === 'failed') {
          const styleId = 'investigation-shake-style';
          if (!document.getElementById(styleId)) {
              const style = document.createElement('style');
              style.id = styleId;
              style.textContent = `
                @keyframes shake-card {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake-card { animation: shake-card 0.4s ease-in-out; }
            `;
              document.head.appendChild(style);
          }
          return () => {
              const style = document.getElementById(styleId);
              if (style) style.remove();
          };
      }
  }, [status]);

  return (
    <div className="absolute inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-8 animate-[fadeIn_0.3s]">
      <div className={`w-full max-w-[320px] bg-white rounded-[32px] p-8 flex flex-col items-center shadow-2xl animate-[scaleIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden ${status === 'failed' ? 'animate-shake-card' : ''}`}>
        
        {/* Glow Effect */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-pink-50 to-transparent pointer-events-none"></div>

        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-[#ffc0cb] border-4 border-white flex items-center justify-center mb-6 relative shadow-inner z-10">
            <div className="w-12 h-12 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M9 12l2 2 4-4"></path>
                </svg>
            </div>
            {/* Pulse Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
        </div>

        {/* Text */}
        <h2 className="text-xl font-bold text-gray-800 mb-2 z-10">
            {status === 'failed' ? '阻止失败' : status === 'success' ? '已成功阻止' : '账号正在被查看'}
        </h2>
        
        <p className="text-sm text-gray-500 mb-8 text-center z-10 font-medium">
            {status === 'failed' ? '对方权限过高，无法踢出' : 
             status === 'success' ? '已强制断开对方连接' : 
             status === 'stopping' ? '正在尝试夺回控制权...' : 
             `${charName} 正在查看你的账号`}
        </p>

        {/* Loading Dots */}
        {(status === 'viewing' || status === 'stopping') && (
            <div className="flex gap-2 mb-8 z-10">
                <div className="w-2 h-2 bg-pink-200 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                <div className="w-2 h-2 bg-pink-300 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
            </div>
        )}

        {/* Footer Info */}
        {status === 'viewing' && (
            <p className="text-xs text-gray-300 mb-6 z-10">查看完成后将自动恢复</p>
        )}

        {/* Button */}
        {status === 'viewing' && (
            <div className="w-full space-y-3 z-10">
                <button 
                    onClick={handleStop}
                    className="w-full bg-[#ff9da8] hover:bg-[#ff8c9a] text-white font-bold py-3.5 rounded-full shadow-lg shadow-pink-200/50 active:scale-95 transition-all text-sm tracking-wide"
                >
                    立即阻止
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default InvestigationOverlay;
