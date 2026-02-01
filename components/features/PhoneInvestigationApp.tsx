import React, { useState, useEffect } from 'react';
import { Contact } from '../../types';

interface PhoneInvestigationAppProps {
  onBack: () => void;
  isOpen: boolean;
}

type InnerAppID = 'home' | 'wechat' | 'album' | 'notes';

const PhoneInvestigationApp: React.FC<PhoneInvestigationAppProps> = ({ onBack, isOpen }) => {
  // --- State ---
  const [partner, setPartner] = useState<Contact | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [currentApp, setCurrentApp] = useState<InnerAppID>('home');
  const [shake, setShake] = useState(false);

  // Load Partner on Open
  useEffect(() => {
    if (isOpen) {
        const savedPartner = localStorage.getItem('ephone_couple_partner');
        if (savedPartner) {
            setPartner(JSON.parse(savedPartner));
        } else {
            setPartner(null);
        }
        // Reset state
        setIsLocked(false);
        setPasscode('');
        setCurrentApp('home');
    }
  }, [isOpen]);

  // --- Handlers ---
  const handleNumClick = (num: string) => {
      if (passcode.length < 4) {
          const newPass = passcode + num;
          setPasscode(newPass);
          if (newPass.length === 4) {
              checkPasscode(newPass);
          }
      }
  };

  const checkPasscode = (code: string) => {
      // Default sweet password
      if (code === '5200' || code === '1314') {
          setTimeout(() => setIsLocked(false), 200);
      } else {
          setShake(true);
          setTimeout(() => {
              setShake(false);
              setPasscode('');
          }, 500);
      }
  };

  const handleDelete = () => {
      setPasscode(prev => prev.slice(0, -1));
  };

  // --- Mock Data Generators ---
  const getChats = () => [
      { id: 1, name: 'Me ❤️', avatar: 'https://ui-avatars.com/api/?name=Me&background=pink&color=fff', message: 'Miss you!', time: 'Just now', pinned: true },
      { id: 2, name: 'Mom', avatar: 'https://ui-avatars.com/api/?name=Mom&background=random', message: 'Remember to eat dinner.', time: '10:30 AM', pinned: false },
      { id: 3, name: 'Boss', avatar: 'https://ui-avatars.com/api/?name=Boss&background=gray', message: 'Send me the report by EOD.', time: 'Yesterday', pinned: false },
      { id: 4, name: 'Bestie', avatar: 'https://ui-avatars.com/api/?name=Bestie&background=random', message: 'So how is it going with them? 😏', time: 'Yesterday', pinned: false },
      { id: 5, name: 'Gym Bro', avatar: 'https://ui-avatars.com/api/?name=Gym&background=random', message: 'Leg day tomorrow?', time: 'Tue', pinned: false },
  ];

  const getNotes = () => [
      { id: 1, title: 'Gift Ideas 🎁', content: 'Camera lens, Handmade scarf, That book they mentioned...' },
      { id: 2, title: 'Passwords', content: 'Netflix: hunter2\nWifi: 12345678' },
      { id: 3, title: 'To Do', content: '- Buy groceries\n- Call grandma\n- Plan weekend date' },
      { id: 4, title: 'Anniversary', content: 'Don\'t forget to book the restaurant!!!' },
  ];

  const getPhotos = () => [
      'https://picsum.photos/200/200?random=10',
      'https://picsum.photos/200/200?random=11',
      'https://picsum.photos/200/200?random=12',
      'https://picsum.photos/200/200?random=13',
      'https://picsum.photos/200/200?random=14',
      'https://picsum.photos/200/200?random=15',
  ];

  if (!isOpen) return null;

  // --- No Partner State ---
  if (!partner) {
      return (
          <div className="absolute inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center text-white app-transition">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-xl font-bold mb-2">Phone Locked</h2>
              <p className="text-gray-400 text-center px-8 mb-8">
                  You don't have a partner yet. <br/>
                  Go to <strong>Couple Space</strong> to invite someone first!
              </p>
              <button onClick={onBack} className="bg-white/10 px-6 py-2 rounded-full backdrop-blur-md">
                  Go Back
              </button>
          </div>
      );
  }

  // --- Lock Screen ---
  if (isLocked) {
      return (
          <div className="absolute inset-0 z-50 flex flex-col items-center pt-20 pb-10 px-6 app-transition bg-cover bg-center" 
               style={{ backgroundImage: `url(https://images.unsplash.com/photo-1518531933037-9a404e412398?q=80&w=800&auto=format&fit=crop)`, backgroundColor: '#333' }}>
              
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
              
              <div className="z-10 flex flex-col items-center w-full h-full">
                  <div className="mt-8 mb-2">
                      <img src={partner.avatar} className="w-24 h-24 rounded-full border-4 border-white/20 shadow-xl" />
                  </div>
                  <h2 className="text-white text-xl font-bold mb-8">{partner.name}'s Phone</h2>

                  <div className={`flex gap-4 mb-8 ${shake ? 'animate-[shake_0.5s]' : ''}`}>
                      {[0, 1, 2, 3].map(i => (
                          <div key={i} className={`w-4 h-4 rounded-full border border-white ${passcode.length > i ? 'bg-white' : 'bg-transparent'}`}></div>
                      ))}
                  </div>

                  {/* Numpad */}
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full max-w-[280px] mb-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <button key={n} onClick={() => handleNumClick(n.toString())} className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-2xl font-medium transition-colors">
                              {n}
                          </button>
                      ))}
                      <div className="col-start-2">
                          <button onClick={() => handleNumClick('0')} className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-2xl font-medium transition-colors">
                              0
                          </button>
                      </div>
                      <div className="col-start-3 flex items-center justify-center">
                          <button onClick={handleDelete} className="text-white/80 active:text-white">
                             <span className="text-xl">⌫</span>
                          </button>
                      </div>
                  </div>

                  <div className="flex justify-between w-full items-center px-4 mt-4">
                      <button onClick={onBack} className="text-white/60 text-sm">Emergency</button>
                      <button onClick={() => alert("Try '5200' or '1314'")} className="text-white/60 text-sm">Hint?</button>
                  </div>
              </div>
          </div>
      );
  }

  // --- Unlocked: Inner Phone OS ---
  return (
    <div className="absolute inset-0 z-50 bg-[#e0e5ec] flex flex-col app-transition overflow-hidden">
        {/* Fake Status Bar */}
        <div className="h-8 bg-black/5 flex justify-between px-4 items-center text-[10px] font-bold text-gray-700">
            <span>{partner.name}</span>
            <div className="flex gap-1">
                <span>5G</span>
                <span>100%</span>
            </div>
        </div>

        {/* --- Home Screen --- */}
        {currentApp === 'home' && (
            <div className="flex-1 p-6 flex flex-col">
                <div className="flex-1">
                    <div className="grid grid-cols-4 gap-6 mt-4">
                        <button onClick={() => setCurrentApp('wechat')} className="flex flex-col items-center gap-1">
                            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">💬</div>
                            <span className="text-xs text-gray-600">WeChat</span>
                        </button>
                        <button onClick={() => setCurrentApp('album')} className="flex flex-col items-center gap-1">
                            <div className="w-14 h-14 bg-blue-400 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">🖼️</div>
                            <span className="text-xs text-gray-600">Photos</span>
                        </button>
                        <button onClick={() => setCurrentApp('notes')} className="flex flex-col items-center gap-1">
                            <div className="w-14 h-14 bg-yellow-400 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">📝</div>
                            <span className="text-xs text-gray-600">Notes</span>
                        </button>
                        <div className="flex flex-col items-center gap-1 opacity-50">
                            <div className="w-14 h-14 bg-gray-400 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">⚙️</div>
                            <span className="text-xs text-gray-600">Settings</span>
                        </div>
                    </div>
                </div>

                {/* Dock */}
                <div className="bg-white/30 backdrop-blur-xl p-4 rounded-3xl flex justify-around mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-sm">📞</div>
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-sm">🌐</div>
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-black shadow-sm">🎵</div>
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-white shadow-sm">📷</div>
                </div>
                
                {/* Exit Button (Real world) */}
                <button onClick={onBack} className="absolute top-10 right-4 w-8 h-8 bg-black/20 rounded-full text-white flex items-center justify-center">✕</button>
            </div>
        )}

        {/* --- Inner Apps --- */}
        
        {/* 1. WeChat */}
        {currentApp === 'wechat' && (
            <div className="flex-1 bg-white flex flex-col animate-[fadeIn_0.2s]">
                <div className="h-12 bg-gray-100 flex items-center justify-between px-4 border-b">
                    <button onClick={() => setCurrentApp('home')} className="text-blue-500 flex items-center hover:bg-gray-200 p-2 -ml-2 rounded-lg transition-colors">
                        <span className="text-2xl mr-1">‹</span>
                        <span className="text-base font-medium">Back</span>
                    </button>
                    <span className="font-bold">WeChat (5)</span>
                    <div className="w-16"></div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {getChats().map(chat => (
                        <div key={chat.id} className={`flex items-center p-3 border-b border-gray-50 ${chat.pinned ? 'bg-gray-50' : ''}`}>
                            <img src={chat.avatar} className="w-12 h-12 rounded-lg bg-gray-200 mr-3" />
                            <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-gray-800">{chat.name}</span>
                                    <span className="text-xs text-gray-400">{chat.time}</span>
                                </div>
                                <p className="text-sm text-gray-500 truncate">{chat.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 2. Photos */}
        {currentApp === 'album' && (
            <div className="flex-1 bg-white flex flex-col animate-[fadeIn_0.2s]">
                <div className="h-12 bg-white flex items-center px-4 border-b justify-between">
                    <button onClick={() => setCurrentApp('home')} className="text-blue-500 flex items-center hover:bg-gray-100 p-2 -ml-2 rounded-lg transition-colors">
                        <span className="text-2xl mr-1">‹</span>
                        <span className="text-base font-medium">Albums</span>
                    </button>
                    <span className="font-bold">Recents</span>
                    <div className="w-20"></div>
                </div>
                <div className="flex-1 overflow-y-auto p-1">
                    <div className="grid grid-cols-3 gap-1">
                        {getPhotos().map((url, i) => (
                            <div key={i} className="aspect-square bg-gray-100">
                                <img src={url} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* 3. Notes */}
        {currentApp === 'notes' && (
            <div className="flex-1 bg-[#fbfbfb] flex flex-col animate-[fadeIn_0.2s]">
                <div className="h-12 bg-[#fbfbfb] flex items-center px-4 justify-between border-b border-gray-100">
                    <button onClick={() => setCurrentApp('home')} className="text-yellow-500 flex items-center hover:bg-yellow-50 p-2 -ml-2 rounded-lg transition-colors">
                        <span className="text-2xl mr-1">‹</span>
                        <span className="text-base font-bold">Folders</span>
                    </button>
                </div>
                <div className="px-4 pt-2 pb-4">
                    <h1 className="text-3xl font-bold mb-4">Notes</h1>
                    <div className="space-y-3">
                        {getNotes().map(note => (
                            <div key={note.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold mb-1">{note.title}</h3>
                                <p className="text-gray-500 text-sm whitespace-pre-wrap">{note.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Bottom Home Indicator */}
        <div className="h-6 flex justify-center items-center bg-transparent">
             <div onClick={() => setCurrentApp('home')} className="w-32 h-1 bg-black/20 rounded-full cursor-pointer active:bg-black/40"></div>
        </div>

    </div>
  );
};

export default PhoneInvestigationApp;