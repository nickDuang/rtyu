
import React, { useState, useEffect, useRef } from 'react';
import StatusBar from './components/features/StatusBar';
import Dock from './components/Dock';
import ChatApp from './components/features/ChatApp';
import WalletApp from './components/features/WalletApp';
import DreamApp from './components/features/DreamApp';
import ApiSettingsApp from './components/features/ApiSettingsApp';
import CoupleSpaceApp from './components/features/CoupleSpaceApp';
import CalendarApp from './components/features/CalendarApp';
import SharedPhoneApp from './components/features/SharedPhoneApp';
import FitnessApp from './components/features/FitnessApp';
import MusicApp from './components/features/MusicApp';
import PhoneInvestigationApp from './components/features/PhoneInvestigationApp';
import TaobaoApp from './components/features/TaobaoApp';
import PaymentApp from './components/features/PaymentApp';
import ForumApp from './components/features/ForumApp'; 
import BookstoreApp from './components/features/BookstoreApp';
import WeatherApp from './components/features/WeatherApp';
import BrowserApp from './components/features/BrowserApp';
import CalculatorApp from './components/features/CalculatorApp';
import ReverseInvestigationApp from './components/features/ReverseInvestigationApp'; 
import InvestigationOverlay from './components/InvestigationOverlay';
import ArchiveApp from './components/features/ArchiveApp';
import { AppID } from './types';

const App: React.FC = () => {
  const [activeApp, setActiveApp] = useState<AppID | null>(null);

  // --- Lock Screen State ---
  const [isSystemLocked, setIsSystemLocked] = useState(true);
  const [inputPasscode, setInputPasscode] = useState('');
  const [lockError, setLockError] = useState(false);
  const SYSTEM_PASSCODE = '6731';

  // --- Theme State ---
  const [wallpaper, setWallpaper] = useState<string>('#d4d4d4'); // Default grey
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [customFont, setCustomFont] = useState<string>('');

  // --- App Layout State (Drag & Drop) ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [appOrder, setAppOrder] = useState<AppID[]>(() => {
      const saved = localStorage.getItem('ephone_desktop_order');
      return saved ? JSON.parse(saved) : [
          // Index 0-3: Top 2x2 Grid
          AppID.CoupleSpace, AppID.Calendar, AppID.Phone, AppID.Bookstore,
          // Index 4+: Main Grid
          AppID.Mail, AppID.Taobao, AppID.WeChat, AppID.Payment,
      ];
  });

  // --- Investigation Overlay State ---
  const [investigationData, setInvestigationData] = useState<{ active: boolean, charName: string }>({ active: false, charName: '' });

  // --- Decoration Widgets State ---
  const [widgetImages, setWidgetImages] = useState<string[]>(() => {
    const saved = localStorage.getItem('ephone_widgets');
    const parsed = saved ? JSON.parse(saved) : Array(8).fill('');
    while (parsed.length < 8) parsed.push('');
    return parsed;
  });
  
  const [widgetOpacities, setWidgetOpacities] = useState<number[]>(() => {
      const saved = localStorage.getItem('ephone_widget_opacities');
      let parsed = [];
      if (saved) {
          parsed = JSON.parse(saved);
      } else {
          parsed = Array(8).fill(1.0);
          parsed[3] = 0.4; // Fitness Widget (Glass default)
          parsed[4] = 0.4; // Quote
          parsed[5] = 0.4; // Music
          parsed[6] = 0.6; // Bottom Info
      }
      while (parsed.length < 8) parsed.push(1.0);
      return parsed;
  });

  // --- Bottom Widget Data State (Anniversary + Memo) ---
  const [bottomWidgetSettings, setBottomWidgetSettings] = useState<{
      date: string;
      title: string;
      memo: string;
  }>(() => {
      const saved = localStorage.getItem('ephone_bottom_widget_settings');
      return saved ? JSON.parse(saved) : { date: '2024-01-01', title: '纪念日', memo: '记得买牛奶' };
  });
  const [isBottomWidgetEditorOpen, setIsBottomWidgetEditorOpen] = useState(false);

  // Widget Visual Config State
  const [configuringWidgetIndex, setConfiguringWidgetIndex] = useState<number | null>(null);
  const widgetFileInputRef = useRef<HTMLInputElement>(null);

  // --- Quote State ---
  const [quote, setQuote] = useState(() => localStorage.getItem('ephone_home_quote') || "Keep happiness you can do anything.");

  // Load Settings
  useEffect(() => {
      const savedWallpaper = localStorage.getItem('ephone_wallpaper');
      const savedIcons = localStorage.getItem('ephone_icons');
      const savedNames = localStorage.getItem('ephone_app_names');
      const savedFont = localStorage.getItem('ephone_font');
      
      if (savedWallpaper) setWallpaper(savedWallpaper);
      if (savedIcons) setCustomIcons(JSON.parse(savedIcons));
      if (savedNames) setCustomNames(JSON.parse(savedNames));
      if (savedFont) setCustomFont(savedFont);
  }, []);

  // Save Layout
  useEffect(() => {
      localStorage.setItem('ephone_desktop_order', JSON.stringify(appOrder));
  }, [appOrder]);

  // Apply Custom Font
  useEffect(() => {
      if (customFont) {
          const styleId = 'ephone-custom-font';
          let styleTag = document.getElementById(styleId);
          if (!styleTag) {
              styleTag = document.createElement('style');
              styleTag.id = styleId;
              document.head.appendChild(styleTag);
          }
          styleTag.textContent = `
              @font-face {
                  font-family: 'EPhoneUserFont';
                  src: url('${customFont}');
                  font-display: swap;
              }
              body, button, input, textarea, select {
                  font-family: 'EPhoneUserFont', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
              }
          `;
      }
  }, [customFont]);

  // Inject Shake Animation
  useEffect(() => {
      const styleId = 'ephone-shake-anim';
      if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            @keyframes shake {
                0% { transform: translate(0, 0); }
                20% { transform: translate(-10px, 0); }
                40% { transform: translate(10px, 0); }
                60% { transform: translate(-10px, 0); }
                80% { transform: translate(10px, 0); }
                100% { transform: translate(0, 0); }
            }
            .animate-shake-lock {
                animation: shake 0.4s ease-in-out;
            }
            @keyframes icon-shake {
                0% { transform: rotate(0deg); }
                25% { transform: rotate(1.5deg); }
                75% { transform: rotate(-1.5deg); }
                100% { transform: rotate(0deg); }
            }
            .animate-shake {
                animation: icon-shake 0.25s infinite ease-in-out;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .animate-fade-in {
                animation: fadeIn 0.2s ease-out;
            }
          `;
          document.head.appendChild(style);
      }
  }, []);

  // --- Event Listener for Investigation Trigger ---
  useEffect(() => {
      const handleTrigger = (e: CustomEvent) => {
          setInvestigationData({ active: true, charName: e.detail.charName || 'Partner' });
      };
      
      window.addEventListener('ephone-trigger-investigation' as any, handleTrigger);
      return () => window.removeEventListener('ephone-trigger-investigation' as any, handleTrigger);
  }, []);

  const handleInvestigationComplete = (result: 'stopped' | 'failed' | 'allowed') => {
      setInvestigationData({ ...investigationData, active: false });
      
      if (result === 'stopped') {
          // Send success reaction injection
          const reactions = [
              "??? 你干嘛？", 
              "切，小气鬼。", 
              "有什么见不得人的？😒", 
              "行行行，不看就不看，凶什么。",
              "[对方已将您拉黑]"
          ];
          const reaction = reactions[Math.floor(Math.random() * reactions.length)];
          
          window.dispatchEvent(new CustomEvent('ephone-chat-inject', {
              detail: { 
                  content: reaction, 
                  role: 'assistant',
                  charName: investigationData.charName 
              }
          }));
      }
  };

  // --- Lock Screen Handlers ---
  const handlePasscodeClick = (num: string) => {
      if (inputPasscode.length < 4) {
          const newCode = inputPasscode + num;
          setInputPasscode(newCode);
          
          if (newCode.length === 4) {
              if (newCode === SYSTEM_PASSCODE) {
                  // Success
                  setTimeout(() => setIsSystemLocked(false), 200);
              } else {
                  // Error
                  setLockError(true);
                  setTimeout(() => {
                      setLockError(false);
                      setInputPasscode('');
                  }, 600);
              }
          }
      }
  };

  const handlePasscodeDelete = () => {
      if (inputPasscode.length > 0) {
          setInputPasscode(prev => prev.slice(0, -1));
      }
  };

  // --- Common Handlers ---
  const handleThemeUpdate = (type: 'wallpaper' | 'icon' | 'font' | 'name', id: string | null, value: string) => {
      if (type === 'wallpaper') {
          setWallpaper(value);
          localStorage.setItem('ephone_wallpaper', value);
      } else if (type === 'icon' && id) {
          const newIcons = { ...customIcons, [id]: value };
          setCustomIcons(newIcons);
          localStorage.setItem('ephone_icons', JSON.stringify(newIcons));
      } else if (type === 'name' && id) {
          const newNames = { ...customNames, [id]: value };
          setCustomNames(newNames);
          localStorage.setItem('ephone_app_names', JSON.stringify(newNames));
      } else if (type === 'font') {
          setCustomFont(value);
          localStorage.setItem('ephone_font', value);
      }
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
      if (!isEditMode) return;
      e.dataTransfer.setData('text/plain', index.toString());
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      if (isEditMode) e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
      if (!isEditMode) return;
      e.preventDefault();
      const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

      const newOrder = [...appOrder];
      // Simple swap
      const temp = newOrder[sourceIndex];
      newOrder[sourceIndex] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      setAppOrder(newOrder);
  };

  // --- Long Press Logic ---
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const startLongPress = () => {
      longPressTimer.current = setTimeout(() => {
          setIsEditMode(true);
      }, 800); // 800ms for long press
  };

  const endLongPress = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
      }
  };

  // --- Widget Handlers ---
  const openWidgetConfig = (index: number) => {
    setConfiguringWidgetIndex(index);
  };

  const closeWidgetConfig = () => {
    setConfiguringWidgetIndex(null);
  };

  const triggerFileUpload = () => {
      widgetFileInputRef.current?.click();
  };

  const handleRemoveWidgetImage = () => {
      if (configuringWidgetIndex !== null) {
          const newWidgets = [...widgetImages];
          newWidgets[configuringWidgetIndex] = '';
          setWidgetImages(newWidgets);
          localStorage.setItem('ephone_widgets', JSON.stringify(newWidgets));
      }
  };

  const handleWidgetOpacityChange = (val: number) => {
      if (configuringWidgetIndex !== null) {
          const newOpacities = [...widgetOpacities];
          while (newOpacities.length <= configuringWidgetIndex) newOpacities.push(1);
          newOpacities[configuringWidgetIndex] = val;
          setWidgetOpacities(newOpacities);
          localStorage.setItem('ephone_widget_opacities', JSON.stringify(newOpacities));
      }
  };

  const handleWidgetImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && configuringWidgetIndex !== null) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const newWidgets = [...widgetImages];
            while (newWidgets.length <= configuringWidgetIndex) newWidgets.push('');
            newWidgets[configuringWidgetIndex] = result;
            setWidgetImages(newWidgets);
            localStorage.setItem('ephone_widgets', JSON.stringify(newWidgets));
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Functional Widget Click Handlers
  const handleQuoteClick = () => {
      if (isEditMode) openWidgetConfig(4);
      else {
          const newQuote = prompt("Edit quote:", quote);
          if (newQuote !== null) {
              setQuote(newQuote);
              localStorage.setItem('ephone_home_quote', newQuote);
          }
      }
  };

  const handleMusicClick = () => {
      if (isEditMode) openWidgetConfig(5);
      else openApp(AppID.Music);
  };

  // Bottom Widget Logic
  const handleBottomWidgetClick = () => {
      if (isEditMode) {
          openWidgetConfig(6);
      } else {
          setIsBottomWidgetEditorOpen(true);
      }
  };

  const saveBottomWidgetSettings = (e: React.FormEvent) => {
      e.preventDefault();
      // Form values are bound to state, just persist it
      localStorage.setItem('ephone_bottom_widget_settings', JSON.stringify(bottomWidgetSettings));
      setIsBottomWidgetEditorOpen(false);
  };

  const getDaysDiff = (dateStr: string) => {
      if (!dateStr) return { count: 0, label: 'Days' };
      const target = new Date(dateStr);
      const now = new Date();
      target.setHours(0,0,0,0);
      now.setHours(0,0,0,0);
      const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return { count: 0, label: '就是今天' };
      if (diffDays > 0) return { count: diffDays, label: '天后' }; 
      return { count: Math.abs(diffDays), label: '天' }; 
  };

  const wallpaperStyle = wallpaper.startsWith('#') ? { backgroundColor: wallpaper } : {
    backgroundImage: `url('${wallpaper}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const openApp = (id: AppID) => {
      if (isEditMode) return;
      setActiveApp(id);
  };
  const closeApp = () => setActiveApp(null);

  // --- Minimalist App Icon Component ---
  const MinimalAppIcon: React.FC<{ id?: AppID, label: string, icon: string, index: number }> = ({ id, label, icon, index }) => {
      const displayLabel = (id && customNames[id]) || label;
      const customIcon = id && customIcons[id];
      const handleClick = id ? () => openApp(id) : undefined;
      
      return (
          <div 
            draggable={isEditMode}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className={`flex flex-col items-center gap-1 group w-full ${isEditMode ? 'cursor-move animate-shake' : ''}`}
          >
              <button 
                onClick={handleClick}
                className={`w-full aspect-square rounded-[18px] flex items-center justify-center text-2xl relative overflow-hidden transition-transform ${!isEditMode ? 'active:scale-95' : ''} bg-white/40 shadow-sm border border-white/20`}
              >
                  {customIcon ? (
                      <img src={customIcon} className="w-full h-full object-cover" />
                  ) : (
                      <span className="text-gray-600 drop-shadow-sm filter contrast-100 opacity-80">{icon}</span>
                  )}
                  
                  {isEditMode && (
                      <div className="absolute top-0 right-0 p-1">
                          <div className="w-4 h-4 bg-gray-400/80 rounded-full flex items-center justify-center text-white text-[10px]">-</div>
                      </div>
                  )}
              </button>
              <span className="text-[10px] font-medium text-gray-500 tracking-wide mt-0.5 truncate w-full text-center">
                  {displayLabel}
              </span>
          </div>
      );
  };

  // Helper to get app props by ID
  const getAppProps = (id: AppID) => {
      const map: Record<string, {label: string, icon: string}> = {
          [AppID.CoupleSpace]: { label: 'Couple', icon: '♡' },
          [AppID.Calendar]: { label: 'Calendar', icon: '📅' },
          [AppID.Phone]: { label: 'Phone', icon: '📱' },
          [AppID.Bookstore]: { label: 'Novels', icon: '📚' },
          [AppID.Mail]: { label: 'Messages', icon: '💬' },
          [AppID.Forum]: { label: 'Moments', icon: '⭕' },
          [AppID.Taobao]: { label: 'Shop', icon: '🛍️' },
          [AppID.WeChat]: { label: 'Chat', icon: '✉️' },
          [AppID.Payment]: { label: 'Wallet', icon: '💰' },
          [AppID.ApiSettings]: { label: 'Config', icon: '⚙️' },
          [AppID.Weather]: { label: 'Weather', icon: '🌤️' },
          [AppID.ReverseInvestigation]: { label: '查岗', icon: '👁️' },
          [AppID.Archive]: { label: '档案', icon: '📁' },
      };
      return map[id] || { label: 'App', icon: '?' };
  };

  // --- Photo Widget Component ---
  const PhotoWidget = ({ index, className }: { index: number, className?: string }) => {
      const opacity = widgetOpacities[index] ?? 1;
      const bgImage = widgetImages[index];
      
      return (
          <div 
              onClick={() => isEditMode ? openWidgetConfig(index) : null}
              className={`rounded-[20px] overflow-hidden relative cursor-pointer active:opacity-80 flex items-center justify-center group ${className}`}
              style={{
                  backgroundColor: `rgba(255, 255, 255, ${opacity})`,
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
              }}
          >
              {bgImage ? (
                  <div 
                    className="absolute inset-0 w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${bgImage})`, opacity: opacity }}
                  ></div>
              ) : (
                  <span className={`text-gray-400 text-xs font-bold ${isEditMode ? 'opacity-100' : 'opacity-30'}`}>
                      {isEditMode ? 'Tap to Edit' : ''}
                  </span>
              )}
              
              {/* Edit Indicator */}
              <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${isEditMode ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                      ⚙️
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="h-screen w-full flex justify-center items-center bg-[#1c1c1e]">
      <input type="file" ref={widgetFileInputRef} onChange={handleWidgetImageChange} className="hidden" accept="image/*" />

      {/* Phone Bezel */}
      <div className="relative w-full h-full sm:w-[375px] sm:h-[812px] bg-black sm:rounded-[50px] overflow-hidden shadow-2xl border-[8px] border-[#2c2c2e] ring-1 ring-gray-800">
        
        {/* Screen Content */}
        <div 
            className="w-full h-full relative flex flex-col" 
            style={wallpaperStyle}
            onMouseDown={startLongPress}
            onMouseUp={endLongPress}
            onMouseLeave={endLongPress}
            onTouchStart={startLongPress}
            onTouchEnd={endLongPress}
        >
            {/* Overlay for readability */}
            <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>

            <StatusBar />

            {/* --- INVESTIGATION OVERLAY --- */}
            {investigationData.active && (
                <InvestigationOverlay 
                    charName={investigationData.charName} 
                    onClose={handleInvestigationComplete} 
                />
            )}

            {/* --- LOCK SCREEN --- */}
            {isSystemLocked && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-between py-16 text-white bg-black/40 backdrop-blur-xl animate-fade-in">
                    <div className="flex flex-col items-center mt-10">
                        <div className="text-xl opacity-80 mb-2">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                        <div className="text-7xl font-bold tracking-tight font-sans">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </div>
                    </div>

                    <div className={`flex flex-col items-center w-full max-w-[280px] ${lockError ? 'animate-shake-lock' : ''}`}>
                        <div className="mb-4 text-sm font-bold text-red-400 h-5">
                            {lockError ? <span>密码错误</span> : <span className="opacity-0">placeholder</span>}
                        </div>
                        
                        {/* Dots */}
                        <div className="flex gap-4 mb-10">
                            {[0, 1, 2, 3].map(i => (
                                <div 
                                    key={i} 
                                    className={`w-3 h-3 rounded-full border border-white transition-colors duration-200 ${inputPasscode.length > i ? 'bg-white' : 'bg-transparent'}`}
                                ></div>
                            ))}
                        </div>

                        {/* Keypad */}
                        <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button 
                                    key={num}
                                    onClick={() => handlePasscodeClick(num.toString())}
                                    className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/30 active:bg-white/40 backdrop-blur-md flex items-center justify-center text-2xl font-medium transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <div className="col-start-2">
                                <button 
                                    onClick={() => handlePasscodeClick('0')}
                                    className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/30 active:bg-white/40 backdrop-blur-md flex items-center justify-center text-2xl font-medium transition-colors"
                                >
                                    0
                                </button>
                            </div>
                            {inputPasscode.length > 0 && (
                                <div className="col-start-3 flex items-center justify-center">
                                    <button 
                                        onClick={handlePasscodeDelete}
                                        className="text-white text-lg font-medium active:opacity-60 px-4 py-2"
                                    >
                                        删除
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="text-xs opacity-50">Swipe up to unlock (Not really, enter code)</div>
                </div>
            )}

            {/* Edit Mode Overlay */}
            {!isSystemLocked && isEditMode && (
                <div className="absolute top-0 left-0 right-0 h-14 bg-black/40 backdrop-blur-md z-[60] flex items-center justify-between px-4 pt-4 animate-fade-in text-white">
                    <span className="text-xs font-bold">Editing Layout</span>
                    <button 
                        onClick={() => { setIsEditMode(false); setConfiguringWidgetIndex(null); }}
                        className="bg-white text-black px-4 py-1 rounded-full text-xs font-bold shadow-sm"
                    >
                        Done
                    </button>
                </div>
            )}

            {/* VISUAL WIDGET CONFIG MODAL */}
            {!isSystemLocked && isEditMode && configuringWidgetIndex !== null && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full rounded-2xl p-5 shadow-2xl">
                        <h3 className="font-bold text-gray-800 mb-4 text-center">Customize Visuals</h3>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <button onClick={triggerFileUpload} className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-xs font-bold">Upload BG</button>
                                {widgetImages[configuringWidgetIndex] && (
                                    <button onClick={handleRemoveWidgetImage} className="flex-1 bg-red-100 text-red-500 py-2 rounded-xl text-xs font-bold">Remove BG</button>
                                )}
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                                    <span>Opacity</span>
                                    <span>{Math.round((widgetOpacities[configuringWidgetIndex] ?? 1) * 100)}%</span>
                                </div>
                                <input type="range" min="0" max="1" step="0.05" value={widgetOpacities[configuringWidgetIndex] ?? 1} onChange={(e) => handleWidgetOpacityChange(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                            </div>
                        </div>
                        <button onClick={closeWidgetConfig} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-xs mt-6">Close</button>
                    </div>
                </div>
            )}

            {/* CONTENT CONFIG MODAL */}
            {!isSystemLocked && isBottomWidgetEditorOpen && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full rounded-2xl p-6 shadow-2xl">
                        <h3 className="font-bold text-gray-800 mb-6 text-center text-lg">小组件设置</h3>
                        <form onSubmit={saveBottomWidgetSettings} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">标题</label>
                                <input type="text" value={bottomWidgetSettings.title} onChange={(e) => setBottomWidgetSettings({...bottomWidgetSettings, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">日期</label>
                                <input type="date" value={bottomWidgetSettings.date} onChange={(e) => setBottomWidgetSettings({...bottomWidgetSettings, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">备忘录</label>
                                <textarea value={bottomWidgetSettings.memo} onChange={(e) => setBottomWidgetSettings({...bottomWidgetSettings, memo: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 h-24 resize-none" />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsBottomWidgetEditorOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm">取消</button>
                                <button type="submit" className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold text-sm shadow-md">保存</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- HOME SCREEN CONTENT --- */}
            <div className={`flex-1 relative transition-all duration-500 ease-out overflow-y-auto no-scrollbar pt-14 pb-28 px-5 ${activeApp || isSystemLocked ? 'scale-90 opacity-0 pointer-events-none translate-y-10' : 'scale-100 opacity-100 translate-y-0'}`}>
                
                {/* 1. Top Row: 3 Photo Widgets */}
                <div className="grid grid-cols-3 gap-3 mb-4 h-28">
                    <PhotoWidget index={0} className="h-full" />
                    <PhotoWidget index={1} className="h-full" />
                    <PhotoWidget index={2} className="h-full" />
                </div>

                {/* 2. Quote Widget */}
                <div 
                    onClick={handleQuoteClick}
                    className={`w-full rounded-[20px] p-4 mb-4 flex items-center justify-between text-white cursor-pointer active:scale-98 transition-transform relative overflow-hidden backdrop-blur-md border border-white/10`}
                    style={{ backgroundColor: `rgba(255, 255, 255, ${widgetOpacities[4] ?? 0.4})` }}
                >
                    {widgetImages[4] && (
                        <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url(${widgetImages[4]})`, opacity: widgetOpacities[4] ?? 0.4 }}></div>
                    )}
                    {isEditMode && <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center text-xs font-bold border-2 border-white/50 rounded-[20px]">⚙️ Configure</div>}
                    <div className="flex flex-col relative z-10 w-full">
                        <span className="font-serif text-lg leading-tight tracking-wide drop-shadow-md mix-blend-overlay text-white">{quote}</span>
                        <span className="text-[10px] opacity-80 mt-1 uppercase tracking-widest drop-shadow-sm text-white">Daily Inspiration</span>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center relative z-10 shrink-0 ml-2"><span className="text-sm">⚡</span></div>
                </div>

                {/* 3. Split Section: Music + 4 Apps */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div 
                        onClick={handleMusicClick}
                        className={`aspect-square rounded-[24px] p-3 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer active:scale-95 transition-transform backdrop-blur-md border border-white/10`}
                        style={{ backgroundColor: `rgba(255, 255, 255, ${widgetOpacities[5] ?? 0.4})` }}
                    >
                        {widgetImages[5] && (
                            <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url(${widgetImages[5]})`, opacity: widgetOpacities[5] ?? 0.4 }}></div>
                        )}
                        {isEditMode && <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center text-xs font-bold border-2 border-white/50 rounded-[24px] text-white">⚙️</div>}
                        <div className="relative z-10 w-24 h-24 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-lg animate-[spin_10s_linear_infinite]">
                            <div className="absolute inset-0 border-[10px] border-[#222] rounded-full opacity-50"></div>
                            <div className="w-8 h-8 bg-gray-300 rounded-full border border-gray-500"></div>
                        </div>
                        <div className="absolute top-2 left-3 text-[10px] text-white font-bold z-10 drop-shadow-md">Music</div>
                        <div className="absolute bottom-2 right-3 text-[10px] text-white z-10 drop-shadow-md">●</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {appOrder.slice(0, 4).map((id, localIndex) => {
                            const props = getAppProps(id);
                            return <MinimalAppIcon key={id} id={id} {...props} index={localIndex} />;
                        })}
                    </div>
                </div>

                {/* 4. App Row */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                    {appOrder.slice(4).map((id, localIndex) => {
                        const props = getAppProps(id);
                        return <MinimalAppIcon key={id} id={id} {...props} index={localIndex + 4} />;
                    })}
                </div>

                {/* Horizontal Photo Widget */}
                <div className="mb-4 h-32 w-full">
                    <PhotoWidget index={7} className="h-full w-full shadow-sm" />
                </div>

                {/* 5. Split Row: Fitness + Config + New App */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    <div className="col-span-2">
                        <div 
                            onClick={() => isEditMode ? openWidgetConfig(3) : openApp(AppID.Fitness)}
                            className={`w-full aspect-[3/4] rounded-[30px] p-5 relative overflow-hidden cursor-pointer active:scale-95 transition-transform backdrop-blur-md border border-white/10 flex flex-col justify-between`}
                            style={{ backgroundColor: `rgba(255, 255, 255, ${widgetOpacities[3] ?? 0.4})` }}
                        >
                             {widgetImages[3] && (
                                <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url(${widgetImages[3]})`, opacity: widgetOpacities[3] ?? 0.4 }}></div>
                            )}
                            {isEditMode && <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center text-white font-bold text-xs">⚙️ Configure</div>}
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="bg-orange-500/20 p-2 rounded-full backdrop-blur-md">
                                        <span className="text-xl">🔥</span>
                                    </div>
                                    <span className="text-2xl font-bold text-orange-500">324</span>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase">Kcal</div>
                                    <div className="text-xs text-gray-600 font-medium mt-0.5">Keep Moving</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                        {/* Column 1: Config + Archive */}
                        <div className="flex flex-col gap-3">
                            <MinimalAppIcon id={AppID.ApiSettings} {...getAppProps(AppID.ApiSettings)} index={99} />
                            <MinimalAppIcon id={AppID.Archive} {...getAppProps(AppID.Archive)} index={101} />
                        </div>
                        
                        {/* Column 2: Reverse Investigation */}
                        <div className="flex flex-col gap-3">
                            <MinimalAppIcon id={AppID.ReverseInvestigation} {...getAppProps(AppID.ReverseInvestigation)} index={100} />
                        </div>
                    </div>
                </div>

                {/* 6. Bottom Info Widget */}
                <div 
                    onClick={handleBottomWidgetClick}
                    className={`w-full bg-white/60 rounded-[32px] p-6 mb-24 shadow-sm backdrop-blur-md border border-white/40 cursor-pointer active:scale-98 transition-transform relative overflow-hidden`}
                    style={{ backgroundColor: `rgba(255, 255, 255, ${widgetOpacities[6] ?? 0.6})` }}
                >
                    {widgetImages[6] && (
                        <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url(${widgetImages[6]})`, opacity: widgetOpacities[6] ?? 0.6 }}></div>
                    )}
                    {isEditMode && <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center text-white font-bold text-xs">⚙️ Configure</div>}
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{bottomWidgetSettings.title}</span>
                                <div className="text-4xl font-light text-gray-800 mt-1">
                                    {getDaysDiff(bottomWidgetSettings.date).count}
                                    <span className="text-sm font-bold text-gray-400 ml-1">{getDaysDiff(bottomWidgetSettings.date).label}</span>
                                </div>
                            </div>
                            <div className="bg-pink-100 p-2 rounded-full text-pink-500">❤️</div>
                        </div>
                        <div className="bg-white/50 rounded-xl p-3">
                            <p className="text-xs text-gray-500 font-medium line-clamp-2">“{bottomWidgetSettings.memo}”</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Dock */}
            <div className="absolute bottom-6 left-4 right-4 z-20">
                <Dock onAppClick={setActiveApp} />
            </div>

            {/* Active Apps Overlay */}
            <ChatApp 
                isOpen={activeApp === AppID.Chat || activeApp === AppID.WeChat || activeApp === AppID.Mail} 
                appName={activeApp === AppID.Mail ? 'Messages' : 'WeChat'}
                onBack={() => setActiveApp(null)} 
                onOpenExternalApp={setActiveApp}
            />
            <WalletApp isOpen={activeApp === AppID.Beautify} onBack={() => setActiveApp(null)} onUpdateTheme={handleThemeUpdate} />
            <DreamApp isOpen={activeApp === AppID.WorldBook} onBack={() => setActiveApp(null)} />
            <ApiSettingsApp isOpen={activeApp === AppID.ApiSettings} onBack={() => setActiveApp(null)} />
            <CoupleSpaceApp isOpen={activeApp === AppID.CoupleSpace} onBack={() => setActiveApp(null)} onOpenExternalApp={setActiveApp} />
            <CalendarApp isOpen={activeApp === AppID.Calendar} onBack={() => setActiveApp(null)} />
            <SharedPhoneApp isOpen={activeApp === AppID.Phone} onBack={() => setActiveApp(null)} />
            <FitnessApp isOpen={activeApp === AppID.Fitness} onBack={() => setActiveApp(null)} />
            <MusicApp isOpen={activeApp === AppID.Music} onBack={() => setActiveApp(null)} />
            <PhoneInvestigationApp isOpen={activeApp === AppID.Investigation} onBack={() => setActiveApp(null)} />
            <ArchiveApp isOpen={activeApp === AppID.Archive} onBack={() => setActiveApp(null)} />
            <TaobaoApp isOpen={activeApp === AppID.Taobao} onBack={() => setActiveApp(null)} />
            <PaymentApp isOpen={activeApp === AppID.Payment} onBack={() => setActiveApp(null)} />
            <ForumApp isOpen={activeApp === AppID.Forum} onBack={() => setActiveApp(null)} />
            <BookstoreApp isOpen={activeApp === AppID.Bookstore} onBack={() => setActiveApp(null)} />
            <WeatherApp isOpen={activeApp === AppID.Weather} onBack={() => setActiveApp(null)} />
            <BrowserApp isOpen={false} onBack={() => setActiveApp(null)} />
            <CalculatorApp isOpen={false} onBack={() => setActiveApp(null)} />
            <ReverseInvestigationApp isOpen={activeApp === AppID.ReverseInvestigation} onBack={() => setActiveApp(null)} />

            {/* Home Indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full z-50 pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};

export default App;
