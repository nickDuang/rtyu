import React, { useState, useEffect, useRef } from 'react';
import { AppID, Contact, Message, MessageType, ChatSession, Dossier } from '../../types';
import { generateChatResponse } from '../../services/geminiService';
import { parseCharacterCard } from '../../services/characterParser';

interface ChatAppProps {
  isOpen: boolean;
  onBack: () => void;
  onOpenExternalApp?: (appId: AppID) => void;
  appName?: string;
}

type Tab = 'chats' | 'contacts' | 'discover' | 'me';

const ChatApp: React.FC<ChatAppProps> = ({ isOpen, onBack, onOpenExternalApp, appName }) => {
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [users, setUsers] = useState<Contact[]>([]);
  const [threads, setThreads] = useState<ChatSession[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isArchivePickerOpen, setIsArchivePickerOpen] = useState(false);
  const [archiveDossiers, setArchiveDossiers] = useState<Dossier[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  // Load Data
  useEffect(() => {
      if (isOpen) {
          const savedContacts = localStorage.getItem('ephone_contacts');
          const savedChats = localStorage.getItem('ephone_chats');
          
          if (savedContacts) setUsers(JSON.parse(savedContacts));
          if (savedChats) setThreads(JSON.parse(savedChats));
          else {
              if (savedContacts) {
                  const contacts: Contact[] = JSON.parse(savedContacts);
                  const initialThreads: ChatSession[] = contacts.map(c => ({
                      id: `chat_${c.id}`,
                      contactId: c.id,
                      name: c.name,
                      avatar: c.avatar,
                      messages: [],
                      isPinned: false,
                      unreadCount: 0,
                      persona: c.description
                  }));
                  setThreads(initialThreads);
              }
          }
      }
  }, [isOpen]);

  // Save Data
  useEffect(() => {
      if (threads.length > 0) {
          localStorage.setItem('ephone_chats', JSON.stringify(threads));
      }
      if (users.length > 0) {
          localStorage.setItem('ephone_contacts', JSON.stringify(users));
      }
  }, [threads, users]);

  // Scroll to bottom
  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadId, threads]);

  const activeThread = threads.find(t => t.id === activeThreadId);

  const handleImportCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          const char = await parseCharacterCard(file);
          if (char) {
              addContactFromData(char.name, char.avatar, char.description);
          }
      } catch (err) {
          console.error(err);
          alert("导入失败，请检查文件格式");
      }
      e.target.value = '';
  };

  const addContactFromData = (name: string, avatar: string, persona: string) => {
      const newId = `c_${Date.now()}`;
      const newContact: Contact = {
          id: newId,
          name: name,
          avatar: avatar,
          description: persona,
          isOnline: true
      };
      
      const newThread: ChatSession = {
          id: `chat_${newId}`,
          contactId: newId,
          name: name,
          avatar: avatar,
          messages: [],
          isPinned: false,
          unreadCount: 0,
          persona: persona
      };

      setUsers(prev => [...prev, newContact]);
      setThreads(prev => [newThread, ...prev]);
      alert(`成功添加角色: ${name}`);
  };

  const openArchivePicker = () => {
      const saved = localStorage.getItem('ephone_archive_dossiers');
      if (saved) {
          setArchiveDossiers(JSON.parse(saved));
          setIsArchivePickerOpen(true);
          setIsPlusMenuOpen(false);
      } else {
          alert("档案库为空，请先在档案应用中创建档案");
      }
  };

  const handleSelectDossier = (dossier: Dossier) => {
      addContactFromData(dossier.charName, dossier.charAvatar, dossier.charPersona);
      setIsArchivePickerOpen(false);
  };

  const handleSendMessage = async () => {
      if (!inputMessage.trim() || !activeThread) return;

      const userMsg: Message = {
          id: `m_${Date.now()}`,
          role: 'user',
          type: MessageType.Text,
          content: inputMessage,
          timestamp: Date.now()
      };

      const updatedThread = {
          ...activeThread,
          messages: [...activeThread.messages, userMsg]
      };

      setThreads(prev => prev.map(t => t.id === activeThread.id ? updatedThread : t));
      setInputMessage('');
      setIsTyping(true);

      try {
          const history = updatedThread.messages.map(m => ({ role: m.role, content: m.content }));
          const responseText = await generateChatResponse(history, activeThread.persona);
          
          let finalContent = responseText;
          let nextMsgTimestamp = Date.now() + 1;
          const newMessages: Message[] = [];

          // Helper to update balance
          const addMoneyToWallet = (amount: number, type: 'RedPacket' | 'Transfer', sourceName: string) => {
              try {
                  const currentBalance = parseFloat(localStorage.getItem('ephone_wallet_balance') || '0');
                  const newBalance = currentBalance + amount;
                  localStorage.setItem('ephone_wallet_balance', newBalance.toString());
                  
                  // Add Transaction Record
                  const savedTxs = JSON.parse(localStorage.getItem('ephone_wallet_transactions') || '[]');
                  const newTx = {
                      id: `tx_${Date.now()}`,
                      title: `收到 ${sourceName} 的${type === 'RedPacket' ? '红包' : '转账'}`,
                      amount: amount,
                      type: 'income',
                      date: new Date().toLocaleString()
                  };
                  localStorage.setItem('ephone_wallet_transactions', JSON.stringify([newTx, ...savedTxs]));
              } catch (e) {
                  console.error("Failed to update wallet", e);
              }
          };

          // 1. Profile Update
          const updateRegex = /<<<PROFILE_UPDATE:([\s\S]*?)>>>/;
          const updateMatch = responseText.match(updateRegex);
          if (updateMatch) {
              try {
                  const jsonStr = updateMatch[1];
                  const updateData = JSON.parse(jsonStr);
                  if (updateData.name && updateData.persona) {
                      const newName = updateData.name;
                      const newPersona = updateData.persona;
                      setUsers(prev => prev.map(u => u.id === activeThread.contactId ? { ...u, name: newName, description: newPersona } : u));
                      setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, name: newName, persona: newPersona } : t));
                  }
                  finalContent = finalContent.replace(updateMatch[0], '');
              } catch (e) {}
          }

          // 2. Location
          const locRegex = /<<<LOCATION:([\s\S]*?)>>>/;
          const locMatch = responseText.match(locRegex);
          if (locMatch) {
              try {
                  const data = JSON.parse(locMatch[1]);
                  newMessages.push({
                      id: `m_${nextMsgTimestamp++}`,
                      role: 'assistant',
                      type: MessageType.Location,
                      content: JSON.stringify(data),
                      timestamp: Date.now()
                  });
                  finalContent = finalContent.replace(locMatch[0], '');
              } catch (e) {}
          }

          // 3. Red Packet
          const rpRegex = /<<<REDPACKET:([\s\S]*?)>>>/;
          const rpMatch = responseText.match(rpRegex);
          if (rpMatch) {
              try {
                  const data = JSON.parse(rpMatch[1]);
                  newMessages.push({
                      id: `m_${nextMsgTimestamp++}`,
                      role: 'assistant',
                      type: MessageType.RedPacket,
                      content: JSON.stringify(data),
                      timestamp: Date.now()
                  });
                  addMoneyToWallet(data.amount, 'RedPacket', activeThread.name);
                  finalContent = finalContent.replace(rpMatch[0], '');
              } catch (e) {}
          }

          // 4. Transfer
          const txRegex = /<<<TRANSFER:([\s\S]*?)>>>/;
          const txMatch = responseText.match(txRegex);
          if (txMatch) {
              try {
                  const data = JSON.parse(txMatch[1]);
                  newMessages.push({
                      id: `m_${nextMsgTimestamp++}`,
                      role: 'assistant',
                      type: MessageType.Transfer,
                      content: JSON.stringify(data),
                      timestamp: Date.now()
                  });
                  addMoneyToWallet(data.amount, 'Transfer', activeThread.name);
                  finalContent = finalContent.replace(txMatch[0], '');
              } catch (e) {}
          }

          // Clean text
          finalContent = finalContent.trim();

          // Add Text Message First (if any)
          if (finalContent) {
              newMessages.unshift({
                  id: `m_${Date.now()}`,
                  role: 'assistant',
                  type: MessageType.Text,
                  content: finalContent,
                  timestamp: Date.now()
              });
          }

          // Add all new messages to thread
          setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, messages: [...t.messages, ...newMessages] } : t));

      } catch (e) {
          console.error(e);
      } finally {
          setIsTyping(false);
      }
  };

  if (!isOpen) return null;

  // --- Render Helpers ---

  const renderHeader = () => {
      if (activeThreadId && activeThread) {
          return (
            <div className="h-12 bg-[#ededed] border-b border-[#dcdcdc] flex justify-between items-center px-4 sticky top-0 z-20">
                <button onClick={() => setActiveThreadId(null)} className="flex items-center text-black">
                    <span className="text-2xl mr-1">‹</span>
                    <span className="text-sm font-medium">微信</span>
                </button>
                <span className="font-medium text-base">{activeThread.name}</span>
                <button className="text-black text-xl">•••</button>
            </div>
          );
      }

      return (
        <div className="h-12 bg-[#ededed] border-b border-[#dcdcdc] flex justify-between items-center px-4 sticky top-0 z-20">
            <span className="font-medium text-base">
                {activeTab === 'chats' ? '微信' : 
                 activeTab === 'contacts' ? '通讯录' : 
                 activeTab === 'discover' ? '发现' : '我'}
            </span>
            <div className="flex gap-4 text-black text-xl relative">
                <button type="button">🔍</button>
                <button type="button" onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}>⊕</button>

                {isPlusMenuOpen && (
                    <React.Fragment>
                        <div className="fixed inset-0 z-40" onClick={() => setIsPlusMenuOpen(false)}></div>
                        <div className="absolute top-10 right-0 w-44 bg-[#4c4c4c] rounded-md shadow-xl z-50 py-1 text-white text-sm animate-fade-in">
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsPlusMenuOpen(false);
                                    cardInputRef.current?.click();
                                }}
                                className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-black/20 border-b border-white/10"
                            >
                                <span className="text-lg">📥</span>
                                <span>导入角色卡</span>
                            </button>
                            <button 
                                type="button" 
                                onClick={openArchivePicker}
                                className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-black/20 border-b border-white/10"
                            >
                                <span className="text-lg">📁</span>
                                <span>从档案选择</span>
                            </button>
                            <button type="button" className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-black/20 border-b border-white/10">
                                <span className="text-lg">👥</span>
                                <span>发起群聊</span>
                            </button>
                            <button type="button" className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-black/20 border-b border-white/10">
                                <span className="text-lg">👤</span>
                                <span>添加朋友</span>
                            </button>
                            <button type="button" className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-black/20">
                                <span className="text-lg">📷</span>
                                <span>扫一扫</span>
                            </button>
                        </div>
                    </React.Fragment>
                )}
            </div>
        </div>
      );
  };

  const renderBottomNav = () => (
      <div className="h-14 bg-[#f7f7f7] border-t border-[#dcdcdc] flex justify-around items-center pb-safe z-20">
          <button onClick={() => setActiveTab('chats')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'chats' ? 'text-[#07c160]' : 'text-gray-500'}`}>
              <div className="text-xl">💬</div>
              <span className="text-[10px]">微信</span>
          </button>
          <button onClick={() => setActiveTab('contacts')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'contacts' ? 'text-[#07c160]' : 'text-gray-500'}`}>
              <div className="text-xl">👤</div>
              <span className="text-[10px]">通讯录</span>
          </button>
          <button onClick={() => setActiveTab('discover')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'discover' ? 'text-[#07c160]' : 'text-gray-500'}`}>
              <div className="text-xl">🧭</div>
              <span className="text-[10px]">发现</span>
          </button>
          <button onClick={() => setActiveTab('me')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'me' ? 'text-[#07c160]' : 'text-gray-500'}`}>
              <div className="text-xl">😎</div>
              <span className="text-[10px]">我</span>
          </button>
      </div>
  );

  return (
    <div className="absolute inset-0 bg-[#f2f2f2] z-50 flex flex-col app-transition overflow-hidden">
        <input 
            type="file" 
            ref={cardInputRef} 
            onChange={handleImportCard} 
            className="hidden" 
            accept=".png,.json" 
        />
        
        {/* Status Bar Spacer (if needed, usually handled by OS container) */}
        <div className="h-8 bg-[#ededed]"></div>

        {/* Header */}
        {renderHeader()}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto relative bg-white">
            
            {/* CHAT LIST */}
            {activeTab === 'chats' && !activeThreadId && (
                <div className="bg-white min-h-full">
                    {/* Search Bar */}
                    <div className="p-2 bg-[#ededed]">
                        <div className="bg-white rounded text-center py-1 text-sm text-gray-400">
                            🔍 搜索
                        </div>
                    </div>
                    
                    {threads.map(chat => (
                        <div 
                            key={chat.id} 
                            onClick={() => setActiveThreadId(chat.id)}
                            className="flex items-center p-3 bg-white active:bg-[#d9d9d9] cursor-pointer relative"
                        >
                            <div className="relative">
                                <img src={chat.avatar} className="w-12 h-12 rounded-[6px] bg-gray-200 object-cover" />
                                {chat.unreadCount > 0 && <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{chat.unreadCount}</div>}
                            </div>
                            <div className="ml-3 flex-1 overflow-hidden border-b border-gray-100 pb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-base text-black">{chat.name}</span>
                                    <span className="text-xs text-gray-300">
                                        {chat.messages.length > 0 ? new Date(chat.messages[chat.messages.length - 1].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-400 truncate">
                                    {chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].content.substring(0, 30) : chat.persona.substring(0, 30)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CONTACTS */}
            {activeTab === 'contacts' && !activeThreadId && (
                <div className="bg-white min-h-full">
                     <div className="p-2 bg-[#ededed]">
                        <div className="bg-white rounded text-center py-1 text-sm text-gray-400">🔍 搜索</div>
                    </div>
                    {['新的朋友', '群聊', '标签', '公众号'].map((item, i) => (
                        <div key={i} className="flex items-center p-3 border-b border-gray-50 active:bg-gray-100">
                            <div className={`w-10 h-10 rounded-[4px] flex items-center justify-center text-white ${['bg-orange-400', 'bg-green-500', 'bg-blue-500', 'bg-blue-600'][i]}`}>
                                {['👤', '👥', '🏷️', '📢'][i]}
                            </div>
                            <span className="ml-3 font-medium">{item}</span>
                        </div>
                    ))}
                    <div className="bg-[#ededed] px-3 py-1 text-xs text-gray-500">星标朋友</div>
                    {users.map(user => (
                        <div key={user.id} className="flex items-center p-3 border-b border-gray-50 active:bg-gray-100">
                            <img src={user.avatar} className="w-10 h-10 rounded-[4px] bg-gray-200 object-cover" />
                            <span className="ml-3 font-medium">{user.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* DISCOVER */}
            {activeTab === 'discover' && !activeThreadId && (
                <div className="bg-[#ededed] min-h-full pb-4">
                    <div onClick={() => onOpenExternalApp?.(AppID.Forum)} className="bg-white mt-0 p-3 flex items-center justify-between active:bg-gray-100 cursor-pointer border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⭕</span>
                            <span className="text-base">朋友圈</span>
                        </div>
                        <span className="text-gray-400">›</span>
                    </div>
                    
                    <div className="bg-white mt-2 p-3 flex items-center justify-between active:bg-gray-100 cursor-pointer border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <span className="text-xl text-blue-500">⚡</span>
                            <span className="text-base">视频号</span>
                        </div>
                        <span className="text-gray-400">›</span>
                    </div>

                    <div className="bg-white mt-2">
                        <div className="p-3 flex items-center justify-between active:bg-gray-100 cursor-pointer border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">📷</span>
                                <span className="text-base">扫一扫</span>
                            </div>
                            <span className="text-gray-400">›</span>
                        </div>
                        <div className="p-3 flex items-center justify-between active:bg-gray-100 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">👋</span>
                                <span className="text-base">摇一摇</span>
                            </div>
                            <span className="text-gray-400">›</span>
                        </div>
                    </div>

                    <div className="bg-white mt-2">
                        <div className="p-3 flex items-center justify-between active:bg-gray-100 cursor-pointer border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🛍️</span>
                                <span className="text-base">购物</span>
                            </div>
                            <span className="text-gray-400">›</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ME */}
            {activeTab === 'me' && !activeThreadId && (
                <div className="bg-[#ededed] min-h-full pb-4">
                    <div className="bg-white p-6 flex items-center gap-4 mb-2">
                        <img src="https://ui-avatars.com/api/?name=Me&background=random" className="w-16 h-16 rounded-[6px]" />
                        <div className="flex-1">
                            <div className="font-bold text-lg">我</div>
                            <div className="text-gray-500 text-sm mt-1">微信号: wxid_88888888</div>
                        </div>
                        <div className="text-gray-400 text-2xl">›</div>
                    </div>

                    <div onClick={() => onOpenExternalApp?.(AppID.Wallet)} className="bg-white p-3 flex items-center justify-between active:bg-gray-100 cursor-pointer mb-2">
                        <div className="flex items-center gap-3">
                            <span className="text-xl text-green-500">💰</span>
                            <span className="text-base">服务</span>
                        </div>
                        <span className="text-gray-400">›</span>
                    </div>

                    <div className="bg-white mb-2">
                        <div className="p-3 flex items-center justify-between active:bg-gray-100 cursor-pointer border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="text-xl text-orange-400">⭐</span>
                                <span className="text-base">收藏</span>
                            </div>
                            <span className="text-gray-400">›</span>
                        </div>
                        <div className="p-3 flex items-center justify-between active:bg-gray-100 cursor-pointer border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="text-xl text-blue-400">🖼️</span>
                                <span className="text-base">相册</span>
                            </div>
                            <span className="text-gray-400">›</span>
                        </div>
                        <div className="p-3 flex items-center justify-between active:bg-gray-100 cursor-pointer border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="text-xl text-yellow-400">💳</span>
                                <span className="text-base">卡包</span>
                            </div>
                            <span className="text-gray-400">›</span>
                        </div>
                        <div className="p-3 flex items-center justify-between active:bg-gray-100 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <span className="text-xl text-yellow-500">😊</span>
                                <span className="text-base">表情</span>
                            </div>
                            <span className="text-gray-400">›</span>
                        </div>
                    </div>

                    <div className="bg-white p-3 flex items-center justify-between active:bg-gray-100 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <span className="text-xl text-blue-500">⚙️</span>
                            <span className="text-base">设置</span>
                        </div>
                        <span className="text-gray-400">›</span>
                    </div>
                </div>
            )}

            {/* CHAT DETAIL (Overlay) */}
            {activeThreadId && activeThread && (
                <div className="absolute inset-0 bg-[#f2f2f2] z-30 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeThread.messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-2 max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <img 
                                        src={msg.role === 'user' ? "https://ui-avatars.com/api/?name=Me&background=random" : activeThread.avatar} 
                                        className="w-10 h-10 rounded-[4px] bg-gray-200 flex-shrink-0"
                                    />
                                    
                                    {msg.type === MessageType.Text && (
                                        <div className={`p-2.5 rounded-[4px] text-base leading-relaxed relative ${msg.role === 'user' ? 'bg-[#95ec69] text-black' : 'bg-white text-black'}`}>
                                            {/* Triangle pointer would go here but simple rounded box is fine for now */}
                                            {msg.content}
                                        </div>
                                    )}
                                    
                                    {msg.type === MessageType.Image && (
                                        <img src={msg.content} className="rounded-[4px] max-w-full" />
                                    )}

                                    {(msg.type === MessageType.RedPacket || msg.type === MessageType.Transfer) && (
                                        <div className={`w-60 bg-[#fa9d3b] rounded-[4px] p-4 text-white flex items-center gap-3 ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                                            <div className="bg-[#fcf5e6] w-10 h-10 rounded-full flex items-center justify-center text-[#fa9d3b] text-xl">
                                                {msg.type === MessageType.RedPacket ? '🧧' : '💸'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold">{msg.type === MessageType.RedPacket ? '恭喜发财，大吉大利' : `¥${JSON.parse(msg.content).amount}`}</div>
                                                <div className="text-xs opacity-80">{JSON.parse(msg.content).note || '微信红包'}</div>
                                            </div>
                                        </div>
                                    )}

                                    {msg.type === MessageType.Location && (
                                        <div className="bg-white p-2 rounded-[4px] w-48">
                                            <div className="text-sm font-bold truncate">{JSON.parse(msg.content).name}</div>
                                            <div className="text-xs text-gray-500 truncate mb-2">{JSON.parse(msg.content).address}</div>
                                            <div className="h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">Map Preview</div>
                                        </div>
                                    )}
                                    
                                    {msg.type === MessageType.PayRequest && (
                                        <div className="bg-white rounded-[4px] w-60 overflow-hidden border border-gray-200">
                                            {(() => {
                                                const data = JSON.parse(msg.content);
                                                return (
                                                    <>
                                                        <div className="bg-orange-500 p-3 text-white flex justify-between items-center">
                                                            <span className="font-bold text-sm">代付请求</span>
                                                            <span className="text-xs">{data.status === 'paid' ? '已支付' : '待支付'}</span>
                                                        </div>
                                                        <div className="p-3">
                                                            <div className="flex gap-3 mb-2">
                                                                <img src={data.productImage} className="w-12 h-12 rounded bg-gray-100 object-cover" />
                                                                <div className="flex-1">
                                                                    <div className="text-xs text-gray-800 line-clamp-2">{data.productTitle}</div>
                                                                    <div className="text-xs font-bold text-orange-500 mt-1">¥{data.price}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                                                "{data.note}"
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                    
                                    {msg.type === MessageType.Share && (
                                        <div className="bg-white rounded-[4px] p-3 w-60 flex gap-3 cursor-pointer hover:bg-gray-50">
                                            <div className="w-12 h-12 bg-gray-100 flex-shrink-0 flex items-center justify-center text-xl">📄</div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-sm font-bold text-black truncate">{JSON.parse(msg.content).title}</div>
                                                <div className="text-xs text-gray-500 truncate mt-1">{JSON.parse(msg.content).description}</div>
                                                <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                                                    {JSON.parse(msg.content).source}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex items-center gap-2">
                                <img src={activeThread.avatar} className="w-10 h-10 rounded-[4px] bg-gray-200" />
                                <div className="bg-white p-3 rounded-[4px]">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="bg-[#f7f7f7] border-t border-[#dcdcdc] p-2 flex items-center gap-3 pb-safe">
                        <button className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center text-gray-500">
                            <span className="text-xl">🔊</span>
                        </button>
                        <input 
                            type="text" 
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1 bg-white h-10 rounded-[4px] px-3 text-base outline-none border border-gray-200"
                        />
                        <button className="text-3xl text-gray-500">☺</button>
                        {inputMessage.trim() ? (
                             <button onClick={handleSendMessage} className="px-3 py-1.5 bg-[#95ec69] text-black font-medium rounded-[4px] text-sm">
                                发送
                            </button>
                        ) : (
                            <button className="text-3xl text-gray-500">⊕</button>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Bottom Nav (Only show when not in chat detail and not Messages app) */}
        {!activeThreadId && appName !== 'Messages' && renderBottomNav()}

        {/* Archive Picker Overlay */}
        {isArchivePickerOpen && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
                <div className="w-full max-w-md bg-white rounded-t-[32px] overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">选择档案角色</h3>
                        <button onClick={() => setIsArchivePickerOpen(false)} className="text-gray-400 text-2xl">×</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {archiveDossiers.map(d => (
                            <div 
                                key={d.id} 
                                onClick={() => handleSelectDossier(d)}
                                className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl active:scale-98 transition-transform cursor-pointer"
                            >
                                <img src={d.charAvatar} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                <div className="flex-1">
                                    <div className="font-bold text-gray-800">{d.charName}</div>
                                    <div className="text-xs text-gray-500 truncate">{d.charPersona.substring(0, 40)}...</div>
                                </div>
                                <span className="text-green-500 font-bold">选择</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-6 bg-gray-50">
                        <button 
                            onClick={() => setIsArchivePickerOpen(false)}
                            className="w-full py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-500 active:bg-gray-100"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ChatApp;