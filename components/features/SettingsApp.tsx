
import React, { useState, useEffect } from 'react';
import { fetchModels } from '../../services/geminiService';
import { AppSettings } from '../../types';

interface SettingsAppProps {
  onBack: () => void;
  isOpen: boolean;
}

const SETTINGS_KEY = 'ephone_settings';

const SettingsApp: React.FC<SettingsAppProps> = ({ onBack, isOpen }) => {
  const [settings, setSettings] = useState<AppSettings>({
    baseUrl: '',
    apiKey: '',
    modelName: 'gemini-3-flash-preview'
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
          const parsed = JSON.parse(saved);
          // Merge with default to prevent undefined fields
          setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
          console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const handleChange = (field: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
  };

  const handleSave = () => {
    // Sanitize before saving
    const trimmedSettings = {
        ...settings,
        apiKey: settings.apiKey.trim(),
        baseUrl: settings.baseUrl.trim(),
        modelName: settings.modelName.trim()
    };
    
    setSettings(trimmedSettings); // Update UI
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(trimmedSettings));
    
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleFetchModels = async () => {
    setIsLoadingModels(true);
    // Ensure current settings are saved first so service uses them
    const tempSettings = {
        ...settings,
        apiKey: settings.apiKey.trim(),
        baseUrl: settings.baseUrl.trim(),
        modelName: settings.modelName.trim()
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(tempSettings));
    
    try {
      const models = await fetchModels();
      setAvailableModels(models);
      // Don't auto-override modelName unless it's empty
      if (models.length > 0 && !settings.modelName) {
          // Optional: Could set default here, but let's respect user choice
      }
    } catch (e) {
      // Fallback handled in service
    } finally {
      setIsLoadingModels(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-gray-100 flex flex-col z-50 app-transition">
      {/* Header */}
      <div className="h-24 bg-gray-200/80 backdrop-blur-md pt-12 px-4 flex items-center justify-between border-b border-gray-300 shadow-sm z-10">
        <button onClick={onBack} className="text-blue-500 font-medium flex items-center">
            <span className="text-2xl mr-1">‹</span> Home
        </button>
        <h1 className="font-bold text-lg text-black">Settings</h1>
        <div className="w-16"></div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-0">
        
        {/* Connection Section */}
        <div className="mt-6 mb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Connection
        </div>
        <div className="bg-white border-y border-gray-200">
            <div className="pl-4 pr-2 py-3 flex items-center border-b border-gray-100 last:border-0">
                <span className="w-24 font-medium text-gray-900">Base URL</span>
                <input 
                    type="text" 
                    value={settings.baseUrl}
                    onChange={(e) => handleChange('baseUrl', e.target.value)}
                    placeholder="Optional (Default: Google)"
                    className="flex-1 text-right text-gray-600 outline-none placeholder-gray-300"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                />
            </div>
            <div className="pl-4 pr-2 py-3 flex items-center">
                <span className="w-24 font-medium text-gray-900">API Key</span>
                <input 
                    type="password" 
                    value={settings.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    placeholder="Enter your API Key"
                    className="flex-1 text-right text-gray-600 outline-none placeholder-gray-300"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                />
            </div>
        </div>
        <p className="px-4 mt-2 text-xs text-gray-400">
            Leave API Key empty to use the system default.
        </p>

        {/* Model Section */}
        <div className="mt-8 mb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Model Configuration
        </div>
        <div className="bg-white border-y border-gray-200 overflow-hidden">
            <div className="pl-4 pr-2 py-3 flex items-center border-b border-gray-100">
                <span className="w-24 font-medium text-gray-900">Model Name</span>
                <input 
                    type="text" 
                    value={settings.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    className="flex-1 text-right text-gray-600 outline-none"
                    placeholder="e.g. gemini-3-flash-preview"
                    autoComplete="off"
                />
            </div>
            
            <div className="p-3 bg-gray-50 flex justify-between items-center border-b border-gray-100">
                <span className="text-xs text-gray-500 pl-1">
                    {availableModels.length > 0 
                        ? `${availableModels.length} models found` 
                        : 'Pull latest models from server'}
                </span>
                <button 
                    onClick={handleFetchModels}
                    disabled={isLoadingModels}
                    className="bg-white border border-gray-300 shadow-sm text-black px-4 py-1.5 rounded-full text-xs font-semibold active:bg-gray-100 transition-colors flex items-center gap-2"
                >
                    {isLoadingModels ? (
                        <>
                            <span className="w-3 h-3 border-2 border-gray-400 border-t-black rounded-full animate-spin"></span>
                            Fetching...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                            Pull Models
                        </>
                    )}
                </button>
            </div>

            {availableModels.length > 0 && (
                 <div className="pl-4 pr-2 py-3 flex items-center animate-[fadeIn_0.3s_ease-out]">
                    <span className="w-24 font-medium text-gray-900">Select</span>
                    <div className="flex-1 relative">
                        <select 
                            onChange={(e) => handleChange('modelName', e.target.value)}
                            value={availableModels.includes(settings.modelName) ? settings.modelName : ""}
                            className="w-full text-right text-blue-500 outline-none bg-transparent appearance-none pr-4"
                        >
                             <option value="" disabled>-- Choose a model --</option>
                            {availableModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-gray-400">
                             <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Save Button */}
        <div className="mt-8 px-4">
            <button 
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-semibold shadow-sm transition-all text-white
                    ${saveStatus === 'saved' ? 'bg-green-500' : 'bg-blue-600 active:scale-[0.98]'}
                `}
            >
                {saveStatus === 'saved' ? 'Saved Successfully' : 'Save Configuration'}
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsApp;
