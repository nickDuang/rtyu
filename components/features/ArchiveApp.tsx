import React, { useState, useEffect, useRef } from 'react';
import { AppID, Dossier } from '../../types';

interface ArchiveAppProps {
    isOpen: boolean;
    onBack: () => void;
}

const ArchiveApp: React.FC<ArchiveAppProps> = ({ isOpen, onBack }) => {
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [dossiers, setDossiers] = useState<Dossier[]>([]);
    const [editingDossier, setEditingDossier] = useState<Dossier | null>(null);

    // Form State
    const [charName, setCharName] = useState('');
    const [charAvatar, setCharAvatar] = useState('');
    const [charPersona, setCharPersona] = useState('');
    const [userName, setUserName] = useState('');
    const [userAvatar, setUserAvatar] = useState('');
    const [userPersona, setUserPersona] = useState('');

    const charAvatarRef = useRef<HTMLInputElement>(null);
    const userAvatarRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('ephone_archive_dossiers');
            if (saved) setDossiers(JSON.parse(saved));
        }
    }, [isOpen]);

    const saveDossiers = (updated: Dossier[]) => {
        setDossiers(updated);
        localStorage.setItem('ephone_archive_dossiers', JSON.stringify(updated));
    };

    const handleAdd = () => {
        setEditingDossier(null);
        setCharName('');
        setCharAvatar('');
        setCharPersona('');
        setUserName('');
        setUserAvatar('');
        setUserPersona('');
        setView('editor');
    };

    const handleEdit = (dossier: Dossier) => {
        setEditingDossier(dossier);
        setCharName(dossier.charName);
        setCharAvatar(dossier.charAvatar);
        setCharPersona(dossier.charPersona);
        setUserName(dossier.userName);
        setUserAvatar(dossier.userAvatar);
        setUserPersona(dossier.userPersona);
        setView('editor');
    };

    const handleSave = () => {
        if (!charName.trim() || !userName.trim()) {
            alert('请填写姓名');
            return;
        }

        const newDossier: Dossier = {
            id: editingDossier?.id || `dossier_${Date.now()}`,
            charName,
            charAvatar: charAvatar || 'https://picsum.photos/seed/char/200',
            charPersona,
            userName,
            userAvatar: userAvatar || 'https://picsum.photos/seed/user/200',
            userPersona,
            timestamp: Date.now()
        };

        let updated: Dossier[];
        if (editingDossier) {
            updated = dossiers.map(d => d.id === editingDossier.id ? newDossier : d);
        } else {
            updated = [newDossier, ...dossiers];
        }

        saveDossiers(updated);
        setView('list');
    };

    const handleDelete = () => {
        if (!editingDossier) return;
        if (confirm('确定要删除这个档案吗？')) {
            const updated = dossiers.filter(d => d.id !== editingDossier.id);
            saveDossiers(updated);
            setView('list');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'char' | 'user') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                if (target === 'char') setCharAvatar(result);
                else setUserAvatar(result);
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 bg-[#f5f5f7] z-50 flex flex-col app-transition overflow-hidden font-sans">
            {/* Header */}
            <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-20">
                <button 
                    onClick={view === 'list' ? onBack : () => setView('list')} 
                    className="w-10 h-10 flex items-center justify-center text-gray-800 active:opacity-50"
                >
                    <span className="text-2xl">‹</span>
                </button>
                <div className="flex-1 text-center font-bold text-gray-800">
                    {view === 'list' ? '档案' : (editingDossier ? '编辑档案' : '建立新档案')}
                </div>
                <div className="w-10 flex items-center justify-center">
                    {view === 'list' && (
                        <button onClick={handleAdd} className="text-2xl text-blue-500 active:opacity-50">＋</button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {view === 'list' ? (
                    <div className="space-y-3">
                        {dossiers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <span className="text-4xl mb-2">📁</span>
                                <p className="text-sm">暂无档案</p>
                            </div>
                        ) : (
                            dossiers.map(d => (
                                <div 
                                    key={d.id} 
                                    onClick={() => handleEdit(d)}
                                    className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-98 transition-transform cursor-pointer"
                                >
                                    <div className="flex -space-x-4">
                                        <img src={d.charAvatar} className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-sm" />
                                        <img src={d.userAvatar} className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-sm" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="font-bold text-gray-800 truncate">{d.charName} & {d.userName}</div>
                                        <div className="text-xs text-gray-400 mt-1">{new Date(d.timestamp).toLocaleDateString()}</div>
                                    </div>
                                    <span className="text-gray-300">›</span>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 pb-20">
                        {/* Character Section */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">角色 (CHARACTER)</h3>
                            <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-4">
                                <div 
                                    onClick={() => charAvatarRef.current?.click()}
                                    className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden shrink-0 cursor-pointer"
                                >
                                    {charAvatar ? (
                                        <img src={charAvatar} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl text-gray-300">📷</span>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <input 
                                        type="text" 
                                        value={charName}
                                        onChange={(e) => setCharName(e.target.value)}
                                        placeholder="姓名"
                                        className="w-full bg-gray-50 border-none rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <textarea 
                                        value={charPersona}
                                        onChange={(e) => setCharPersona(e.target.value)}
                                        placeholder="人设背景..."
                                        className="w-full bg-gray-50 border-none rounded-xl p-2 text-sm h-20 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* User Section */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">用户 (USER)</h3>
                            <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-4">
                                <div 
                                    onClick={() => userAvatarRef.current?.click()}
                                    className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden shrink-0 cursor-pointer"
                                >
                                    {userAvatar ? (
                                        <img src={userAvatar} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl text-gray-300">👤</span>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <input 
                                        type="text" 
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        placeholder="姓名"
                                        className="w-full bg-gray-50 border-none rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <textarea 
                                        value={userPersona}
                                        onChange={(e) => setUserPersona(e.target.value)}
                                        placeholder="你的设定..."
                                        className="w-full bg-gray-50 border-none rounded-xl p-2 text-sm h-20 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 pt-4">
                            <button 
                                onClick={handleSave}
                                className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                            >
                                保存并生成
                            </button>
                            {editingDossier && (
                                <button 
                                    onClick={handleDelete}
                                    className="w-full bg-red-50 text-red-500 py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                                >
                                    删除档案
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden Inputs */}
            <input type="file" ref={charAvatarRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'char')} />
            <input type="file" ref={userAvatarRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'user')} />
        </div>
    );
};

export default ArchiveApp;
