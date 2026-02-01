
import React, { useState, useEffect, useRef } from 'react';
import { Contact } from '../../types';
import { generateWhisperNote } from '../../services/geminiService';

interface SharedPhoneAppProps {
  onBack: () => void;
  isOpen: boolean;
}

type AppMode = 'lock' | 'home' | 'notes' | 'album' | 'wishes' | 'quiz' | 'settings';
type WishlistItem = { id: number; text: string; done: boolean };
type GalleryImage = { id: number; src: string };
type NoteItem = {
    id: number;
    text: string;
    color: 'yellow' | 'pink' | 'blue' | 'green';
    rotation: number;
    x?: number; // Visual position simulation
    y?: number;
};
type QuizQuestion = { q: string; a: string; b: string; c: string; correct: 'a'|'b'|'c'; };

const QUIZ_QUESTIONS: QuizQuestion[] = [
    { q: "What's my favorite color?", a: "Blue", b: "Green", c: "Black", correct: 'a' },
    { q: "Dream vacation spot?", a: "Tokyo", b: "Paris", c: "A cabin in the woods", correct: 'c' },
    { q: "My go-to coffee order?", a: "Latte", b: "Black Coffee", c: "Espresso", correct: 'b' },
    { q: "What am I most afraid of?", a: "Spiders", b: "Heights", c: "Public Speaking", correct: 'a' },
];

const SharedPhoneApp: React.FC<SharedPhoneAppProps> = ({ onBack, isOpen }) => {
  const [partner, setPartner] = useState<Contact | null>(null);
  const [mode, setMode] = useState<AppMode>('lock');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Data States
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('sharedphone_wallpaper') || 'https://images.unsplash.com/photo-1518531933037-9a404e412398?q=80&w=800&auto=format&fit=crop');
  const [wishes, setWishes] = useState<WishlistItem[]>(() => JSON.parse(localStorage.getItem('sharedphone_wishlist') || '[]'));
  const [album, setAlbum] = useState<GalleryImage[]>(() => JSON.parse(localStorage.getItem('sharedphone_gallery') || '[]'));
  const [notes, setNotes] = useState<NoteItem[]>(() => JSON.parse(localStorage.getItem('sharedphone_notes') || '[]'));
  
  // Quiz State
  const [quizStep, setQuizStep] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState('');

  // Refs
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);

  // Init
  useEffect(() => {
    if (isOpen) {
      const savedPartner = localStorage.getItem('ephone_couple_partner');
      if (savedPartner) {
        setPartner(JSON.parse(savedPartner));
      } else {
         // Fallback partner
         setPartner({ id: 'c1', name: 'Alice', avatar: 'https://picsum.photos/200', description: 'My AI Love' });
      }
      setMode('lock');
      // Clock timer
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  // Persistence
  useEffect(() => { localStorage.setItem('sharedphone_wallpaper', wallpaper); }, [wallpaper]);
  useEffect(() => { localStorage.setItem('sharedphone_wishlist', JSON.stringify(wishes)); }, [wishes]);
  useEffect(() => { localStorage.setItem('sharedphone_gallery', JSON.stringify(album)); }, [album]);
  useEffect(() => { localStorage.setItem('sharedphone_notes', JSON.stringify(notes)); }, [notes]);

  // --- Actions ---

  const handleWallpaperChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => setWallpaper(evt.target?.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => setAlbum(prev => [{ id: Date.now(), src: evt.target?.result as string }, ...prev]);
          reader.readAsDataURL(file);
      }
  };

  const handleAddWish = () => {
      const text = prompt("Add a wish to our list:");
      if (text) setWishes(prev => [...prev, { id: Date.now(), text, done: false }]);
  };

  const toggleWish = (id: number) => {
      setWishes(prev => prev.map(w => w.id === id ? { ...w, done: !w.done } : w));
  };

  const handleAddNote = async (type: 'manual' | 'ai') => {
      let text = '';
      if (type === 'manual') {
          const input = prompt("Write a note:");
          if (!input) return;
          text = input;
      } else {
          if (!partner) return;
          setIsGeneratingNote(true);
          text = await generateWhisperNote(partner);
          setIsGeneratingNote(false);
      }

      const colors: NoteItem['color'][] = ['yellow', 'pink', 'blue', 'green'];
      const newNote: NoteItem = {
          id: Date.now(),
          text,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 10 - 5, // -5 to 5 degrees
          x: Math.random() * 20, // visual randomness
          y: Math.random() * 20
      };
      setNotes(prev => [newNote, ...prev]);
  };

  const deleteNote = (id: number) => {
      if (confirm("Remove this note?")) {
          setNotes(prev => prev.filter(n => n.id !== id));
      }
  };

  // --- Views ---

  if (!isOpen || !partner) return null;

  const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  // 1. Lock Screen
  if (mode === 'lock') {
      return (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-between py-20 text-white app-transition bg-cover bg-center" style={{ backgroundImage: `url(${wallpaper})` }}>
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
              
              <div className="z-10 flex flex-col items-center animate-fade-in">
                  <div className="text-xl font-light opacity-90">{dateString}</div>
                  <div className="text-7xl font-bold tracking-tight my-2">{timeString}</div>
              </div>

              {/* Notifications */}
              <div className="z-10 w-full px-6 space-y-2">
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl flex items-center gap-3 animate-slide-up">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                          <img src={partner.avatar} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between items-baseline">
                             <span className="font-bold text-sm">WeChat</span>
                             <span className="text-[10px] opacity-70">now</span>
                          </div>
                          <div className="text-sm opacity-90">Miss you! ❤️</div>
                      </div>
                  </div>
              </div>

              <div className="z-10 flex flex-col items-center gap-4 animate-bounce-slow">
                  <div 
                    onClick={() => setMode('home')}
                    className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer active:bg-white/40 transition-colors"
                  >
                      <span className="text-2xl">🔓</span>
                  </div>
                  <span className="text-xs font-medium opacity-70">Tap to Unlock</span>
              </div>
          </div>
      );
  }

  // 2. Home Screen
  if (mode === 'home') {
      return (
          <div className="absolute inset-0 z-50 bg-gray-100 flex flex-col app-transition bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${wallpaper})` }}>
              {/* Overlay */}
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>

              {/* Status Bar */}
              <div className="relative z-10 h-8 flex justify-between px-6 items-center text-xs font-medium text-white/90 drop-shadow-md pt-2">
                  <span>{timeString}</span>
                  <div className="flex gap-1.5">
                      <span>Signal</span>
                      <span>Wifi</span>
                      <span>100%</span>
                  </div>
              </div>

              {/* Widgets Area */}
              <div className="relative z-10 p-6 pt-10">
                  <div className="flex justify-between items-end text-white drop-shadow-md mb-8">
                      <div>
                          <div className="text-4xl font-light">{timeString}</div>
                          <div className="text-sm opacity-90">{dateString}</div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full">
                          <span>🌤️</span>
                          <span>24°C</span>
                      </div>
                  </div>
              </div>

              {/* App Grid */}
              <div className="relative z-10 flex-1 px-6">
                  <div className="grid grid-cols-4 gap-x-4 gap-y-8">
                      <AppIcon icon="📝" label="Notes" color="bg-yellow-400" onClick={() => setMode('notes')} />
                      <AppIcon icon="🖼️" label="Album" color="bg-blue-400" onClick={() => setMode('album')} />
                      <AppIcon icon="✨" label="Wishes" color="bg-pink-400" onClick={() => setMode('wishes')} />
                      <AppIcon icon="❓" label="Quiz" color="bg-purple-400" onClick={() => setMode('quiz')} />
                      <AppIcon icon="⚙️" label="Settings" color="bg-gray-500" onClick={() => setMode('settings')} />
                  </div>
              </div>

              {/* Dock */}
              <div className="relative z-10 mb-6 mx-4 bg-white/30 backdrop-blur-xl rounded-[28px] p-4 flex justify-around">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-2xl shadow-sm cursor-pointer hover:-translate-y-1 transition-transform">📞</div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl shadow-sm cursor-pointer hover:-translate-y-1 transition-transform">🌐</div>
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm cursor-pointer hover:-translate-y-1 transition-transform" onClick={() => alert("Just a demo!")}>💬</div>
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-2xl shadow-sm cursor-pointer hover:-translate-y-1 transition-transform">📷</div>
              </div>
              
              {/* Home Indicator/Exit */}
              <button 
                onClick={onBack} 
                className="absolute top-12 right-4 z-50 w-8 h-8 bg-black/20 text-white rounded-full flex items-center justify-center backdrop-blur-md"
              >
                  ✕
              </button>
          </div>
      );
  }

  // --- Sub-Apps ---

  // 3. Notes App (Corkboard style)
  if (mode === 'notes') {
      return (
          <AppWindow title="Sticky Notes" onClose={() => setMode('home')} bgClass="bg-[#e8d5b5]">
              {/* Corkboard texture simulation via CSS pattern or color */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#8b7355 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              
              <div className="relative z-10 p-4 min-h-full overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4 pb-20">
                      {notes.map(note => (
                          <div 
                            key={note.id}
                            onClick={() => deleteNote(note.id)}
                            className={`
                                relative p-4 shadow-md transition-transform hover:scale-105 cursor-pointer font-handwriting text-gray-800
                                ${note.color === 'yellow' ? 'bg-[#fef3c7]' : note.color === 'blue' ? 'bg-[#dbeafe]' : note.color === 'pink' ? 'bg-[#fce7f3]' : 'bg-[#dcfce7]'}
                            `}
                            style={{ 
                                transform: `rotate(${note.rotation}deg)`,
                                minHeight: '140px'
                            }}
                          >
                              {/* Tape visual */}
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-white/40 rotate-1"></div>
                              <p className="text-lg leading-relaxed">{note.text}</p>
                          </div>
                      ))}
                      
                      {/* Add Button */}
                      <div className="flex flex-col gap-2 items-center justify-center min-h-[140px] border-2 border-dashed border-gray-400/30 rounded-xl">
                          <button onClick={() => handleAddNote('manual')} className="w-10 h-10 bg-white rounded-full shadow-sm text-xl text-gray-600 hover:bg-gray-50">+</button>
                          <button 
                            onClick={() => handleAddNote('ai')} 
                            disabled={isGeneratingNote}
                            className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full shadow-sm text-xl text-white hover:opacity-90 flex items-center justify-center"
                          >
                              {isGeneratingNote ? '⏳' : '✨'}
                          </button>
                          <span className="text-xs text-gray-500 font-bold opacity-60">Add Note</span>
                      </div>
                  </div>
              </div>
          </AppWindow>
      );
  }

  // 4. Album App
  if (mode === 'album') {
      return (
          <AppWindow title="Our Album" onClose={() => setMode('home')} bgClass="bg-white">
              <div className="p-1 min-h-full">
                  <div className="grid grid-cols-3 gap-1">
                      <div 
                        onClick={() => photoInputRef.current?.click()}
                        className="aspect-square bg-gray-100 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                          <span className="text-2xl text-gray-400">+</span>
                          <span className="text-[10px] text-gray-400 font-medium">Add</span>
                      </div>
                      {album.map(img => (
                          <div key={img.id} className="aspect-square bg-gray-100 relative group overflow-hidden">
                              <img src={img.src} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => {
                                    if(confirm("Delete photo?")) setAlbum(prev => prev.filter(p => p.id !== img.id));
                                }}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity"
                              >
                                  Delete
                              </button>
                          </div>
                      ))}
                  </div>
                  <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handleAddPhoto} />
              </div>
          </AppWindow>
      );
  }

  // 5. Wishes App
  if (mode === 'wishes') {
      return (
          <AppWindow title="Wishlist" onClose={() => setMode('home')} bgClass="bg-[#fff9f0]">
               {/* Notepad lines */}
               <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '100% 2.5rem', marginTop: '3.5rem' }}></div>
               <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-red-200/50 pointer-events-none"></div>

               <div className="relative z-10 p-6 pt-4">
                   <div className="flex justify-end mb-4">
                       <button onClick={handleAddWish} className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform">
                           + New Wish
                       </button>
                   </div>
                   
                   <div className="space-y-0">
                       {wishes.map(item => (
                           <div 
                             key={item.id} 
                             onClick={() => toggleWish(item.id)}
                             className="flex items-center gap-3 h-[2.5rem] px-2 cursor-pointer group"
                           >
                               <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'}`}>
                                   {item.done && '✓'}
                               </div>
                               <span className={`font-handwriting text-xl text-gray-700 ${item.done ? 'line-through opacity-50' : ''}`}>
                                   {item.text}
                               </span>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setWishes(prev => prev.filter(w => w.id !== item.id)); }}
                                 className="ml-auto text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                   ×
                               </button>
                           </div>
                       ))}
                   </div>
               </div>
          </AppWindow>
      );
  }

  // 6. Quiz App
  if (mode === 'quiz') {
      return (
          <AppWindow title="Couple Quiz" onClose={() => setMode('home')} bgClass="bg-purple-50">
              <div className="flex-1 flex flex-col items-center justify-center p-6">
                  {quizStep < QUIZ_QUESTIONS.length ? (
                      <div className="w-full max-w-xs bg-white rounded-2xl p-6 shadow-lg">
                          <div className="flex justify-between text-xs font-bold text-purple-400 uppercase tracking-wider mb-4">
                              <span>Question {quizStep + 1}</span>
                              <span>{QUIZ_QUESTIONS.length} Total</span>
                          </div>
                          
                          <h3 className="text-xl font-bold text-gray-800 mb-8">{QUIZ_QUESTIONS[quizStep].q}</h3>
                          
                          <div className="space-y-3">
                              {['a','b','c'].map(opt => (
                                  <button 
                                    key={opt}
                                    onClick={() => {
                                        if (quizFeedback) return;
                                        const isCorrect = opt === QUIZ_QUESTIONS[quizStep].correct;
                                        setQuizFeedback(isCorrect ? 'Correct! 🎉' : 'Wrong 😅');
                                        if (isCorrect) setScore(s => s + 1);
                                        setTimeout(() => {
                                            setQuizStep(s => s + 1);
                                            setQuizFeedback('');
                                        }, 1000);
                                    }}
                                    className="w-full text-left p-4 rounded-xl border-2 border-purple-50 hover:border-purple-200 hover:bg-purple-50 transition-all font-medium text-gray-600 active:scale-95"
                                  >
                                      {QUIZ_QUESTIONS[quizStep][opt as 'a'|'b'|'c']}
                                  </button>
                              ))}
                          </div>
                          
                          {quizFeedback && (
                              <div className="mt-4 text-center font-bold text-purple-600 animate-pulse">
                                  {quizFeedback}
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="text-center bg-white p-8 rounded-3xl shadow-xl">
                          <div className="text-6xl mb-4">🏆</div>
                          <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Finished!</h2>
                          <p className="text-gray-500 mb-6">You scored {score} / {QUIZ_QUESTIONS.length}</p>
                          <button 
                            onClick={() => { setQuizStep(0); setScore(0); }}
                            className="bg-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-purple-200 hover:scale-105 transition-transform"
                          >
                              Play Again
                          </button>
                      </div>
                  )}
              </div>
          </AppWindow>
      );
  }

  // 7. Settings
  if (mode === 'settings') {
      return (
          <AppWindow title="Settings" onClose={() => setMode('home')} bgClass="bg-gray-50">
              <div className="p-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-100">
                          <h3 className="font-bold text-gray-800">Wallpaper</h3>
                          <p className="text-xs text-gray-500 mb-3">Change the home and lock screen background.</p>
                          <div 
                            onClick={() => wallpaperInputRef.current?.click()}
                            className="h-32 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors bg-cover bg-center"
                            style={{ backgroundImage: `url(${wallpaper})` }}
                          >
                              <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">Change</span>
                          </div>
                          <input type="file" ref={wallpaperInputRef} className="hidden" accept="image/*" onChange={handleWallpaperChange} />
                      </div>
                      <div className="p-4">
                          <h3 className="font-bold text-gray-800 mb-2">About</h3>
                          <div className="text-sm text-gray-500 space-y-1">
                              <p>LoveOS Version 1.0</p>
                              <p>Connected with: {partner.name}</p>
                          </div>
                      </div>
                  </div>
              </div>
          </AppWindow>
      );
  }

  return null;
};

// --- Sub-components ---

const AppIcon: React.FC<{ icon: string; label: string; color: string; onClick: () => void }> = ({ icon, label, color, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg group-active:scale-90 transition-transform`}>
            {icon}
        </div>
        <span className="text-[11px] font-medium text-white drop-shadow-md">{label}</span>
    </button>
);

const AppWindow: React.FC<{ title: string; onClose: () => void; bgClass: string; children: React.ReactNode }> = ({ title, onClose, bgClass, children }) => (
    <div className={`absolute inset-0 z-50 ${bgClass} flex flex-col app-transition`}>
        <div className="h-20 pt-8 px-4 flex items-center justify-between bg-white/50 backdrop-blur-md border-b border-black/5 sticky top-0 z-20">
            <button 
                onClick={onClose} 
                className="w-8 h-8 flex items-center justify-center bg-black/10 rounded-full hover:bg-black/20 transition-colors"
            >
                ‹
            </button>
            <h1 className="font-bold text-gray-800">{title}</h1>
            <div className="w-8"></div>
        </div>
        <div className="flex-1 relative overflow-hidden flex flex-col">
            {children}
        </div>
        {/* Home Bar */}
        <div className="h-6 flex justify-center items-center absolute bottom-0 left-0 right-0 z-50 pointer-events-none">
             <div className="w-32 h-1 bg-black/20 rounded-full"></div>
        </div>
    </div>
);

export default SharedPhoneApp;
