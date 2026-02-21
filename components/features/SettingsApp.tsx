
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { fetchModels } from '../../services/geminiService';
import { AppSettings, ApiPreset } from '../../types';

interface SettingsAppProps {
  onBack: () => void;
  isOpen: boolean;
}

const SETTINGS_KEY = 'ephone_settings';
const PRESETS_KEY = 'ephone_api_presets';

// Blocked sites list from the source file
const BLOCKED_API_SITES = [
    'api.pisces.ink',
    'aiapi.qzz.io'
];

const SettingsApp: React.FC<SettingsAppProps> = ({ onBack, isOpen }) => {
  // --- Main Settings State ---
  const [settings, setSettings] = useState<AppSettings>({
    provider: 'gemini',
    baseUrl: '',
    apiKey: '',
    modelName: 'gemini-3-flash-preview',
    enableBackgroundActivity: false,
    backgroundActivityInterval: 60,
    blockCooldownHours: 1
  });

  // --- Presets State ---
  const [presets, setPresets] = useState<ApiPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isManagingPresets, setIsManagingPresets] = useState(false);

  // --- UI/Status State ---
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  
  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Initialization ---
  useEffect(() => {
    // Load Settings
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
          console.error("Failed to parse settings", e);
      }
    }

    // Load Presets
    const savedPresets = localStorage.getItem(PRESETS_KEY);
    if (savedPresets) {
        try {
            setPresets(JSON.parse(savedPresets));
        } catch (e) {
            console.error("Failed to parse presets", e);
        }
    }
  }, []);

  // Sync selection if current settings match a preset
  useEffect(() => {
      const match = presets.find(p => 
          p.baseUrl === settings.baseUrl && 
          p.apiKey === settings.apiKey &&
          p.modelName === settings.modelName
      );
      if (match) {
          setSelectedPresetId(match.id);
      } else {
          setSelectedPresetId(''); // Custom
      }
  }, [settings, presets]);

  // --- Handlers ---

  const handleChange = (field: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
    if (field === 'apiKey' || field === 'baseUrl') {
        setTestStatus('idle');
        setTestMessage('');
    }
  };

  const handleSave = () => {
    // Check Blocked Sites
    if (BLOCKED_API_SITES.some(site => settings.baseUrl.includes(site))) {
        alert("Error: This API site is blocked.");
        return;
    }

    // Warning for Background Activity
    if (settings.enableBackgroundActivity) {
        // Simple check to avoid nagging every save, but if needed check previous value
        const prev = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        if (!prev.enableBackgroundActivity) {
            const confirm = window.confirm("【High Cost Warning】\n\nEnabling background activity will make AI characters proactively message you. This consumes API quota even when you are idle.\n\nAre you sure?");
            if (!confirm) return;
        }
    }

    const trimmedSettings = {
        ...settings,
        apiKey: settings.apiKey.trim(),
        baseUrl: settings.baseUrl.trim(),
        modelName: settings.modelName.trim()
    };
    
    setSettings(trimmedSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(trimmedSettings));
    
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // --- Preset Logic ---

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      setSelectedPresetId(id);
      if (!id) return; // Custom

      const preset = presets.find(p => p.id === id);
      if (preset) {
          setSettings(prev => ({
              ...prev,
              provider: preset.provider || 'gemini',
              baseUrl: preset.baseUrl,
              apiKey: preset.apiKey,
              modelName: preset.modelName
          }));
      }
  };

  const handleSavePreset = () => {
      const name = prompt("Enter a name for this configuration:");
      if (!name) return;

      const newPreset: ApiPreset = {
          id: Date.now().toString(),
          name,
          provider: settings.provider,
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          modelName: settings.modelName
      };

      const newPresets = [...presets, newPreset];
      setPresets(newPresets);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(newPresets));
      setSelectedPresetId(newPreset.id);
      setIsManagingPresets(false);
  };

  const handleUpdatePreset = () => {
      if (!selectedPresetId) return;
      const newPresets = presets.map(p => 
          p.id === selectedPresetId 
          ? { ...p, provider: settings.provider, baseUrl: settings.baseUrl, apiKey: settings.apiKey, modelName: settings.modelName }
          : p
      );
      setPresets(newPresets);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(newPresets));
      alert("Preset updated!");
      setIsManagingPresets(false);
  };

  const handleDeletePreset = () => {
      if (!selectedPresetId) return;
      if (!confirm("Delete this preset?")) return;
      
      const newPresets = presets.filter(p => p.id !== selectedPresetId);
      setPresets(newPresets);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(newPresets));
      setSelectedPresetId('');
      setIsManagingPresets(false);
  };

  // --- API Testing ---

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    const apiKey = settings.apiKey.trim();
    const baseUrl = settings.baseUrl.trim().replace(/\/$/, "");

    if (!apiKey) {
        setTestStatus('error');
        setTestMessage('API Key is missing.');
        return;
    }

    try {
        const clientOptions: any = { apiKey };
        if (baseUrl) clientOptions.baseUrl = baseUrl;
        const ai = new GoogleGenAI(clientOptions);
        await ai.models.list();
        setTestStatus('success');
        setTestMessage('API Connection Successful');
    } catch (error: any) {
        console.error("Test API Error", error);
        setTestStatus('error');
        const msg = error instanceof Error ? error.message : String(error);
        setTestMessage(`Connection Failed: ${msg}`);
    }
  };

  const handleFetchModels = async () => {
    setIsLoadingModels(true);
    // Temporary save to ensure service uses current values
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    
    try {
      const models = await fetchModels();
      setAvailableModels(models);
      if (models.length > 0) alert(`Found ${models.length} models.`);
    } catch (e) {
      alert("Failed to fetch models.");
    } finally {
      setIsLoadingModels(false);
    }
  };

  // --- Data Management ---

  const handleExportData = () => {
      const allData: any = {};
      // Iterate local storage and backup everything starting with ephone_
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('ephone_')) {
              allData[key] = localStorage.getItem(key);
          }
      }
      
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EPhone-Backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!confirm("⚠️ Warning: Importing data will OVERWRITE your current settings and chats. Continue?")) {
          e.target.value = '';
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              Object.keys(data).forEach(key => {
                  if (key.startsWith('ephone_')) {
                      localStorage.setItem(key, data[key]);
                  }
              });
              alert("Data imported successfully! The app will reload.");
              window.location.reload();
          } catch (err) {
              alert("Failed to import data: Invalid file format.");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-gray-50 flex flex-col z-50 app-transition">
      
      {/* Header */}
      <div className="h-24 bg-white/90 backdrop-blur-md pt-12 px-4 flex items-center justify-between border-b border-gray-200 shadow-sm z-10">
        <button onClick={onBack} className="text-blue-500 font-medium flex items-center">
            <span className="text-2xl mr-1">‹</span> Home
        </button>
        <h1 className="font-bold text-lg text-black">Settings</h1>
        <div className="w-16"></div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-0 pb-10">
        
        {/* === 1. API Configuration === */}
        <div className="mt-6 mb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wide">
            API Configuration
        </div>
        <div className="bg-white border-y border-gray-200">
            {/* Base URL */}
            <div className="pl-4 pr-4 py-3 flex items-center border-b border-gray-100">
                <span className="w-24 font-medium text-gray-900">Base URL</span>
                <input 
                    type="text" 
                    value={settings.baseUrl}
                    onChange={(e) => handleChange('baseUrl', e.target.value)}
                    placeholder="https://generativelanguage.googleapis.com"
                    className="flex-1 text-right text-gray-600 outline-none placeholder-gray-300 text-sm"
                />
            </div>
            {/* API Key */}
            <div className="pl-4 pr-4 py-3 flex items-center border-b border-gray-100">
                <span className="w-24 font-medium text-gray-900">API Key</span>
                <input 
                    type="password" 
                    value={settings.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 text-right text-gray-600 outline-none placeholder-gray-300 text-sm"
                />
            </div>
            {/* Model Name */}
            <div className="pl-4 pr-4 py-3 flex items-center border-b border-gray-100">
                <span className="w-24 font-medium text-gray-900">Model</span>
                <input 
                    type="text" 
                    value={settings.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    className="flex-1 text-right text-gray-600 outline-none text-sm"
                    placeholder="gemini-3-flash-preview"
                />
            </div>
            
            {/* Presets & Fetch Buttons */}
            <div className="p-3 flex justify-between items-center bg-gray-50/50">
                 <div className="flex-1 mr-2 relative">
                     <select 
                        value={selectedPresetId}
                        onChange={handlePresetChange}
                        className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded-lg p-2 pr-8 appearance-none focus:outline-none focus:border-blue-500"
                     >
                         <option value="">-- Custom Config --</option>
                         {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">▼</div>
                 </div>
                 <button 
                    onClick={() => setIsManagingPresets(!isManagingPresets)}
                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold"
                 >
                     Manage
                 </button>
            </div>
            
            {/* Preset Management Actions */}
            {isManagingPresets && (
                <div className="p-3 bg-gray-100 flex flex-wrap gap-2 animate-[fadeIn_0.2s]">
                    <button onClick={handleSavePreset} className="flex-1 bg-blue-500 text-white py-2 rounded-md text-xs">Save as New</button>
                    <button onClick={handleUpdatePreset} disabled={!selectedPresetId} className="flex-1 bg-gray-500 text-white py-2 rounded-md text-xs disabled:opacity-50">Update Current</button>
                    <button onClick={handleDeletePreset} disabled={!selectedPresetId} className="flex-1 bg-red-500 text-white py-2 rounded-md text-xs disabled:opacity-50">Delete</button>
                </div>
            )}
        </div>

        {/* Model Helpers */}
        <div className="px-4 mt-2 mb-4 flex justify-end">
            <button 
                onClick={handleFetchModels}
                disabled={isLoadingModels}
                className="text-blue-500 text-xs font-medium flex items-center gap-1"
            >
                {isLoadingModels ? 'Fetching...' : 'Fetch Models List ↻'}
            </button>
        </div>

        {/* Available Models Chips */}
        {availableModels.length > 0 && (
             <div className="px-4 mb-4 flex flex-wrap gap-2">
                 {availableModels.slice(0, 5).map(m => (
                     <span key={m} onClick={() => handleChange('modelName', m)} className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] rounded-md border border-blue-100 cursor-pointer">
                         {m}
                     </span>
                 ))}
             </div>
        )}

        {/* Test Connection */}
        <div className="px-4 mb-6">
             <button 
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className={`w-full py-2.5 rounded-lg text-sm font-bold border transition-all flex justify-center items-center gap-2
                    ${testStatus === 'testing' ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-300 shadow-sm'}
                `}
             >
                {testStatus === 'testing' ? "Testing..." : "Test Connection"}
             </button>
             {testMessage && (
                 <div className={`mt-2 text-xs p-3 rounded-lg border flex items-start gap-2 ${testStatus === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    <span className="text-lg leading-none mt-0.5">{testStatus === 'success' ? '✅' : '❌'}</span>
                    <span className="break-all">{testMessage}</span>
                 </div>
             )}
        </div>

        {/* === 2. Background Activity === */}
        <div className="mt-6 mb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wide flex justify-between items-center">
            <span>Background Activity</span>
            {settings.enableBackgroundActivity && <span className="text-green-500">Active</span>}
        </div>
        <div className="bg-white border-y border-gray-200">
             <div className="pl-4 pr-4 py-3 flex items-center justify-between border-b border-gray-100">
                 <div className="flex flex-col">
                     <span className="font-medium text-gray-900 text-sm">Enable AI Autonomy</span>
                     <span className="text-[10px] text-gray-400">Characters message you proactively</span>
                 </div>
                 <div 
                    onClick={() => handleChange('enableBackgroundActivity', !settings.enableBackgroundActivity)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${settings.enableBackgroundActivity ? 'bg-green-500' : 'bg-gray-300'}`}
                 >
                     <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.enableBackgroundActivity ? 'translate-x-5' : 'translate-x-0'}`}></div>
                 </div>
             </div>
             
             {settings.enableBackgroundActivity && (
                 <>
                    <div className="pl-4 pr-4 py-3 flex items-center border-b border-gray-100">
                        <span className="w-40 font-medium text-gray-900 text-sm">Check Interval (sec)</span>
                        <input 
                            type="number" 
                            min="30"
                            value={settings.backgroundActivityInterval}
                            onChange={(e) => handleChange('backgroundActivityInterval', parseInt(e.target.value))}
                            className="flex-1 text-right text-gray-600 outline-none text-sm bg-gray-50 rounded px-2 py-1"
                        />
                    </div>
                    <div className="pl-4 pr-4 py-3 flex items-center">
                        <span className="w-40 font-medium text-gray-900 text-sm">Block Cooldown (hrs)</span>
                        <input 
                            type="number" 
                            min="0.1"
                            step="0.1"
                            value={settings.blockCooldownHours}
                            onChange={(e) => handleChange('blockCooldownHours', parseFloat(e.target.value))}
                            className="flex-1 text-right text-gray-600 outline-none text-sm bg-gray-50 rounded px-2 py-1"
                        />
                    </div>
                    <div className="p-3 bg-yellow-50 text-[10px] text-yellow-800 leading-relaxed">
                        ⚠️ <strong>Warning:</strong> This consumes API tokens even when you are not chatting. Use cautiously.
                    </div>
                 </>
             )}
        </div>

        {/* === 3. Data Management === */}
        <div className="mt-8 mb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wide">
            Data Management
        </div>
        <div className="px-4 flex gap-3">
             <button onClick={handleExportData} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-bold shadow-sm">
                 Export Backup
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-bold shadow-sm">
                 Import Backup
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
        </div>

        {/* Save Button */}
        <div className="mt-10 px-4 pb-12">
            <button 
                onClick={handleSave}
                className={`w-full py-3.5 rounded-xl font-bold shadow-md transition-all text-white
                    ${saveStatus === 'saved' ? 'bg-green-500 scale-95' : 'bg-black active:scale-95'}
                `}
            >
                {saveStatus === 'saved' ? 'Saved Successfully' : 'Save All Settings'}
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsApp;
