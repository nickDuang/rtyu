
import React, { useState, useRef, useEffect } from 'react';
import { Product, AppID } from '../../types';

interface WalletAppProps {
  onBack: () => void;
  isOpen: boolean;
  onUpdateTheme: (type: 'wallpaper' | 'icon' | 'font' | 'name', id: string | null, value: string) => void;
}

const WalletApp: React.FC<WalletAppProps> = ({ onBack, isOpen, onUpdateTheme }) => {
  // Load balance from storage
  const [balance, setBalance] = useState(() => {
      const saved = localStorage.getItem('ephone_balance');
      return saved ? parseFloat(saved) : 1250.50;
  });

  const [customNames, setCustomNames] = useState<Record<string, string>>({});

  // Save balance
  useEffect(() => {
      localStorage.setItem('ephone_balance', balance.toString());
  }, [balance]);

  // Load names
  useEffect(() => {
      if (isOpen) {
          const savedNames = localStorage.getItem('ephone_app_names');
          if (savedNames) setCustomNames(JSON.parse(savedNames));
      }
  }, [isOpen]);

  const [activeTab, setActiveTab] = useState<'wallet' | 'market' | 'custom'>('custom');
  
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const fontFileInputRef = useRef<HTMLInputElement>(null);
  const [fontUrl, setFontUrl] = useState('');

  // Refs for icon inputs
  const iconRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const products: Product[] = [
    { id: '1', name: 'Neon Theme', price: 5.00, image: 'https://picsum.photos/100/100?random=10', category: 'Theme' },
    { id: '2', name: 'Retro Icons', price: 15.00, image: 'https://picsum.photos/100/100?random=11', category: 'Icons' },
    { id: '3', name: 'Gold Member', price: 99.00, image: 'https://picsum.photos/100/100?random=12', category: 'Service' },
    { id: '4', name: 'Pet Widget', price: 25.00, image: 'https://picsum.photos/100/100?random=13', category: 'Widget' },
  ];

  const handleBuy = (product: Product) => {
    if (balance >= product.price) {
      if (window.confirm(`Purchase ${product.name} for $${product.price}?`)) {
        setBalance(prev => prev - product.price);
      }
    } else {
      alert("Insufficient funds!");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'wallpaper' | 'icon', id: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const result = event.target?.result as string;
        onUpdateTheme(type, id, result);
        alert(`${type === 'wallpaper' ? 'Wallpaper' : 'Icon'} updated successfully!`);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
  };

  const handleFontFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.match(/\.(ttf|woff|woff2|otf)$/)) {
          alert("Please upload a valid font file (.ttf, .woff, .woff2, .otf)");
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          const result = event.target?.result as string;
          onUpdateTheme('font', null, result);
          alert("Custom font applied!");
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const handleApplyFontUrl = () => {
      if (!fontUrl) return;
      onUpdateTheme('font', null, fontUrl);
      alert("Font URL applied!");
      setFontUrl('');
  };

  const handleNameChange = (id: string, newName: string) => {
      const updated = { ...customNames, [id]: newName };
      setCustomNames(updated);
      // Debounce or just save on blur usually, but for simplicity:
      onUpdateTheme('name', id, newName);
  };

  const customizableApps = [
      { id: AppID.WeChat, name: 'WeChat' },
      { id: AppID.WorldBook, name: 'World Book' },
      { id: AppID.Beautify, name: 'Beautify' },
      { id: AppID.Mail, name: 'Messages' },
      { id: AppID.Phone, name: 'Phone' },
      { id: AppID.Calendar, name: 'Calendar' },
      { id: AppID.CoupleSpace, name: 'Couple Space' },
      { id: AppID.Taobao, name: 'Taobao' },
      { id: AppID.Weather, name: 'Weather' },
      { id: AppID.Bookstore, name: 'Novel Store' },
      { id: AppID.Library, name: 'Library' },
  ];

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-gray-50 flex flex-col z-50 app-transition">
      {/* Header */}
      <div className="h-24 bg-pink-500 pt-12 px-4 flex items-center justify-between text-white shadow-md z-10">
        <button onClick={onBack} className="font-medium flex items-center opacity-90">
            <span className="text-2xl mr-1">‹</span> Back
        </button>
        <h1 className="font-bold text-lg">Beautify Studio</h1>
        <div className="w-16"></div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white shadow-sm z-10">
        <button 
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'custom' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400'}`}
        >
          Customize
        </button>
        <button 
          onClick={() => setActiveTab('wallet')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'wallet' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400'}`}
        >
          Balance
        </button>
        <button 
          onClick={() => setActiveTab('market')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'market' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400'}`}
        >
          Store
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-24">
        
        {activeTab === 'custom' && (
            <div className="space-y-6">
                {/* Wallpaper Section */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span>🖼️</span> Desktop Wallpaper
                    </h3>
                    <div 
                        onClick={() => wallpaperInputRef.current?.click()}
                        className="h-32 w-full bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-pink-300 transition-colors"
                    >
                        <span className="text-2xl mb-1">📤</span>
                        <span className="text-xs">Tap to upload image</span>
                    </div>
                    <input 
                        type="file" 
                        ref={wallpaperInputRef} 
                        onChange={(e) => handleFileChange(e, 'wallpaper')} 
                        className="hidden" 
                        accept="image/*" 
                    />
                </div>

                {/* Custom Font Section */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span>🔤</span> System Font
                    </h3>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={fontUrl}
                                onChange={(e) => setFontUrl(e.target.value)}
                                placeholder="Paste font URL (e.g. Google Fonts)"
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-300"
                            />
                            <button 
                                onClick={handleApplyFontUrl}
                                className="bg-pink-500 text-white px-3 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform"
                            >
                                Apply
                            </button>
                        </div>
                        <div className="text-center text-xs text-gray-400">- OR -</div>
                        <div 
                            onClick={() => fontFileInputRef.current?.click()}
                            className="w-full py-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-colors"
                        >
                            <span className="text-lg">📂</span>
                            <span className="text-xs font-bold text-gray-600">Import Local Font (.ttf/.woff)</span>
                        </div>
                        <input 
                            type="file"
                            ref={fontFileInputRef}
                            onChange={handleFontFileChange}
                            className="hidden"
                            accept=".ttf,.woff,.woff2,.otf"
                        />
                         <button 
                            onClick={() => onUpdateTheme('font', null, '')}
                            className="w-full py-1 text-[10px] text-gray-400 hover:text-red-400"
                        >
                            Reset to Default Font
                        </button>
                    </div>
                </div>

                {/* Icons Section */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span>📱</span> App Icons & Names
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        {customizableApps.map(app => (
                            <div key={app.id} className="flex flex-col items-center gap-2 p-2 rounded-xl border border-gray-50 bg-gray-50/50">
                                <div 
                                    onClick={() => iconRefs.current[app.id]?.click()}
                                    className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-gray-400 cursor-pointer shadow-sm hover:ring-2 hover:ring-pink-400 transition-all border border-gray-100"
                                >
                                    <span className="text-lg">📷</span>
                                </div>
                                <input 
                                    value={customNames[app.id] !== undefined ? customNames[app.id] : app.name}
                                    onChange={(e) => handleNameChange(app.id, e.target.value)}
                                    placeholder="Name"
                                    className="w-full text-[10px] text-center bg-transparent border-b border-gray-300 focus:border-pink-500 outline-none p-1 text-gray-600"
                                />
                                <input 
                                    type="file"
                                    ref={(el) => { iconRefs.current[app.id] = el; }}
                                    onChange={(e) => handleFileChange(e, 'icon', app.id)}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'wallet' && (
          <div className="flex flex-col items-center mt-4">
             <div className="w-full bg-gradient-to-br from-pink-500 to-orange-400 rounded-2xl p-6 text-white shadow-lg mb-8">
                <p className="text-sm opacity-80 mb-1">Total Balance</p>
                <h2 className="text-4xl font-bold mb-4">${balance.toFixed(2)}</h2>
                <div className="flex justify-between items-center text-xs opacity-90">
                    <span>**** **** **** 8888</span>
                    <span>VISA</span>
                </div>
             </div>
             
             <div className="w-full">
                <h3 className="text-gray-500 font-semibold mb-4 text-sm uppercase tracking-wider">Purchase History</h3>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {[1,2,3].map(i => (
                        <div key={i} className="flex justify-between items-center p-4 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">🛍️</div>
                                <div>
                                    <p className="font-medium text-gray-800">Theme Pack</p>
                                    <p className="text-xs text-gray-400">Today, 10:2{i} AM</p>
                                </div>
                            </div>
                            <span className="font-semibold text-red-500">-$25.00</span>
                        </div>
                    ))}
                     <div className="flex justify-between items-center p-4 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-500">💰</div>
                                <div>
                                    <p className="font-medium text-gray-800">Top Up</p>
                                    <p className="text-xs text-gray-400">Yesterday</p>
                                </div>
                            </div>
                            <span className="font-semibold text-green-500">+$500.00</span>
                        </div>
                </div>
             </div>
          </div>
        )}
        
        {activeTab === 'market' && (
          <div className="grid grid-cols-2 gap-4">
             {products.map(product => (
                 <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
                    <img src={product.image} alt={product.name} className="w-full h-32 object-cover" />
                    <div className="p-3 flex flex-col flex-1">
                        <span className="text-xs text-pink-500 font-semibold mb-1">{product.category}</span>
                        <h3 className="font-medium text-gray-800 text-sm mb-2 line-clamp-1">{product.name}</h3>
                        <div className="mt-auto flex justify-between items-center">
                            <span className="font-bold text-gray-900">${product.price}</span>
                            <button 
                                onClick={() => handleBuy(product)}
                                className="bg-black text-white text-xs px-3 py-1.5 rounded-full active:bg-gray-800"
                            >
                                Buy
                            </button>
                        </div>
                    </div>
                 </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletApp;
