
import React, { useState, useEffect, useRef } from 'react';
import StatusBar from './components/features/StatusBar';
import Dock from './components/Dock';
import ChatApp from './components/features/ChatApp';
import WalletApp from './components/features/WalletApp';
import DreamApp from './components/features/DreamApp';
import SettingsApp from './components/features/SettingsApp';
import CoupleSpaceApp from './components/features/CoupleSpaceApp';
import CalendarApp from './components/features/CalendarApp';
import SharedPhoneApp from './components/features/SharedPhoneApp';
import FitnessApp from './components/features/FitnessApp';
import MusicApp from './components/features/MusicApp';
import CalculatorApp from './components/features/CalculatorApp';
import PhoneInvestigationApp from './components/features/PhoneInvestigationApp';
import { AppID } from './types';

interface Polaroid {
    id: number;
    image: string;
    caption: string;
    rotation: string;
    zIndex: number;
}

const App: React.FC = () => {
  const [activeApp, setActiveApp] = useState<AppID | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // --- Theme State ---
  const defaultWallpaper = 'https://images.unsplash.com/photo-1513569771920-c9e1d31714b0?q=80&w=2000&auto=format&fit=crop';
  const [wallpaper, setWallpaper] = useState<string>(defaultWallpaper);
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [customFont, setCustomFont] = useState<string>('');

  // --- Decoration Widgets State ---
  const [widgetImages, setWidgetImages] = useState<string[]>(() => {
    const saved = localStorage.getItem('ephone_widgets');
    return saved ? JSON.parse(saved) : [
        'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1495360019602-e001b272081f?q=80&w=600&auto=format&fit=crop'
    ];
  });
  const [currentWidgetIndex, setCurrentWidgetIndex] = useState<number | null>(null);
  const widgetFileInputRef = useRef<HTMLInputElement>(null);

  // --- Polaroid State ---
  const [polaroids, setPolaroids] = useState<Polaroid[]>(() => {
      const saved = localStorage.getItem('ephone_polaroids');
      return saved ? JSON.parse(saved) : [
          { id: 1, image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=600&auto=format&fit=crop', caption: 'Vivian & Evan', rotation: 'rotate-2', zIndex: 10 },
          { id: 2, image: 'https://images.unsplash.com/photo-1516575334481-f85287c2c82d?q=80&w=600&auto=format&fit=crop', caption: 'Our Trip', rotation: '-rotate-3', zIndex: 5 },
          { id: 3, image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=600&auto=format&fit=crop', caption: 'Besties', rotation: 'rotate-6', zIndex: 8 }
      ];
  });
  const [activePolaroidId, setActivePolaroidId] = useState<number | null>(null);
  const polaroidInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const savedWallpaper = localStorage.getItem('ephone_wallpaper');
      const savedIcons = localStorage.getItem('ephone_icons');
      const savedFont = localStorage.getItem('ephone_font');
      
      if (savedWallpaper) setWallpaper(savedWallpaper);
      if (savedIcons) setCustomIcons(JSON.parse(savedIcons));
      if (savedFont) setCustomFont(savedFont);
  }, []);

  // Save Polaroids
  useEffect(() => {
      localStorage.setItem('ephone_polaroids', JSON.stringify(polaroids));
  }, [polaroids]);

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

  const handleThemeUpdate = (type: 'wallpaper' | 'icon' | 'font', id: string | null, value: string) => {
      if (type === 'wallpaper') {
          setWallpaper(value);
          localStorage.setItem('ephone_wallpaper', value);
      } else if (type === 'icon' && id) {
          const newIcons = { ...customIcons, [id]: value };
          setCustomIcons(newIcons);
          localStorage.setItem('ephone_icons', JSON.stringify(newIcons));
      } else if (type === 'font') {
          setCustomFont(value);
          localStorage.setItem('ephone_font', value);
      }
  };

  // --- Widget Handlers ---
  const triggerWidgetUpload = (index: number) => {
    setCurrentWidgetIndex(index);
    widgetFileInputRef.current?.click();
  };

  const handleWidgetImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentWidgetIndex !== null) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const newWidgets = [...widgetImages];
            newWidgets[currentWidgetIndex] = result;
            setWidgetImages(newWidgets);
            localStorage.setItem('ephone_widgets', JSON.stringify(newWidgets));
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // --- Polaroid Handlers ---
  const triggerPolaroidUpload = (id: number) => {
      setActivePolaroidId(id);
      polaroidInputRef.current?.click();
  };

  const handlePolaroidImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activePolaroidId !== null) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const result = event.target?.result as string;
              setPolaroids(prev => prev.map(p => p.id === activePolaroidId ? { ...p, image: result } : p));
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const editPolaroidCaption = (id: number, currentCaption: string) => {
      const newCaption = prompt("Enter caption:", currentCaption);
      if (newCaption !== null) {
          setPolaroids(prev => prev.map(p => p.id === id ? { ...p, caption: newCaption.substring(0, 15) } : p));
      }
  };

  const wallpaperStyle = {
    backgroundImage: `url('${wallpaper}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const openApp = (id: AppID) => {
    setActiveApp(id);
  };

  const closeApp = () => {
    setActiveApp(null);
  };

  // --- Home Screen App Icon Component ---
  const HomeAppIcon = ({ id, label, icon, color }: { id: AppID, label: string, icon: string, color: string }) => {
      const customIcon = customIcons[id];
      return (
          <button onClick={() => openApp(id)} className="flex flex-col items-center gap-1.5 transition-transform active:scale-90 group">
              <div className={`w-[60px] h-[60px] rounded-[20px] shadow-sm flex items-center justify-center text-2xl border border-white/60 relative overflow-hidden transition-all duration-300 group-hover:-translate-y-1 ${customIcon ? '' : `${color} bg-opacity-90 backdrop-blur-md`}`}>
                  {/* Glass sheen effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
                  
                  {customIcon ? (
                      <img src={customIcon} className="w-full h-full object-cover" />
                  ) : (
                      <span className="drop-shadow-sm filter contrast-125">{icon}</span>
                  )}
              </div>
              <span className="text-[10px] font-bold text-gray-600/90 tracking-wide bg-white/40 px-2 py-0.5 rounded-full backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  {label}
              </span>
          </button>
      );
  };

  return (
    <div className="h-screen w-full flex justify-center items-center bg-[#1c1c1e]">
      <input type="file" ref={widgetFileInputRef} onChange={handleWidgetImageChange} className="hidden" accept="image/*" />
      <input type="file" ref={polaroidInputRef} onChange={handlePolaroidImageChange} className="hidden" accept="image/*" />

      {/* Phone Bezel */}
      <div className="relative w-full h-full sm:w-[375px] sm:h-[812px] bg-black sm:rounded-[50px] overflow-hidden shadow-2xl border-[8px] border-[#2c2c2e] ring-1 ring-gray-800">
        
        {/* Screen Content */}
        <div className="w-full h-full relative flex flex-col" style={wallpaperStyle}>
            {/* Light Overlay to ensure text readability on varied wallpapers */}
            <div className="absolute inset-0 bg-white/10 pointer-events-none"></div>

            <StatusBar />

            {/* --- HOME SCREEN CONTENT (Scrollable Pages) --- */}
            <div className={`flex-1 relative transition-all duration-500 ease-out ${activeApp ? 'scale-90 opacity-0 pointer-events-none translate-y-10' : 'scale-100 opacity-100 translate-y-0'}`}>
                
                {/* Horizontal Snap Scroll Container */}
                <div 
                    className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
                    onScroll={(e) => {
                        const page = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth);
                        if (page !== currentPage) setCurrentPage(page);
                    }}
                >
                    {/* === PAGE 1 === */}
                    <div className="min-w-full h-full overflow-y-auto no-scrollbar pt-14 px-6 pb-32 snap-center">
                        {/* 1. Header Widget: Clock & Weather */}
                        <div className="flex justify-between items-end mb-8 text-gray-800">
                            <div className="flex flex-col">
                                <h1 className="text-[64px] leading-none font-light tracking-tighter text-gray-800/90 mix-blend-overlay" style={{fontFamily: '-apple-system, sans-serif'}}>16:08</h1>
                                <p className="text-sm font-bold text-gray-500/80 ml-1 uppercase tracking-widest">Tuesday, Sep 2</p>
                            </div>
                            <div className="flex flex-col items-end pb-1">
                                <span className="text-3xl mb-1 drop-shadow-sm">🌤️</span>
                                <span className="text-lg font-bold text-gray-700">31°</span>
                            </div>
                        </div>

                        {/* 2. Couple Widget */}
                        <div 
                            onClick={() => openApp(AppID.CoupleSpace)}
                            className="bg-white/40 backdrop-blur-xl rounded-[32px] p-5 mb-8 border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.05)] relative overflow-hidden active:scale-98 transition-transform cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            </div>
                            
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-[3px] border-white shadow-md overflow-hidden bg-pink-100">
                                        <img src="https://picsum.photos/200?random=101" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-pink-400 to-rose-400 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                        ❤️
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-gray-800 tracking-tight" style={{fontFamily: 'Georgia, serif'}}>1,188</span>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-white/50 px-1.5 py-0.5 rounded-md">Days</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/50 rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-pink-400 w-[70%] rounded-full opacity-60"></div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1.5 font-medium flex items-center gap-1">
                                        <span>✨</span> Loving you every second
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 3. App Grid - Page 1 */}
                        <div className="grid grid-cols-4 gap-x-3 gap-y-7 px-1">
                            <HomeAppIcon id={AppID.Calendar} label="Memory" icon="🌸" color="bg-gradient-to-b from-rose-100 to-rose-200 text-rose-500" />
                            <HomeAppIcon id={AppID.WeChat} label="Chat" icon="💬" color="bg-gradient-to-b from-emerald-100 to-emerald-200 text-emerald-600" />
                            <HomeAppIcon id={AppID.Fitness} label="Fitness" icon="👟" color="bg-gradient-to-b from-orange-400 to-emerald-400 text-white" />
                            <HomeAppIcon id={AppID.Mail} label="Msg" icon="✉️" color="bg-gradient-to-b from-sky-100 to-sky-200 text-sky-500" />

                            <HomeAppIcon id={AppID.CoupleSpace} label="Space" icon="💌" color="bg-gradient-to-b from-pink-100 to-pink-200 text-pink-500" />
                            <HomeAppIcon id={AppID.Settings} label="Config" icon="⚙️" color="bg-gradient-to-b from-slate-100 to-slate-200 text-slate-600" />
                            <HomeAppIcon id={AppID.Phone} label="Phone" icon="📞" color="bg-gradient-to-b from-teal-100 to-teal-200 text-teal-600" />
                        </div>

                        {/* 4. Custom Decorative Widgets */}
                        <div className="grid grid-cols-2 gap-3 mt-8 mb-2 px-1">
                            {widgetImages.map((img, index) => (
                                <div 
                                    key={`widget-${index}`}
                                    onClick={() => triggerWidgetUpload(index)}
                                    className="aspect-[4/5] rounded-[24px] bg-white/40 backdrop-blur-md border border-white/60 shadow-sm relative overflow-hidden group cursor-pointer active:scale-95 transition-all hover:-translate-y-1 duration-300"
                                >
                                    <div className="absolute inset-0 p-2">
                                        <div className="w-full h-full rounded-[18px] overflow-hidden bg-gray-100/50 relative shadow-inner">
                                            {img ? (
                                                <img src={img} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                                    <span className="text-2xl mb-1 opacity-50">🖼️</span>
                                                    <span className="text-[10px] font-medium opacity-50">Add Photo</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-white/30 backdrop-blur-sm border-l border-r border-white/40 ${index % 2 === 0 ? '-rotate-2' : 'rotate-2'} shadow-sm`}></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* === PAGE 2 === */}
                    <div className="min-w-full h-full overflow-y-auto no-scrollbar pt-14 px-6 pb-32 snap-center">
                        {/* Music Widget */}
                        <div 
                            onClick={() => openApp(AppID.Music)}
                            className="w-full aspect-[2/1] bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] p-6 mb-8 shadow-lg relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
                        >
                            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                            <div className="relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                                        <span className="text-xl">🎵</span>
                                    </div>
                                    <span className="text-white/80 text-xs font-bold uppercase tracking-wider">Now Playing</span>
                                </div>
                                <div>
                                    <h3 className="text-white text-xl font-bold">Midnight City</h3>
                                    <p className="text-white/60 text-sm">M83</p>
                                </div>
                                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-2">
                                    <div className="w-1/3 h-full bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Page 2 Grid */}
                        <div className="grid grid-cols-4 gap-x-3 gap-y-7 px-1">
                            <HomeAppIcon id={AppID.Music} label="Music" icon="🎧" color="bg-gradient-to-b from-purple-400 to-purple-500 text-white" />
                            <HomeAppIcon id={AppID.Calculator} label="Calc" icon="🧮" color="bg-gradient-to-b from-orange-400 to-orange-500 text-white" />
                            <HomeAppIcon id={AppID.Investigation} label="Secret" icon="🕵️" color="bg-gradient-to-b from-gray-700 to-gray-800 text-white" />
                        </div>

                        {/* 5. Polaroids (Customizable Group) - Moved to Page 2 for variety */}
                        <div className="mt-8 relative h-48 w-full">
                            {polaroids.map((polaroid, index) => {
                                const leftPos = index === 0 ? '5%' : index === 1 ? '45%' : '20%';
                                const topPos = index === 0 ? '10px' : index === 1 ? '20px' : '90px';
                                
                                return (
                                    <div 
                                        key={polaroid.id}
                                        className={`absolute bg-white p-2 pb-6 shadow-md rounded-sm transform transition-transform hover:z-20 hover:scale-110 cursor-pointer w-32 group ${polaroid.rotation}`}
                                        style={{ left: leftPos, top: topPos, zIndex: polaroid.zIndex }}
                                    >
                                        <div className="absolute -top-3 left-1/2 -translate-x-1 w-12 h-6 bg-white/40 backdrop-blur-sm border-l border-r border-white/60 rotate-[-5deg] shadow-sm z-10"></div>
                                        
                                        <div 
                                            onClick={() => triggerPolaroidUpload(polaroid.id)}
                                            className="w-full aspect-square bg-gray-100 overflow-hidden mb-2 filter sepia-[0.3] relative"
                                        >
                                            <img src={polaroid.image} className="w-full h-full object-cover opacity-90" />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <span className="text-[10px] text-white font-bold bg-black/40 px-2 py-1 rounded-full">Change</span>
                                            </div>
                                        </div>
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); editPolaroidCaption(polaroid.id, polaroid.caption); }}
                                            className="text-center hover:bg-gray-50 rounded px-1"
                                        >
                                            <span className="font-serif text-[10px] text-gray-500 italic font-bold">{polaroid.caption}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Pagination Dots */}
                <div className="absolute bottom-[6.5rem] left-0 right-0 flex justify-center gap-2 pointer-events-none z-20">
                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentPage === 0 ? 'bg-white w-4' : 'bg-white/40'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentPage === 1 ? 'bg-white w-4' : 'bg-white/40'}`} />
                </div>
            </div>

            {/* --- ACTIVE APPS LAYER --- */}
            <ChatApp 
              isOpen={activeApp === AppID.Chat || activeApp === AppID.WeChat} 
              appName="WeChat" 
              variant="wechat"
              onBack={closeApp} 
              onOpenExternalApp={openApp}
            />
            <ChatApp 
              isOpen={activeApp === AppID.Mail} 
              appName="Messages" 
              variant="ios"
              onBack={closeApp} 
              onOpenExternalApp={openApp}
            />
            
            <WalletApp 
                isOpen={activeApp === AppID.Beautify} 
                onBack={closeApp} 
                onUpdateTheme={handleThemeUpdate} 
            />
            <DreamApp isOpen={activeApp === AppID.WorldBook} onBack={closeApp} />
            <SettingsApp isOpen={activeApp === AppID.Settings} onBack={closeApp} />
            <CoupleSpaceApp isOpen={activeApp === AppID.CoupleSpace} onBack={closeApp} onOpenExternalApp={openApp} />
            <CalendarApp isOpen={activeApp === AppID.Calendar} onBack={closeApp} />
            <SharedPhoneApp isOpen={activeApp === AppID.Phone} onBack={closeApp} />
            <FitnessApp isOpen={activeApp === AppID.Fitness} onBack={closeApp} />
            
            {/* New Apps */}
            <MusicApp isOpen={activeApp === AppID.Music} onBack={closeApp} />
            <CalculatorApp isOpen={activeApp === AppID.Calculator} onBack={closeApp} />
            <PhoneInvestigationApp isOpen={activeApp === AppID.Investigation} onBack={closeApp} />

            {/* Bottom Dock - Floating Style */}
            <div className={`transition-all duration-500 ease-out ${activeApp ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
                 <Dock onAppClick={openApp} />
            </div>

            {/* Home Bar */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/20 rounded-full z-50"></div>
        </div>
      </div>
    </div>
  );
};

export default App;
