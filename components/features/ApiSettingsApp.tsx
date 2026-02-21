import React, { useState, useEffect, useRef } from 'react';
import { fetchModels } from '../../services/geminiService'; // Renamed service handles multi-provider internally
import { AppSettings, ApiPreset, Contact, ActivityFrequency, ApiProvider } from '../../types';

interface ApiSettingsAppProps {
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

const ApiSettingsApp: React.FC<ApiSettingsAppProps> = ({ onBack, isOpen }) => {
  // --- Main Settings State ---
  const [settings, setSettings] = useState<AppSettings>({
    provider: 'gemini',
    baseUrl: '',
    apiKey: '',
    modelName: 'gemini-3-flash-preview',
    enableBackgroundActivity: false,
    backgroundActivityInterval: 60,
    blockCooldownHours: 1,
    backgroundActivityConfig: {}
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
  
  // --- Character Selection for Background Activity ---
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactsForConfig, setSelectedContactsForConfig] = useState<Set<string>>(new Set());

  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Initialization ---
  useEffect(() => {
    // Load Settings from LocalStorage (Persistence)
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
          const parsed = JSON.parse(savedSettings);
          // Default provider if missing
          if (!parsed.provider) parsed.provider = 'gemini';
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

    // Load Contacts
    const savedContacts = localStorage.getItem('ephone_contacts');
    if (savedContacts) {
        try {
            const parsedContacts = JSON.parse(savedContacts);
            setContacts(parsedContacts.filter((c: Contact) => !c.isSystem)); 
        } catch (e) {
            console.error("Failed to parse contacts", e);
        }
    }
  }, []);

  // Sync selection if current settings match a preset
  useEffect(() => {
      const match = presets.find(p => 
          p.baseUrl === settings.baseUrl && 
          p.apiKey === settings.apiKey &&
          p.modelName === settings.modelName &&
          (p.provider === settings.provider || (!p.provider && settings.provider === 'gemini'))
      );
      if (match) {
          setSelectedPresetId(match.id);
      } else {
          setSelectedPresetId(''); // Custom
      }
  }, [settings, presets]);

  // --- Handlers ---

  const handleChange = (field: keyof AppSettings, value: any) => {
    setSettings(prev => {
        const next = { ...prev, [field]: value };
        // Reset defaults when provider changes if fields are empty or default
        if (field === 'provider') {
            if (value === 'openai') {
                if (!next.baseUrl) next.baseUrl = 'https://api.openai.com/v1';
                if (!next.modelName || next.modelName.includes('gemini')) next.modelName = 'gpt-4o';
            } else if (value === 'anthropic') {
                if (!next.baseUrl) next.baseUrl = 'https://api.anthropic.com/v1';
                if (!next.modelName || next.modelName.includes('gemini')) next.modelName = 'claude-3-5-sonnet-20240620';
            } else {
                // Gemini default
                if (next.baseUrl === 'https://api.openai.com/v1') next.baseUrl = ''; 
                if (next.modelName && !next.modelName.includes('gemini')) next.modelName = 'gemini-3-flash-preview';
            }
        }
        return next;
    });
    setSaveStatus('idle');
    if (field === 'apiKey' || field === 'baseUrl' || field === 'provider') {
        setTestStatus('idle');
        setTestMessage('');
        // We do NOT clear availableModels here to allow user to see them if they just fetched
    }
  };

  const handleSave = () => {
    if (BLOCKED_API_SITES.some(site => settings.baseUrl.includes(site))) {
        alert("错误：此 API 站点已被屏蔽。");
        return;
    }

    if (settings.enableBackgroundActivity) {
        const prev = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        if (!prev.enableBackgroundActivity) {
            const confirm = window.confirm("【高消耗警告】\n\n开启后台活动会让 AI 角色主动向您发送消息。即使您空闲时也会消耗 API 额度。\n\n确定要开启吗？");
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
      if (!id) return;

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
      const name = prompt("请输入此配置的名称：");
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
      alert("预设已更新！");
      setIsManagingPresets(false);
  };

  const handleDeletePreset = () => {
      if (!selectedPresetId) return;
      if (!confirm("确定删除此预设吗？")) return;
      
      const newPresets = presets.filter(p => p.id !== selectedPresetId);
      setPresets(newPresets);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(newPresets));
      setSelectedPresetId('');
      setIsManagingPresets(false);
  };

  // --- API Testing & Fetch Models ---

  const handleFetchModels = async () => {
    setIsLoadingModels(true);
    setTestMessage('');
    setTestStatus('testing');
    
    // Clean inputs
    const currentBaseUrl = settings.baseUrl.trim().replace(/\/$/, '');
    const config = { 
        apiKey: settings.apiKey, 
        baseUrl: currentBaseUrl,
        provider: settings.provider
    };

    const onSuccess = (models: string[]) => {
        if (models && models.length > 0) {
            setAvailableModels(models);
            setTestStatus('success');
            setTestMessage(`成功获取 ${models.length} 个模型！请在下方列表点击选择。`);
        } else {
            setTestStatus('error');
            setTestMessage("连接成功，但未找到模型列表。");
        }
    };

    try {
        // Attempt 1: As provided
        const models = await fetchModels(config);
        onSuccess(models);
    } catch (e: any) {
        // Attempt 2: Auto-correct for OpenAI Compatible (append /v1)
        if ((settings.provider === 'openai' || settings.provider === 'anthropic') && !currentBaseUrl.endsWith('/v1')) {
            try {
                const altUrl = currentBaseUrl + '/v1';
                const models = await fetchModels({ ...config, baseUrl: altUrl });
                // If success, update UI and notify
                handleChange('baseUrl', altUrl);
                onSuccess(models);
                setTestMessage(`连接成功！已自动修正地址为: ${altUrl}`);
                // Don't throw here, we recovered
                return;
            } catch (retryErr) {
                // If retry also fails, show original error
                console.error(retryErr);
            }
        }
        
        setTestStatus('error');
        setTestMessage("获取模型失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
        setIsLoadingModels(false);
    }
  };

  const handleTestConnection = async () => {
      setTestStatus('testing');
      setTestMessage('');
      
      try {
          // Simply trying to fetch models is a good connectivity test
          const models = await fetchModels({ 
              apiKey: settings.apiKey, 
              baseUrl: settings.baseUrl,
              provider: settings.provider
          });
          if (models) {
              setTestStatus('success');
              setTestMessage(`连接成功!`);
          }
      } catch (error: any) {
          console.error("Test API Error", error);
          setTestStatus('error');
          setTestMessage(`连接失败: ${error instanceof Error ? error.message : String(error)}`);
      }
  };

  // --- Background Config Helpers ---
  const toggleContactSelection = (id: string) => {
      const newSet = new Set(selectedContactsForConfig);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      setSelectedContactsForConfig(newSet);
  };
  const selectAllContacts = () => setSelectedContactsForConfig(new Set(contacts.map(c => c.id)));
  const deselectAllContacts = () => setSelectedContactsForConfig(new Set());
  
  const applyFrequencyToSelected = (freq: ActivityFrequency) => {
      if (selectedContactsForConfig.size === 0) return alert("请至少选择一个角色。");
      const newConfig = { ...settings.backgroundActivityConfig };
      selectedContactsForConfig.forEach(id => {
          if (freq === 'none') delete newConfig[id];
          else newConfig[id] = freq;
      });
      setSettings(prev => ({ ...prev, backgroundActivityConfig: newConfig }));
      setSelectedContactsForConfig(new Set());
  };

  // --- Import/Export ---
  const handleExportData = () => {
      const allData: any = {};
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('ephone_')) allData[key] = localStorage.getItem(key);
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
      if (!confirm("⚠️ 警告：导入数据将覆盖当前所有设置和聊天记录。是否继续？")) {
          e.target.value = ''; return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              Object.keys(data).forEach(key => { if (key.startsWith('ephone_')) localStorage.setItem(key, data[key]); });
              alert("数据导入成功！应用将重新加载。");
              window.location.reload();
          } catch (err) { alert("导入失败：文件格式无效。"); }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-gray-50 flex flex-col z-50 app-transition">
      
      {/* Header */}
      <div className="h-24 bg-white/90 backdrop-blur-md pt-12 px-4 flex items-center justify-between border-b border-gray-200 shadow-sm z-10">
        <button onClick={onBack} className="text-blue-500 font-medium flex items-center">
            <span className="text-2xl mr-1">‹</span> 返回
        </button>
        <h1 className="font-bold text-lg text-black">系统设置</h1>
        <div className="w-16"></div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-0 pb-10">
        
        {/* === 1. API Configuration === */}
        <div className="mt-6 mb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wide">
            接口设置 (API Configuration)
        </div>
        <div className="bg-white border-y border-gray-200">
            {/* Provider Select */}
            <div className="pl-4 pr-4 py-3 flex items-center border-b border-gray-100">
                <span className="w-24 font-medium text-gray-900">服务商</span>
                <select 
                    value={settings.provider}
                    onChange={(e) => handleChange('provider', e.target.value)}
                    className="flex-1 text-right text-gray-600 outline-none text-sm bg-transparent dir-rtl"
                >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI / Compatible</option>
                    <option value="anthropic">Anthropic</option>
                </select>
            </div>

            {/* Base URL */}
            <div className="pl-4 pr-4 py-3 flex items-center border-b border-gray-100">
                <span className="w-24 font-medium text-gray-900">代理地址</span>
                <input 
                    type="text" 
                    value={settings.baseUrl}
                    onChange={(e) => handleChange('baseUrl', e.target.value)}
                    placeholder={settings.provider === 'openai' ? "https://api.openai.com/v1" : "默认留空"}
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
                <span className="w-24 font-medium text-gray-900">模型名称</span>
                <input 
                    type="text" 
                    value={settings.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    className="flex-1 text-right text-gray-600 outline-none text-sm"
                    placeholder="gemini-3-flash-preview"
                />
            </div>
            
            {/* Presets */}
            <div className="p-3 flex justify-between items-center bg-gray-50/50">
                 <div className="flex-1 mr-2 relative">
                     <select 
                        value={selectedPresetId}
                        onChange={handlePresetChange}
                        className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded-lg p-2 pr-8 appearance-none focus:outline-none focus:border-blue-500"
                     >
                         <option value="">-- 自定义配置 --</option>
                         {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">▼</div>
                 </div>
                 <button 
                    onClick={() => setIsManagingPresets(!isManagingPresets)}
                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold"
                 >
                     管理
                 </button>
            </div>
            
            {isManagingPresets && (
                <div className="p-3 bg-gray-100 flex flex-wrap gap-2 animate-[fadeIn_0.2s]">
                    <button onClick={handleSavePreset} className="flex-1 bg-blue-500 text-white py-2 rounded-md text-xs">存为新预设</button>
                    <button onClick={handleUpdatePreset} disabled={!selectedPresetId} className="flex-1 bg-gray-500 text-white py-2 rounded-md text-xs disabled:opacity-50">更新当前</button>
                    <button onClick={handleDeletePreset} disabled={!selectedPresetId} className="flex-1 bg-red-500 text-white py-2 rounded-md text-xs disabled:opacity-50">删除</button>
                </div>
            )}
        </div>

        {/* Model Helpers */}
        <div className="px-4 mt-4 mb-2 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500">可用模型列表</span>
            <button 
                onClick={handleFetchModels}
                disabled={isLoadingModels}
                className="text-blue-500 text-xs font-bold border border-blue-500 px-3 py-1.5 rounded-full active:bg-blue-50"
            >
                {isLoadingModels ? '正在拉取...' : '拉取模型列表 ⬇'}
            </button>
        </div>

        {/* Available Models Chips */}
        {availableModels.length > 0 ? (
             <div className="px-4 mb-6 grid grid-cols-2 gap-2 animate-[fadeIn_0.2s] max-h-40 overflow-y-auto">
                 {availableModels.map(m => (
                     <button 
                        key={m} 
                        onClick={() => handleChange('modelName', m)} 
                        className={`px-3 py-2 text-[11px] rounded-lg border text-left truncate transition-all ${settings.modelName === m ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                        title={m}
                     >
                         {m}
                     </button>
                 ))}
             </div>
        ) : (
            <div className="px-4 mb-4 text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg mx-4 border border-dashed border-gray-200">
                {isLoadingModels ? '正在尝试连接...' : '点击上方按钮拉取模型列表'}
            </div>
        )}

        {/* Status Message */}
        {testMessage && (
             <div className={`mx-4 mb-6 text-xs p-3 rounded-lg border flex items-start gap-2 ${testStatus === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                <span className="text-lg leading-none mt-0.5">{testStatus === 'success' ? '✅' : '❌'}</span>
                <span className="break-all">{testMessage}</span>
             </div>
        )}

        {/* === 2. Background Activity === */}
        <div className="mt-6 mb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wide flex justify-between items-center">
            <span>后台活动 (Background)</span>
            {settings.enableBackgroundActivity && <span className="text-green-500">已开启</span>}
        </div>
        <div className="bg-white border-y border-gray-200">
             <div className="pl-4 pr-4 py-3 flex items-center justify-between border-b border-gray-100">
                 <div className="flex flex-col">
                     <span className="font-medium text-gray-900 text-sm">启用 AI 自主活动</span>
                     <span className="text-[10px] text-gray-400">允许角色主动发消息</span>
                 </div>
                 <div 
                    onClick={() => handleChange('enableBackgroundActivity', !settings.enableBackgroundActivity)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${settings.enableBackgroundActivity ? 'bg-green-500' : 'bg-gray-300'}`}
                 >
                     <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.enableBackgroundActivity ? 'translate-x-5' : 'translate-x-0'}`}></div>
                 </div>
             </div>
             
             {settings.enableBackgroundActivity && (
                 <div className="animate-[fadeIn_0.2s]">
                    <div className="pl-4 pr-4 py-3 flex items-center border-b border-gray-100">
                        <span className="w-40 font-medium text-gray-900 text-sm">检测间隔 (秒)</span>
                        <input 
                            type="number" 
                            min="30"
                            value={settings.backgroundActivityInterval}
                            onChange={(e) => handleChange('backgroundActivityInterval', parseInt(e.target.value))}
                            className="flex-1 text-right text-gray-600 outline-none text-sm bg-gray-50 rounded px-2 py-1"
                        />
                    </div>
                    <div className="pl-4 pr-4 py-3 flex items-center border-b border-gray-100">
                        <span className="w-40 font-medium text-gray-900 text-sm">消息冷却 (小时)</span>
                        <input 
                            type="number" 
                            min="0.1"
                            step="0.1"
                            value={settings.blockCooldownHours}
                            onChange={(e) => handleChange('blockCooldownHours', parseFloat(e.target.value))}
                            className="flex-1 text-right text-gray-600 outline-none text-sm bg-gray-50 rounded px-2 py-1"
                        />
                    </div>
                    
                    {/* Character Selection */}
                    <div className="p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500">角色频率配置</span>
                            <div className="flex gap-2">
                                <button onClick={selectAllContacts} className="text-[10px] text-blue-500">全选</button>
                                <button onClick={deselectAllContacts} className="text-[10px] text-gray-400">清空</button>
                            </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-gray-200 mb-2">
                            {contacts.length === 0 && <div className="p-3 text-center text-xs text-gray-400">暂无角色</div>}
                            {contacts.map(c => {
                                const freq = settings.backgroundActivityConfig?.[c.id] || 'none';
                                const isSelected = selectedContactsForConfig.has(c.id);
                                return (
                                    <div key={c.id} onClick={() => toggleContactSelection(c.id)} className={`flex items-center justify-between p-2 border-b border-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded border ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}></div>
                                            <span className="text-sm text-gray-700 truncate w-24">{c.name}</span>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${freq === 'none' ? 'bg-gray-100 text-gray-400' : freq === 'high' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                                            {freq === 'none' ? '关闭' : freq}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex gap-1 justify-end">
                            <span className="text-[10px] text-gray-400 self-center mr-2">设置选中:</span>
                            <button onClick={() => applyFrequencyToSelected('high')} className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded">高频</button>
                            <button onClick={() => applyFrequencyToSelected('medium')} className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded">中频</button>
                            <button onClick={() => applyFrequencyToSelected('low')} className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded">低频</button>
                            <button onClick={() => applyFrequencyToSelected('none')} className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded">关闭</button>
                        </div>
                    </div>
                 </div>
             )}
        </div>

        {/* === 3. Data Management === */}
        <div className="mt-8 mb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wide">
            数据管理 (Data)
        </div>
        <div className="px-4 flex gap-3">
             <button onClick={handleExportData} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-bold shadow-sm active:bg-gray-50">
                 导出备份
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-bold shadow-sm active:bg-gray-50">
                 导入备份
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
                {saveStatus === 'saved' ? '设置已保存' : '保存设置'}
            </button>
        </div>

      </div>
    </div>
  );
};

export default ApiSettingsApp;
