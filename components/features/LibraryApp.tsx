import React, { useState, useEffect } from 'react';

interface LibraryAppProps {
  onBack: () => void;
  isOpen: boolean;
}

export interface LibraryBook {
  id: string;
  title: string;
  isGlobal: boolean;
  category: string;
  content: string;
  timestamp: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  behavior_core: 'AI行为标准',
  worldview: '世界观',
  writing_style: '文风',
  sticker_pack: '表情包',
  html_module: 'HTML模块',
  photo_album: '相册/照片流',
};

const LibraryApp: React.FC<LibraryAppProps> = ({ onBack, isOpen }) => {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [books, setBooks] = useState<LibraryBook[]>(() => {
      const saved = localStorage.getItem('ephone_library_books');
      return saved ? JSON.parse(saved) : [];
  });

  // Form State
  const [title, setTitle] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [category, setCategory] = useState('behavior_core');
  const [content, setContent] = useState('');

  useEffect(() => {
      localStorage.setItem('ephone_library_books', JSON.stringify(books));
  }, [books]);

  const handleSave = () => {
      if (!title.trim() || !content.trim()) {
          alert("请填写书名和内容");
          return;
      }

      const newBook: LibraryBook = {
          id: `lib_${Date.now()}`,
          title,
          isGlobal,
          category,
          content,
          timestamp: Date.now()
      };

      setBooks(prev => [newBook, ...prev]);
      
      // Reset form
      setTitle('');
      setIsGlobal(false);
      setCategory('behavior_core');
      setContent('');
      setView('list');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm("确定要删除这本书吗？")) {
          setBooks(prev => prev.filter(b => b.id !== id));
      }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-[#f5f5f7] flex flex-col z-50 app-transition font-sans">
        {view === 'list' ? (
            <div className="flex flex-col h-full">
                <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-20">
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center text-gray-800 active:opacity-50">
                        <span className="text-2xl">‹</span>
                    </button>
                    <div className="flex-1 text-center font-bold text-gray-800 text-lg">图书馆</div>
                    <button onClick={() => setView('create')} className="w-10 h-10 flex items-center justify-center text-gray-800 active:opacity-50">
                        <span className="text-2xl">＋</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {books.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <span className="text-4xl mb-2">📚</span>
                            <p className="text-sm">图书馆空空如也</p>
                        </div>
                    ) : (
                        books.map(book => (
                            <div key={book.id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2 relative">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-gray-800 text-lg">{book.title}</h3>
                                    <button onClick={(e) => handleDelete(book.id, e)} className="text-red-400 text-sm">删除</button>
                                </div>
                                <div className="flex gap-2 text-xs">
                                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md">{CATEGORY_LABELS[book.category]}</span>
                                    {book.isGlobal && <span className="bg-green-50 text-green-600 px-2 py-1 rounded-md">全局生效</span>}
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{book.content}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        ) : (
            <div className="flex flex-col h-full">
                <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-20">
                    <button onClick={() => setView('list')} className="w-10 h-10 flex items-center justify-center text-gray-800 active:opacity-50">
                        <span className="text-2xl">‹</span>
                    </button>
                    <div className="flex-1 text-center font-bold text-gray-800 text-lg">创建新书</div>
                    <div className="w-10"></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold text-gray-600 ml-1">书名</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="为这本书起个名字" 
                            className="bg-white border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-600">设为全局</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#07c160]"></div>
                        </label>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold text-gray-600 ml-1">分类</label>
                        <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="bg-white border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-500 appearance-none"
                        >
                            <option value="behavior_core">AI行为标准</option>
                            <option value="worldview">世界观</option>
                            <option value="writing_style">文风</option>
                            <option value="sticker_pack">表情包</option>
                            <option value="html_module">HTML模块</option>
                            <option value="photo_album">相册/照片流</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1 flex-1 min-h-[200px]">
                        <label className="text-sm font-bold text-gray-600 ml-1">内容</label>
                        <textarea 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="输入这本书的具体内容或指令..." 
                            className="bg-white border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-500 flex-1 resize-none"
                        ></textarea>
                    </div>

                    <button 
                        onClick={handleSave}
                        className="w-full bg-blue-500 text-white font-bold rounded-xl py-4 mt-2 active:scale-95 transition-transform shadow-lg shadow-blue-500/30"
                    >
                        保存
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default LibraryApp;
