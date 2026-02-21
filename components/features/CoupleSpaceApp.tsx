
import React, { useState, useEffect, useRef } from 'react';
import { generateChatResponse, generateCoupleInvitationReaction, generateCoupleDiary, generateRelationshipQuiz, QuizData, generateLoveLetter } from '../../services/geminiService';
import { Contact, AppID, ChatSession } from '../../types';

interface CoupleSpaceAppProps {
  onBack: () => void;
  isOpen: boolean;
  onOpenExternalApp?: (appId: AppID) => void;
}

interface CoupleDiaryEntry {
    id: string;
    date: number;
    content: string;
    mood: string;
    isLocked?: boolean;
    quiz?: QuizData;
}

interface TimeCapsuleLetter {
    id: string;
    title: string;
    trigger: string;
    content: string;
    isLocked: boolean; // Locked until opened
    openedAt?: number;
}

// Enhanced check-in status
interface CheckInRecord {
  mood: string;
  note: string;
  timestamp: number;
  partnerReply?: string;
}

const MOOD_EMOJIS = ['😊', '❤️', '☁️', '☀️', '😴', '🍜', '✨', '💪', '🌧️', '🎵', '🎮', '🥰'];

const CoupleSpaceApp: React.FC<CoupleSpaceAppProps> = ({ onBack, isOpen, onOpenExternalApp }) => {
  // --- Invitation State ---
  const [partner, setPartner] = useState<Contact | null>(() => {
      const saved = localStorage.getItem('ephone_couple_partner');
      return saved ? JSON.parse(saved) : null;
  });

  const [inviteStep, setInviteStep] = useState<'select' | 'sending' | 'result'>('select');
  
  // --- Dynamic Contact List State ---
  const [availableCandidates, setAvailableCandidates] = useState<Contact[]>(() => {
      const savedContacts = localStorage.getItem('ephone_contacts');
      const loadedContacts: Contact[] = savedContacts ? JSON.parse(savedContacts) : [];
      const defaults: Contact[] = [
          { id: 'c1', name: 'Alice (AI)', avatar: 'https://picsum.photos/200/200?random=1', description: "A friendly and cheerful AI assistant." },
          { id: 'c3', name: 'Luna', avatar: 'https://picsum.photos/200/200?random=3', description: "A mysterious girl who likes poetry." },
          { id: 'c4', name: 'Kaito', avatar: 'https://ui-avatars.com/api/?name=Kaito&background=0D8ABC&color=fff', description: "A cool, calm cyberpunk hacker." }
      ];
      const allCandidates = [...loadedContacts, ...defaults];
      const uniqueCandidates = allCandidates.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      return uniqueCandidates;
  });

  useEffect(() => {
      if (isOpen && !partner) {
          const savedContacts = localStorage.getItem('ephone_contacts');
          const loadedContacts: Contact[] = savedContacts ? JSON.parse(savedContacts) : [];
          const defaults: Contact[] = [
            { id: 'c1', name: 'Alice (AI)', avatar: 'https://picsum.photos/200/200?random=1', description: "A friendly and cheerful AI assistant." },
            { id: 'c3', name: 'Luna', avatar: 'https://picsum.photos/200/200?random=3', description: "A mysterious girl who likes poetry." },
            { id: 'c4', name: 'Kaito', avatar: 'https://ui-avatars.com/api/?name=Kaito&background=0D8ABC&color=fff', description: "A cool, calm cyberpunk hacker." }
          ];
          const allCandidates = [...loadedContacts, ...defaults];
          const uniqueCandidates = allCandidates.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
          setAvailableCandidates(uniqueCandidates);
      }
  }, [isOpen, partner]);

  const [selectedCharId, setSelectedCharId] = useState<string>('');

  useEffect(() => {
      if (!selectedCharId && availableCandidates.length > 0) {
          setSelectedCharId(availableCandidates[0].id);
      }
  }, [availableCandidates, selectedCharId]);
  
  const [inviteNote, setInviteNote] = useState('');
  const [inviteReaction, setInviteReaction] = useState<{accepted: boolean, reply: string} | null>(null);

  // --- Settings State ---
  const [showSettings, setShowSettings] = useState(false);
  const [wallpaper, setWallpaper] = useState<string>(() => localStorage.getItem('ephone_couple_wallpaper') || '');

  // --- Main App State ---
  const [activeView, setActiveView] = useState<'home' | 'diary' | 'letters'>('home');
  const [startDate, setStartDate] = useState<Date>(() => {
      const saved = localStorage.getItem('ephone_couple_startdate');
      return saved ? new Date(saved) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 10);
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [intimacyLevel, setIntimacyLevel] = useState(1);
  const [intimacyExp, setIntimacyExp] = useState(45);

  // Check-in State
  const [todayCheckIn, setTodayCheckIn] = useState<CheckInRecord | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInNote, setCheckInNote] = useState('');
  const [selectedMood, setSelectedMood] = useState(MOOD_EMOJIS[0]);
  const [isPartnerReplying, setIsPartnerReplying] = useState(false);

  // --- Diary State ---
  const [diaries, setDiaries] = useState<CoupleDiaryEntry[]>(() => {
      const saved = localStorage.getItem('ephone_couple_diaries');
      return saved ? JSON.parse(saved) : [];
  });
  const [isGeneratingDiary, setIsGeneratingDiary] = useState(false);
  
  // Quiz Unlock State
  const [quizTargetId, setQuizTargetId] = useState<string | null>(null);
  
  // --- Letters (Time Capsule) State ---
  const [letters, setLetters] = useState<TimeCapsuleLetter[]>(() => {
      const saved = localStorage.getItem('ephone_couple_letters');
      return saved ? JSON.parse(saved) : [];
  });
  const [activeLetter, setActiveLetter] = useState<TimeCapsuleLetter | null>(null);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);

  // --- Persistence Effects ---
  useEffect(() => {
      if (partner) localStorage.setItem('ephone_couple_partner', JSON.stringify(partner));
      else localStorage.removeItem('ephone_couple_partner');
  }, [partner]);

  useEffect(() => { localStorage.setItem('ephone_couple_startdate', startDate.toISOString()); }, [startDate]);
  useEffect(() => { localStorage.setItem('ephone_couple_wallpaper', wallpaper); }, [wallpaper]);
  useEffect(() => { localStorage.setItem('ephone_couple_diaries', JSON.stringify(diaries)); }, [diaries]);
  useEffect(() => { localStorage.setItem('ephone_couple_letters', JSON.stringify(letters)); }, [letters]);

  useEffect(() => {
    const savedCheckIn = localStorage.getItem('ephone_couple_today_checkin');
    if (savedCheckIn) {
        const record: CheckInRecord = JSON.parse(savedCheckIn);
        const recordDate = new Date(record.timestamp).toDateString();
        const todayDate = new Date().toDateString();
        if (recordDate === todayDate) {
            setTodayCheckIn(record);
        } else {
            localStorage.removeItem('ephone_couple_today_checkin');
        }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  // Helpers
  const daysTogether = Math.floor((currentTime.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // --- Handlers ---

  const handleInvite = async () => {
      if (!inviteNote.trim()) { alert("Please write a sweet note!"); return; }
      if (!selectedCharId) { alert("Please select a partner!"); return; }

      setInviteStep('sending');
      const char = availableCandidates.find(c => c.id === selectedCharId);
      
      if (!char) {
          alert("Character not found.");
          setInviteStep('select');
          return;
      }

      const reaction = await generateCoupleInvitationReaction(char.name, char.description, inviteNote);
      setInviteReaction(reaction);
      setInviteStep('result');
  };

  const handleEnterSpace = () => {
      if (inviteReaction?.accepted) {
          const char = availableCandidates.find(c => c.id === selectedCharId);
          if (char) {
            setPartner(char);
            setStartDate(new Date());
          }
      } else {
          setInviteStep('select');
          setInviteReaction(null);
          setInviteNote('');
      }
  };

  const submitCheckIn = async () => {
      const record: CheckInRecord = {
          mood: selectedMood,
          note: checkInNote || "Thinking of you...",
          timestamp: Date.now()
      };
      setTodayCheckIn(record);
      setShowCheckInModal(false);
      localStorage.setItem('ephone_couple_today_checkin', JSON.stringify(record));
      
      setIsPartnerReplying(true);
      
      setTimeout(async () => {
          const prompt = [
              { role: 'user', content: `I just did my daily mood check-in. My mood is ${record.mood} and my note says: "${record.note}". Reply to me sweetly as my partner.` }
          ];
          const persona = partner ? `You are ${partner.name}. ${partner.description}. You are in a romantic relationship with the user.` : "You are a loving partner.";
          
          try {
             const reply = await generateChatResponse(prompt, persona);
             const updatedRecord = { ...record, partnerReply: reply };
             setTodayCheckIn(updatedRecord);
             localStorage.setItem('ephone_couple_today_checkin', JSON.stringify(updatedRecord));
          } catch(e) {
             console.error(e);
          } finally {
             setIsPartnerReplying(false);
             setIntimacyExp(prev => Math.min(prev + 5, 100));
          }
      }, 2000);
  };
  
  const handleWallpaperChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => setWallpaper(evt.target?.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = new Date(e.target.value);
      if (!isNaN(date.getTime())) {
          setStartDate(date);
      }
  };

  // --- Diary & Quiz Logic ---
  const handleGenerateDiary = async () => {
      if (!partner) return;
      setIsGeneratingDiary(true);

      try {
          const savedChats = localStorage.getItem('ephone_chats');
          const allChats: ChatSession[] = savedChats ? JSON.parse(savedChats) : [];
          const partnerChat = allChats.find(c => c.contactId === partner.id);
          const chatHistory = partnerChat ? partnerChat.messages : [];

          // 1. Generate Diary Content
          const content = await generateCoupleDiary(partner.name, partner.description, chatHistory);
          
          // 2. Generate Quiz
          const quiz = await generateRelationshipQuiz(partner.name, chatHistory);

          // 3. Save
          const newEntry: CoupleDiaryEntry = {
              id: `diary_${Date.now()}`,
              date: Date.now(),
              content: content,
              mood: MOOD_EMOJIS[Math.floor(Math.random() * MOOD_EMOJIS.length)],
              isLocked: true, // Default locked
              quiz: quiz
          };
          
          setDiaries(prev => [newEntry, ...prev]);
      } catch (e) {
          console.error("Failed to generate diary", e);
          alert("Couldn't write the diary right now. Try chatting more first!");
      } finally {
          setIsGeneratingDiary(false);
      }
  };

  const handleUnlockDiary = (entry: CoupleDiaryEntry, optionIndex: number) => {
      if (entry.quiz && optionIndex === entry.quiz.correctIndex) {
          setDiaries(prev => prev.map(d => d.id === entry.id ? { ...d, isLocked: false } : d));
          setQuizTargetId(null);
          alert("Unlocked! ❤️");
      } else {
          alert("Wrong answer! Try to remember our chats... 😢");
      }
  };

  // --- Letters Logic ---
  const handleCreateLetter = async (trigger: string) => {
      if (!partner) return;
      setIsGeneratingLetter(true);
      try {
          const letterData = await generateLoveLetter(partner.name, partner.description, trigger);
          const newLetter: TimeCapsuleLetter = {
              id: `letter_${Date.now()}`,
              title: letterData.title,
              trigger: trigger,
              content: letterData.content,
              isLocked: true // Locked until user clicks to open
          };
          setLetters(prev => [newLetter, ...prev]);
      } catch (e) {
          console.error(e);
      } finally {
          setIsGeneratingLetter(false);
      }
  };

  const openLetter = (id: string) => {
      setLetters(prev => prev.map(l => l.id === id ? { ...l, isLocked: false, openedAt: Date.now() } : l));
      setActiveLetter(letters.find(l => l.id === id) || null);
  };

  // --- Render Components ---

  // Renders the Diary List View
  const renderDiaryView = () => (
      <div className="flex-1 flex flex-col bg-[#fdfbf7] z-20">
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/cream-paper.png)' }}></div>
          
          <div className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-gray-300 overflow-hidden shadow-sm">
                          <img src={partner?.avatar} className="w-full h-full object-cover" />
                      </div>
                      <div>
                          <h2 className="font-serif font-bold text-gray-800">{partner?.name}'s Diary</h2>
                          <p className="text-xs text-gray-500 italic">"Secret thoughts about us..."</p>
                      </div>
                  </div>
                  <button 
                    onClick={handleGenerateDiary}
                    disabled={isGeneratingDiary}
                    className="bg-[#2c2c2e] text-white p-3 rounded-full shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                  >
                      {isGeneratingDiary ? <span className="animate-spin block">↻</span> : '✒️'}
                  </button>
              </div>

              {/* Entries List */}
              <div className="space-y-6 pb-20">
                  {diaries.length === 0 && (
                      <div className="text-center mt-20 opacity-50">
                          <div className="text-4xl mb-2">📖</div>
                          <p className="font-serif italic text-gray-600">The pages are empty.</p>
                          <p className="text-xs text-gray-400 mt-1">Tap the pen to let {partner?.name} write about today.</p>
                      </div>
                  )}

                  {diaries.map(entry => (
                      <div key={entry.id} className="bg-white p-6 shadow-sm border border-gray-100 relative overflow-hidden group animate-[fadeIn_0.5s]">
                          {/* Decorative Tape */}
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-pink-100/80 rotate-1 shadow-sm"></div>
                          
                          <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
                              <span className="font-serif text-lg font-bold text-gray-700">
                                  {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-2xl">{entry.mood}</span>
                          </div>
                          
                          {entry.isLocked ? (
                              <div className="py-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                  <div className="text-3xl mb-2">🔒</div>
                                  <p className="text-sm font-bold text-gray-500 mb-4">Locked by {partner?.name}</p>
                                  <button 
                                    onClick={() => setQuizTargetId(entry.id)}
                                    className="bg-pink-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md hover:bg-pink-600 transition-colors"
                                  >
                                      Take Quiz to Unlock
                                  </button>
                              </div>
                          ) : (
                              <p className="font-serif text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">
                                  {entry.content}
                              </p>
                          )}
                          
                          <div className="mt-4 text-right">
                              <button 
                                onClick={() => { if(confirm("Tear out this page?")) setDiaries(prev => prev.filter(d => d.id !== entry.id)); }}
                                className="text-gray-300 text-xs hover:text-red-400"
                              >
                                  Remove
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
          
          {/* QUIZ MODAL */}
          {quizTargetId && (
              <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-[fadeIn_0.2s]">
                  <div className="bg-white w-full rounded-2xl p-6 shadow-2xl animate-[scaleIn_0.2s_ease-out]">
                      {(() => {
                          const entry = diaries.find(d => d.id === quizTargetId);
                          if (!entry || !entry.quiz) return null;
                          return (
                              <>
                                  <div className="text-center mb-6">
                                      <div className="text-4xl mb-2">💘</div>
                                      <h3 className="font-bold text-gray-800 text-lg">Love Quiz</h3>
                                      <p className="text-xs text-gray-500 mt-1">Prove you know me to read my diary!</p>
                                  </div>
                                  <div className="mb-6 font-medium text-gray-700 text-center">
                                      "{entry.quiz.question}"
                                  </div>
                                  <div className="space-y-3">
                                      {entry.quiz.options.map((opt, i) => (
                                          <button 
                                            key={i}
                                            onClick={() => handleUnlockDiary(entry, i)}
                                            className="w-full p-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600 transition-all text-left active:scale-98"
                                          >
                                              {String.fromCharCode(65 + i)}. {opt}
                                          </button>
                                      ))}
                                  </div>
                                  <button onClick={() => setQuizTargetId(null)} className="mt-6 text-gray-400 text-xs w-full">Cancel</button>
                              </>
                          );
                      })()}
                  </div>
              </div>
          )}
      </div>
  );

  // Renders the Letters View
  const renderLettersView = () => (
      <div className="flex-1 bg-[#fff0f5] relative z-20 flex flex-col">
          {/* Active Letter View */}
          {activeLetter ? (
              <div className="absolute inset-0 bg-black/80 z-30 flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-[#fff9f0] w-full max-w-sm rounded-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh] animate-[scaleIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
                      {/* Floral decoration top */}
                      <div className="h-24 bg-cover bg-center opacity-80" style={{ backgroundImage: 'url(https://img.freepik.com/free-vector/hand-drawn-floral-background_23-2148123681.jpg?w=1380&t=st=1708800000~exp=1708800600~hmac=fakeurl)' }}>
                          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#fff9f0]"></div>
                      </div>
                      
                      <div className="px-8 pb-8 pt-2 flex-1 overflow-y-auto no-scrollbar relative">
                          {/* Close Button */}
                          <button onClick={() => setActiveLetter(null)} className="absolute top-0 right-4 text-gray-400 text-2xl">×</button>

                          <div className="font-handwriting text-gray-800">
                              <h2 className="text-xl mb-6 font-bold text-pink-800">{activeLetter.title}</h2>
                              <div className="text-lg leading-loose whitespace-pre-wrap">
                                  {activeLetter.content}
                              </div>
                          </div>
                      </div>

                      <div className="p-6 bg-[#fff9f0] border-t border-pink-100 flex justify-center">
                          <button 
                            onClick={() => setActiveLetter(null)}
                            className="bg-gradient-to-r from-pink-300 to-rose-300 text-white px-8 py-2 rounded-full font-bold shadow-md active:scale-95 transition-transform"
                          >
                              💌 Receive Reply
                          </button>
                      </div>
                  </div>
              </div>
          ) : (
              <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
                  <div className="mb-6">
                      <h2 className="text-xl font-bold text-pink-900 font-serif mb-1">Time Capsule</h2>
                      <p className="text-xs text-pink-400">Letters for special moments.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                      {['After 1st Fight', 'Anniversary', 'When Missing Me', 'Random Surprise'].map(trigger => (
                          <button 
                            key={trigger}
                            onClick={() => handleCreateLetter(trigger)}
                            disabled={isGeneratingLetter}
                            className="bg-white p-4 rounded-xl shadow-sm border border-pink-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
                          >
                              <span className="text-2xl">✉️</span>
                              <span className="text-[10px] font-bold text-gray-600 text-center">{trigger}</span>
                          </button>
                      ))}
                  </div>

                  <div className="space-y-3">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Mailbox</h3>
                      {letters.length === 0 && <div className="text-center text-gray-400 text-xs py-8">No letters yet. Generate one above!</div>}
                      {letters.map(l => (
                          <div 
                            key={l.id} 
                            onClick={() => openLetter(l.id)}
                            className={`p-4 rounded-xl shadow-sm flex items-center gap-4 cursor-pointer transition-all ${l.isLocked ? 'bg-gray-100 opacity-80' : 'bg-white border-l-4 border-pink-400'}`}
                          >
                              <div className="text-2xl">{l.isLocked ? '🔒' : '📨'}</div>
                              <div className="flex-1">
                                  <div className="font-bold text-sm text-gray-800">{l.title}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">Trigger: {l.trigger}</div>
                              </div>
                              {!l.isLocked && <div className="text-[10px] text-pink-400 font-bold bg-pink-50 px-2 py-1 rounded">READ</div>}
                          </div>
                      ))}
                  </div>
                  
                  {isGeneratingLetter && (
                      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-xs backdrop-blur-md animate-pulse">
                          Writing letter... ✍️
                      </div>
                  )}
              </div>
          )}
      </div>
  );

  // --- Main Logic Checks ---
  if (!isOpen) return null;

  // Invitation Flow (Same as before)
  if (!partner) {
      // ... (Same invitation code as previous version)
      return (
        <div className="absolute inset-0 bg-white flex flex-col z-50 app-transition">
            {/* ... invitation UI ... */}
             <div className="h-24 bg-pink-50 pt-12 px-4 flex items-center justify-between shadow-sm">
                <button onClick={onBack} className="text-gray-500 font-medium">Cancel</button>
                <h1 className="text-lg font-bold text-pink-500">Open Couple Space</h1>
                <div className="w-12"></div>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-8 bg-gradient-to-b from-pink-50 to-white">
                {inviteStep === 'select' && (
                    <div className="w-full max-w-sm animate-[fadeIn_0.5s_ease-out]">
                        {/* ... */}
                        <div className="text-center mb-8">
                            <div className="w-24 h-24 bg-pink-100 rounded-full mx-auto flex items-center justify-center text-4xl mb-4 shadow-inner">💌</div>
                            <h2 className="text-xl font-bold text-gray-800">Invite a Partner</h2>
                            <p className="text-gray-500 text-sm mt-2">Select a character from your contacts.</p>
                        </div>
                        <div className="space-y-4">
                             {/* ... list ... */}
                             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                    {availableCandidates.map(char => (
                                        <div 
                                            key={char.id} 
                                            onClick={() => setSelectedCharId(char.id)} 
                                            className={`flex flex-col items-center gap-2 min-w-[70px] cursor-pointer p-2 rounded-xl transition-all ${selectedCharId === char.id ? 'bg-pink-50 border border-pink-200 scale-105' : 'opacity-60 grayscale hover:grayscale-0'}`}
                                        >
                                            <img src={char.avatar} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                                            <span className="text-[10px] font-bold truncate w-full text-center">{char.name.split(' ')[0]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <textarea 
                                    value={inviteNote} 
                                    onChange={(e) => setInviteNote(e.target.value)} 
                                    placeholder="Write a sweet confession..." 
                                    className="w-full h-24 text-sm resize-none outline-none text-gray-700 placeholder-gray-300" 
                                />
                            </div>
                            <button 
                                onClick={handleInvite} 
                                disabled={availableCandidates.length === 0}
                                className="w-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                            >
                                Send Invitation 💘
                            </button>
                        </div>
                    </div>
                )}
                {inviteStep === 'sending' && <div className="text-center animate-pulse"><h3 className="text-lg font-bold text-gray-700">Sending...</h3></div>}
                {inviteStep === 'result' && inviteReaction && (
                    <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-pink-100 text-center animate-[scaleIn_0.3s_ease-out]">
                         <h3 className="text-xl font-bold text-gray-800 mb-2">{inviteReaction.accepted ? 'She said Yes!' : 'Declined'}</h3>
                         <p className="text-gray-600 italic mb-8">"{inviteReaction.reply}"</p>
                         <button onClick={handleEnterSpace} className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl">{inviteReaction.accepted ? 'Enter Space' : 'Try Again'}</button>
                    </div>
                )}
            </div>
        </div>
      );
  }

  // --- Main Interface ---
  const containerStyle = wallpaper ? { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#fff0f5' };

  return (
    <div className="absolute inset-0 flex flex-col z-50 app-transition text-gray-800" style={activeView === 'home' ? containerStyle : { backgroundColor: '#fdfbf7' }}>
       {/* Background Overlay */}
       {activeView === 'home' && wallpaper && <div className="absolute inset-0 bg-white/30 backdrop-blur-sm z-0"></div>}

       {/* Header */}
       <div className={`h-24 pt-12 px-4 flex items-center justify-between z-10 ${activeView !== 'home' ? 'bg-[#fdfbf7] border-b border-gray-100' : ''}`}>
          <button 
            onClick={() => activeView !== 'home' ? setActiveView('home') : onBack()} 
            className="w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-gray-700"
          >
            <span className="text-xl">‹</span>
          </button>
          <h1 className="text-lg font-bold text-gray-800 tracking-wide drop-shadow-sm">
              {activeView === 'diary' ? 'Memory Book' : activeView === 'letters' ? 'Time Capsule' : 'Couple Space'}
          </h1>
          {activeView === 'home' ? (
              <button onClick={() => setShowSettings(true)} className="w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-gray-700">
                <span>⚙️</span>
              </button>
          ) : <div className="w-10"></div>}
       </div>

       {/* View Switcher */}
       {activeView === 'diary' ? renderDiaryView() : 
        activeView === 'letters' ? renderLettersView() : (
           <div className="flex-1 overflow-y-auto no-scrollbar pb-8 px-4 space-y-5 z-10 animate-[fadeIn_0.3s]">
              
              {/* 1. Avatars & Days */}
              <div className="flex justify-between items-center px-4 mt-2">
                 <div className="flex flex-col items-center">
                     <div className="w-16 h-16 rounded-full border-2 border-white shadow-md overflow-hidden bg-gray-200">
                         <img src="https://ui-avatars.com/api/?name=Me&background=random" className="w-full h-full object-cover" />
                     </div>
                     <span className="text-xs font-bold text-gray-600 mt-1">Me</span>
                 </div>
                 
                 <div className="flex flex-col items-center">
                     <div className="text-3xl font-bold text-pink-500 drop-shadow-sm">❤️</div>
                     <div className="text-2xl font-bold text-gray-800 leading-none mt-1">{daysTogether}</div>
                     <div className="text-[10px] text-gray-500 font-medium">Days</div>
                 </div>

                 <div className="flex flex-col items-center">
                     <div className="w-16 h-16 rounded-full border-2 border-white shadow-md overflow-hidden bg-gray-200 relative">
                         <img src={partner.avatar} className="w-full h-full object-cover" />
                         {isPartnerReplying && (
                             <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                 <span className="animate-pulse text-white text-xs">...</span>
                             </div>
                         )}
                     </div>
                     <span className="text-xs font-bold text-gray-600 mt-1">{partner.name.split(' ')[0]}</span>
                 </div>
              </div>
              
              <div className="text-center text-xs text-gray-500 bg-white/40 backdrop-blur-sm py-1 px-3 rounded-full mx-auto w-fit">
                  📅 {startDate.toLocaleDateString()}
              </div>

              {/* 2. Intimacy Level */}
              <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50">
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-600 flex items-center gap-1">💖 Intimacy</span>
                      <span className="bg-pink-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Lv.{Math.floor(intimacyExp / 100) + 1}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-400 rounded-full transition-all duration-1000" style={{ width: `${intimacyExp % 100}%` }}></div>
                  </div>
                  <div className="flex justify-end mt-1">
                      <span className="text-[10px] text-gray-400">{intimacyExp % 100} / 100</span>
                  </div>
              </div>

              {/* 3. Feature Grid */}
              <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: '📅', label: 'Calendar', app: AppID.Calendar, action: () => onOpenExternalApp && onOpenExternalApp(AppID.Calendar) },
                    { icon: '📱', label: 'Our Phone', app: AppID.Phone, action: () => onOpenExternalApp && onOpenExternalApp(AppID.Phone) },
                    { icon: '🔐', label: 'Diary', app: undefined, action: () => setActiveView('diary') },
                    { icon: '💌', label: 'Capsule', app: undefined, action: () => setActiveView('letters') }
                  ].map((item, i) => (
                      <div 
                        key={i} 
                        onClick={item.action}
                        className="flex flex-col items-center gap-1 bg-white/60 backdrop-blur-md rounded-xl p-3 shadow-sm active:scale-95 transition-transform"
                      >
                          <span className="text-xl">{item.icon}</span>
                          <span className="text-[9px] font-bold text-gray-600">{item.label}</span>
                      </div>
                  ))}
              </div>

              {/* 4. Mood Check-in Area */}
              <div className="flex gap-3">
                 {/* Left: User */}
                 <div className="flex-1 bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50 flex flex-col items-center justify-between min-h-[140px]">
                     <div className="text-xs font-bold text-gray-500 mb-2 w-full">Today's Mood</div>
                     {todayCheckIn ? (
                         <div className="flex flex-col items-center">
                             <span className="text-4xl mb-2">{todayCheckIn.mood}</span>
                             <span className="text-[10px] text-gray-500 line-clamp-2 text-center">"{todayCheckIn.note}"</span>
                         </div>
                     ) : (
                         <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl opacity-50">?</div>
                     )}
                     
                     {!todayCheckIn ? (
                         <button 
                            onClick={() => setShowCheckInModal(true)}
                            className="mt-3 bg-pink-400 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm w-full"
                         >
                            Check In
                         </button>
                     ) : (
                         <div className="mt-3 text-[10px] text-pink-400 font-bold bg-pink-50 px-3 py-1 rounded-full">Completed</div>
                     )}
                     <div className="text-[10px] text-gray-400 mt-2 font-medium">Me</div>
                 </div>

                 {/* Right: Partner */}
                 <div className="flex-1 bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50 flex flex-col items-center justify-between min-h-[140px]">
                     <div className="text-xs font-bold text-gray-500 mb-2 w-full text-right">Reply</div>
                     <div className="flex flex-col items-center">
                         <div className="relative">
                            <img src={partner.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                            {isPartnerReplying && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>}
                         </div>
                         <div className="mt-2 text-[10px] text-gray-600 text-center bg-white/50 p-2 rounded-lg min-h-[40px] flex items-center justify-center w-full">
                             {todayCheckIn?.partnerReply ? (
                                 <span className="line-clamp-3">{todayCheckIn.partnerReply}</span>
                             ) : (
                                 <span className="text-gray-400 italic">Waiting...</span>
                             )}
                         </div>
                     </div>
                     <div className="text-[10px] text-gray-400 mt-2 font-medium text-right w-full">{partner.name.split(' ')[0]}</div>
                 </div>
              </div>

              {/* 5. Return to Desktop Button */}
              <div className="mt-6 mb-8 px-4">
                  <button 
                    onClick={onBack}
                    className="w-full bg-white/50 hover:bg-white/70 backdrop-blur-md text-gray-700 font-bold py-3 rounded-2xl shadow-sm border border-white/50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                      <span>🏠</span> Return to Desktop
                  </button>
              </div>

           </div>
       )}

       {/* Settings Modal */}
       {showSettings && (
           <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-6">
               <div className="bg-white w-full rounded-2xl p-5 shadow-xl">
                   <h3 className="font-bold text-gray-800 mb-4">Space Settings</h3>
                   
                   <div className="space-y-4">
                       <div>
                           <label className="text-xs font-bold text-gray-500 uppercase">Start Date</label>
                           <input type="date" className="w-full mt-1 border p-2 rounded-lg text-sm" onChange={handleDateChange} value={startDate.toISOString().split('T')[0]} />
                       </div>
                       <div>
                           <label className="text-xs font-bold text-gray-500 uppercase">Wallpaper</label>
                           <input type="file" className="w-full mt-1 text-sm" accept="image/*" onChange={handleWallpaperChange} />
                       </div>
                   </div>

                   <button onClick={() => setShowSettings(false)} className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl mt-6">Close</button>
               </div>
           </div>
       )}

       {/* Check-In Modal */}
       {showCheckInModal && (
           <div className="absolute inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center sm:p-6">
               <div className="bg-white w-full sm:max-w-xs rounded-t-[32px] sm:rounded-3xl p-6 shadow-xl animate-[slideUp_0.3s_ease-out]">
                   <h3 className="font-bold text-center text-gray-800 mb-6">How are you feeling?</h3>
                   
                   <div className="grid grid-cols-4 gap-4 mb-6">
                       {MOOD_EMOJIS.map(emoji => (
                           <button 
                            key={emoji}
                            onClick={() => setSelectedMood(emoji)}
                            className={`text-2xl h-12 rounded-xl flex items-center justify-center transition-all ${selectedMood === emoji ? 'bg-pink-100 scale-110 border-2 border-pink-300' : 'bg-gray-50'}`}
                           >
                               {emoji}
                           </button>
                       ))}
                   </div>

                   <textarea 
                    value={checkInNote}
                    onChange={(e) => setCheckInNote(e.target.value)}
                    placeholder="Add a note for your partner..." 
                    className="w-full h-20 bg-gray-50 rounded-xl p-3 text-sm mb-6 resize-none focus:outline-none focus:ring-2 focus:ring-pink-100"
                   />

                   <div className="flex gap-3">
                       <button onClick={() => setShowCheckInModal(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Cancel</button>
                       <button onClick={submitCheckIn} className="flex-1 bg-pink-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-pink-200">Done</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default CoupleSpaceApp;
