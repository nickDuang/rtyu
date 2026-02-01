import React from 'react';
import { AppID } from '../types';

interface DockProps {
  onAppClick: (app: AppID) => void;
}

const Dock: React.FC<DockProps> = ({ onAppClick }) => {
  const dockApps = [
    { id: AppID.WeChat, label: 'WeChat', icon: '💬', color: 'bg-gradient-to-b from-green-400 to-green-500' },
    { id: AppID.Mail, label: 'Messages', icon: '✉️', color: 'bg-gradient-to-b from-blue-400 to-blue-500' },
    { id: AppID.WorldBook, label: 'World', icon: '📖', color: 'bg-gradient-to-b from-indigo-500 to-indigo-600' },
    { id: AppID.Beautify, label: 'Theme', icon: '🎨', color: 'bg-gradient-to-br from-pink-400 to-purple-500' },
  ];

  return (
    <div className="absolute bottom-8 left-6 right-6 h-20 bg-white/40 backdrop-blur-xl rounded-[28px] flex items-center justify-around px-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-white/40 z-40">
      {dockApps.map((app) => (
        <button
          key={app.id}
          onClick={() => onAppClick(app.id)}
          className="flex flex-col items-center gap-1 transition-transform active:scale-90 hover:-translate-y-1 duration-200"
        >
          <div className={`w-12 h-12 ${app.color} rounded-2xl flex items-center justify-center text-xl shadow-md text-white border border-white/20`}>
            {app.icon}
          </div>
        </button>
      ))}
    </div>
  );
};

export default Dock;