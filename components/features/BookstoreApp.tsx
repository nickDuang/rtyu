
import React, { useState, useEffect } from 'react';
import { generateMiniFiction } from '../../services/geminiService';
import { Contact, BookStory } from '../../types';

interface BookstoreAppProps {
  onBack: () => void;
  isOpen: boolean;
}

const GENRES = [
    { id: 'sweet', label: '🍬 甜宠文', color: 'bg-pink-100 border-pink-300' },
    { id: 'ancient', label: '🪭 古言', color: 'bg-red-100 border-red-300' },
    { id: 'palace', label: '👑 宫斗', color: 'bg-yellow-100 border-yellow-400' },
    { id: 'house', label: '🏮 宅斗', color: 'bg-green-100 border-green-300' },
    { id: 'random', label: '🎲 随机日常', color: 'bg-blue-100 border-blue-300' },
    { id: 'be', label: '💔 虐文 (BE)', color: 'bg-gray-100 border-gray-400' },
];

const BookstoreApp: React.FC<BookstoreAppProps> = ({ onBack, isOpen }) => {
  const [activeTab, setActiveTab] = useState<'shelf' | 'create'>('shelf');
  const [stories, setStories] = useState<BookStory[]>(() => {
      const saved = localStorage.getItem('ephone_bookstore_stories');
      return saved ? JSON.parse(saved) : [];
  });
  
  // --- Create State ---
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('sweet');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewStory, setPreviewStory] = useState<{title: string, content: string} | null>(null);

  // --- Reading State ---
  const [readingBook, setReadingBook] = useState<BookStory | null>(null);

  // Load Contacts
  useEffect(() => {
      if (isOpen) {
          const savedContacts = localStorage.getItem('ephone_contacts');
          if (savedContacts) {
              const parsed = JSON.parse(savedContacts);
              setContacts(parsed);
              if (parsed.length > 0 && !selectedCharId) {
                  setSelectedCharId(parsed[0].id);
              }
          }
      }
  }, [isOpen]);

  // Save Stories
  useEffect(() => {
      localStorage.setItem('ephone_bookstore_stories', JSON.stringify(stories));
  }, [stories]);

  const handleGenerate = async () => {
      const char = contacts.find(c => c.id === selectedCharId);
      if (!char) return alert("请选择主角");

      setIsGenerating(true);
      try {
          const result = await generateMiniFiction(char.name, char.description, selectedGenre as any);
          setPreviewStory(result);
      } catch (e) {
          alert("生成失败，请重试");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSaveBook = () => {
      if (!previewStory) return;
      const char = contacts.find(c => c.id === selectedCharId);
      
      const newBook: BookStory = {
          id: `book_${Date.now()}`,
          title: previewStory.title,
          content: previewStory.content,
          author: char ? char.name : 'Unknown',
          genre: GENRES.find(g => g.id === selectedGenre)?.label || 'Fiction',
          coverColor: ['bg-red-700', 'bg-blue-800', 'bg-green-800', 'bg-amber-700', 'bg-purple-800'][Math.floor(Math.random() * 5)],
          timestamp: Date.now()
      };

      setStories(prev => [newBook, ...prev]);
      setPreviewStory(null);
      setActiveTab('shelf');
      alert("已保存到书架！");
  };

  const handleDeleteBook = (id: string) => {
      if (confirm("确定删除这本书吗？")) {
          setStories(prev => prev.filter(b => b.id !== id));
          if (readingBook?.id === id) setReadingBook(null);
      }
  };

  if (!isOpen) return null;

  // --- Reading View ---
  if (readingBook) {
      return (
          <div className="absolute inset-0 bg-[#fdf6e3] z-[60] flex flex-col animate-[fadeIn_0.2s]">
              <div className="h-16 flex items-center justify-between px-4 border-b border-[#eee8d5] bg-[#fdf6e3] sticky top-0 z-10">
                  <button onClick={() => setReadingBook(null)} className="text-xl text-[#586e75]">‹ 返回书架</button>
                  <div className="flex gap-4 text-sm text-[#93a1a1]">
                      <button onClick={() => handleDeleteBook(readingBook.id)}>删除</button>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 pb-20">
                  <h1 className="text-2xl font-serif font-bold text-[#b58900] mb-2 text-center">{readingBook.title}</h1>
                  <div className="text-center text-xs text-[#93a1a1] mb-8">
                      主角: {readingBook.author} • {readingBook.genre}
                  </div>
                  <div className="font-serif text-[#657b83] leading-loose text-lg whitespace-pre-wrap text-justify">
                      {readingBook.content}
                  </div>
                  <div className="mt-12 text-center text-xs text-[#93a1a1]">--- 完 ---</div>
              </div>
          </div>
      );
  }

  // --- Main App View ---
  return (
    <div className="absolute inset-0 bg-[#f5f5f5] flex flex-col z-50 app-transition">
        {/* Header */}
        <div className="h-24 bg-white pt-12 px-4 flex justify-between items-center shadow-sm z-10">
            <button onClick={onBack} className="text-xl text-gray-600">‹</button>
            <div className="flex gap-6 text-sm font-bold">
                <button 
                    onClick={() => setActiveTab('shelf')}
                    className={`${activeTab === 'shelf' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-400'}`}
                >
                    书架
                </button>
                <button 
                    onClick={() => setActiveTab('create')}
                    className={`${activeTab === 'create' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-400'}`}
                >
                    创作
                </button>
            </div>
            <div className="w-4"></div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            
            {/* Shelf View */}
            {activeTab === 'shelf' && (
                <div className="grid grid-cols-3 gap-4 auto-rows-max">
                    {stories.length === 0 && (
                        <div className="col-span-3 text-center text-gray-400 mt-20">
                            <div className="text-4xl mb-2">📚</div>
                            书架空空如也<br/>快去创作吧
                        </div>
                    )}
                    {stories.map(book => (
                        <div key={book.id} onClick={() => setReadingBook(book)} className="flex flex-col gap-2 cursor-pointer group active:scale-95 transition-transform">
                            <div className={`aspect-[2/3] rounded-r-lg rounded-l-sm shadow-md ${book.coverColor} relative overflow-hidden`}>
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20"></div> {/* Spine highlight */}
                                <div className="absolute inset-0 flex flex-col justify-center items-center p-2 text-center">
                                    <div className="w-12 h-16 border-2 border-white/30 mb-2"></div>
                                    <h3 className="text-white font-serif font-bold text-xs line-clamp-2">{book.title}</h3>
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-500 text-center truncate">{book.author}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Create View */}
            {activeTab === 'create' && (
                <div className="space-y-6">
                    {!previewStory ? (
                        <>
                            {/* Character Select */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 mb-2">选择主角</h3>
                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                    {contacts.map(c => (
                                        <div 
                                            key={c.id} 
                                            onClick={() => setSelectedCharId(c.id)}
                                            className={`flex flex-col items-center gap-1 min-w-[64px] cursor-pointer p-2 rounded-xl transition-all ${selectedCharId === c.id ? 'bg-amber-100 border border-amber-300' : 'opacity-60'}`}
                                        >
                                            <img src={c.avatar} className="w-10 h-10 rounded-full object-cover" />
                                            <span className="text-[10px] font-bold truncate w-full text-center">{c.name.split(' ')[0]}</span>
                                        </div>
                                    ))}
                                    {contacts.length === 0 && <div className="text-gray-400 text-xs py-2">暂无角色，请去通讯录添加。</div>}
                                </div>
                            </div>

                            {/* Genre Select */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 mb-2">选择题材</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {GENRES.map(g => (
                                        <button 
                                            key={g.id}
                                            onClick={() => setSelectedGenre(g.id)}
                                            className={`p-3 rounded-xl border text-sm transition-all ${selectedGenre === g.id ? `${g.color} shadow-sm font-bold` : 'border-gray-200 bg-white text-gray-600'}`}
                                        >
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || !selectedCharId}
                                className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 mt-4"
                            >
                                {isGenerating ? '正在构思剧情...' : '开始生成 ✨'}
                            </button>
                        </>
                    ) : (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-[fadeIn_0.3s]">
                            <h2 className="text-xl font-bold mb-4 text-center font-serif">{previewStory.title}</h2>
                            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mb-6 max-h-[60vh] overflow-y-auto">
                                {previewStory.content}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setPreviewStory(null)} className="flex-1 py-3 text-gray-500 bg-gray-100 rounded-lg text-sm font-bold">重写</button>
                                <button onClick={handleSaveBook} className="flex-1 py-3 text-white bg-amber-600 rounded-lg text-sm font-bold shadow-md">保存到书架</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default BookstoreApp;
