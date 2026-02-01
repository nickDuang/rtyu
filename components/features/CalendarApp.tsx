
import React, { useState, useEffect, useRef } from 'react';
import { generateDiaryReply, generatePeriodCareMessage } from '../../services/geminiService';
import { Contact } from '../../types';

interface CalendarAppProps {
  onBack: () => void;
  isOpen: boolean;
}

interface DiaryEntry {
    dateStr: string;
    userContent: string;
    partnerContent: string | null;
    timestamp: number;
}

interface PeriodSettings {
    enabled: boolean;
    days: [number, number]; // Two days of the month (1-31)
    contactId?: string; // ID of the contact chosen for reminders
}

type CalendarView = 'calendar' | 'mailbox' | 'compose';

const CalendarApp: React.FC<CalendarAppProps> = ({ onBack, isOpen }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // --- View Management ---
  const [view, setView] = useState<CalendarView>('calendar');
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // --- Data State ---
  const [diaryEntries, setDiaryEntries] = useState<Record<string, DiaryEntry>>({});
  const [periodDates, setPeriodDates] = useState<Set<string>>(new Set());
  const [isPeriodMode, setIsPeriodMode] = useState(false);
  
  // --- Reminder State ---
  const [showReminderConfig, setShowReminderConfig] = useState(false);
  const [showPeriodAlert, setShowPeriodAlert] = useState(false);
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings>({ enabled: false, days: [1, 15] });
  const [partner, setPartner] = useState<Contact | null>(null);
  const [allContacts, setAllContacts] = useState<Contact[]>([]); // Load all contacts
  
  // Dynamic Message State
  const [periodMessage, setPeriodMessage] = useState<string>('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  // --- Composition State ---
  const [composeText, setComposeText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // --- UI State (Mailbox) ---
  const [openedEnvelope, setOpenedEnvelope] = useState<'user' | 'partner' | null>(null);

  // Load Data
  useEffect(() => {
    if (!isOpen) return;

    // Load Period Data
    const savedPeriod = localStorage.getItem('ephone_calendar_period');
    if (savedPeriod) setPeriodDates(new Set(JSON.parse(savedPeriod)));

    // Load Diary Data
    const savedDiary = localStorage.getItem('ephone_calendar_diary');
    if (savedDiary) setDiaryEntries(JSON.parse(savedDiary));

    // Load Partner Data (Default Couple)
    const savedPartner = localStorage.getItem('ephone_couple_partner');
    if (savedPartner) setPartner(JSON.parse(savedPartner));

    // Load All Contacts (For selection)
    const savedContacts = localStorage.getItem('ephone_contacts');
    if (savedContacts) setAllContacts(JSON.parse(savedContacts));

    // Load Period Settings
    const savedSettings = localStorage.getItem('ephone_period_settings');
    if (savedSettings) {
        setPeriodSettings(JSON.parse(savedSettings));
    }
  }, [isOpen]);

  // Check for Reminder Trigger on Open/Settings Change
  useEffect(() => {
      if (!isOpen || !periodSettings.enabled) return;

      const today = new Date();
      const dayOfMonth = today.getDate();
      const todayStr = today.toDateString();
      const lastAlert = localStorage.getItem('ephone_period_last_alert');

      // Check if today matches one of the reminder days
      if (periodSettings.days.includes(dayOfMonth)) {
          // Check if we already alerted today
          if (lastAlert !== todayStr) {
              setShowPeriodAlert(true);
              localStorage.setItem('ephone_period_last_alert', todayStr);
          }
      }
  }, [isOpen, periodSettings]);

  // Save Period Data
  useEffect(() => {
      if (periodDates.size > 0 || isPeriodMode) {
          localStorage.setItem('ephone_calendar_period', JSON.stringify(Array.from(periodDates)));
      }
  }, [periodDates]);

  // Save Diary Data
  useEffect(() => {
      if (Object.keys(diaryEntries).length > 0) {
          localStorage.setItem('ephone_calendar_diary', JSON.stringify(diaryEntries));
      }
  }, [diaryEntries]);

  // Save Settings
  useEffect(() => {
      localStorage.setItem('ephone_period_settings', JSON.stringify(periodSettings));
  }, [periodSettings]);

  // --- Helpers ---
  const toDateStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Determine which contact is the "Reminder Character"
  const getReminderContact = () => {
      if (periodSettings.contactId) {
          return allContacts.find(c => c.id === periodSettings.contactId) || partner;
      }
      return partner;
  };

  const reminderContact = getReminderContact();

  // --- Generate Message Effect ---
  useEffect(() => {
      if (showPeriodAlert && reminderContact) {
          // Reset message
          setPeriodMessage('');
          setIsGeneratingMessage(true);

          generatePeriodCareMessage(reminderContact.name, reminderContact.description)
            .then(msg => setPeriodMessage(msg))
            .catch(() => setPeriodMessage("Take care of yourself today. No cold drinks, okay? ❤️"))
            .finally(() => setIsGeneratingMessage(false));
      }
  }, [showPeriodAlert]);

  // --- Actions ---

  const handleDateClick = (dateStr: string) => {
      if (isPeriodMode) {
          const newSet = new Set(periodDates);
          if (newSet.has(dateStr)) newSet.delete(dateStr);
          else newSet.add(dateStr);
          setPeriodDates(newSet);
      } else {
          // Open Mailbox
          setSelectedDateStr(dateStr);
          setOpenedEnvelope(null); // Reset mailbox state
          setView('mailbox');
      }
  };

  const handleExchange = async () => {
      if (!composeText.trim() || !selectedDateStr) return;
      
      setIsSending(true);

      // 1. Save User Entry
      const newEntry: DiaryEntry = {
          dateStr: selectedDateStr,
          userContent: composeText,
          partnerContent: null, // Pending
          timestamp: Date.now()
      };

      setDiaryEntries(prev => ({ ...prev, [selectedDateStr]: newEntry }));
      
      // 2. Trigger AI Reply
      const partnerName = partner ? partner.name : "Partner";
      const partnerPersona = partner ? partner.description : "A loving partner.";

      try {
          // Simulate network delay for "ritual" feel
          await new Promise(r => setTimeout(r, 1500));
          
          const reply = await generateDiaryReply(composeText, partnerName, partnerPersona);
          
          setDiaryEntries(prev => ({
              ...prev,
              [selectedDateStr]: {
                  ...prev[selectedDateStr],
                  partnerContent: reply
              }
          }));
      } catch (e) {
          console.error(e);
      } finally {
          setIsSending(false);
          setComposeText('');
          setView('mailbox');
      }
  };

  const handleDismissAlert = () => {
      setShowPeriodAlert(false);
      setPeriodMessage(''); // Clear for next time
  };

  // --- Render Components ---

  const renderCalendar = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate);
    const startDay = firstDayOfMonth(currentDate);
    
    // Empty cells
    for (let i = 0; i < startDay; i++) {
        days.push(<div key={`empty-${i}`} className="w-full aspect-square"></div>);
    }

    for (let i = 1; i <= totalDays; i++) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
        const dateStr = toDateStr(d);
        const isPeriod = periodDates.has(dateStr);
        const hasDiary = !!diaryEntries[dateStr];
        const isToday = toDateStr(new Date()) === dateStr;
        const isReminderDay = periodSettings.enabled && periodSettings.days.includes(i);

        days.push(
            <div 
                key={i} 
                onClick={() => handleDateClick(dateStr)}
                className="w-full aspect-square relative flex items-center justify-center cursor-pointer"
            >
                <div className={`
                    relative w-9 h-9 flex items-center justify-center text-sm rounded-full transition-all
                    ${isToday ? 'bg-black text-white font-bold shadow-md' : 'text-gray-700'}
                    ${isPeriodMode && isPeriod ? 'ring-2 ring-rose-300 bg-rose-50' : ''}
                    ${isReminderDay && !isPeriodMode && !isToday ? 'bg-rose-50 text-rose-500 font-medium' : ''}
                `}>
                    {i}
                    {/* Visual Indicators */}
                    {!isPeriodMode && hasDiary && (
                        <div className="absolute -bottom-1 text-[10px]">💌</div>
                    )}
                    {isPeriod && !isPeriodMode && (
                        <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-rose-400 rounded-full"></div>
                    )}
                    {isReminderDay && (
                        <div className="absolute top-0 right-0 text-[8px] leading-none text-rose-500 font-bold">•</div>
                    )}
                </div>
            </div>
        );
    }
    return days;
  };

  // --- Render Mailbox View ---
  const renderMailbox = () => {
      const entry = selectedDateStr ? diaryEntries[selectedDateStr] : null;
      const partnerName = partner?.name || "Partner";

      // Case 1: Opened Letter View
      if (openedEnvelope) {
          const isUser = openedEnvelope === 'user';
          const content = isUser ? entry?.userContent : entry?.partnerContent;
          const author = isUser ? "Me" : partnerName;

          return (
              <div className="flex-1 bg-[#fdfbf7] p-6 flex flex-col animate-[fadeIn_0.5s]">
                  {/* Paper Texture UI */}
                  <div className="bg-white flex-1 shadow-sm border border-gray-100 p-8 relative overflow-hidden" 
                       style={{ 
                           backgroundImage: 'linear-gradient(#f1f1f1 1px, transparent 1px)', 
                           backgroundSize: '100% 2rem',
                           lineHeight: '2rem' 
                       }}>
                      <div className="text-right text-xs text-gray-400 mb-4 font-serif italic">
                          {selectedDateStr} • From {author}
                      </div>
                      <p className="font-serif text-gray-700 text-lg whitespace-pre-wrap">
                          {content}
                      </p>
                  </div>
                  <button 
                    onClick={() => setOpenedEnvelope(null)}
                    className="mt-6 self-center text-gray-400 hover:text-gray-600 font-medium"
                  >
                      Fold & Close
                  </button>
              </div>
          );
      }

      // Case 2: Mailbox View (Envelopes)
      return (
          <div className="flex-1 bg-[#f5f5f7] flex flex-col items-center justify-center p-6 relative">
              <div className="text-center mb-10">
                  <h2 className="font-serif text-2xl text-gray-800 mb-1">Exchange Box</h2>
                  <p className="text-xs text-gray-400 font-serif italic">{selectedDateStr}</p>
              </div>

              {entry ? (
                  <div className="w-full max-w-xs space-y-6">
                      {/* User's Envelope */}
                      <div 
                        onClick={() => setOpenedEnvelope('user')}
                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:-translate-y-1 transition-transform relative overflow-hidden group"
                      >
                           <div className="absolute top-0 left-0 w-1 h-full bg-blue-300"></div>
                           <div className="flex justify-between items-center">
                               <div>
                                   <span className="text-xs text-gray-400 uppercase tracking-widest block mb-1">From</span>
                                   <span className="font-serif text-lg text-gray-800">Me</span>
                               </div>
                               <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">✉️</span>
                           </div>
                      </div>

                      {/* Partner's Envelope */}
                      {entry.partnerContent ? (
                          <div 
                            onClick={() => setOpenedEnvelope('partner')}
                            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:-translate-y-1 transition-transform relative overflow-hidden group"
                          >
                               <div className="absolute top-0 left-0 w-1 h-full bg-pink-300"></div>
                               <div className="flex justify-between items-center">
                                   <div>
                                       <span className="text-xs text-gray-400 uppercase tracking-widest block mb-1">From</span>
                                       <span className="font-serif text-lg text-gray-800">{partnerName}</span>
                                   </div>
                                   <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">❤️</span>
                               </div>
                          </div>
                      ) : (
                          <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg text-center">
                              <p className="text-xs text-gray-400 italic">Waiting for reply...</p>
                          </div>
                      )}
                  </div>
              ) : (
                  // Empty State
                  <div className="text-center">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl shadow-sm mb-4 mx-auto">
                          📭
                      </div>
                      <p className="text-gray-500 font-serif mb-8">No letters exchanged today.</p>
                      <button 
                        onClick={() => setView('compose')}
                        className="bg-gray-900 text-white px-8 py-3 rounded-full font-serif italic text-lg shadow-lg hover:scale-105 transition-transform"
                      >
                          Write a Letter
                      </button>
                  </div>
              )}
          </div>
      );
  };

  // --- Render Compose View ---
  const renderCompose = () => {
      return (
          <div className="flex-1 bg-white flex flex-col relative animate-[fadeIn_0.3s]">
              {isSending && (
                  <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
                      <div className="animate-bounce text-4xl mb-2">🕊️</div>
                      <p className="font-serif text-gray-500 italic">Delivering your letter...</p>
                  </div>
              )}
              
              <div className="flex-1 p-8">
                  <div className="h-full flex flex-col">
                      <div className="text-xs text-gray-400 font-serif italic mb-6 text-center">
                          {selectedDateStr}
                      </div>
                      <textarea 
                        value={composeText}
                        onChange={(e) => setComposeText(e.target.value)}
                        placeholder="Write whatever is on your mind..."
                        className="flex-1 w-full resize-none outline-none font-serif text-lg text-gray-700 leading-relaxed placeholder:text-gray-300"
                        autoFocus
                      />
                  </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={handleExchange}
                    disabled={!composeText.trim()}
                    className="bg-black text-white px-6 py-2 rounded-full font-serif disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                      Exchange
                  </button>
              </div>
          </div>
      );
  };

  if (!isOpen) return null;

  const handleBack = () => {
      if (view === 'compose') setView('mailbox');
      else if (view === 'mailbox') setView('calendar');
      else onBack();
  };

  return (
    <div className="absolute inset-0 bg-white flex flex-col z-50 app-transition">
      {/* Header */}
      <div className="h-24 pt-12 px-6 flex items-center justify-between z-10 bg-white border-b border-gray-50">
          <button onClick={handleBack} className="text-gray-600 w-8 h-8 flex items-center justify-center">
              <span className="text-xl">‹</span>
          </button>
          
          <h1 className="font-serif text-lg text-gray-800 tracking-wide">
              {view === 'calendar' ? 'Memory Calendar' : 
               view === 'mailbox' ? 'Mailbox' : 'New Letter'}
          </h1>

          {view === 'calendar' ? (
             <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setShowReminderConfig(true)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 active:scale-95 transition-transform"
                >
                    <span className="text-lg">🔔</span>
                </button>
                 <button 
                    onClick={() => setIsPeriodMode(!isPeriodMode)}
                    className={`transition-all duration-300 w-8 h-8 flex items-center justify-center ${isPeriodMode ? 'text-rose-500 scale-110' : 'text-gray-300 opacity-50 grayscale hover:grayscale-0'}`}
                >
                    🌸
                </button>
            </div>
          ) : (
             <div className="w-8"></div>
          )}
      </div>

      {/* Main Content Switcher */}
      {view === 'calendar' && (
          <>
            <div className="px-6 py-4 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-light text-gray-800 tracking-tight">
                        {currentDate.toLocaleString('default', { month: 'long' })}
                    </h2>
                    <p className="text-gray-400 text-sm">{currentDate.getFullYear()}</p>
                </div>
                <div className="flex gap-4 pb-1">
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="text-gray-400">←</button>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="text-gray-400">→</button>
                </div>
            </div>

            <div className="px-4 pb-4">
                <div className="grid grid-cols-7 mb-2 text-xs text-gray-300 font-bold text-center uppercase tracking-wider">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>
                <div className="grid grid-cols-7 gap-y-2">
                    {renderCalendar()}
                </div>
            </div>

            {isPeriodMode && (
                <div className="text-center mt-4 animate-[fadeIn_0.3s]">
                    <p className="text-xs text-rose-400 font-medium tracking-wide">Select days to mark privately.</p>
                </div>
            )}
            
            {/* Bottom Decoration for Calendar View */}
            <div className="flex-1 bg-gray-50 relative overflow-hidden mt-4 rounded-t-[40px] shadow-inner p-8 flex flex-col items-center justify-center text-center">
                <span className="text-4xl mb-3 opacity-80">💌</span>
                <p className="font-serif text-gray-500 text-sm italic max-w-xs">
                    "Every day is a letter waiting to be written."
                </p>
                <p className="text-xs text-gray-400 mt-2">Tap a date to open the Exchange Diary.</p>
            </div>
          </>
      )}

      {view === 'mailbox' && renderMailbox()}
      {view === 'compose' && renderCompose()}

      {/* --- Configuration Modal --- */}
      {showReminderConfig && (
          <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Monthly Reminder</h3>
                  <p className="text-gray-500 text-sm mb-6">Receive a caring reminder on two specific days each month.</p>
                  
                  {/* Select Contact */}
                  <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Reminder Character</label>
                      <select 
                          value={periodSettings.contactId || ''} 
                          onChange={(e) => setPeriodSettings(p => ({ ...p, contactId: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm"
                      >
                          <option value="">{partner ? `${partner.name} (Partner)` : "Select a contact..."}</option>
                          {allContacts.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                      <span className="font-medium text-gray-700">Enable Reminders</span>
                      <button 
                        onClick={() => setPeriodSettings(p => ({ ...p, enabled: !p.enabled }))}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${periodSettings.enabled ? 'bg-rose-400' : 'bg-gray-300'}`}
                      >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${periodSettings.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </button>
                  </div>

                  {periodSettings.enabled && (
                      <div className="grid grid-cols-2 gap-4 mb-8">
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Day 1</label>
                              <select 
                                value={periodSettings.days[0]} 
                                onChange={(e) => setPeriodSettings(p => ({ ...p, days: [parseInt(e.target.value), p.days[1]] }))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm"
                              >
                                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                                      <option key={d} value={d}>{d}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Day 2</label>
                              <select 
                                value={periodSettings.days[1]} 
                                onChange={(e) => setPeriodSettings(p => ({ ...p, days: [p.days[0], parseInt(e.target.value)] }))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm"
                              >
                                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                                      <option key={d} value={d}>{d}</option>
                                  ))}
                              </select>
                          </div>
                      </div>
                  )}

                  <button 
                    onClick={() => setShowReminderConfig(false)}
                    className="w-full bg-black text-white py-3 rounded-xl font-bold"
                  >
                      Save Settings
                  </button>
              </div>
          </div>
      )}

      {/* --- Alert Popup (Styled based on screenshot) --- */}
      {showPeriodAlert && (
          <div className="absolute inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-[fadeIn_0.3s]">
              <div className="w-full max-w-[320px] bg-white rounded-3xl overflow-hidden shadow-2xl animate-[scaleIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
                  {/* Header */}
                  <div className="bg-black text-white text-center py-5">
                      <h2 className="text-xs font-bold tracking-[0.2em] uppercase">Monthly Reminder</h2>
                  </div>
                  
                  {/* Content */}
                  <div className="p-8 flex flex-col items-center">
                      {/* Avatars */}
                      <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden grayscale opacity-50">
                              <img src="https://picsum.photos/200?random=1" className="w-full h-full object-cover"/>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden grayscale opacity-70">
                               <img src="https://picsum.photos/200?random=2" className="w-full h-full object-cover"/>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden grayscale opacity-50">
                               <img src="https://picsum.photos/200?random=3" className="w-full h-full object-cover"/>
                          </div>
                          {/* Main Active Avatar with Indicator */}
                          <div className="relative">
                              <div className="w-14 h-14 rounded-full border-2 border-black overflow-hidden shadow-lg">
                                  <img src={reminderContact?.avatar || "https://ui-avatars.com/api/?name=User"} className="w-full h-full object-cover"/>
                              </div>
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full"></div>
                          </div>
                      </div>

                      {/* Name */}
                      <div className="self-start w-full text-left mb-3">
                          <span className="text-xs font-bold text-gray-400">{reminderContact?.name || "Partner"}</span>
                      </div>

                      {/* Message Body - Dynamic AI Text */}
                      <div className="text-sm text-gray-800 leading-relaxed font-medium mb-8 text-left w-full min-h-[60px] relative">
                          {isGeneratingMessage ? (
                              <div className="flex items-center gap-2 text-gray-400 italic">
                                  <span className="animate-pulse">Writing care message...</span>
                              </div>
                          ) : (
                              periodMessage || "Take care of yourself today. No cold drinks, okay? ❤️"
                          )}
                      </div>

                      {/* Button */}
                      <button 
                        onClick={handleDismissAlert}
                        className="bg-black text-white w-full py-3.5 rounded-full text-sm font-bold active:scale-95 transition-transform"
                      >
                          I received it
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default CalendarApp;
