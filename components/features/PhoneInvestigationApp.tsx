
import React, { useState, useEffect } from 'react';
import { Contact, QuestionBoxItem } from '../../types';
import { generateCharacterPhoneContent, PhoneContent, generateCharacterQuestion, answerUserQuestion } from '../../services/geminiService';

interface PhoneInvestigationAppProps {
  onBack: () => void;
  isOpen: boolean;
}

type InnerAppID = 'home' | 'wechat' | 'album' | 'notes' | 'question_box';

const PhoneInvestigationApp: React.FC<PhoneInvestigationAppProps> = ({ onBack, isOpen }) => {
  // --- State ---
  const [partner, setPartner] = useState<Contact | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [currentApp, setCurrentApp] = useState<InnerAppID>('home');
  const [shake, setShake] = useState(false);
  
  // AI Generated Data State
  const [phoneData, setPhoneData] = useState<PhoneContent | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Question Box State
  const [qBoxItems, setQBoxItems] = useState<QuestionBoxItem[]>(() => {
      const saved = localStorage.getItem('ephone_question_box');
      return saved ? JSON.parse(saved) : [];
  });
  const [qBoxInput, setQBoxInput] = useState('');
  const [isQBoxLoading, setIsQBoxLoading] = useState(false);
  const [qBoxReplyInput, setQBoxReplyInput] = useState(''); // For user replying to char
  const [answeringId, setAnsweringId] = useState<string | null>(null);

  // Load Partner on Open
  useEffect(() => {
    if (isOpen) {
        const savedPartner = localStorage.getItem('ephone_couple_partner');
        if (savedPartner) {
            const parsedPartner = JSON.parse(savedPartner);
            setPartner(parsedPartner);
            
            const cacheKey = `ephone_investigation_data_${parsedPartner.id}`;
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                setPhoneData(JSON.parse(cachedData));
            } else {
                setIsLoadingData(true);
                generateCharacterPhoneContent(parsedPartner.name, parsedPartner.description)
                    .then(data => { if (data) { setPhoneData(data); localStorage.setItem(cacheKey, JSON.stringify(data)); } })
                    .finally(() => setIsLoadingData(false));
            }
        } else {
            setPartner(null);
        }
        setIsLocked(false);
        setPasscode('');
        setCurrentApp('home');
    }
  }, [isOpen]);

  useEffect(() => {
      localStorage.setItem('ephone_question_box', JSON.stringify(qBoxItems));
  }, [qBoxItems]);

  // --- Handlers ---
  const handleNumClick = (num: string) => {
      if (passcode.length < 4) {
          const newPass = passcode + num;
          setPasscode(newPass);
          if (newPass.length === 4) checkPasscode(newPass);
      }
  };

  const checkPasscode = (code: string) => {
      if (code === '5200' || code === '1314') {
          setTimeout(() => setIsLocked(false), 200);
      } else {
          setShake(true);
          setTimeout(() => { setShake(false); setPasscode(''); }, 500);
      }
  };

  const handleDelete = () => setPasscode(prev => prev.slice(0, -1));

  const handleRegenerate = async () => {
      if (!partner) return;
      if (confirm("Reset current phone data and generate new content?")) {
          setIsLoadingData(true);
          const data = await generateCharacterPhoneContent(partner.name, partner.description);
          if (data) {
              setPhoneData(data);
              localStorage.setItem(`ephone_investigation_data_${partner.id}`, JSON.stringify(data));
          }
          setIsLoadingData(false);
      }
  };

  // --- Question Box Logic ---
  
  // 1. User Asks Character
  const handleUserAsk = async () => {
      if (!qBoxInput.trim() || !partner) return;
      setIsQBoxLoading(true);
      
      const question = qBoxInput;
      setQBoxInput('');

      try {
          const answer = await answerUserQuestion(partner.name, partner.description, question);
          const newItem: QuestionBoxItem = {
              id: `q_${Date.now()}`,
              type: 'user_ask',
              question: question,
              answer: answer,
              timestamp: Date.now(),
              isAnonymous: true
          };
          setQBoxItems(prev => [newItem, ...prev]);
      } catch (e) {
          alert("Failed to get answer.");
      } finally {
          setIsQBoxLoading(false);
      }
  };

  // 2. Character Asks User (Triggered by user button for now)
  const handleTriggerCharAsk = async () => {
      if (!partner) return;
      setIsQBoxLoading(true);
      try {
          // Get chat context if available (simple read from localstorage for context)
          const savedChats = localStorage.getItem('ephone_chats');
          let chatContext = "";
          if (savedChats) {
              const chats: any[] = JSON.parse(savedChats);
              const pChat = chats.find(c => c.contactId === partner.id);
              if (pChat) chatContext = pChat.messages.slice(-5).map((m: any) => m.content).join('\n');
          }

          const question = await generateCharacterQuestion(partner.name, partner.description, chatContext);
          const newItem: QuestionBoxItem = {
              id: `q_${Date.now()}`,
              type: 'char_ask',
              question: question,
              answer: '', // Pending user reply
              timestamp: Date.now(),
              isAnonymous: true // Character pretends to be anon
          };
          setQBoxItems(prev => [newItem, ...prev]);
      } catch (e) {
          console.error(e);
      } finally {
          setIsQBoxLoading(false);
      }
  };

  // 3. User Replies to Character Question
  const handleUserReply = (itemId: string) => {
      if (!qBoxReplyInput.trim()) return;
      setQBoxItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, answer: qBoxReplyInput } : item
      ));
      setAnsweringId(null);
      setQBoxReplyInput('');
  };

  // --- Mock Data Generators ---
  const getChats = () => phoneData?.chats || [{ name: 'System', message: 'Generating data...', time: 'Now', pinned: false }];
  const getNotes = () => phoneData?.notes || [{ title: 'Empty', content: 'No notes found.' }];
  const getPhotos = () => [10, 11, 12, 13, 14, 15].map(i => `https://picsum.photos/200/200?random=${i}`);

  if (!isOpen) return null;
  if (!partner) return <div className="absolute inset-0 bg-gray-900 z-50 flex items-center justify-center text-white"><p>Please invite a partner in Couple Space first.</p><button onClick={onBack} className="mt-4 bg-white/20 px-4 py-2 rounded">Back</button></div>;

  // Lock Screen
  if (isLocked) {
      return (
          <div className="absolute inset-0 z-50 flex flex-col items-center pt-20 pb-10 px-6 app-transition bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1518531933037-9a404e412398?q=80&w=800&auto=format&fit=crop)`, backgroundColor: '#333' }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
              <div className="z-10 flex flex-col items-center w-full h-full">
                  <div className="mt-8 mb-2"><img src={partner.avatar} className="w-24 h-24 rounded-full border-4 border-white/20 shadow-xl" /></div>
                  <h2 className="text-white text-xl font-bold mb-8">{partner.name}'s Phone</h2>
                  <div className={`flex gap-4 mb-8 ${shake ? 'animate-[shake_0.5s]' : ''}`}>{[0, 1, 2, 3].map(i => (<div key={i} className={`w-4 h-4 rounded-full border border-white ${passcode.length > i ? 'bg-white' : 'bg-transparent'}`}></div>))}</div>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full max-w-[280px] mb-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (<button key={n} onClick={() => handleNumClick(n.toString())} className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-2xl font-medium">{n}</button>))}
                      <div className="col-start-2"><button onClick={() => handleNumClick('0')} className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-2xl font-medium">0</button></div>
                      <div className="col-start-3 flex items-center justify-center"><button onClick={handleDelete} className="text-white/80 active:text-white"><span className="text-xl">⌫</span></button></div>
                  </div>
                  <div className="flex justify-between w-full items-center px-4 mt-4"><button onClick={onBack} className="text-white/60 text-sm">Emergency</button><button onClick={() => alert("Try '5200' or '1314'")} className="text-white/60 text-sm">Hint?</button></div>
              </div>
          </div>
      );
  }

  // --- Unlocked OS ---
  return (
    <div className="absolute inset-0 z-50 bg-[#e0e5ec] flex flex-col app-transition overflow-hidden">
        <div className="h-8 bg-black/5 flex justify-between px-4 items-center text-[10px] font-bold text-gray-700"><span>{partner.name}</span><div className="flex gap-1"><span>5G</span><span>100%</span></div></div>

        {/* Home Screen */}
        {currentApp === 'home' && (
            <div className="flex-1 p-6 flex flex-col">
                <div className="flex-1">
                    <div className="grid grid-cols-4 gap-6 mt-4">
                        <button onClick={() => setCurrentApp('wechat')} className="flex flex-col items-center gap-1"><div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">💬</div><span className="text-xs text-gray-600">WeChat</span></button>
                        <button onClick={() => setCurrentApp('album')} className="flex flex-col items-center gap-1"><div className="w-14 h-14 bg-blue-400 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">🖼️</div><span className="text-xs text-gray-600">Photos</span></button>
                        <button onClick={() => setCurrentApp('notes')} className="flex flex-col items-center gap-1"><div className="w-14 h-14 bg-yellow-400 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">📝</div><span className="text-xs text-gray-600">Notes</span></button>
                        <button onClick={() => setCurrentApp('question_box')} className="flex flex-col items-center gap-1"><div className="w-14 h-14 bg-pink-400 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">💌</div><span className="text-xs text-gray-600">提问箱</span></button>
                        <div onClick={handleRegenerate} className="flex flex-col items-center gap-1 opacity-70 cursor-pointer"><div className={`w-14 h-14 bg-gray-400 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg ${isLoadingData ? 'animate-spin' : ''}`}>↻</div><span className="text-xs text-gray-600">Reset</span></div>
                    </div>
                </div>
                <div className="bg-white/30 backdrop-blur-xl p-4 rounded-3xl flex justify-around mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-sm">📞</div>
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-sm">🌐</div>
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-black shadow-sm">🎵</div>
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-white shadow-sm">📷</div>
                </div>
                <button onClick={onBack} className="absolute top-10 right-4 w-8 h-8 bg-black/20 rounded-full text-white flex items-center justify-center">✕</button>
            </div>
        )}

        {/* --- Inner Apps --- */}
        
        {/* WeChat */}
        {currentApp === 'wechat' && (
            <div className="flex-1 bg-white flex flex-col animate-[fadeIn_0.2s]">
                <div className="h-12 bg-gray-100 flex items-center justify-between px-4 border-b"><button onClick={() => setCurrentApp('home')} className="text-blue-500 flex items-center hover:bg-gray-200 p-2 -ml-2 rounded-lg">‹ Back</button><span className="font-bold">WeChat</span><div className="w-16"></div></div>
                <div className="flex-1 overflow-y-auto">{isLoadingData && !phoneData ? <div className="p-4 text-center text-gray-400">Loading chats...</div> : getChats().map((chat, i) => (<div key={i} className={`flex items-center p-3 border-b border-gray-50 ${chat.pinned ? 'bg-gray-50' : ''}`}><div className="w-12 h-12 rounded-lg bg-gray-200 mr-3 flex items-center justify-center text-xl text-gray-500 font-bold overflow-hidden">{chat.name[0]}</div><div className="flex-1"><div className="flex justify-between mb-1"><span className="font-bold text-gray-800">{chat.name}</span><span className="text-xs text-gray-400">{chat.time}</span></div><p className="text-sm text-gray-500 truncate">{chat.message}</p></div></div>))}</div>
            </div>
        )}

        {/* Album */}
        {currentApp === 'album' && (
            <div className="flex-1 bg-white flex flex-col animate-[fadeIn_0.2s]">
                <div className="h-12 bg-white flex items-center px-4 border-b justify-between"><button onClick={() => setCurrentApp('home')} className="text-blue-500 flex items-center hover:bg-gray-100 p-2 -ml-2 rounded-lg">‹ Albums</button><span className="font-bold">Recents</span><div className="w-20"></div></div>
                <div className="flex-1 overflow-y-auto p-1"><div className="grid grid-cols-3 gap-1">{getPhotos().map((url, i) => (<div key={i} className="aspect-square bg-gray-100"><img src={url} className="w-full h-full object-cover" /></div>))}</div></div>
            </div>
        )}

        {/* Notes */}
        {currentApp === 'notes' && (
            <div className="flex-1 bg-[#fbfbfb] flex flex-col animate-[fadeIn_0.2s]">
                <div className="h-12 bg-[#fbfbfb] flex items-center px-4 justify-between border-b border-gray-100"><button onClick={() => setCurrentApp('home')} className="text-yellow-500 flex items-center hover:bg-yellow-50 p-2 -ml-2 rounded-lg">‹ Folders</button></div>
                <div className="px-4 pt-2 pb-4"><h1 className="text-3xl font-bold mb-4">Notes</h1><div className="space-y-3">{isLoadingData && !phoneData ? <div className="text-gray-400">Loading notes...</div> : getNotes().map((note, i) => (<div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><h3 className="font-bold mb-1">{note.title}</h3><p className="text-gray-500 text-sm whitespace-pre-wrap">{note.content}</p></div>))}</div></div>
            </div>
        )}

        {/* Question Box (New Feature) */}
        {currentApp === 'question_box' && (
            <div className="flex-1 bg-[#f7f7f7] flex flex-col animate-[fadeIn_0.2s] relative">
                <div className="h-12 bg-white flex items-center justify-between px-4 border-b shadow-sm z-10">
                    <button onClick={() => setCurrentApp('home')} className="text-gray-500">Back</button>
                    <span className="font-bold text-gray-800">助手的提问箱</span>
                    <button onClick={handleTriggerCharAsk} className="text-xl" title="获取提问">↻</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-6">
                    {/* Input Area */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="text-sm font-bold text-gray-500 mb-2">向TA提出问题 ...</div>
                        <textarea 
                            value={qBoxInput}
                            onChange={(e) => setQBoxInput(e.target.value)}
                            placeholder="输入你想问的问题..."
                            className="w-full h-24 bg-gray-50 rounded-xl p-3 text-sm resize-none outline-none mb-2"
                        />
                        <div className="flex justify-between items-center">
                            <label className="flex items-center gap-2 text-xs text-gray-500">
                                <input type="checkbox" checked readOnly className="rounded text-pink-500" />
                                匿名提问
                            </label>
                            <button 
                                onClick={handleUserAsk}
                                disabled={isQBoxLoading || !qBoxInput.trim()}
                                className="bg-[#2c2c2e] text-white px-6 py-2 rounded-full font-bold text-sm disabled:opacity-50"
                            >
                                {isQBoxLoading ? '...' : '发送提问'}
                            </button>
                        </div>
                    </div>

                    <div className="text-center text-xs text-gray-400 my-4">历史问答</div>

                    {/* Feed */}
                    {qBoxItems.map(item => (
                        <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                            {/* Question Part */}
                            <div className="bg-gradient-to-b from-gray-50 to-white p-4 pb-6 border-b border-dashed border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-gray-400">来自: {item.isAnonymous ? '匿名用户' : (item.type === 'char_ask' ? partner.name : '我')}</span>
                                    <span className="bg-gray-200 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">匿名</span>
                                </div>
                                <p className="font-bold text-gray-800 text-lg leading-snug">{item.question}</p>
                            </div>

                            {/* Answer Part */}
                            <div className="p-4 bg-white relative">
                                <div className="flex gap-3">
                                    <img 
                                        src={item.type === 'user_ask' ? partner.avatar : "https://ui-avatars.com/api/?name=Me"} 
                                        className="w-10 h-10 rounded-full bg-gray-200 object-cover border-2 border-white shadow-sm" 
                                    />
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-gray-600 mb-1">{item.type === 'user_ask' ? partner.name : '我'}</div>
                                        {item.answer ? (
                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                                        ) : (
                                            <div>
                                                <p className="text-xs text-gray-400 italic mb-2">等待回复...</p>
                                                {item.type === 'char_ask' && answeringId !== item.id && (
                                                    <button onClick={() => setAnsweringId(item.id)} className="text-pink-500 text-xs font-bold">点击回复</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Reply Input */}
                                {answeringId === item.id && (
                                    <div className="mt-3 animate-[fadeIn_0.2s]">
                                        <textarea 
                                            value={qBoxReplyInput}
                                            onChange={(e) => setQBoxReplyInput(e.target.value)}
                                            className="w-full bg-gray-50 p-2 rounded-lg text-sm mb-2 h-20 outline-none border focus:border-pink-300"
                                            placeholder="写下你的回答..."
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setAnsweringId(null)} className="text-gray-400 text-xs">取消</button>
                                            <button onClick={() => handleUserReply(item.id)} className="bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">回复</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Bottom Home Indicator */}
        <div className="h-6 flex justify-center items-center bg-transparent"><div onClick={() => setCurrentApp('home')} className="w-32 h-1 bg-black/20 rounded-full cursor-pointer active:bg-black/40"></div></div>
    </div>
  );
};

export default PhoneInvestigationApp;
