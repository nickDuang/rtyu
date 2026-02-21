
import React, { useState, useEffect, useRef } from 'react';
import { performProductSearch, generateTaobaoCSResponse, evaluatePayRequest } from '../../services/geminiService';
import { TaobaoProduct, Contact, ChatSession, Message, MessageType } from '../../types';

interface TaobaoAppProps {
  onBack: () => void;
  isOpen: boolean;
}

// --- Local Types ---
interface CartItem extends TaobaoProduct {
    count: number;
    selected: boolean;
}

interface LogisticsStep {
    time: string;
    status: string;
    location: string;
}

interface Order {
    id: string;
    items: CartItem[];
    total: number;
    status: 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'refunding';
    timestamp: number;
    logistics: LogisticsStep[];
}

interface UserInfo {
    name: string;
    avatar: string;
    address: string;
    phone: string;
}

interface Address {
    id: string;
    name: string;
    phone: string;
    address: string;
    tag?: string;
    isDefault?: boolean;
}

interface CSMessage {
    id: string;
    role: 'user' | 'service';
    content: string;
    timestamp: number;
}

// --- Helper Functions for Color ---
const hsvToHex = (h: number, s: number, v: number) => {
    s /= 100;
    v /= 100;
    let c = v * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = v - c;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToHsv = (hex: string) => {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
        h = 0; 
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
};

const THEME_PRESETS = [
    '#ff5000', // Classic Orange
    '#ff0036', // Tmall Red
    '#0066cc', // Tech Blue
    '#8e44ad', // Elegant Purple
    '#2ecc71', // Fresh Green
    '#34495e', // Cool Dark
    '#e91e63', // Hot Pink
    '#f1c40f', // Vibrant Yellow
];

const TaobaoApp: React.FC<TaobaoAppProps> = ({ onBack, isOpen }) => {
  // --- Navigation State ---
  const [activeTab, setActiveTab] = useState<'home' | 'cart' | 'me'>('home');
  const [subView, setSubView] = useState<'none' | 'detail' | 'order_detail' | 'logistics' | 'address_edit' | 'create_item' | 'after_sales_options' | 'cs_chat' | 'checkout' | 'address_select' | 'theme_settings'>('none');
  
  // --- Theme State ---
  const [themeColor, setThemeColor] = useState<string>(() => localStorage.getItem('taobao_theme_color') || '#ff5000');
  const [backgroundImage, setBackgroundImage] = useState<string>(() => localStorage.getItem('taobao_background_image') || '');
  const [bgOpacity, setBgOpacity] = useState<number>(() => parseFloat(localStorage.getItem('taobao_bg_opacity') || '1'));

  // HSV Picker State
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hsv, setHsv] = useState({ h: 0, s: 100, v: 100 });

  // --- Data State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(() => JSON.parse(localStorage.getItem('taobao_search_history') || '[]'));
  const [products, setProducts] = useState<TaobaoProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => JSON.parse(localStorage.getItem('taobao_cart') || '[]'));
  const [orders, setOrders] = useState<Order[]>(() => JSON.parse(localStorage.getItem('taobao_orders') || '[]'));
  const [userInfo, setUserInfo] = useState<UserInfo>(() => JSON.parse(localStorage.getItem('taobao_user') || JSON.stringify({
      name: '淘宝用户',
      avatar: 'https://ui-avatars.com/api/?name=User&background=ff9000&color=fff',
      address: '幸福街道 520号 梦想花园 1栋 101室',
      phone: '138****8888'
  })));
  
  const [userAddresses, setUserAddresses] = useState<Address[]>(() => JSON.parse(localStorage.getItem('taobao_addresses') || JSON.stringify([
      { id: '1', name: '淘宝用户', phone: '138****8888', address: '幸福街道 520号 梦想花园 1栋 101室', tag: '家', isDefault: true },
      { id: '2', name: '打工人', phone: '136****9999', address: '高新园区 互联网大厦 B座 10层', tag: '公司' },
      { id: '3', name: '老妈', phone: '135****6666', address: '老家幸福村 3组 66号', tag: '父母家' }
  ])));

  // --- Temporary State ---
  const [selectedProduct, setSelectedProduct] = useState<TaobaoProduct | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Custom Item Inputs
  const [customItem, setCustomItem] = useState({ title: '', price: '', shop: '自定义店铺' });

  // --- CS Chat State ---
  const [csMessages, setCsMessages] = useState<CSMessage[]>([]);
  const [csInput, setCsInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // --- Payment & Friend Pay State ---
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showContactSelect, setShowContactSelect] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [payRequestNote, setPayRequestNote] = useState('我们的情侣款 🥺');

  // Persistence
  useEffect(() => { localStorage.setItem('taobao_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('taobao_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('taobao_user', JSON.stringify(userInfo)); }, [userInfo]);
  useEffect(() => { localStorage.setItem('taobao_search_history', JSON.stringify(searchHistory)); }, [searchHistory]);
  useEffect(() => { localStorage.setItem('taobao_addresses', JSON.stringify(userAddresses)); }, [userAddresses]);
  useEffect(() => { localStorage.setItem('taobao_theme_color', themeColor); }, [themeColor]);
  useEffect(() => { localStorage.setItem('taobao_background_image', backgroundImage); }, [backgroundImage]);
  useEffect(() => { localStorage.setItem('taobao_bg_opacity', bgOpacity.toString()); }, [bgOpacity]);

  // Initial Load
  useEffect(() => {
      if (isOpen) {
          if (products.length === 0) handleSearch('猜你喜欢');
          // Load contacts for Friend Pay
          const savedContacts = localStorage.getItem('ephone_contacts');
          if (savedContacts) setContacts(JSON.parse(savedContacts));
      }
  }, [isOpen]);

  // --- Logic Helpers ---

  const handleSearch = async (term: string) => {
      if (!term.trim()) return;
      
      // Update History: Add to top, remove duplicates, limit to 10
      setSearchHistory(prev => {
          const newHistory = [term, ...prev.filter(t => t !== term)].slice(0, 10);
          return newHistory;
      });

      setLoading(true);
      const results = await performProductSearch(term || '热门商品');
      setProducts(results);
      setLoading(false);
  };

  const clearHistory = () => {
      if (confirm('确认清空历史搜索记录吗？')) {
          setSearchHistory([]);
      }
  };

  const addToCart = (product: TaobaoProduct) => {
      setCart(prev => {
          const existing = prev.find(i => i.id === product.id);
          if (existing) {
              return prev.map(i => i.id === product.id ? { ...i, count: i.count + 1 } : i);
          }
          return [...prev, { ...product, count: 1, selected: true }];
      });
      alert('已加入购物车');
  };

  // --- CHECKOUT FLOW ---
  const initiateCheckout = () => {
      const selectedItems = cart.filter(i => i.selected);
      if (selectedItems.length === 0) return alert("请先勾选商品");
      // Instead of showing payment modal directly, go to Checkout Confirmation view
      setSubView('checkout');
  };

  const handleSelectAddress = (addr: Address) => {
      setUserInfo(prev => ({
          ...prev,
          name: addr.name,
          phone: addr.phone,
          address: addr.address
      }));
      setSubView('checkout');
  };

  const handleSubmitOrder = () => {
      setShowPaymentMethodModal(true);
  };

  // 1. Self Pay (Existing Logic)
  const handleSelfPay = () => {
      setShowPaymentMethodModal(false);
      setSubView('none'); // Close checkout view on success
      const selectedItems = cart.filter(i => i.selected);
      const total = selectedItems.reduce((sum, item) => sum + item.price * item.count, 0);
      
      const walletPassword = localStorage.getItem('ephone_wallet_password');
      if (!walletPassword) {
          if (confirm("支付失败：尚未设置支付密码。\n是否前往【钱包】应用设置？")) onBack();
          return;
      }

      const inputPass = prompt(`合计 ¥${total.toFixed(2)}\n请输入支付密码：`);
      if (inputPass === null) return;

      if (inputPass !== walletPassword) {
          alert("密码错误，支付失败！");
          return;
      }

      let balanceStr = localStorage.getItem('ephone_wallet_balance');
      let currentBalance = balanceStr ? parseFloat(balanceStr) : 10000;

      if (currentBalance < total) {
          alert(`余额不足！当前余额: ¥${currentBalance.toFixed(2)}`);
          return;
      }

      const newBalance = currentBalance - total;
      localStorage.setItem('ephone_wallet_balance', newBalance.toString());

      // Record Tx
      const savedTxs = JSON.parse(localStorage.getItem('ephone_wallet_transactions') || '[]');
      const newTx = {
          id: `tx_${Date.now()}`,
          title: `淘宝购物 - ${selectedItems[0].title.substring(0, 10)}...`,
          amount: total,
          type: 'expense',
          date: new Date().toLocaleString()
      };
      localStorage.setItem('ephone_wallet_transactions', JSON.stringify([newTx, ...savedTxs]));

      createOrder(selectedItems, total, 'shipped'); // Instant ship for self pay
      alert(`支付成功！\n剩余余额 ¥${newBalance.toFixed(2)}`);
  };

  // 2. Friend Pay Logic
  const handleFriendPay = async (contactId: string) => {
      setShowContactSelect(false);
      setShowPaymentMethodModal(false);
      setSubView('none'); // Close checkout view

      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;

      const selectedItems = cart.filter(i => i.selected);
      const total = selectedItems.reduce((sum, item) => sum + item.price * item.count, 0);
      const mainItem = selectedItems[0];

      // A. Create Pending Order
      const orderId = createOrder(selectedItems, total, 'pending_payment');

      // B. Create Chat Message (Pay Request Card)
      const payRequestContent = JSON.stringify({
          orderId,
          productTitle: mainItem.title,
          productImage: mainItem.image,
          price: total,
          note: payRequestNote || "帮我付个款嘛~",
          status: 'pending'
      });

      // C. Find/Create Chat Session & Append Message
      const savedChats = localStorage.getItem('ephone_chats');
      const allChats: ChatSession[] = savedChats ? JSON.parse(savedChats) : [];
      let targetChat = allChats.find(c => c.contactId === contactId);
      
      if (!targetChat) {
          targetChat = {
              id: `chat_${Date.now()}`,
              contactId: contact.id,
              name: contact.name,
              avatar: contact.avatar,
              isPinned: false,
              unreadCount: 0,
              persona: contact.description,
              messages: []
          };
          allChats.unshift(targetChat);
      }

      const requestMsg: Message = {
          id: `msg_${Date.now()}`,
          role: 'user',
          type: MessageType.PayRequest,
          content: payRequestContent,
          timestamp: Date.now()
      };
      targetChat.messages.push(requestMsg);
      localStorage.setItem('ephone_chats', JSON.stringify(allChats));

      alert(`代付请求已发送给 ${contact.name}！请等待对方处理。`);
      setActiveTab('me');

      // D. Trigger AI Evaluation (Simulated async)
      setTimeout(async () => {
          // Re-read chats to ensure freshness
          const currentChats: ChatSession[] = JSON.parse(localStorage.getItem('ephone_chats') || '[]');
          const activeChat = currentChats.find(c => c.id === targetChat!.id);
          if (!activeChat) return;

          const decision = await evaluatePayRequest(contact.name, contact.description, mainItem.title, total, payRequestNote);
          
          // 1. Send Text Reply
          const replyMsg: Message = {
              id: `msg_${Date.now()}`,
              role: 'assistant',
              type: MessageType.Text,
              content: decision.reply,
              timestamp: Date.now()
          };
          activeChat.messages.push(replyMsg);

          // 2. If Agreed, Update Order & Card Status
          if (decision.agreed) {
              // Update Order
              setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o));
              // Update localStorage Orders
              const currentOrders = JSON.parse(localStorage.getItem('taobao_orders') || '[]');
              const updatedOrders = currentOrders.map((o: Order) => o.id === orderId ? { ...o, status: 'shipped' } : o);
              localStorage.setItem('taobao_orders', JSON.stringify(updatedOrders));

              // Update Card Message in Chat to 'paid'
              const msgToUpdate = activeChat.messages.find(m => m.id === requestMsg.id);
              if (msgToUpdate) {
                  const data = JSON.parse(msgToUpdate.content);
                  data.status = 'paid';
                  msgToUpdate.content = JSON.stringify(data);
              }
          }

          localStorage.setItem('ephone_chats', JSON.stringify(currentChats));
      }, 3000); // 3s delay for realism
  };

  const createOrder = (items: CartItem[], total: number, status: Order['status']) => {
      const now = new Date();
      const logistics: LogisticsStep[] = [
          { time: now.toLocaleString(), status: '已下单', location: '系统' },
          { time: new Date(now.getTime() + 3600000).toLocaleString(), status: '商家已发货', location: '发货仓' },
          { time: new Date(now.getTime() + 86400000).toLocaleString(), status: '运输中', location: '中转中心' }
      ];

      const newOrder: Order = {
          id: `TB${Date.now()}`,
          items,
          total,
          status,
          timestamp: Date.now(),
          logistics
      };

      setOrders(prev => [newOrder, ...prev]);
      setCart(prev => prev.filter(i => !i.selected)); // Remove bought items
      return newOrder.id;
  };

  const handleCustomItemCreate = () => {
      if (!customItem.title || !customItem.price) return;
      const newProduct: TaobaoProduct = {
          id: `custom_${Date.now()}`,
          title: customItem.title,
          price: parseFloat(customItem.price),
          shop: customItem.shop,
          sales: '0人付款',
          image: 'https://via.placeholder.com/400x400/ff9000/ffffff?text=Custom'
      };
      setProducts(prev => [newProduct, ...prev]);
      setSubView('none');
      setCustomItem({ title: '', price: '', shop: '自定义店铺' });
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  // --- Color Picker Logic ---
  const openColorPicker = () => {
      setHsv(hexToHsv(themeColor));
      setShowColorPicker(true);
  };

  const confirmColorPicker = () => {
      const newHex = hsvToHex(hsv.h, hsv.s, hsv.v);
      setThemeColor(newHex);
      setShowColorPicker(false);
  };

  // --- CS Logic ---

  const handleAfterSalesClick = () => {
      setSubView('after_sales_options');
  };

  const startCSChat = () => {
      setSubView('cs_chat');
      // Initialize with greeting if empty
      if (csMessages.length === 0) {
          const productName = selectedOrder?.items[0]?.title || "商品";
          const initialMsg: CSMessage = {
              id: `msg_${Date.now()}`,
              role: 'service',
              content: `亲，您好！我是售后客服小蜜。关于订单 "${productName}" 您有什么问题吗？😊`,
              timestamp: Date.now()
          };
          setCsMessages([initialMsg]);
      }
  };

  const handleCSSend = async () => {
      if (!csInput.trim()) return;

      const userMsg: CSMessage = {
          id: `msg_${Date.now()}`,
          role: 'user',
          content: csInput,
          timestamp: Date.now()
      };

      setCsMessages(prev => [...prev, userMsg]);
      setCsInput('');
      setIsTyping(true);

      const history = [...csMessages, userMsg].map(m => ({
          role: m.role === 'service' ? 'assistant' : 'user',
          content: m.content
      }));

      const productInfo = selectedOrder?.items[0]?.title || "Unknown Product";

      try {
          const replyText = await generateTaobaoCSResponse(history, productInfo);
          const aiMsg: CSMessage = {
              id: `msg_${Date.now() + 1}`,
              role: 'service',
              content: replyText,
              timestamp: Date.now()
          };
          setCsMessages(prev => [...prev, aiMsg]);
      } catch (e) {
          console.error(e);
      } finally {
          setIsTyping(false);
      }
  };


  // --- Views ---

  // 1. Home Feed
  const renderHome = () => (
      <>
        {/* Search Bar with Dynamic Theme Background */}
        <div 
            className="p-3 pt-12 flex items-center gap-3 sticky top-0 z-20 shadow-sm transition-colors duration-300"
            style={{ background: themeColor }}
        >
            <button onClick={onBack} className="text-white text-2xl font-light px-1">‹</button>
            <div className="flex-1 bg-white rounded-full flex items-center px-4 py-1.5">
                <span className="text-gray-400 mr-2">🔍</span>
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }} className="flex-1">
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="搜索宝贝" 
                        className="w-full outline-none text-sm text-gray-800"
                    />
                </form>
                <button 
                    className="text-white text-xs px-3 py-1 rounded-full font-bold"
                    style={{ backgroundColor: themeColor }} 
                    onClick={() => handleSearch(searchTerm)}
                >
                    搜索
                </button>
            </div>
            <button onClick={() => setSubView('create_item')} className="text-white text-2xl" title="自定义商品">+</button>
        </div>

        {/* Latest Logistics Widget */}
        {orders.length > 0 && orders[0].status !== 'completed' && orders[0].status !== 'pending_payment' && (
            <div className="mx-3 mt-3 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-sm flex items-center gap-3" onClick={() => { setSelectedOrder(orders[0]); setSubView('logistics'); }}>
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 text-lg">🚚</div>
                <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-gray-800">运输中</span>
                        <span className="text-xs text-gray-400">{orders[0].logistics[orders[0].logistics.length-1]?.time.split(' ')[1]}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">您的包裹已到达 {orders[0].logistics[orders[0].logistics.length-1]?.location}</div>
                </div>
            </div>
        )}

        {/* Categories */}
        <div className="grid grid-cols-5 gap-y-4 m-3 bg-white/90 backdrop-blur-sm p-4 rounded-xl">
            {['天猫', '聚划算', '天猫国际', '外卖', '超市', '充值', '飞猪旅行', '领金币', '拍卖', '分类'].map(cat => (
                <div key={cat} onClick={() => { setSearchTerm(cat); handleSearch(cat); }} className="flex flex-col items-center gap-1 cursor-pointer">
                    <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl text-white"
                        style={{ backgroundColor: themeColor, opacity: 0.8 }}
                    >
                        🎁
                    </div>
                    <span className="text-[10px] text-gray-600">{cat}</span>
                </div>
            ))}
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
            <div className="mx-3 mb-3 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-700 text-sm">历史搜索</h3>
                    <button onClick={clearHistory} className="text-gray-400 text-xs p-1">🗑️</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {searchHistory.map((term, index) => (
                        <button 
                            key={`${term}-${index}`}
                            onClick={() => { setSearchTerm(term); handleSearch(term); }}
                            className="bg-gray-100 px-3 py-1.5 rounded-full text-xs text-gray-600 active:bg-gray-200 transition-colors"
                        >
                            {term}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Product Feed */}
        <div className="px-3 pb-20">
            <div className="flex items-center gap-2 mb-3">
                <h3 className={`font-bold text-base ${backgroundImage ? 'text-white drop-shadow-md' : 'text-gray-800'}`}>猜你喜欢</h3>
                {loading && <span className="animate-spin" style={{ color: themeColor }}>↻</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
                {products.map(p => (
                    <div key={p.id} onClick={() => { setSelectedProduct(p); setSubView('detail'); }} className="bg-white rounded-lg overflow-hidden shadow-sm flex flex-col cursor-pointer active:opacity-90">
                        <div className="aspect-square bg-gray-200 relative">
                            <img src={p.image || `https://picsum.photos/400?random=${p.id}`} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2 flex-1 flex flex-col">
                            <h3 className="text-xs text-gray-800 line-clamp-2 font-medium leading-relaxed mb-2 h-8">{p.title}</h3>
                            <div className="mt-auto flex items-baseline gap-1">
                                <span className="text-xs font-bold" style={{ color: themeColor }}>¥</span>
                                <span className="text-lg font-bold" style={{ color: themeColor }}>{p.price}</span>
                                <span className="text-[10px] text-gray-400 ml-auto">{p.sales}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </>
  );

  // 2. Cart View
  const renderCart = () => {
      const total = cart.filter(i => i.selected).reduce((sum, i) => sum + i.price * i.count, 0);
      
      return (
          <div className={`flex flex-col h-full relative ${backgroundImage ? 'bg-white/80 backdrop-blur-sm' : 'bg-[#f4f4f4]'}`}>
              <div className="bg-white/90 backdrop-blur-sm p-3 pt-12 border-b flex justify-between items-center sticky top-0 z-10">
                  <h2 className="text-lg font-bold">购物车 ({cart.length})</h2>
                  <button className="text-sm text-gray-500" onClick={() => setCart([])}>清空</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-32">
                  {cart.length === 0 ? (
                      <div className="text-center text-gray-400 mt-20">购物车是空的</div>
                  ) : cart.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-3 flex gap-3 items-center shadow-sm">
                          <div 
                            onClick={() => setCart(prev => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it))}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors`}
                            style={{ 
                                backgroundColor: item.selected ? themeColor : 'transparent',
                                borderColor: item.selected ? themeColor : '#d1d5db'
                            }}
                          >
                              {item.selected && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden">
                              <img src={item.image || `https://picsum.photos/200?random=${item.id}`} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                              <h3 className="text-xs text-gray-800 line-clamp-2 mb-1">{item.title}</h3>
                              <div className="bg-gray-100 text-[10px] text-gray-500 px-1 rounded w-fit mb-2">默认规格</div>
                              <div className="flex justify-between items-center">
                                  <span className="font-bold" style={{ color: themeColor }}>¥{item.price}</span>
                                  <div className="flex items-center border rounded">
                                      <button onClick={() => setCart(prev => prev.map((it, i) => i === idx ? { ...it, count: Math.max(1, it.count - 1) } : it))} className="px-2 text-gray-500">-</button>
                                      <span className="text-xs px-1">{item.count}</span>
                                      <button onClick={() => setCart(prev => prev.map((it, i) => i === idx ? { ...it, count: it.count + 1 } : it))} className="px-2 text-gray-500">+</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-2 px-4 flex justify-between items-center pb-safe z-30 shadow-md">
                  <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">合计:</span>
                      <span className="font-bold text-lg" style={{ color: themeColor }}>¥{total.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={initiateCheckout}
                    className="text-white px-6 py-2 rounded-full font-bold text-sm shadow-md active:opacity-90"
                    style={{ backgroundColor: themeColor }}
                  >
                      结算 ({cart.filter(i=>i.selected).length})
                  </button>
              </div>
          </div>
      );
  };

  // 3. Me View
  const renderMe = () => (
      <div className={`flex flex-col h-full ${backgroundImage ? 'bg-white/80 backdrop-blur-sm' : 'bg-[#f4f4f4]'}`}>
          {/* Header */}
          <div 
            className="p-6 pt-16 pb-10 flex items-center gap-4 text-white shadow-sm"
            style={{ background: themeColor }}
          >
              <div className="w-14 h-14 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                  <img src={userInfo.avatar} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                  <div className="font-bold text-lg">{userInfo.name}</div>
                  <div className="text-xs opacity-80 bg-white/20 px-2 py-0.5 rounded-full w-fit mt-1">淘宝值 888</div>
              </div>
              <div className="flex gap-4">
                  <button onClick={() => setSubView('theme_settings')} className="text-xl" title="主题设置">🎨</button>
                  <button onClick={() => setSubView('address_edit')} className="text-xl">⚙️</button>
              </div>
          </div>

          {/* Order Stats */}
          <div className="mx-3 -mt-6 bg-white rounded-xl p-4 shadow-sm z-10 flex justify-between text-center">
              {[
                  { l: '待付款', i: '💳', count: orders.filter(o => o.status === 'pending_payment').length },
                  { l: '待发货', i: '📦' },
                  { l: '待收货', i: '🚚', count: orders.filter(o => o.status === 'shipped').length },
                  { l: '待评价', i: '💬', count: orders.filter(o => o.status === 'delivered').length },
                  { l: '退款/售后', i: '💰' }
              ].map(stat => (
                  <div key={stat.l} className="flex flex-col gap-1 relative w-1/5">
                      <span className="text-xl">{stat.i}</span>
                      <span className="text-xs text-gray-600">{stat.l}</span>
                      {stat.count ? <span className="absolute -top-1 right-2 bg-red-500 text-white text-[9px] px-1 rounded-full">{stat.count}</span> : null}
                  </div>
              ))}
          </div>

          {/* Order List */}
          <div className="m-3 mt-4 space-y-3 pb-20">
              <h3 className="font-bold text-gray-700 ml-1">我的订单</h3>
              {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm" onClick={() => { setSelectedOrder(order); setSubView('order_detail'); }}>
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-50">
                          <span className="text-xs font-bold text-gray-700">{order.items[0].shop} &gt;</span>
                          <span className="text-xs" style={{ color: themeColor }}>
                              {order.status === 'pending_payment' ? '等待付款' : order.status === 'shipped' ? '卖家已发货' : order.status === 'delivered' ? '交易成功' : order.status === 'completed' ? '已评价' : '处理中'}
                          </span>
                      </div>
                      
                      {order.items.map((item, idx) => (
                          <div key={idx} className="flex gap-3 mb-2">
                              <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                  <img src={item.image || `https://picsum.photos/200?random=${item.id}`} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                  <div className="text-xs text-gray-800 line-clamp-2">{item.title}</div>
                                  <div className="text-xs text-gray-400 mt-1">x{item.count}</div>
                              </div>
                              <div className="text-xs font-bold">¥{item.price}</div>
                          </div>
                      ))}

                      <div className="flex justify-end items-center gap-2 mt-2 pt-2">
                          <span className="text-xs text-gray-500">实付款 ¥{order.total.toFixed(2)}</span>
                          {order.status === 'shipped' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'delivered'); alert('收货成功！'); }}
                                className="border text-xs px-3 py-1 rounded-full"
                                style={{ borderColor: themeColor, color: themeColor }}
                              >
                                  确认收货
                              </button>
                          )}
                          {(order.status === 'shipped' || order.status === 'delivered') && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setSubView('logistics'); }}
                                className="border border-gray-300 text-gray-600 text-xs px-3 py-1 rounded-full"
                              >
                                  查看物流
                              </button>
                          )}
                          {order.status === 'delivered' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'completed'); alert('评价成功！'); }}
                                className="border text-xs px-3 py-1 rounded-full"
                                style={{ borderColor: themeColor, color: themeColor }}
                              >
                                  评价
                              </button>
                          )}
                      </div>
                  </div>
              ))}
              {orders.length === 0 && <div className="text-center text-gray-400 py-10">暂无订单</div>}
          </div>
      </div>
  );

  // --- Sub Views (Detail, Address, etc.) ---

  // Address Select View
  if (subView === 'address_select') {
      return (
          <div className="absolute inset-0 bg-[#f4f4f4] z-[80] flex flex-col animate-[slideLeft_0.2s_ease-out]">
              <div className="bg-white p-4 pt-12 flex justify-between items-center border-b shadow-sm sticky top-0 z-10">
                  <button onClick={() => setSubView('checkout')} className="text-2xl text-gray-600">‹</button>
                  <h2 className="font-bold text-lg">选择收货地址</h2>
                  <button className="text-sm" style={{ color: themeColor }}>管理</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {userAddresses.map(addr => (
                      <div 
                        key={addr.id} 
                        onClick={() => handleSelectAddress(addr)}
                        className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 cursor-pointer active:bg-gray-50"
                      >
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm">
                              {addr.name[0]}
                          </div>
                          <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-1">
                                  <span className="font-bold text-gray-800">{addr.name}</span>
                                  <span className="text-gray-500 text-xs">{addr.phone}</span>
                                  {addr.tag && <span className="bg-blue-50 text-blue-500 text-[9px] px-1 rounded">{addr.tag}</span>}
                                  {addr.isDefault && <span className="text-white text-[9px] px-1 rounded" style={{ backgroundColor: themeColor }}>默认</span>}
                              </div>
                              <div className="text-sm text-gray-600 line-clamp-2">{addr.address}</div>
                          </div>
                      </div>
                  ))}
                  <button 
                    className="w-full py-3 bg-white font-bold rounded-full border text-sm"
                    style={{ color: themeColor, borderColor: themeColor }}
                  >
                      + 新增地址
                  </button>
              </div>
          </div>
      );
  }

  // Theme Settings View (NEW)
  if (subView === 'theme_settings') {
      return (
          <div className="absolute inset-0 bg-[#f4f4f4] z-[80] flex flex-col animate-[slideLeft_0.2s_ease-out]">
              <div className="bg-white p-4 pt-12 flex items-center border-b shadow-sm sticky top-0 z-10">
                  <button onClick={() => setSubView('none')} className="text-2xl text-gray-600 mr-4">‹</button>
                  <h2 className="font-bold text-lg">主题设置</h2>
              </div>
              <div className="p-6">
                  <h3 className="text-sm font-bold text-gray-600 mb-4 uppercase">推荐色板</h3>
                  <div className="grid grid-cols-4 gap-4 mb-8">
                      {THEME_PRESETS.map(color => (
                          <button 
                              key={color}
                              onClick={() => setThemeColor(color)}
                              className={`w-14 h-14 rounded-full shadow-sm flex items-center justify-center transition-transform active:scale-95 ${themeColor === color ? 'ring-4 ring-offset-2 ring-gray-200' : ''}`}
                              style={{ backgroundColor: color }}
                          >
                              {themeColor === color && <span className="text-white text-xl">✓</span>}
                          </button>
                      ))}
                  </div>

                  <h3 className="text-sm font-bold text-gray-600 mb-4 uppercase">自定义颜色</h3>
                  <div 
                    onClick={openColorPicker}
                    className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 mb-8 cursor-pointer active:bg-gray-50"
                  >
                      <div 
                        className="w-12 h-12 rounded border border-gray-200" 
                        style={{ backgroundColor: themeColor }}
                      ></div>
                      <div className="flex-1">
                          <div className="text-sm font-bold">点击选择颜色</div>
                          <div className="text-xs text-gray-400 uppercase">{themeColor}</div>
                      </div>
                      <span className="text-gray-300">›</span>
                  </div>

                  {/* Background Image Settings */}
                  <h3 className="text-sm font-bold text-gray-600 mb-4 uppercase">背景图片</h3>
                  <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                      {backgroundImage ? (
                          <div className="relative h-32 w-full rounded-lg overflow-hidden group">
                              <img 
                                src={backgroundImage} 
                                className="w-full h-full object-cover" 
                                style={{ opacity: bgOpacity }} 
                              />
                              <button 
                                  onClick={() => setBackgroundImage('')}
                                  className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                  移除背景
                              </button>
                          </div>
                      ) : (
                          <div 
                              onClick={() => document.getElementById('taobao-bg-upload')?.click()}
                              className="h-32 w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors"
                          >
                              <span className="text-2xl mb-1">🖼️</span>
                              <span className="text-xs">点击上传图片</span>
                          </div>
                      )}
                      <input 
                          id="taobao-bg-upload"
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => setBackgroundImage(ev.target?.result as string);
                                  reader.readAsDataURL(file);
                              }
                              e.target.value = ''; // Reset input
                          }}
                      />

                      {/* Opacity Control */}
                      {backgroundImage && (
                          <div>
                              <div className="flex justify-between text-xs text-gray-500 mb-1 font-bold">
                                  <span>背景不透明度</span>
                                  <span>{Math.round(bgOpacity * 100)}%</span>
                              </div>
                              <input 
                                  type="range" 
                                  min="0.1" 
                                  max="1" 
                                  step="0.1" 
                                  value={bgOpacity}
                                  onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                              />
                          </div>
                      )}
                  </div>

                  <div className="mt-8 p-4 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
                      <div className="text-sm text-gray-500 mb-2">预览效果</div>
                      <button 
                          className="px-6 py-2 rounded-full text-white font-bold shadow-md"
                          style={{ backgroundColor: themeColor }}
                      >
                          按钮样式
                      </button>
                  </div>
              </div>

              {/* HSV Color Picker Modal */}
              {showColorPicker && (
                  <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 animate-[fadeIn_0.2s]">
                      <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-[scaleIn_0.2s]">
                          <h3 className="font-bold text-lg mb-6 text-gray-800">选择颜色</h3>
                          
                          {/* Sliders */}
                          <div className="space-y-6">
                              <div>
                                  <label className="text-xs font-bold text-gray-500 mb-2 block">色调 (Hue)</label>
                                  <input 
                                      type="range" min="0" max="360" value={hsv.h} 
                                      onChange={(e) => setHsv({...hsv, h: parseInt(e.target.value)})}
                                      className="w-full h-4 rounded-full appearance-none cursor-pointer"
                                      style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 mb-2 block">饱和度 (Saturation)</label>
                                  <input 
                                      type="range" min="0" max="100" value={hsv.s} 
                                      onChange={(e) => setHsv({...hsv, s: parseInt(e.target.value)})}
                                      className="w-full h-4 rounded-full appearance-none cursor-pointer"
                                      style={{ background: `linear-gradient(to right, #fff, ${hsvToHex(hsv.h, 100, 100)})` }}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 mb-2 block">值 (Value)</label>
                                  <input 
                                      type="range" min="0" max="100" value={hsv.v} 
                                      onChange={(e) => setHsv({...hsv, v: parseInt(e.target.value)})}
                                      className="w-full h-4 rounded-full appearance-none cursor-pointer"
                                      style={{ background: `linear-gradient(to right, #000, ${hsvToHex(hsv.h, hsv.s, 100)})` }}
                                  />
                              </div>
                          </div>

                          {/* Preview */}
                          <div className="flex justify-between items-center mt-8 mb-6">
                              <span className="text-sm font-bold text-gray-600">建议</span>
                              <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-gray-600">已选择的颜色</span>
                                  <div 
                                      className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm"
                                      style={{ backgroundColor: hsvToHex(hsv.h, hsv.s, hsv.v) }}
                                  ></div>
                              </div>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end gap-4">
                              <button onClick={() => setShowColorPicker(false)} className="text-gray-500 font-bold px-4 py-2">取消</button>
                              <button onClick={confirmColorPicker} className="text-blue-600 font-bold px-4 py-2">设置</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // Checkout Confirmation View
  if (subView === 'checkout') {
      const selectedItems = cart.filter(i => i.selected);
      const total = selectedItems.reduce((sum, item) => sum + item.price * item.count, 0);

      return (
          <div className="absolute inset-0 bg-[#f4f4f4] z-[70] flex flex-col animate-[slideUp_0.2s_ease-out]">
              {/* Header */}
              <div className="bg-white p-4 pt-12 flex justify-between items-center border-b shadow-sm sticky top-0 z-10">
                  <button onClick={() => setSubView('none')} className="text-2xl text-gray-600">‹</button>
                  <h2 className="font-bold text-lg">确认订单</h2>
                  <div className="w-6"></div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-20">
                  {/* Address Card (Clickable) */}
                  <div 
                    onClick={() => setSubView('address_select')}
                    className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 cursor-pointer active:bg-gray-50"
                  >
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-lg" style={{ color: themeColor }}>📍</div>
                      <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                              <span className="font-bold text-lg text-gray-800">{userInfo.name}</span>
                              <span className="text-gray-500 text-sm">{userInfo.phone}</span>
                          </div>
                          <div className="text-sm text-gray-600 line-clamp-2">{userInfo.address}</div>
                      </div>
                      <span className="text-gray-300 text-xl">›</span>
                  </div>

                  {/* Item List */}
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                      {selectedItems.map((item, i) => (
                          <div key={i} className="flex gap-3 mb-4 last:mb-0">
                              <img src={item.image} className="w-20 h-20 rounded-md bg-gray-100 object-cover" />
                              <div className="flex-1 flex flex-col justify-between">
                                  <div className="text-sm font-bold text-gray-800 line-clamp-2">{item.title}</div>
                                  <div className="flex justify-between items-center mt-2">
                                      <span className="font-bold" style={{ color: themeColor }}>¥{item.price}</span>
                                      <span className="text-xs text-gray-500">x{item.count}</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                      <div className="border-t mt-3 pt-3 flex justify-between text-sm">
                          <span>配送方式</span>
                          <span className="text-gray-500">快递 免邮</span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                          <span>运费险</span>
                          <span className="text-gray-500">卖家赠送</span>
                      </div>
                  </div>
              </div>

              {/* Bottom Submit Bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-2 px-4 flex justify-end items-center pb-safe z-30 shadow-md gap-4">
                  <div className="flex items-baseline gap-1">
                      <span className="text-sm text-gray-500">共{selectedItems.length}件,</span>
                      <span className="text-sm text-gray-900">合计:</span>
                      <span className="font-bold text-xl" style={{ color: themeColor }}>¥{total.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={handleSubmitOrder}
                    className="text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-md active:opacity-90"
                    style={{ backgroundColor: themeColor }}
                  >
                      提交订单
                  </button>
              </div>
          </div>
      );
  }

  // Product Detail
  if (subView === 'detail' && selectedProduct) {
      return (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col animate-[slideUp_0.2s_ease-out]">
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="aspect-square bg-gray-100 relative">
                    <img src={selectedProduct.image || `https://picsum.photos/600?random=${selectedProduct.id}`} className="w-full h-full object-cover" />
                    <button onClick={() => setSubView('none')} className="absolute top-12 left-4 w-8 h-8 bg-black/30 rounded-full text-white flex items-center justify-center backdrop-blur-md">‹</button>
                </div>
                <div className="p-4">
                    <div className="flex items-baseline gap-1 mb-2" style={{ color: themeColor }}>
                        <span className="text-sm font-bold">¥</span>
                        <span className="text-3xl font-bold">{selectedProduct.price}</span>
                    </div>
                    <h1 className="text-gray-900 font-bold text-lg leading-snug mb-4">{selectedProduct.title}</h1>
                    <div className="flex justify-between text-xs text-gray-400 mb-4 bg-gray-50 p-2 rounded">
                        <span>快递: 免运费</span>
                        <span>月销 {selectedProduct.sales}</span>
                        <span>上海</span>
                    </div>
                    {/* Shop */}
                    <div className="flex items-center gap-3 p-2 border border-gray-100 rounded-xl">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">🏪</div>
                        <div className="flex-1">
                            <div className="font-bold text-sm">{selectedProduct.shop}</div>
                            <div className="text-xs text-gray-400">天猫五年老店</div>
                        </div>
                        <button className="text-white text-xs px-3 py-1 rounded-full" style={{ backgroundColor: themeColor }}>进店</button>
                    </div>
                </div>
            </div>
            <div className="h-14 bg-white border-t border-gray-200 flex items-center px-4 gap-2 pb-safe">
                <div className="flex gap-4 px-2 mr-2 text-[10px] text-gray-500">
                    <div className="flex flex-col items-center"><span>🏬</span>店铺</div>
                    <div className="flex flex-col items-center"><span>💬</span>客服</div>
                    <div className="flex flex-col items-center"><span>⭐️</span>收藏</div>
                </div>
                <button 
                    onClick={() => { addToCart(selectedProduct); setSubView('none'); }} 
                    className="flex-1 text-white h-10 rounded-l-full font-bold text-sm opacity-90"
                    style={{ backgroundColor: themeColor, filter: 'brightness(1.1)' }}
                >
                    加入购物车
                </button>
                <button 
                    onClick={() => { addToCart(selectedProduct); setActiveTab('cart'); setSubView('none'); }} 
                    className="flex-1 text-white h-10 rounded-r-full font-bold text-sm"
                    style={{ backgroundColor: themeColor }}
                >
                    立即购买
                </button>
            </div>
        </div>
      );
  }

  // Address Edit
  if (subView === 'address_edit') {
      return (
          <div className="absolute inset-0 bg-gray-100 z-[60] flex flex-col animate-[slideUp_0.2s_ease-out]">
              <div className="bg-white p-4 pt-12 flex justify-between items-center shadow-sm">
                  <button onClick={() => setSubView('none')}>取消</button>
                  <h2 className="font-bold">编辑地址</h2>
                  <button onClick={() => setSubView('none')} className="font-bold" style={{ color: themeColor }}>保存</button>
              </div>
              <div className="mt-4 bg-white">
                  <div className="flex p-4 border-b">
                      <label className="w-20 font-bold">收货人</label>
                      <input value={userInfo.name} onChange={e => setUserInfo({...userInfo, name: e.target.value})} className="flex-1 outline-none" />
                  </div>
                  <div className="flex p-4 border-b">
                      <label className="w-20 font-bold">手机号码</label>
                      <input value={userInfo.phone} onChange={e => setUserInfo({...userInfo, phone: e.target.value})} className="flex-1 outline-none" />
                  </div>
                  <div className="flex p-4 border-b">
                      <label className="w-20 font-bold">详细地址</label>
                      <input value={userInfo.address} onChange={e => setUserInfo({...userInfo, address: e.target.value})} className="flex-1 outline-none" />
                  </div>
              </div>
          </div>
      );
  }

  // Create Item
  if (subView === 'create_item') {
      return (
          <div className="absolute inset-0 bg-gray-100 z-[60] flex flex-col animate-[slideUp_0.2s_ease-out]">
              <div className="bg-white p-4 pt-12 flex justify-between items-center shadow-sm">
                  <button onClick={() => setSubView('none')}>取消</button>
                  <h2 className="font-bold">发布虚拟商品 (Roleplay)</h2>
                  <button onClick={handleCustomItemCreate} className="font-bold" style={{ color: themeColor }}>发布</button>
              </div>
              <div className="p-4 space-y-4">
                  <div className="bg-white p-4 rounded-xl">
                      <input 
                        value={customItem.title} 
                        onChange={e => setCustomItem({...customItem, title: e.target.value})}
                        placeholder="商品名称 (例如: 送给XX的飞船)"
                        className="w-full text-lg font-bold outline-none mb-4"
                      />
                      <div className="flex items-center gap-2 border-b pb-2 mb-4">
                          <span className="font-bold" style={{ color: themeColor }}>¥</span>
                          <input 
                            type="number"
                            value={customItem.price} 
                            onChange={e => setCustomItem({...customItem, price: e.target.value})}
                            placeholder="价格"
                            className="flex-1 outline-none text-lg"
                          />
                      </div>
                      <input 
                        value={customItem.shop} 
                        onChange={e => setCustomItem({...customItem, shop: e.target.value})}
                        placeholder="店铺名称"
                        className="w-full text-sm text-gray-500 outline-none"
                      />
                  </div>
                  <div className="text-xs text-gray-400 text-center">此商品仅在本地显示，用于模拟购物剧情。</div>
              </div>
          </div>
      );
  }

  // Logistics View
  if (subView === 'logistics' && selectedOrder) {
      return (
          <div className="absolute inset-0 bg-gray-100 z-[60] flex flex-col animate-[slideUp_0.2s_ease-out]">
              <div className="p-4 pt-12 text-white flex gap-4 items-center" style={{ backgroundColor: themeColor }}>
                  <button onClick={() => setSubView('none')} className="text-2xl">‹</button>
                  <div>
                      <div className="font-bold text-lg">
                          {selectedOrder.status === 'delivered' ? '已签收' : selectedOrder.status === 'pending_payment' ? '等待付款' : '运输中'}
                      </div>
                      <div className="text-xs opacity-80">韵达快递: 73849127384</div>
                  </div>
              </div>
              <div className="flex-1 bg-white mt-2 p-6 overflow-y-auto">
                  <div className="relative border-l-2 border-gray-200 ml-2 space-y-8">
                      {selectedOrder.logistics.map((step, i) => {
                          const isLatest = i === selectedOrder.logistics.length - 1;
                          return (
                              <div key={i} className="pl-6 relative">
                                  <div 
                                    className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white`}
                                    style={{ 
                                        backgroundColor: isLatest ? themeColor : '#d1d5db',
                                        width: isLatest ? '20px' : '16px',
                                        height: isLatest ? '20px' : '16px',
                                        left: isLatest ? '-11px' : '-9px'
                                    }}
                                  ></div>
                                  <div className="text-xs text-gray-400 mb-1">{step.time}</div>
                                  <div className={`text-sm ${isLatest ? 'font-bold' : 'text-gray-600'}`} style={{ color: isLatest ? themeColor : undefined }}>
                                      {step.status} - {step.location}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  }

  // After Sales Menu
  if (subView === 'after_sales_options') {
      return (
          <div className="absolute inset-0 bg-gray-100 z-[70] flex flex-col animate-[slideUp_0.2s_ease-out]">
               <div className="bg-white p-4 pt-12 flex items-center gap-3 border-b">
                  <button onClick={() => setSubView('order_detail')} className="text-xl">‹</button>
                  <h2 className="font-bold text-lg">选择服务类型</h2>
              </div>
              <div className="p-4 space-y-3">
                  {/* Options */}
                  {[
                      { title: '仅退款', desc: '未收到货，或协商同意前提下' },
                      { title: '退货退款', desc: '已收到货，需要退换已收到的货物' },
                      { title: '换货', desc: '已收到货，需要更换已收到的货物' },
                  ].map(opt => (
                      <div key={opt.title} onClick={() => alert('请联系客服处理')} className="bg-white p-4 rounded-xl flex justify-between items-center cursor-pointer active:bg-gray-50">
                          <div>
                              <div className="font-bold text-gray-800">{opt.title}</div>
                              <div className="text-xs text-gray-400 mt-1">{opt.desc}</div>
                          </div>
                          <span className="text-gray-300">›</span>
                      </div>
                  ))}
                  
                  {/* CS Option */}
                  <div onClick={startCSChat} className="bg-white p-4 rounded-xl flex justify-between items-center cursor-pointer active:bg-gray-50 mt-4">
                      <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-xl">🎧</div>
                           <div>
                              <div className="font-bold text-gray-800">客服处理</div>
                              <div className="text-xs text-gray-400 mt-1">官方客服介入，协商解决</div>
                          </div>
                      </div>
                      <span className="text-gray-300">›</span>
                  </div>
              </div>
          </div>
      );
  }

  // CS Chat
  if (subView === 'cs_chat') {
      return (
          <div className="absolute inset-0 bg-[#f4f4f4] z-[80] flex flex-col animate-[slideUp_0.2s_ease-out]">
              <div className="bg-white p-4 pt-12 flex items-center gap-3 border-b shadow-sm sticky top-0 z-10">
                  <button onClick={() => setSubView('after_sales_options')} className="text-xl">‹</button>
                  <div className="flex flex-col">
                      <span className="font-bold text-base">官方客服-小蜜</span>
                      <span className="text-[10px] text-green-500">● 在线</span>
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {csMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                                  {msg.role === 'user' ? '👤' : '🎧'}
                              </div>
                              <div 
                                className={`p-3 rounded-xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}
                                style={{ backgroundColor: msg.role === 'user' ? themeColor : 'white' }}
                              >
                                  {msg.content}
                              </div>
                          </div>
                      </div>
                  ))}
                  {isTyping && (
                      <div className="flex justify-start">
                          <div className="bg-white p-3 rounded-xl rounded-tl-none text-xs text-gray-400 shadow-sm ml-10">
                              客服正在输入...
                          </div>
                      </div>
                  )}
              </div>

              <div className="bg-white p-3 border-t flex gap-2 pb-safe">
                  <input 
                      value={csInput}
                      onChange={e => setCsInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCSSend()}
                      placeholder="描述您的问题..."
                      className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none"
                  />
                  <button 
                    onClick={handleCSSend} 
                    disabled={!csInput.trim() || isTyping} 
                    className="text-white px-4 py-1.5 rounded-full text-sm font-bold disabled:opacity-50"
                    style={{ backgroundColor: themeColor }}
                  >
                      发送
                  </button>
              </div>
          </div>
      );
  }

  // Order Detail
  if (subView === 'order_detail' && selectedOrder) {
      return (
          <div className="absolute inset-0 bg-gray-100 z-[60] flex flex-col animate-[slideUp_0.2s_ease-out]">
              <div className="p-4 pt-12 text-white" style={{ backgroundColor: themeColor }}>
                  <button onClick={() => setSubView('none')} className="text-white text-2xl mb-4">‹</button>
                  <h2 className="font-bold text-xl mb-1">
                      {selectedOrder.status === 'shipped' ? '卖家已发货' : selectedOrder.status === 'pending_payment' ? '等待付款' : '交易成功'}
                  </h2>
                  <p className="text-xs opacity-90">
                      {selectedOrder.status === 'shipped' ? '宝贝正在赶往您的怀抱' : selectedOrder.status === 'pending_payment' ? '请尽快完成支付' : '感谢您的购买'}
                  </p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {/* Address */}
                  <div className="bg-white rounded-xl p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">📍</div>
                      <div>
                          <div className="font-bold text-sm text-gray-800">{userInfo.name} {userInfo.phone}</div>
                          <div className="text-xs text-gray-500 mt-1">{userInfo.address}</div>
                      </div>
                  </div>

                  {/* Items */}
                  <div className="bg-white rounded-xl p-4">
                      {selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="flex gap-3 mb-4 last:mb-0">
                              <img src={item.image || `https://picsum.photos/200?random=${item.id}`} className="w-20 h-20 rounded bg-gray-100 object-cover" />
                              <div className="flex-1">
                                  <div className="text-sm font-bold text-gray-800">{item.title}</div>
                                  <div className="text-xs text-gray-500 mt-1">数量: x{item.count}</div>
                                  <div className="text-sm font-bold mt-2" style={{ color: themeColor }}>¥{item.price}</div>
                              </div>
                          </div>
                      ))}
                      <div className="border-t mt-3 pt-3 flex justify-between text-sm">
                          <span>实付款</span>
                          <span className="font-bold" style={{ color: themeColor }}>¥{selectedOrder.total.toFixed(2)}</span>
                      </div>
                  </div>

                  {/* Info */}
                  <div className="bg-white rounded-xl p-4 text-xs text-gray-500 space-y-2">
                      <div className="flex justify-between"><span>订单编号</span><span>{selectedOrder.id}</span></div>
                      <div className="flex justify-between"><span>创建时间</span><span>{new Date(selectedOrder.timestamp).toLocaleString()}</span></div>
                  </div>
              </div>

              {/* Actions */}
              <div className="bg-white p-3 border-t flex justify-end gap-3 pb-safe">
                  <button onClick={handleAfterSalesClick} className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-full text-sm">申请售后</button>
                  {selectedOrder.status === 'shipped' && (
                      <button 
                        onClick={() => { updateOrderStatus(selectedOrder.id, 'delivered'); alert('确认收货成功'); setSubView('none'); }}
                        className="border px-4 py-1.5 rounded-full text-sm"
                        style={{ borderColor: themeColor, color: themeColor }}
                      >
                          确认收货
                      </button>
                  )}
              </div>
          </div>
      );
  }

  if (!isOpen) return null;

  return (
    <div 
        className="absolute inset-0 z-50 flex flex-col app-transition overflow-hidden bg-[#f4f4f4]"
    >
        {/* Separate Background Layer for Opacity Control */}
        {backgroundImage && (
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ 
                    backgroundImage: `url(${backgroundImage})`, 
                    opacity: bgOpacity,
                    pointerEvents: 'none'
                }}
            />
        )}

        {/* Main Content Area based on Tab */}
        <div className={`flex-1 overflow-y-auto no-scrollbar relative z-10 ${backgroundImage ? 'bg-white/60 backdrop-blur-md' : ''}`}>
            {activeTab === 'home' && renderHome()}
            {activeTab === 'cart' && renderCart()}
            {activeTab === 'me' && renderMe()}
        </div>

        {/* Bottom Tab Bar */}
        <div className="h-14 bg-white/90 backdrop-blur-sm border-t border-gray-200 flex items-center justify-around text-[10px] z-20 pb-safe text-gray-500 relative">
            <div onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-0.5 cursor-pointer`} style={{ color: activeTab === 'home' ? themeColor : undefined }}>
                <span className="text-xl">🏠</span>
                <span>首页</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 cursor-pointer">
                <span className="text-xl">📺</span>
                <span>直播</span>
            </div>
            <div onClick={() => setActiveTab('cart')} className={`flex flex-col items-center gap-0.5 cursor-pointer`} style={{ color: activeTab === 'cart' ? themeColor : undefined }}>
                <span className="text-xl relative">
                    🛒
                    {cart.length > 0 && <span className="absolute -top-1 -right-1 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px]" style={{ backgroundColor: themeColor }}>{cart.length}</span>}
                </span>
                <span>购物车</span>
            </div>
            <div onClick={() => setActiveTab('me')} className={`flex flex-col items-center gap-0.5 cursor-pointer`} style={{ color: activeTab === 'me' ? themeColor : undefined }}>
                <span className="text-xl">👤</span>
                <span>我的淘宝</span>
            </div>
        </div>

        {/* Payment Method Modal */}
        {showPaymentMethodModal && (
            <div className="absolute inset-0 bg-black/50 z-[80] flex items-end animate-[fadeIn_0.2s]">
                <div className="bg-white w-full rounded-t-xl p-4 animate-[slideUp_0.2s]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">选择支付方式</h3>
                        <button onClick={() => setShowPaymentMethodModal(false)} className="text-2xl text-gray-400">×</button>
                    </div>
                    <div className="space-y-3">
                        <div onClick={handleSelfPay} className="flex items-center justify-between p-3 border rounded-xl active:bg-gray-50 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">💰</span>
                                <div>
                                    <div className="font-bold">自己付</div>
                                    <div className="text-xs text-gray-500">使用钱包余额支付</div>
                                </div>
                            </div>
                            <span className="text-gray-300">›</span>
                        </div>
                        <div onClick={() => { setShowPaymentMethodModal(false); setShowContactSelect(true); }} className="flex items-center justify-between p-3 border rounded-xl active:bg-gray-50 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">💝</span>
                                <div>
                                    <div className="font-bold">找人付 / 亲密付</div>
                                    <div className="text-xs text-gray-500">发送代付卡片给好友</div>
                                </div>
                            </div>
                            <span className="text-gray-300">›</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Contact Selector for Friend Pay */}
        {showContactSelect && (
            <div className="absolute inset-0 bg-white z-[90] flex flex-col animate-[slideUp_0.2s]">
                <div className="h-12 bg-gray-50 flex items-center px-4 border-b">
                    <button onClick={() => setShowContactSelect(false)} className="text-sm text-gray-600">取消</button>
                    <span className="flex-1 text-center font-bold">选择好友代付</span>
                    <div className="w-8"></div>
                </div>
                <div className="p-4 bg-gray-50 border-b">
                    <input 
                        type="text" 
                        value={payRequestNote}
                        onChange={(e) => setPayRequestNote(e.target.value)}
                        placeholder="给TA留言 (例如: 我们的情侣款🥺)"
                        className="w-full bg-white p-3 rounded-lg text-sm outline-none"
                    />
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {contacts.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10">暂无联系人，请先去通讯录添加。</div>
                    ) : (
                        contacts.map(c => (
                            <div key={c.id} onClick={() => handleFriendPay(c.id)} className="flex items-center gap-3 p-3 border-b border-gray-100 active:bg-gray-50 cursor-pointer">
                                <img src={c.avatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                                <span className="font-medium text-gray-800">{c.name}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default TaobaoApp;
