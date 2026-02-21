
import React, { useState, useEffect } from 'react';
import { getWeatherReport } from '../../services/geminiService';

interface WeatherAppProps {
  onBack: () => void;
  isOpen: boolean;
}

const WeatherApp: React.FC<WeatherAppProps> = ({ onBack, isOpen }) => {
  const [temperature, setTemperature] = useState(24);
  const [condition, setCondition] = useState('Sunny');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  // Simulate diverse weather on mount or refresh
  const refreshWeather = async () => {
      setLoading(true);
      // Random mock data
      const conditions = ['Sunny', 'Rainy', 'Cloudy', 'Stormy', 'Snowy', 'Windy'];
      const newCond = conditions[Math.floor(Math.random() * conditions.length)];
      const newTemp = Math.floor(Math.random() * 35) - 5; // -5 to 30
      
      setCondition(newCond);
      setTemperature(newTemp);

      const aiText = await getWeatherReport(newTemp, newCond);
      setReport(aiText);
      setLoading(false);
  };

  useEffect(() => {
      if (isOpen) {
          refreshWeather();
      }
  }, [isOpen]);

  if (!isOpen) return null;

  // Dynamic Background based on Condition
  const getBackground = () => {
      switch(condition) {
          case 'Sunny': return 'bg-gradient-to-br from-blue-400 to-orange-300';
          case 'Rainy': return 'bg-gradient-to-br from-gray-700 to-blue-800';
          case 'Cloudy': return 'bg-gradient-to-br from-gray-300 to-gray-500';
          case 'Stormy': return 'bg-gradient-to-br from-indigo-900 to-purple-900';
          case 'Snowy': return 'bg-gradient-to-br from-blue-100 to-white';
          default: return 'bg-gradient-to-br from-blue-400 to-blue-600';
      }
  };

  const getEmoji = () => {
      switch(condition) {
          case 'Sunny': return '☀️';
          case 'Rainy': return '🌧️';
          case 'Cloudy': return '☁️';
          case 'Stormy': return '⛈️';
          case 'Snowy': return '❄️';
          default: return '🌤️';
      }
  };

  return (
    <div className={`absolute inset-0 z-50 flex flex-col app-transition text-white ${getBackground()}`}>
        
        {/* Header */}
        <div className="h-24 pt-12 px-6 flex justify-between items-center z-10">
            <button onClick={onBack} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                ‹
            </button>
            <h1 className="font-bold tracking-widest uppercase text-sm opacity-80">SkyCast AI</h1>
            <button onClick={refreshWeather} className={`w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors ${loading ? 'animate-spin' : ''}`}>
                ↻
            </button>
        </div>

        {/* Main Display */}
        <div className="flex-1 flex flex-col items-center pt-10 px-6">
            <div className="text-8xl mb-4 drop-shadow-lg animate-[float_4s_ease-in-out_infinite]">
                {getEmoji()}
            </div>
            <div className="text-[120px] font-bold leading-none tracking-tighter drop-shadow-md">
                {temperature}°
            </div>
            <div className="text-2xl font-medium opacity-90 mb-12">
                {condition}
            </div>

            {/* AI Report Card */}
            <div className="w-full bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30 shadow-lg animate-[slideUp_0.5s_ease-out]">
                <div className="flex items-center gap-2 mb-3">
                    <span className="bg-white/30 p-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">Vibe Report</span>
                    {loading && <span className="text-xs animate-pulse">Consulting the clouds...</span>}
                </div>
                <p className="text-lg font-medium leading-relaxed italic">
                    {loading ? "..." : `"${report}"`}
                </p>
                <div className="mt-4 flex justify-between items-center text-xs opacity-70">
                    <span>Humidity: {Math.floor(Math.random() * 50) + 30}%</span>
                    <span>Wind: {Math.floor(Math.random() * 20)} km/h</span>
                </div>
            </div>
        </div>

        {/* Hourly Forecast (Mock) */}
        <div className="h-40 bg-black/10 backdrop-blur-sm border-t border-white/10 flex items-center gap-6 overflow-x-auto px-6 no-scrollbar pb-safe">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 min-w-[60px]">
                    <span className="text-sm opacity-80">{(new Date().getHours() + i + 1) % 24}:00</span>
                    <span className="text-2xl opacity-90">{['☁️','☀️','🌧️'][Math.floor(Math.random()*3)]}</span>
                    <span className="font-bold">{temperature + (i%3)-1}°</span>
                </div>
            ))}
        </div>
    </div>
  );
};

export default WeatherApp;
