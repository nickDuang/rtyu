
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
                      <div className="animate-bounce text-4xl mb-4">🕊️</div>
                      <p className="text-gray-500 font-serif">Delivering to {partner?.name}...</p>
                  </div>
              )}
              
              <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-4 text-xs text-gray-400 uppercase tracking-widest text-center">To {partner?.name || 'My Love'}</div>
                  <textarea 
                      value={composeText}
                      onChange={(e) => setComposeText(e.target.value)}
                      placeholder="Write your thoughts here..."
                      className="flex-1 w-full resize-none outline-none font-serif text-lg text-gray-700 leading-loose placeholder-gray-300"
                      autoFocus
                  />
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={handleExchange}
                    disabled={!composeText.trim() || isSending}
                    className="bg-black text-white px-8 py-3 rounded-full font-serif font-bold shadow-lg disabled:opacity-50 hover:bg-gray-800 transition-colors"
                  >
                      Send Letter
                  </button>
              </div>
          </div>
      );
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col app-transition">
        
        {/* Header */}
        <div className="h-24 pt-12 px-6 flex items-center justify-between bg-white border-b border-gray-100 z-10 sticky top-0">
            <button 
                onClick={() => {
                    if (view === 'calendar') onBack();
                    else setView('calendar');
                }}
                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
                ‹
            </button>
            <h1 className="font-serif font-bold text-xl text-gray-800">
                {view === 'calendar' ? currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' }) : 
                 view === 'mailbox' ? 'Mailbox' : 'New Letter'}
            </h1>
            <button 
                onClick={() => {
                    if(view === 'calendar') setIsPeriodMode(!isPeriodMode);
                    else { setShowReminderConfig(true); }
                }}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isPeriodMode ? 'bg-rose-100 text-rose-500' : 'text-gray-400 hover:bg-gray-100'}`}
            >
                {view === 'calendar' ? '🩸' : '⚙️'}
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
            {view === 'calendar' && (
                <div className="flex-1 overflow-y-auto p-4 animate-[fadeIn_0.3s]">
                    <div className="grid grid-cols-7 mb-4 text-center">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                            <div key={d} className="text-xs font-bold text-gray-300 py-2">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-4 justify-items-center">
                        {renderCalendar()}
                    </div>
                    
                    {/* Legend / Info */}
                    <div className="mt-8 px-4">
                        <div className="flex items-center gap-6 text-xs text-gray-400 justify-center">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-black rounded-full"></span>
                                <span>Today</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>💌</span>
                                <span>Diary Entry</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-rose-400 rounded-full"></span>
                                <span>Period</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'mailbox' && renderMailbox()}
            {view === 'compose' && renderCompose()}
        </div>

        {/* Period Alert Modal */}
        {showPeriodAlert && (
            <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 animate-[fadeIn_0.2s]">
                <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
                    <div className="flex items-start gap-4">
                        <div className="relative">
                            <img src={reminderContact?.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                            <div className="absolute -bottom-1 -right-1 bg-red-400 text-white text-[10px] px-1.5 py-0.5 rounded-full border border-white">❤️</div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-sm mb-1">{reminderContact?.name}</h3>
                            <div className="bg-pink-50 p-3 rounded-xl rounded-tl-none text-xs text-gray-600 leading-relaxed relative">
                                {isGeneratingMessage ? <span className="animate-pulse">Thinking...</span> : periodMessage}
                            </div>
                        </div>
                    </div>
                    <button onClick={handleDismissAlert} className="mt-4 w-full bg-pink-100 text-pink-600 font-bold py-2 rounded-xl text-xs hover:bg-pink-200">
                        Thanks, I will!
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default CalendarApp;
