
import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, Message, MessageType, AppID, Contact, Moment } from '../../types';
import { generateChatResponse, generateMomentsReaction, generateAIMomentsPost, generateEventReaction } from '../../services/geminiService';
import { parseCharacterCard } from '../../services/characterParser';

interface ChatAppProps {
  onBack: () => void;
  isOpen: boolean;
  appName?: string;
  variant?: 'wechat' | 'ios';
  onOpenExternalApp: (appId: AppID) => void;
}

const DEFAULT_CONTACTS: Contact[] = [
    { id: 'c1', name: 'Alice (AI)', avatar: 'https://picsum.photos/200/200?random=1', description: "一个友好开朗的AI助手，喜欢使用表情符号。" },
    { id: 'c2', name: 'Bob (群聊)', avatar: 'https://picsum.photos/200/200?random=2', description: "一个总是很累的愤世嫉俗的技术支持。", isSystem: true },
    { id: 'c3', name: 'Luna', avatar: 'https://picsum.photos/200/200?random=3', description: "一个喜欢诗歌和月亮的神秘女孩。" }
];

const DEFAULT_CHATS: ChatSession[] = [
    {
      id: '1',
      contactId: 'c1',
      name: 'Alice (AI)',
      avatar: 'https://picsum.photos/200/200?random=1',
      isPinned: true,
      unreadCount: 2,
      persona: "一个友好热情的助手，喜欢摄影和猫。",
      messages: [
        { id: '1', role: 'assistant', type: MessageType.Text, content: '嘿！今天过得怎么样？', timestamp: Date.now() - 100000 },
        { id: '2', role: 'assistant', type: MessageType.Image, content: 'https://picsum.photos/300/200', timestamp: Date.now() - 90000 },
      ]
    },
    {
      id: '2',
      contactId: 'c2',
      name: 'Bob (群聊)',
      avatar: 'https://picsum.photos/200/200?random=2',
      isPinned: false,
      unreadCount: 0,
      persona: "一个脾气暴躁的技术支持。",
      messages: [
        { id: '1', role: 'assistant', type: MessageType.Text, content: '你试过重启吗？', timestamp: Date.now() - 500000 }
      ]
    }
];

const DEFAULT_MOMENTS: Moment[] = [
    {
      id: 'm1',
      userId: 'c1',
      content: '刚刚更新了我的系统固件。感觉焕然一新！🤖✨',
      images: ['https://picsum.photos/400/300?random=10'],
      timestamp: Date.now() - 3600000,
      likes: ['Bob (群聊)'],
      comments: [
        { id: 'cm1', contactId: 'c2', name: 'Bob (群聊)', content: '修好咖啡机的bug了吗？' }
      ]
    }
];

const GIFT_SHOP = [
    { id: 'g1', name: '玫瑰花', icon: '🌹', price: 5 },
    { id: 'g2', name: '奶茶', icon: '🧋', price: 20 },
    { id: 'g3', name: '名牌包', icon: '👜', price: 2000 },
    { id: 'g4', name: '跑车', icon: '🏎️', price: 9999 },
    { id: 'g5', name: '草莓蛋糕', icon: '🍰', price: 50 },
    { id: 'g6', name: '钻戒', icon: '💍', price: 5000 },
];

const ChatApp: React.FC<ChatAppProps> = ({ onBack, isOpen, appName = "微信", variant = "wechat", onOpenExternalApp }) => {
  const isIOS = variant === 'ios';

  // Navigation State
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'discover'>('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isChatDetailsOpen, setIsChatDetailsOpen] = useState(false); // New state for Chat Settings
  
  // Moments State
  const [isMomentsOpen, setIsMomentsOpen] = useState(false);
  const [isPostingMoment, setIsPostingMoment] = useState(false);
  const [momentText, setMomentText] = useState('');
  const [momentImage, setMomentImage] = useState<string | null>(null);
  const [momentCover, setMomentCover] = useState<string>('https://picsum.photos/800/600?blur=2');
  const [momentUserAvatar, setMomentUserAvatar] = useState<string>('https://ui-avatars.com/api/?name=Me&background=random');
  const [isGeneratingAIPost, setIsGeneratingAIPost] = useState(false);

  // Initial Data with Persistence
  const [contacts, setContacts] = useState<Contact[]>(() => {
      const saved = localStorage.getItem('ephone_contacts');
      return saved ? JSON.parse(saved) : DEFAULT_CONTACTS;
  });

  const [chats, setChats] = useState<ChatSession[]>(() => {
      const saved = localStorage.getItem('ephone_chats');
      return saved ? JSON.parse(saved) : DEFAULT_CHATS;
  });

  const [moments, setMoments] = useState<Moment[]>(() => {
      const saved = localStorage.getItem('ephone_moments');
      return saved ? JSON.parse(saved) : DEFAULT_MOMENTS;
  });

  // Persistence Effects
  useEffect(() => { localStorage.setItem('ephone_contacts', JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { localStorage.setItem('ephone_chats', JSON.stringify(chats)); }, [chats]);
  useEffect(() => { localStorage.setItem('ephone_moments', JSON.stringify(moments)); }, [moments]);

  // Chat State
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // Top right menu
  const [longPressedMessageId, setLongPressedMessageId] = useState<string | null>(null);
  
  // Plus Menu State
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [showRedPacketModal, setShowRedPacketModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [rpAmount, setRpAmount] = useState('');
  const [rpCount, setRpCount] = useState('');

  // Custom Gift State
  const [isCustomGiftMode, setIsCustomGiftMode] = useState(false);
  const [customGiftName, setCustomGiftName] = useState('');
  const [customGiftPrice, setCustomGiftPrice] = useState('');
  const [customGiftIcon, setCustomGiftIcon] = useState('🎁');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null); // For importing cards
  const imageUploadRef = useRef<HTMLInputElement>(null); // For sending images
  const avatarUploadRef = useRef<HTMLInputElement>(null); // For changing avatar
  const momentImageRef = useRef<HTMLInputElement>(null); // For moment images
  const momentCoverInputRef = useRef<HTMLInputElement>(null); // For moment cover
  const momentAvatarInputRef = useRef<HTMLInputElement>(null); // For moment user avatar
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeChat = chats.find(c => c.id === activeChatId);

  // Reset details view when chat changes
  useEffect(() => {
      setIsChatDetailsOpen(false);
  }, [activeChatId]);

  // --- Helpers ---

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const getRelativeTime = (timestamp: number) => {
      const now = Date.now();
      const diff = now - timestamp;
      
      const date = new Date(timestamp);

      if (diff < 60000) return '刚刚';
      if (diff < 86400000) {
           return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }
      if (diff < 86400000 * 2) return '昨天';
      return date.toLocaleDateString();
  };

  // --- Actions ---

  const handleSend = async () => {
    if (!inputValue.trim() || !activeChatId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      type: MessageType.Text,
      content: inputValue,
      timestamp: Date.now()
    };

    setChats(prev => prev.map(c => 
      c.id === activeChatId ? { ...c, messages: [...c.messages, newMessage] } : c
    ));
    setInputValue('');
    setIsPlusMenuOpen(false);
    setIsTyping(true);

    const updatedHistory = [...(activeChat?.messages || []), newMessage];
    
    // Call AI
    const responseText = await generateChatResponse(updatedHistory.map(m=>({role:m.role, content: m.content})), activeChat?.persona || "Friendly AI");
    
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      type: MessageType.Text,
      content: responseText,
      timestamp: Date.now()
    };

    setIsTyping(false);
    setChats(prev => prev.map(c => 
      c.id === activeChatId ? { ...c, messages: [...c.messages, aiMessage] } : c
    ));
  };

  const handleSendRedPacket = async () => {
    if (!activeChatId || !rpAmount || !rpCount || !activeChat) return;
    
    const content = JSON.stringify({ amount: rpAmount, count: rpCount, caption: "恭喜发财，大吉大利" });
    const newMessage: Message = { id: Date.now().toString(), role: 'user', type: MessageType.RedPacket, content: content, timestamp: Date.now() };
    
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, newMessage] } : c));
    setShowRedPacketModal(false); 
    setIsPlusMenuOpen(false); 
    setRpAmount(''); 
    setRpCount('');

    setIsTyping(true);
    // AI Reaction to Red Packet
    const reaction = await generateEventReaction(
        'RedPacket',
        `Amount: ${rpAmount} Yuan. Count: ${rpCount}.`,
        activeChat.name,
        activeChat.persona
    );
    setIsTyping(false);

    const aiResponse: Message = { id: (Date.now() + 1).toString(), role: 'assistant', type: MessageType.Text, content: reaction, timestamp: Date.now() };
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, aiResponse] } : c));
  };

  const handleSendGift = async (gift: {name: string, icon: string, price: number}) => {
      if (!activeChatId || !activeChat) return;

      const content = JSON.stringify(gift);
      const newMessage: Message = { 
          id: Date.now().toString(), 
          role: 'user', 
          type: MessageType.Gift, 
          content: content, 
          timestamp: Date.now() 
      };

      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, newMessage] } : c));
      setShowGiftModal(false);
      setIsPlusMenuOpen(false);

      setIsTyping(true);
      // AI Reaction to Gift
      const reaction = await generateEventReaction(
          'Gift',
          `Gift: ${gift.name} (${gift.icon}). Price: ${gift.price}.`,
          activeChat.name,
          activeChat.persona
      );
      setIsTyping(false);

      const aiResponse: Message = { id: (Date.now() + 1).toString(), role: 'assistant', type: MessageType.Text, content: reaction, timestamp: Date.now() };
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, aiResponse] } : c));
  };

  const handleSendCustomGiftAction = () => {
        if (!customGiftName || !customGiftPrice) return;
        handleSendGift({
            name: customGiftName,
            icon: customGiftIcon,
            price: parseFloat(customGiftPrice)
        });
        setCustomGiftName('');
        setCustomGiftPrice('');
        setIsCustomGiftMode(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !activeChatId) return;
    try {
      const base64 = await convertFileToBase64(file);
      const newMessage: Message = { id: Date.now().toString(), role: 'user', type: MessageType.Image, content: base64, timestamp: Date.now() };
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, newMessage] } : c));
      setIsPlusMenuOpen(false);
    } catch (err) { console.error(err); }
    if (imageUploadRef.current) imageUploadRef.current.value = '';
  };

  const handleChangeAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !activeChatId) return;
    try {
      const base64 = await convertFileToBase64(file);
      // Update Chat Session Avatar
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, avatar: base64 } : c));
      // Update Contact Avatar
      const currentChat = chats.find(c => c.id === activeChatId);
      if (currentChat) {
          setContacts(prev => prev.map(c => c.id === currentChat.contactId ? { ...c, avatar: base64 } : c));
      }

      const sysMsg: Message = { id: Date.now().toString(), role: 'system', type: MessageType.System, content: "你修改了联系人头像。", timestamp: Date.now() };
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, sysMsg] } : c));
      setIsPlusMenuOpen(false);
    } catch (err) { console.error(err); }
    if (avatarUploadRef.current) avatarUploadRef.current.value = '';
  };
  
  const handleImportClick = () => { fileInputRef.current?.click(); setShowMenu(false); };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const charData = await parseCharacterCard(file);
      if (charData) {
        const newContact: Contact = { id: `c_${Date.now()}`, name: charData.name, avatar: charData.avatar, description: charData.description };
        setContacts(prev => [...prev, newContact]); alert(`成功导入 ${charData.name}`); setActiveTab('contacts');
      } else { alert('无法解析角色卡片。'); }
    } catch (err) { console.error(err); alert('文件解析错误。'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteMessage = () => {
      if (activeChatId && longPressedMessageId) {
          setChats(prev => prev.map(c => 
              c.id === activeChatId 
                  ? { ...c, messages: c.messages.filter(m => m.id !== longPressedMessageId) }
                  : c
          ));
          setLongPressedMessageId(null);
      }
  };

  // --- Chat Settings Handlers ---
  const handleTogglePin = () => {
      if (!activeChatId) return;
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, isPinned: !c.isPinned } : c));
  };

  const handleClearHistory = () => {
      if (!activeChatId) return;
      if (window.confirm("确定清空聊天记录吗？")) {
          setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [] } : c));
      }
  };

  const handleDeleteChat = () => {
      if (!activeChatId) return;
      if (window.confirm("删除后，将清空该聊天的消息记录")) {
          const nextChats = chats.filter(c => c.id !== activeChatId);
          setChats(nextChats);
          setActiveChatId(null);
          setIsChatDetailsOpen(false);
      }
  };

  // --- Long Press Handlers ---
  const handleTouchStart = (msgId: string) => {
      longPressTimerRef.current = setTimeout(() => setLongPressedMessageId(msgId), 600);
  };
  const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };
  // Desktop Right Click
  const handleContextMenu = (e: React.MouseEvent, msgId: string) => {
      e.preventDefault();
      setLongPressedMessageId(msgId);
  };

  const createManualCharacter = () => {
    const name = prompt("输入角色名字:"); if (!name) return;
    const desc = prompt("输入角色描述 (Persona):");
    const newContact: Contact = { id: `c_${Date.now()}`, name: name, avatar: `https://ui-avatars.com/api/?name=${name}&background=random`, description: desc || "" };
    setContacts(prev => [...prev, newContact]); setShowMenu(false); setActiveTab('contacts');
  };

  const startChatWithContact = (contact: Contact) => {
    const existingChat = chats.find(c => c.contactId === contact.id);
    if (existingChat) { setActiveChatId(existingChat.id); } 
    else {
      const newChat: ChatSession = { id: `chat_${Date.now()}`, contactId: contact.id, name: contact.name, avatar: contact.avatar, isPinned: false, unreadCount: 0, persona: contact.description, messages: [] };
      setChats(prev => [newChat, ...prev]); setActiveChatId(newChat.id);
    }
  };

  // --- Moments Logic ---
  const handleMomentImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return; try { const base64 = await convertFileToBase64(file); setMomentImage(base64); } catch (err) { console.error(err); }
  };
  const handleMomentCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return; try { const base64 = await convertFileToBase64(file); setMomentCover(base64); } catch (err) { console.error(err); }
  };
  const handleMomentAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return; try { const base64 = await convertFileToBase64(file); setMomentUserAvatar(base64); } catch (err) { console.error(err); }
  };
  const handlePostMoment = async () => {
      if (!momentText && !momentImage) return;
      const newMoment: Moment = { id: `m_${Date.now()}`, userId: 'user', content: momentText, images: momentImage ? [momentImage] : [], timestamp: Date.now(), likes: [], comments: [] };
      setMoments(prev => [newMoment, ...prev]); setIsPostingMoment(false); setMomentText(''); setMomentImage(null);
      const reaction = await generateMomentsReaction(momentText, contacts);
      setTimeout(() => {
          setMoments(prev => prev.map(m => {
              if (m.id === newMoment.id) {
                  return { ...m, likes: [...m.likes, ...reaction.likes], comments: [...m.comments, ...reaction.comments.map((c, i) => ({ id: `cm_${Date.now()}_${i}`, contactId: c.contactId, name: c.name, content: c.content })) ] };
              }
              return m;
          }));
      }, 3000);
  };
  const handleTriggerAIPost = async () => {
      if (isGeneratingAIPost) return; setIsGeneratingAIPost(true);
      const aiPost = await generateAIMomentsPost(contacts);
      if (aiPost) {
          const newMoment: Moment = { id: `m_ai_${Date.now()}`, userId: aiPost.contactId, content: aiPost.content, images: aiPost.imageDescription ? [`https://picsum.photos/400/300?random=${Date.now()}`] : [], timestamp: Date.now(), likes: [], comments: [] };
          setMoments(prev => [newMoment, ...prev]);
      }
      setIsGeneratingAIPost(false);
  };

  // --- Rendering Message Bubbles ---
  const renderMessageContent = (msg: Message) => {
      if (msg.type === MessageType.Image) return <img src={msg.content} className="max-w-full rounded-lg" alt="Sent image" />;
      if (msg.type === MessageType.RedPacket) {
          const data = JSON.parse(msg.content);
          return (
              <div className="flex flex-col min-w-[200px]">
                  <div className="bg-[#fa9d3b] p-4 rounded-t-lg flex items-center gap-3">
                      <div className="bg-[#fec880] w-10 h-12 rounded flex items-center justify-center text-red-600 font-bold text-lg">¥</div>
                      <div className="text-white"><div className="text-sm font-medium line-clamp-1">{data.caption || "恭喜发财"}</div><div className="text-xs opacity-90">微信红包</div></div>
                  </div>
                  <div className="bg-white p-2 rounded-b-lg text-xs text-gray-500">微信红包</div>
              </div>
          );
      }
      if (msg.type === MessageType.Gift) {
          const data = JSON.parse(msg.content);
          return (
              <div className="flex flex-col min-w-[150px] p-2 items-center bg-gradient-to-br from-pink-50 to-white">
                  <div className="text-4xl mb-2 filter drop-shadow-md animate-bounce-slow">{data.icon}</div>
                  <div className="text-sm font-bold text-pink-500">{data.name}</div>
                  <div className="text-[10px] text-gray-400">收到礼物</div>
              </div>
          );
      }
      return msg.content;
  };

  // --- Render Header ---
  const renderHeader = () => {
    if (activeChatId) {
       // --- Active Chat Header ---
       if (isIOS) {
           // iOS Header (Simplified for this update)
           return (
               <div className="h-24 bg-white/80 backdrop-blur-md pt-12 px-2 flex items-center justify-between border-b border-gray-200 z-[60] relative flex-shrink-0">
                   <button 
                       onClick={() => setActiveChatId(null)} 
                       className="text-blue-500 font-medium flex items-center p-2 rounded-lg active:opacity-50"
                   >
                       <span className="text-3xl mr-0.5 leading-none">‹</span>
                       <span className="text-base">9</span>
                   </button>
                   <div className="flex flex-col items-center">
                       <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mb-0.5">
                           <img src={activeChat?.avatar} className="w-full h-full object-cover" />
                       </div>
                       <span className="font-semibold text-xs text-black truncate max-w-[150px]">{activeChat?.name.split(' ')[0]}</span>
                   </div>
                   <button onClick={() => setShowMenu(!showMenu)} className="w-16 flex justify-end px-3">
                       <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-blue-500 text-sm">📹</div>
                   </button>
               </div>
           );
       }
       // WeChat Style Header
       if (isChatDetailsOpen) {
           return (
             <div className="h-28 bg-white pt-14 px-4 flex items-center justify-between border-b border-gray-200 shadow-sm z-[60] relative flex-shrink-0">
               <button onClick={() => setIsChatDetailsOpen(false)} className="text-gray-800 font-medium flex items-center p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200">
                  <span className="text-3xl mr-1 leading-none">‹</span>
                  <span className="text-lg font-bold">聊天信息</span>
                </button>
               <h1 className="font-bold text-lg">聊天信息 ({activeChat?.isPinned ? 2 : 1})</h1>
               <div className="w-24"></div>
             </div>
           );
       }

       return (
         <div className="h-28 bg-white pt-14 px-4 flex items-center justify-between border-b border-gray-200 shadow-sm z-[60] relative flex-shrink-0">
           <button onClick={() => setActiveChatId(null)} className="text-gray-800 font-medium flex items-center p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200">
              <span className="text-3xl mr-1 leading-none">‹</span>
              <span className="text-lg font-bold">微信</span>
            </button>
           <h1 className="font-bold text-lg truncate max-w-[50%] text-center">{activeChat?.name}</h1>
           <div className="w-24 flex justify-end">
               <button onClick={() => setIsChatDetailsOpen(true)} className="text-2xl text-gray-800 p-2">⋯</button>
           </div>
         </div>
       );
    }
    
    // --- Home Screen Header ---
    if (isMomentsOpen && !isIOS) {
       // Moments Header (WeChat Only)
       if (isPostingMoment) {
           return (
            <div className="h-28 bg-white/90 backdrop-blur-md pt-14 px-4 flex items-center justify-between border-b border-gray-200 shadow-sm z-[60] relative">
                <button onClick={() => setIsPostingMoment(false)} className="text-black font-medium p-2 -ml-2">取消</button>
                <button onClick={handlePostMoment} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-bold disabled:opacity-50" disabled={!momentText && !momentImage}>发表</button>
            </div>
           );
       }
       return (
        <div className="h-28 bg-transparent pt-14 px-4 flex items-center justify-between z-[60] fixed w-full pointer-events-none">
            <button onClick={() => setIsMomentsOpen(false)} className="text-white font-medium flex items-center drop-shadow-md pointer-events-auto p-2 -ml-2">
             <span className="text-3xl mr-1 leading-none">‹</span><span className="text-lg">发现</span>
            </button>
            <div className="flex gap-4 items-center pointer-events-auto">
                <button onClick={handleTriggerAIPost} disabled={isGeneratingAIPost} className={`text-white drop-shadow-md transition-all ${isGeneratingAIPost ? 'animate-spin opacity-70' : ''}`}><div className="bg-black/20 p-2 rounded-full backdrop-blur-sm">🪄</div></button>
                <button onClick={() => setIsPostingMoment(true)} className="text-white drop-shadow-md"><div className="bg-black/20 p-2 rounded-full backdrop-blur-sm">📷</div></button>
            </div>
        </div>
       );
    }

    if (isIOS) {
        // iOS Main List Header
        return (
            <div className="bg-white/90 pt-12 pb-2 px-4 flex flex-col z-[60] relative flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={onBack} className="text-blue-500 font-medium text-base">返回</button>
                    <button onClick={() => setShowMenu(!showMenu)} className="text-blue-500">
                        <div className="w-6 h-6 border border-blue-500 rounded-full flex items-center justify-center text-sm pb-0.5">✎</div>
                    </button>
                    {showMenu && (
                        <div className="absolute right-4 top-20 w-48 bg-gray-800 text-white rounded-lg shadow-xl py-1 z-50 backdrop-blur-md bg-opacity-90">
                        <button onClick={createManualCharacter} className="w-full text-left px-4 py-3 border-b border-gray-700 active:bg-gray-700 flex items-center gap-3"><span>👤</span> 新建联系人</button>
                        <button onClick={handleImportClick} className="w-full text-left px-4 py-3 active:bg-gray-700 flex items-center gap-3"><span>📥</span> 导入角色卡</button>
                        </div>
                    )}
                </div>
                <h1 className="font-bold text-3xl text-black mb-2">短信</h1>
                <div className="relative">
                    <div className="absolute left-2 top-1.5 text-gray-400">🔍</div>
                    <input type="text" placeholder="搜索" className="w-full bg-gray-100 rounded-lg pl-8 pr-4 py-1.5 text-sm text-gray-800 outline-none focus:bg-gray-200 transition-colors" />
                </div>
            </div>
        );
    }

    // Default WeChat Home Header
    return (
      <div className="h-28 bg-white pt-14 px-4 flex items-center justify-between border-b border-gray-200 shadow-sm z-[60] relative flex-shrink-0">
        <button onClick={onBack} className="text-blue-500 font-medium flex items-center p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-100">
          <span className="text-3xl mr-1 leading-none">‹</span><span className="text-lg">返回</span>
        </button>
        <h1 className="font-bold text-lg">{activeTab === 'chats' ? "微信" : (activeTab === 'contacts' ? '通讯录' : '发现')}</h1>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><span className="text-xl leading-none mb-1">+</span></button>
          {showMenu && (
            <div className="absolute right-0 top-10 w-48 bg-gray-800 text-white rounded-lg shadow-xl py-1 z-50 backdrop-blur-md bg-opacity-90">
              <button onClick={createManualCharacter} className="w-full text-left px-4 py-3 border-b border-gray-700 active:bg-gray-700 flex items-center gap-3"><span>👤</span> 创建角色</button>
              <button onClick={handleImportClick} className="w-full text-left px-4 py-3 active:bg-gray-700 flex items-center gap-3"><span>📥</span> 导入角色卡</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-gray-100 flex flex-col z-50 app-transition">
      
      {/* Floating Home Button */}
      <button 
        onClick={(e) => {
            e.stopPropagation();
            onBack();
        }}
        className="absolute right-0 top-[60%] z-[100] w-10 h-10 bg-black/30 backdrop-blur-md rounded-l-xl flex items-center justify-center text-white shadow-md active:bg-black/50 transition-colors border-l border-t border-b border-white/10 group hover:w-12"
        title="返回桌面"
      >
        <span className="text-sm">🏠</span>
      </button>

      {renderHeader()}

      {/* --- Main Content Area --- */}
      <div className={`flex-1 overflow-y-auto bg-gray-50 no-scrollbar relative`}>
        <input type="file" ref={fileInputRef} className="hidden" accept=".json,.png" onChange={handleFileChange} />
        <input type="file" ref={imageUploadRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        <input type="file" ref={avatarUploadRef} className="hidden" accept="image/*" onChange={handleChangeAvatar} />
        <input type="file" ref={momentImageRef} className="hidden" accept="image/*" onChange={handleMomentImageChange} />
        <input type="file" ref={momentCoverInputRef} className="hidden" accept="image/*" onChange={handleMomentCoverChange} />
        <input type="file" ref={momentAvatarInputRef} className="hidden" accept="image/*" onChange={handleMomentAvatarChange} />

        {activeChatId ? (
          isChatDetailsOpen ? (
              // === Chat Details (Settings) View ===
              <div className="bg-[#f5f5f5] min-h-full">
                  {/* Members Section */}
                  <div className="bg-white p-4 flex flex-wrap gap-4 border-b border-gray-200">
                      {/* Active Character */}
                      <div className="flex flex-col items-center gap-1 w-16">
                          <img src={activeChat?.avatar} className="w-12 h-12 rounded-lg object-cover" />
                          <span className="text-[10px] text-gray-500 truncate w-full text-center">{activeChat?.name}</span>
                      </div>
                      {/* Self (Placeholder) */}
                      <div className="flex flex-col items-center gap-1 w-16">
                          <img src="https://ui-avatars.com/api/?name=Me&background=random" className="w-12 h-12 rounded-lg object-cover" />
                          <span className="text-[10px] text-gray-500 truncate w-full text-center">我</span>
                      </div>
                      {/* Add Button */}
                      <div className="flex flex-col items-center gap-1 w-16">
                          <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-2xl">+</div>
                      </div>
                  </div>

                  {/* Settings Group 1 */}
                  <div className="mt-3 bg-white border-y border-gray-200">
                      <div className="flex justify-between items-center p-4 border-b border-gray-100 active:bg-gray-50">
                          <span className="text-sm text-black">查找聊天记录</span>
                          <span className="text-gray-300">›</span>
                      </div>
                  </div>

                  {/* Settings Group 2 (Switches) */}
                  <div className="mt-3 bg-white border-y border-gray-200">
                      <div className="flex justify-between items-center p-4 border-b border-gray-100">
                          <span className="text-sm text-black">置顶聊天</span>
                          <div 
                            onClick={handleTogglePin}
                            className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${activeChat?.isPinned ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${activeChat?.isPinned ? 'translate-x-4' : 'translate-x-0'}`}></div>
                          </div>
                      </div>
                      <div className="flex justify-between items-center p-4">
                          <span className="text-sm text-black">消息免打扰</span>
                          <div className="w-10 h-6 rounded-full bg-gray-300 p-0.5 cursor-pointer">
                              <div className="w-5 h-5 bg-white rounded-full shadow-sm"></div>
                          </div>
                      </div>
                  </div>

                  {/* Settings Group 3 (Actions) */}
                  <div className="mt-3 bg-white border-y border-gray-200">
                      <div className="flex justify-between items-center p-4 active:bg-gray-50 cursor-pointer">
                          <span className="text-sm text-black">设置当前聊天背景</span>
                          <span className="text-gray-300">›</span>
                      </div>
                      <div 
                        onClick={handleClearHistory}
                        className="flex justify-between items-center p-4 active:bg-gray-50 cursor-pointer border-t border-gray-100"
                      >
                          <span className="text-sm text-black">清空聊天记录</span>
                      </div>
                  </div>

                  {/* Delete Button */}
                  <div className="mt-6 mb-10 px-4">
                      <button 
                        onClick={handleDeleteChat}
                        className="w-full bg-white text-red-500 font-bold py-3 rounded-lg border border-gray-200 shadow-sm active:bg-gray-50"
                      >
                          删除聊天
                      </button>
                  </div>
              </div>
          ) : (
              // === Active Chat View ===
              <div className="p-4 flex flex-col gap-3 min-h-full">
                {activeChat?.messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm mt-10">开始和 {activeChat.name} 聊天吧</div>
                )}
                
                {/* Messages */}
                {activeChat?.messages.map((msg, index) => {
                    const isLast = index === activeChat.messages.length - 1;
                    
                    if (msg.type === MessageType.System) {
                        return <div key={msg.id} className="flex justify-center my-2"><span className="bg-gray-200 text-gray-500 text-xs px-2 py-1 rounded-sm">{msg.content}</span></div>;
                    }

                    if (isIOS) {
                        // iOS Bubble Style (Simplified)
                        return (
                            <div key={msg.id} className="flex flex-col w-full">
                                <div className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div 
                                        className={`
                                            max-w-[75%] px-4 py-2 text-[15px] leading-snug relative
                                            ${msg.role === 'user' 
                                                ? 'bg-[#007AFF] text-white rounded-2xl rounded-br-sm' 
                                                : 'bg-[#E9E9EB] text-black rounded-2xl rounded-bl-sm'}
                                            ${msg.type === MessageType.Image ? 'p-0 overflow-hidden bg-transparent' : ''}
                                        `}
                                    >
                                        {renderMessageContent(msg)}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // WeChat Bubble Style
                    return (
                      <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role !== 'user' && <img src={activeChat.avatar} className="w-9 h-9 rounded-md mr-2 self-start object-cover bg-gray-300" />}
                        <div 
                            onContextMenu={(e) => handleContextMenu(e, msg.id)}
                            onTouchStart={() => handleTouchStart(msg.id)}
                            onTouchEnd={handleTouchEnd}
                            className={`max-w-[75%] rounded-lg shadow-sm text-sm overflow-hidden select-none active:brightness-90 transition-all ${msg.role === 'user' ? 'bg-[#95ec69] text-black' : 'bg-white text-gray-800'} ${msg.type === MessageType.RedPacket || msg.type === MessageType.Gift ? 'p-0' : 'px-3 py-2'}`}
                        >
                          {renderMessageContent(msg)}
                        </div>
                      </div>
                    );
                })}
                
                {isTyping && (
                   <div className={`flex w-full ${isIOS ? 'justify-start' : 'justify-start'}`}>
                      {!isIOS && <img src={activeChat?.avatar} className="w-9 h-9 rounded-md mr-2 self-start object-cover bg-gray-300" />}
                      <div className={`${isIOS ? 'bg-[#E9E9EB] rounded-2xl px-4 py-2' : 'bg-white px-4 py-2 rounded-lg shadow-sm'}`}>
                        <span className="animate-pulse text-gray-400">...</span>
                      </div>
                   </div>
                )}
              </div>
          )
        ) : isMomentsOpen && !isIOS ? (
            // ... (Moments Code - Hidden for iOS) ...
             <div className="bg-white min-h-full pb-20">
                    {/* Parallax Header */}
                    <div 
                        className="relative h-64 bg-gray-800 cursor-pointer group"
                        onClick={() => momentCoverInputRef.current?.click()}
                    >
                        <img src={momentCover} className="w-full h-full object-cover opacity-90" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                             <span className="text-white opacity-0 group-hover:opacity-100 font-medium text-xs border border-white px-3 py-1 rounded-full backdrop-blur-md">更换封面</span>
                        </div>
                        <div className="absolute -bottom-8 right-4 flex items-end gap-3 z-20 pointer-events-none">
                            <span className="text-white font-bold text-lg mb-10 mr-2 drop-shadow-md">我</span>
                            <div 
                                className="pointer-events-auto cursor-pointer" 
                                onClick={(e) => { e.stopPropagation(); momentAvatarInputRef.current?.click(); }}
                            >
                                <img src={momentUserAvatar} className="w-16 h-16 rounded-xl border-2 border-white bg-white shadow-md object-cover" />
                            </div>
                        </div>
                    </div>
                    <div className="h-10"></div> {/* Spacer for negative margin avatar */}

                    {/* Posts List */}
                    <div className="flex flex-col">
                        {moments.map(moment => {
                            const userAvatar = moment.userId === 'user' 
                                ? momentUserAvatar
                                : contacts.find(c => c.id === moment.userId)?.avatar;
                            const userName = moment.userId === 'user' ? '我' : contacts.find(c => c.id === moment.userId)?.name;

                            return (
                                <div key={moment.id} className="flex gap-3 p-4 border-b border-gray-100">
                                    <img src={userAvatar} className="w-10 h-10 rounded-lg bg-gray-200 object-cover" />
                                    <div className="flex-1">
                                        <h3 className="font-bold text-[#576b95] text-sm mb-1">{userName}</h3>
                                        <p className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">{moment.content}</p>
                                        {moment.images.length > 0 && (
                                            <div className="mb-2">
                                                <img src={moment.images[0]} className="max-w-[70%] max-h-60 rounded-md object-cover" />
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                                            <span>{getRelativeTime(moment.timestamp)}</span>
                                            <button className="bg-gray-100 px-2 py-0.5 rounded text-[#576b95]">•••</button>
                                        </div>
                                        
                                        {/* Likes & Comments Area */}
                                        {(moment.likes.length > 0 || moment.comments.length > 0) && (
                                            <div className="bg-[#f7f7f7] rounded-md p-2 text-sm">
                                                {moment.likes.length > 0 && (
                                                    <div className="text-[#576b95] border-b border-gray-200/50 pb-1 mb-1 flex items-center">
                                                        <span className="mr-1">♡</span>
                                                        {moment.likes.join(', ')}
                                                    </div>
                                                )}
                                                {moment.comments.map(c => (
                                                    <div key={c.id} className="mb-0.5 last:mb-0">
                                                        <span className="text-[#576b95] font-semibold">{c.name}:</span>
                                                        <span className="text-gray-700 ml-1">{c.content}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
        ) : (
            // === Lists View (Chats / Contacts / Discover) ===
            <>
              {activeTab === 'chats' && (
                <div className="bg-white min-h-full">
                  {/* iOS Pinned Contacts */}
                  {isIOS && (
                      <div className="px-4 py-6 border-b border-gray-100 grid grid-cols-3 gap-2 justify-items-center">
                          {chats.filter(c => c.isPinned).map(chat => (
                              <div key={chat.id} onClick={() => setActiveChatId(chat.id)} className="flex flex-col items-center gap-2 cursor-pointer w-20">
                                  <div className="w-16 h-16 rounded-full overflow-hidden relative shadow-sm">
                                      <img src={chat.avatar} className="w-full h-full object-cover" />
                                      {chat.unreadCount > 0 && <div className="absolute top-0 right-0 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>}
                                  </div>
                                  <span className="text-xs text-gray-600 text-center leading-tight line-clamp-2">{chat.name.split(' ')[0]}</span>
                              </div>
                          ))}
                          {chats.filter(c => c.isPinned).length === 0 && (
                             <div className="col-span-3 text-gray-400 text-xs text-center py-4">无置顶会话</div>
                          )}
                      </div>
                  )}

                  {/* Chat List */}
                  <div className={`divide-y divide-gray-100 ${isIOS ? 'px-4' : ''}`}>
                    {chats.filter(c => !isIOS || !c.isPinned).map(chat => (
                        <div 
                        key={chat.id} 
                        onClick={() => setActiveChatId(chat.id)}
                        className={`flex items-center active:bg-gray-50 cursor-pointer ${isIOS ? 'py-3' : 'p-4'}`}
                        >
                            {!isIOS && (
                                <div className="relative">
                                    <img src={chat.avatar} alt="" className="w-12 h-12 rounded-lg mr-3 object-cover bg-gray-200" />
                                    {chat.unreadCount > 0 && <div className="absolute -top-1 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">{chat.unreadCount}</div>}
                                </div>
                            )}
                            
                            {isIOS && (
                                <div className="relative mr-3">
                                     <div className="w-2 h-2 rounded-full bg-blue-500 absolute -left-3 top-1/2 -translate-y-1/2 opacity-0"></div>
                                     {chat.unreadCount > 0 && <div className="w-2.5 h-2.5 rounded-full bg-[#007AFF] absolute -left-3 top-1/2 -translate-y-1/2"></div>}
                                     <img src={chat.avatar} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h3 className={`text-gray-900 truncate ${isIOS ? 'font-bold text-sm' : 'font-semibold'}`}>{chat.name}</h3>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-gray-400 ${isIOS ? 'text-xs' : 'text-xs'}`}>{getRelativeTime(chat.messages[chat.messages.length - 1]?.timestamp || Date.now())}</span>
                                        {isIOS && <span className="text-gray-300 text-xs">›</span>}
                                    </div>
                                </div>
                                <p className={`truncate ${isIOS ? 'text-gray-500 text-sm' : 'text-sm text-gray-500'}`}>
                                    {chat.messages[chat.messages.length - 1]?.type === MessageType.Image 
                                        ? '[图片]' 
                                        : chat.messages[chat.messages.length - 1]?.content || '暂无消息'}
                                </p>
                            </div>
                        </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!isIOS && activeTab === 'contacts' && (
                <div>
                   <div className="px-4 py-2 bg-gray-100 text-xs text-gray-500 font-bold uppercase sticky top-0">我的联系人</div>
                   <div className="divide-y divide-gray-200 bg-white">
                     {contacts.map(contact => (
                       <div key={contact.id} onClick={() => startChatWithContact(contact)} className="flex items-center p-3 px-4 active:bg-gray-100 cursor-pointer">
                         <img src={contact.avatar} alt="" className="w-10 h-10 rounded-lg mr-3 object-cover bg-gray-200" />
                         <div className="flex-1"><h3 className="font-semibold text-gray-900">{contact.name}</h3></div>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {!isIOS && activeTab === 'discover' && (
                 <div className="bg-gray-100 h-full pt-2 divide-y divide-gray-200">
                     <div onClick={() => setIsMomentsOpen(true)} className="bg-white flex items-center p-3 px-4 cursor-pointer active:bg-gray-50 mb-2">
                         <div className="w-6 h-6 mr-4 flex items-center justify-center"><span className="text-xl">⭕️</span></div>
                         <div className="flex-1 text-base text-gray-900">朋友圈</div><span className="text-gray-300">›</span>
                     </div>
                     <div onClick={() => onOpenExternalApp(AppID.CoupleSpace)} className="bg-white flex items-center p-3 px-4 cursor-pointer active:bg-gray-50">
                         <div className="w-6 h-6 mr-4 flex items-center justify-center"><span className="text-xl">💕</span></div>
                         <div className="flex-1 text-base text-gray-900">情侣空间</div><span className="text-gray-300">›</span>
                     </div>
                 </div>
              )}
            </>
        )}
      </div>

      {/* --- Bottom Input (Active Chat) OR Bottom Tabs (List View) --- */}
      {activeChatId && !isChatDetailsOpen ? (
        <div className={`w-full flex flex-col justify-end border-t border-gray-200 z-20 flex-shrink-0 ${isIOS ? 'bg-white' : 'bg-gray-100'}`}>
            {/* Plus Menu Panel (WeChat only) */}
            {!isIOS && isPlusMenuOpen && (
                <div className="bg-gray-100 border-t border-gray-200 p-6 animate-[slideUp_0.2s_ease-out]">
                    <div className="grid grid-cols-4 gap-6">
                        <div onClick={() => imageUploadRef.current?.click()} className="flex flex-col items-center gap-2 cursor-pointer active:opacity-70 group">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-gray-50 transition-colors"><span className="text-2xl">🖼️</span></div><span className="text-xs text-gray-500">照片</span>
                        </div>
                        <div onClick={() => setShowRedPacketModal(true)} className="flex flex-col items-center gap-2 cursor-pointer active:opacity-70 group">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-gray-50 transition-colors"><span className="text-2xl">🧧</span></div><span className="text-xs text-gray-500">红包</span>
                        </div>
                        <div onClick={() => setShowGiftModal(true)} className="flex flex-col items-center gap-2 cursor-pointer active:opacity-70 group">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-gray-50 transition-colors"><span className="text-2xl">🎁</span></div><span className="text-xs text-gray-500">礼物</span>
                        </div>
                        <div onClick={() => avatarUploadRef.current?.click()} className="flex flex-col items-center gap-2 cursor-pointer active:opacity-70 group">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-gray-50 transition-colors"><span className="text-2xl">🎭</span></div><span className="text-xs text-gray-500">换头像</span>
                        </div>
                        <div onClick={() => setActiveChatId(null)} className="flex flex-col items-center gap-2 cursor-pointer active:opacity-70 group">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-gray-50 transition-colors"><span className="text-2xl">↩️</span></div><span className="text-xs text-gray-500">返回</span>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Input Bar */}
            <div className={`p-2 pb-8 safe-area-pb flex items-center gap-2 ${isIOS ? 'bg-white px-3' : 'bg-gray-100 p-3'}`}>
                {isIOS ? (
                    // iOS Input Bar Style
                    <>
                        <button onClick={() => imageUploadRef.current?.click()} className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 flex-shrink-0">
                            <span className="text-lg">📷</span>
                        </button>
                        <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 flex-shrink-0">
                            <div className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-500">A</div>
                        </button>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                className="w-full bg-white border border-gray-300 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                                placeholder="发消息"
                            />
                        </div>
                        {inputValue ? (
                            <button onClick={handleSend} className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center text-white flex-shrink-0 mb-0.5">
                                <span className="text-xs font-bold">↑</span>
                            </button>
                        ) : (
                            <button className="w-8 h-8 flex items-center justify-center text-gray-400 flex-shrink-0">
                                <span>🎙️</span>
                            </button>
                        )}
                    </>
                ) : (
                    // WeChat Input Bar Style
                    <>
                        <button onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)} className={`text-gray-500 w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center transition-transform ${isPlusMenuOpen ? 'rotate-45' : ''}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            onFocus={() => setIsPlusMenuOpen(false)}
                            className="flex-1 bg-white rounded-md px-3 py-2 text-sm focus:outline-none"
                        />
                        <button className="text-gray-500 p-1"><span className="text-2xl">☺</span></button>
                        {inputValue && <button onClick={handleSend} className="bg-green-500 text-white px-3 py-1.5 rounded-md text-sm font-bold">发送</button>}
                    </>
                )}
            </div>
        </div>
      ) : isMomentsOpen || isChatDetailsOpen ? (
          null
      ) : !isIOS ? (
        // WeChat Bottom Tabs
        <div className="w-full bg-gray-100 border-t border-gray-300 h-20 pb-6 flex justify-around items-center text-xs text-gray-500 z-50 flex-shrink-0">
           <button onClick={() => setActiveTab('chats')} className={`flex flex-col items-center gap-1 ${activeTab === 'chats' ? 'text-green-600' : ''}`}>
             <div className="text-2xl">💬</div><span>微信</span>{chats.reduce((a,b)=>a + b.unreadCount, 0) > 0 && <span className="absolute top-2 ml-4 w-2 h-2 bg-red-500 rounded-full"></span>}
           </button>
           <button onClick={() => setActiveTab('contacts')} className={`flex flex-col items-center gap-1 ${activeTab === 'contacts' ? 'text-green-600' : ''}`}>
             <div className="text-2xl">👥</div><span>通讯录</span>
           </button>
           <button onClick={() => setActiveTab('discover')} className={`flex flex-col items-center gap-1 ${activeTab === 'discover' ? 'text-green-600' : ''}`}>
             <div className="text-2xl">🧭</div><span>发现</span>
           </button>
        </div>
      ) : null}

      {/* Red Packet Modal (WeChat only) */}
      {!isIOS && showRedPacketModal && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-[#f3f3f3] w-full max-w-xs rounded-lg overflow-hidden shadow-2xl animate-[scaleIn_0.2s_ease-out]">
                <div className="bg-[#d95940] text-white p-4 text-center font-bold text-lg relative">发红包<button onClick={() => setShowRedPacketModal(false)} className="absolute left-4 top-4 text-sm font-normal">取消</button></div>
                <div className="p-6 flex flex-col gap-4">
                    <div className="bg-white p-3 rounded-md flex justify-between items-center"><label className="text-sm font-bold w-20">金额</label><input type="number" value={rpAmount} onChange={(e) => setRpAmount(e.target.value)} className="text-right flex-1 outline-none text-gray-700" placeholder="0.00" /><span className="ml-2 text-sm">元</span></div>
                    <div className="bg-white p-3 rounded-md flex justify-between items-center"><label className="text-sm font-bold w-20">数量</label><input type="number" value={rpCount} onChange={(e) => setRpCount(e.target.value)} className="text-right flex-1 outline-none text-gray-700" placeholder="1" /><span className="ml-2 text-sm">个</span></div>
                    <button onClick={handleSendRedPacket} disabled={!rpAmount || !rpCount} className="bg-[#d95940] text-white py-3 rounded-md font-bold mt-2 disabled:opacity-50">塞钱进红包</button>
                </div>
            </div>
        </div>
      )}

      {/* Gift Shop Modal */}
      {!isIOS && showGiftModal && (
          <div className="absolute inset-0 bg-black/50 z-[100] flex items-end justify-center">
              <div className="bg-white w-full rounded-t-2xl overflow-hidden shadow-2xl max-h-[80%] flex flex-col animate-[slideUp_0.2s_ease-out]">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <div className="flex gap-4 text-sm font-bold">
                          <button 
                            onClick={() => setIsCustomGiftMode(false)}
                            className={`${!isCustomGiftMode ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500'}`}
                          >
                              礼物商店
                          </button>
                          <button 
                            onClick={() => setIsCustomGiftMode(true)}
                            className={`${isCustomGiftMode ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500'}`}
                          >
                              自定义
                          </button>
                      </div>
                      <button onClick={() => setShowGiftModal(false)} className="text-gray-500 text-2xl leading-none">×</button>
                  </div>
                  
                  <div className="p-4 overflow-y-auto">
                      {!isCustomGiftMode ? (
                          <div className="grid grid-cols-3 gap-4">
                              {GIFT_SHOP.map(gift => (
                                  <div key={gift.id} onClick={() => handleSendGift(gift)} className="flex flex-col items-center p-3 rounded-xl border border-gray-100 active:bg-pink-50 cursor-pointer hover:shadow-md transition-all">
                                      <div className="text-4xl mb-2">{gift.icon}</div>
                                      <span className="font-bold text-sm text-gray-800">{gift.name}</span>
                                      <span className="text-xs text-pink-500 font-bold">¥ {gift.price}</span>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="flex flex-col gap-4">
                              <div className="flex justify-center mb-2">
                                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-6xl shadow-inner relative overflow-hidden">
                                      {customGiftIcon}
                                  </div>
                              </div>
                              
                              <div className="grid grid-cols-6 gap-2 mb-2">
                                  {['🎁', '🌹', '💍', '🍰', '📱', '🏎️', '🏠', '🚀', '🐱', '🐶', '💎', '🧸'].map(emo => (
                                      <button key={emo} onClick={() => setCustomGiftIcon(emo)} className={`text-2xl p-2 rounded-lg ${customGiftIcon === emo ? 'bg-pink-100 ring-1 ring-pink-300' : 'bg-gray-50'}`}>{emo}</button>
                                  ))}
                              </div>

                              <div>
                                  <label className="text-xs font-bold text-gray-500">礼物名称</label>
                                  <input 
                                    type="text" 
                                    value={customGiftName}
                                    onChange={(e) => setCustomGiftName(e.target.value)}
                                    placeholder="例如：超级跑车"
                                    className="w-full bg-gray-50 p-3 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-pink-200"
                                  />
                              </div>

                              <div>
                                  <label className="text-xs font-bold text-gray-500">价格 (¥)</label>
                                  <input 
                                    type="number" 
                                    value={customGiftPrice}
                                    onChange={(e) => setCustomGiftPrice(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-gray-50 p-3 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-pink-200"
                                  />
                              </div>

                              <button 
                                onClick={handleSendCustomGiftAction}
                                disabled={!customGiftName || !customGiftPrice}
                                className="bg-pink-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-pink-200 disabled:opacity-50 mt-2"
                              >
                                  赠送礼物
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Delete Message Modal/Menu */}
      {longPressedMessageId && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center" onClick={() => setLongPressedMessageId(null)}>
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
              <div className="bg-white rounded-lg shadow-xl overflow-hidden min-w-[200px] z-[201] animate-[scaleIn_0.1s_ease-out]">
                  <button onClick={handleDeleteMessage} className="w-full p-4 text-red-500 font-bold active:bg-gray-100 border-b border-gray-100">删除消息</button>
                  <button onClick={() => setLongPressedMessageId(null)} className="w-full p-4 text-gray-600 active:bg-gray-100">取消</button>
              </div>
          </div>
      )}

    </div>
  );
};

export default ChatApp;
