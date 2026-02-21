
import React from 'react';
import { AppID } from '../types';

interface DockProps {
  onAppClick: (app: AppID) => void;
}

const Dock: React.FC<DockProps> = ({ onAppClick }) => {
  const dockApps = [
    { id: AppID.WorldBook, label: 'Gallery', icon: '🖼️', color: 'bg-gray-200' }, // Gallery placeholder
    { id: AppID.Weather, label: 'Location', icon: '📍', color: 'bg-gray-200' }, // Map placeholder
    { id: AppID.Beautify, label: 'Video', icon: '📹', color: 'bg-gray-200' }, // Video placeholder
  ];

  return (
    <div className="h-20 bg-white/60 backdrop-blur-xl rounded-[32px] flex items-center justify-around px-8 shadow-lg border border-white/40">
      {dockApps.map((app) => (
        <button
          key={app.id}
          onClick={() => onAppClick(app.id)}
          className="flex flex-col items-center gap-1 transition-transform active:scale-90 hover:-translate-y-1 duration-200"
        >
          <div className={`w-12 h-12 ${app.color} rounded-[18px] flex items-center justify-center text-xl text-gray-600 border border-white/50`}>
            {app.icon}
          </div>
        </button>
      ))}
    </div>
  );
};

export default Dock;
