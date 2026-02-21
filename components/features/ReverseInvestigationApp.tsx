
import React, { useState, useEffect } from 'react';

interface ReverseInvestigationAppProps {
  onBack: () => void;
  isOpen: boolean;
}

const ReverseInvestigationApp: React.FC<ReverseInvestigationAppProps> = ({ onBack, isOpen }) => {
  const [checkInEnabled, setCheckInEnabled] = useState(false);
  const [shuraModeEnabled, setShuraModeEnabled] = useState(false);
  const [hasPassword, setHasPassword] = useState(false); // Simulate detection of system password

  useEffect(() => {
    if (isOpen) {
      // Load settings
      const savedCheckIn = localStorage.getItem('ephone_ri_checkin');
      const savedShura = localStorage.getItem('ephone_ri_shura');
      // Mock detection of password (e.g., if lock screen is enabled in main app)
      setHasPassword(true); 

      if (savedCheckIn) setCheckInEnabled(JSON.parse(savedCheckIn));
      if (savedShura) setShuraModeEnabled(JSON.parse(savedShura));
    }
  }, [isOpen]);

  const toggleCheckIn = () => {
    const newVal = !checkInEnabled;
    setCheckInEnabled(newVal);
    localStorage.setItem('ephone_ri_checkin', JSON.stringify(newVal));
    
    // If disabling check-in, force disable shura
    if (!newVal) {
        setShuraModeEnabled(false);
        localStorage.setItem('ephone_ri_shura', JSON.stringify(false));
    }
  };

  const toggleShuraMode = () => {
    if (!checkInEnabled && !shuraModeEnabled) {
        alert("请先开启查岗模式");
        return;
    }
    const newVal = !shuraModeEnabled;
    setShuraModeEnabled(newVal);
    localStorage.setItem('ephone_ri_shura', JSON.stringify(newVal));
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-[#1a1a1a] z-50 flex flex-col app-transition text-white">
      {/* Header */}
      <div className="h-24 pt-12 px-6 flex items-center justify-between border-b border-gray-800 bg-[#1a1a1a]/90 backdrop-blur-md z-10">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-full text-gray-300 active:scale-95 transition-transform">
            ‹
        </button>
        <h1 className="font-bold text-lg tracking-wider text-red-500">反向查手机</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-xl animate-[fadeIn_0.5s]">
              <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                      <h3 className="font-bold text-red-400 text-sm mb-1">风险提示</h3>
                      <p className="text-xs text-red-200/70 leading-relaxed">
                          开启此功能意味着您允许虚拟角色介入您的模拟设备权限。请做好心理准备，可能会触发意想不到的剧情。
                      </p>
                  </div>
              </div>
          </div>

          <div className="space-y-6">
              {/* Check-in Mode */}
              <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700 animate-[slideUp_0.3s_ease-out]">
                  <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                          <span className="text-xl">🕵️‍♀️</span>
                          <span className="font-bold text-lg">查岗模式</span>
                      </div>
                      <div 
                        onClick={toggleCheckIn}
                        className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer ${checkInEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                      >
                          <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checkInEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                      启用后，角色可能会在剧情触发时（如长时间未回复）尝试登录您的账号，或检查您的模拟相册。
                  </p>
                  <div className="flex gap-2 mt-3">
                      <div className={`text-[10px] px-2 py-1 rounded border ${hasPassword ? 'border-green-500 text-green-500' : 'border-gray-600 text-gray-500'}`}>
                          {hasPassword ? '检测到密码保护' : '无密码保护'}
                      </div>
                      <div className="text-[10px] px-2 py-1 rounded border border-gray-600 text-gray-400">
                          {hasPassword ? '角色需猜密码' : '角色可直接登录'}
                      </div>
                  </div>
              </div>

              {/* Shura Field Mode */}
              <div className={`bg-gray-800/50 rounded-2xl p-5 border border-gray-700 transition-all duration-300 animate-[slideUp_0.4s_ease-out] ${checkInEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
                  <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                          <span className="text-xl">🔥</span>
                          <span className="font-bold text-lg text-red-400">修罗场模式</span>
                      </div>
                      <div 
                        onClick={toggleShuraMode}
                        className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer ${shuraModeEnabled ? 'bg-red-600' : 'bg-gray-600'}`}
                      >
                          <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${shuraModeEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                      <strong>高能预警：</strong> 启用后，如果同时与多位角色互动，可能会触发争风吃醋、抢夺手机控制权等特殊事件。
                  </p>
              </div>

              {/* Logs */}
              <div className="mt-8 animate-[slideUp_0.5s_ease-out]">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 ml-1">最近记录</h3>
                  <div className="space-y-2">
                      <div className="bg-black/30 p-3 rounded-lg border-l-2 border-gray-600 flex justify-between items-center">
                          <span className="text-xs text-gray-300">系统: 应用初始化完成</span>
                          <span className="text-[10px] text-gray-600">Just now</span>
                      </div>
                      {checkInEnabled && (
                          <div className="bg-black/30 p-3 rounded-lg border-l-2 border-green-500 flex justify-between items-center">
                              <span className="text-xs text-green-400">系统: 查岗监控已启动</span>
                              <span className="text-[10px] text-gray-600">Now</span>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          <div className="mt-10 text-center">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-mono">
                  SECURE LEVEL: {shuraModeEnabled ? 'CRITICAL' : checkInEnabled ? 'MODERATE' : 'SAFE'}
              </p>
          </div>
      </div>
    </div>
  );
};

export default ReverseInvestigationApp;
