import React, { useState, useEffect } from 'react';
import { WorldBookEntry, WorldBookCategory } from '../../types';

interface DreamAppProps {
  onBack: () => void;
  isOpen: boolean;
}

// Initial Data
const INITIAL_CATEGORIES: WorldBookCategory[] = [
    { id: 'cat_1', name: 'Magic System', isGlobal: true },
    { id: 'cat_2', name: 'Character Backstories', isGlobal: false }
];

const INITIAL_BOOKS: WorldBookEntry[] = [
    { id: 'wb_1', name: 'Mana Rules', content: 'Magic requires mana...', categoryId: 'cat_1', isGlobal: true, isEnabled: true },
    { id: 'wb_2', name: 'Alice\'s Secret', content: 'Alice is actually...', categoryId: 'cat_2', isGlobal: false, isEnabled: true }
];

const DreamApp: React.FC<DreamAppProps> = ({ onBack, isOpen }) => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'local' | 'global'>('local');
  const [view, setView] = useState<'list' | 'editor' | 'categoryManager'>('list');
  
  // Data State
  const [books, setBooks] = useState<WorldBookEntry[]>(() => {
      const saved = localStorage.getItem('ephone_worldbooks');
      return saved ? JSON.parse(saved) : INITIAL_BOOKS;
  });
  const [categories, setCategories] = useState<WorldBookCategory[]>(() => {
      const saved = localStorage.getItem('ephone_wb_categories');
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  // Editor State
  const [editingBook, setEditingBook] = useState<WorldBookEntry | null>(null);
  const [editorName, setEditorName] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorCategoryId, setEditorCategoryId] = useState<string>('');

  // Category Manager State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // --- Persistence ---
  useEffect(() => { localStorage.setItem('ephone_worldbooks', JSON.stringify(books)); }, [books]);
  useEffect(() => { localStorage.setItem('ephone_wb_categories', JSON.stringify(categories)); }, [categories]);

  // --- Helpers ---
  const currentCategories = categories.filter(c => c.isGlobal === (activeTab === 'global'));
  const currentBooks = books.filter(b => b.isGlobal === (activeTab === 'global'));
  
  // Group books by category
  const booksByCategory: Record<string, WorldBookEntry[]> = {};
  const uncategorizedBooks: WorldBookEntry[] = [];

  currentBooks.forEach(book => {
      if (book.categoryId && currentCategories.find(c => c.id === book.categoryId)) {
          if (!booksByCategory[book.categoryId]) booksByCategory[book.categoryId] = [];
          booksByCategory[book.categoryId].push(book);
      } else {
          uncategorizedBooks.push(book);
      }
  });

  // --- Actions ---

  const handleEditBook = (book: WorldBookEntry | null) => {
      if (book) {
          setEditingBook(book);
          setEditorName(book.name);
          setEditorContent(book.content);
          setEditorCategoryId(book.categoryId || '');
      } else {
          setEditingBook(null);
          setEditorName('');
          setEditorContent('');
          setEditorCategoryId('');
      }
      setView('editor');
  };

  const handleSaveBook = () => {
      if (!editorName.trim()) return alert("Name is required");

      const bookData: WorldBookEntry = {
          id: editingBook ? editingBook.id : `wb_${Date.now()}`,
          name: editorName,
          content: editorContent,
          categoryId: editorCategoryId || null,
          isGlobal: activeTab === 'global',
          isEnabled: editingBook ? editingBook.isEnabled : true
      };

      if (editingBook) {
          setBooks(prev => prev.map(b => b.id === bookData.id ? bookData : b));
      } else {
          setBooks(prev => [...prev, bookData]);
      }
      setView('list');
  };

  const handleDeleteBook = () => {
      if (!editingBook) return;
      if (confirm("Delete this entry?")) {
          setBooks(prev => prev.filter(b => b.id !== editingBook.id));
          setView('list');
      }
  };

  const toggleGlobalBook = (e: React.MouseEvent, bookId: string) => {
      e.stopPropagation();
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, isEnabled: !b.isEnabled } : b));
  };

  const toggleCategory = (catId: string) => {
      const newSet = new Set(expandedCategories);
      if (newSet.has(catId)) newSet.delete(catId);
      else newSet.add(catId);
      setExpandedCategories(newSet);
  };

  const handleAddCategory = () => {
      if (!newCategoryName.trim()) return;
      const newCat: WorldBookCategory = {
          id: `cat_${Date.now()}`,
          name: newCategoryName,
          isGlobal: activeTab === 'global'
      };
      setCategories(prev => [...prev, newCat]);
      setNewCategoryName('');
  };

  const handleDeleteCategory = (catId: string) => {
      if (confirm("Delete this category? Books inside will become uncategorized.")) {
          setCategories(prev => prev.filter(c => c.id !== catId));
          // Unlink books
          setBooks(prev => prev.map(b => b.categoryId === catId ? { ...b, categoryId: null } : b));
      }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-[#f8f9fa] text-slate-800 flex flex-col z-50 app-transition">
      
      {/* --- 1. Header --- */}
      <div className="h-24 bg-white/80 pt-12 px-4 flex items-center justify-between backdrop-blur-md border-b border-gray-200 z-10">
        <button onClick={() => {
            if (view === 'list') onBack();
            else setView('list');
        }} className="font-medium flex items-center text-indigo-600">
            <span className="text-2xl mr-1">‹</span> {view === 'list' ? 'Home' : 'Back'}
        </button>
        <h1 className="font-bold text-lg tracking-wide text-indigo-900">
            {view === 'editor' ? (editingBook ? 'Edit Entry' : 'New Entry') : 
             view === 'categoryManager' ? 'Manage Categories' : 'World Book'}
        </h1>
        <div className="w-16 flex justify-end">
            {view === 'list' && (
                <button onClick={() => handleEditBook(null)} className="text-2xl text-indigo-600 font-light leading-none">
                    +
                </button>
            )}
            {view === 'editor' && (
                <button onClick={handleSaveBook} className="text-sm font-bold text-indigo-600">
                    Save
                </button>
            )}
        </div>
      </div>

      {/* --- 2. Main Content --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
          
          {/* LIST VIEW */}
          {view === 'list' && (
              <>
                {/* Tabs */}
                <div className="flex bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                    <button 
                        onClick={() => setActiveTab('local')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'local' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-400'}`}
                    >
                        Local
                    </button>
                    <button 
                        onClick={() => setActiveTab('global')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'global' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-400'}`}
                    >
                        Global
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex justify-end">
                        <button 
                            onClick={() => setView('categoryManager')}
                            className="text-xs bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full font-medium hover:bg-gray-300 transition-colors"
                        >
                            Manage Categories
                        </button>
                    </div>

                    {/* Categories Render */}
                    {currentCategories.map(cat => {
                        const isExpanded = expandedCategories.has(cat.id);
                        const booksInCat = booksByCategory[cat.id] || [];
                        
                        return (
                            <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div 
                                    onClick={() => toggleCategory(cat.id)}
                                    className="p-4 flex items-center justify-between cursor-pointer bg-gray-50/50 active:bg-gray-100"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs text-gray-400 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                        <span className="font-semibold text-gray-700">{cat.name}</span>
                                        <span className="text-xs text-gray-400">({booksInCat.length})</span>
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className="divide-y divide-gray-100 border-t border-gray-100">
                                        {booksInCat.length === 0 && (
                                            <div className="p-4 text-center text-xs text-gray-400 italic">No entries in this folder.</div>
                                        )}
                                        {booksInCat.map(book => (
                                            <div 
                                                key={book.id} 
                                                onClick={() => handleEditBook(book)}
                                                className="p-4 pl-8 hover:bg-indigo-50/30 active:bg-indigo-50 transition-colors flex justify-between items-center cursor-pointer"
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-800 text-sm">{book.name}</div>
                                                    <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{book.content}</div>
                                                </div>
                                                {activeTab === 'global' && (
                                                    <div 
                                                        onClick={(e) => toggleGlobalBook(e, book.id)}
                                                        className={`w-10 h-5 rounded-full relative transition-colors ${book.isEnabled ? 'bg-green-400' : 'bg-gray-300'}`}
                                                    >
                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${book.isEnabled ? 'left-5' : 'left-0.5'}`}></div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Uncategorized */}
                    {uncategorizedBooks.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-3 bg-gray-50/80 text-xs font-bold text-gray-400 uppercase tracking-wider pl-4">
                                Uncategorized
                            </div>
                            <div className="divide-y divide-gray-100">
                                {uncategorizedBooks.map(book => (
                                    <div 
                                        key={book.id} 
                                        onClick={() => handleEditBook(book)}
                                        className="p-4 hover:bg-indigo-50/30 active:bg-indigo-50 transition-colors flex justify-between items-center cursor-pointer"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-800 text-sm">{book.name}</div>
                                            <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{book.content}</div>
                                        </div>
                                        {activeTab === 'global' && (
                                            <div 
                                                onClick={(e) => toggleGlobalBook(e, book.id)}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${book.isEnabled ? 'bg-green-400' : 'bg-gray-300'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${book.isEnabled ? 'left-5' : 'left-0.5'}`}></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {currentBooks.length === 0 && (
                        <div className="flex flex-col items-center justify-center pt-20 text-gray-300">
                            <span className="text-4xl mb-2">📚</span>
                            <p>No entries found.</p>
                        </div>
                    )}
                </div>
              </>
          )}

          {/* EDITOR VIEW */}
          {view === 'editor' && (
              <div className="p-4 space-y-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Title</label>
                          <input 
                              type="text" 
                              value={editorName}
                              onChange={(e) => setEditorName(e.target.value)}
                              className="w-full text-lg font-bold border-b border-gray-200 pb-2 focus:outline-none focus:border-indigo-500 bg-transparent"
                              placeholder="Entry Name"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Category</label>
                          <select 
                              value={editorCategoryId}
                              onChange={(e) => setEditorCategoryId(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                              <option value="">Uncategorized</option>
                              {currentCategories.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Content</label>
                          <textarea 
                              value={editorContent}
                              onChange={(e) => setEditorContent(e.target.value)}
                              className="w-full h-64 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none leading-relaxed"
                              placeholder="Describe the world rule, character background, or item details..."
                          />
                      </div>
                  </div>

                  {editingBook && (
                      <button 
                          onClick={handleDeleteBook}
                          className="w-full py-3 text-red-500 font-medium bg-white rounded-xl border border-red-100 shadow-sm active:bg-red-50"
                      >
                          Delete Entry
                      </button>
                  )}
              </div>
          )}

          {/* CATEGORY MANAGER VIEW */}
          {view === 'categoryManager' && (
              <div className="p-4 space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                      <h3 className="text-sm font-bold text-gray-800 mb-4">Create New Category</h3>
                      <div className="flex gap-2">
                          <input 
                              type="text" 
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder={`New ${activeTab} category...`}
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:border-indigo-500"
                          />
                          <button 
                              onClick={handleAddCategory}
                              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold active:bg-indigo-700"
                          >
                              Add
                          </button>
                      </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-3 bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-100">
                          Existing {activeTab} Categories
                      </div>
                      <div className="divide-y divide-gray-100">
                          {currentCategories.length === 0 ? (
                              <div className="p-4 text-center text-gray-400 text-sm">No categories yet.</div>
                          ) : (
                              currentCategories.map(cat => (
                                  <div key={cat.id} className="p-4 flex justify-between items-center">
                                      <span className="font-medium text-gray-700">{cat.name}</span>
                                      <button 
                                          onClick={() => handleDeleteCategory(cat.id)}
                                          className="text-red-400 hover:text-red-600 p-1"
                                      >
                                          ✕
                                      </button>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default DreamApp;