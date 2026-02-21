
import React, { useState, useRef, useEffect } from 'react';
import { searchMusic } from '../../services/geminiService';

interface MusicAppProps {
  onBack: () => void;
  isOpen: boolean;
}

interface Track {
    id: string;
    title: string;
    artist: string;
    cover: string;
    url: string; // Blob URL or Remote URL
    duration: number; // In seconds
    isLocal?: boolean;
}

// Default "Demo" tracks (Simulation only or public domain)
const DEFAULT_TRACKS: Track[] = [
    { 
        id: 't1', 
        title: "Daylight", 
        artist: "David Kushner", 
        cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop", 
        url: "", // Demo track without audio
        duration: 210 
    },
    { 
        id: 't2', 
        title: "Midnight City", 
        artist: "M83", 
        cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=600&auto=format&fit=crop", 
        url: "", 
        duration: 243 
    },
    { 
        id: 't3', 
        title: "Cruel Summer", 
        artist: "Taylor Swift", 
        cover: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=600&auto=format&fit=crop", 
        url: "", 
        duration: 178 
    }
];

const MusicApp: React.FC<MusicAppProps> = ({ onBack, isOpen }) => {
  // --- State ---
  const [playlist, setPlaylist] = useState<Track[]>(() => {
      // Try to restore simplified playlist structure if needed, currently using defaults
      return DEFAULT_TRACKS;
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Customization State
  const [background, setBackground] = useState<string | null>(() => localStorage.getItem('music_custom_bg'));
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Add URL State
  const [addUrlInputs, setAddUrlInputs] = useState({ url: '', title: '', artist: '' });

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const songInputRef = useRef<HTMLInputElement>(null);

  // Initialize Audio
  useEffect(() => {
      audioRef.current = new Audio();
      
      const audio = audioRef.current;
      
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleLoadedMetadata = () => setDuration(audio.duration);
      const handleEnded = () => nextTrack();
      const handleError = () => {
          console.warn("Audio playback error or empty source.");
          setIsPlaying(false);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
          audio.pause();
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
      };
  }, []);

  // Sync Track
  useEffect(() => {
      if (audioRef.current) {
          const track = playlist[currentTrackIndex];
          // If the track has a valid URL, load it. Otherwise, it's a demo/simulated track.
          if (track.url) {
              audioRef.current.src = track.url;
              if (isPlaying) {
                  audioRef.current.play().catch(e => console.log("Auto-play blocked or failed", e));
              }
          } else {
              audioRef.current.removeAttribute('src'); // Stop playing previous
              // For demo tracks, we will rely on simulated progress in a separate effect if needed
              // or just reset state
              setDuration(track.duration);
              setCurrentTime(0);
          }
      }
  }, [currentTrackIndex, playlist]);

  // Play/Pause Control
  useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const track = playlist[currentTrackIndex];

      if (track.url) {
          if (isPlaying) audio.play().catch(e => { console.error(e); setIsPlaying(false); });
          else audio.pause();
      } else {
          // Simulation logic for demo tracks without audio
          let interval: any;
          if (isPlaying) {
              interval = setInterval(() => {
                  setCurrentTime(prev => {
                      if (prev >= track.duration) {
                          setIsPlaying(false);
                          return 0;
                      }
                      return prev + 1;
                  });
              }, 1000);
          }
          return () => clearInterval(interval);
      }
  }, [isPlaying, currentTrackIndex, playlist]);

  // Pause when app closes
  useEffect(() => {
      if (!isOpen) {
          setIsPlaying(false);
          audioRef.current?.pause();
      }
  }, [isOpen]);

  // --- Handlers ---

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      if (audioRef.current && playlist[currentTrackIndex].url) {
          audioRef.current.currentTime = time;
      }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // --- Upload Handlers ---

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
              const result = evt.target?.result as string;
              setBackground(result);
              localStorage.setItem('music_custom_bg', result);
              setShowMenu(false);
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const handleSongUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const objectUrl = URL.createObjectURL(file);
          const newTrack: Track = {
              id: `local_${Date.now()}`,
              title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
              artist: "Local Upload",
              cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop", // Generic cover
              url: objectUrl,
              duration: 0, // Will load metadata
              isLocal: true
          };
          setPlaylist(prev => [newTrack, ...prev]);
          setCurrentTrackIndex(0); // Play new song
          setIsPlaying(true);
          setShowMenu(false);
      }
      e.target.value = '';
  };

  const handleAddUrl = () => {
      if (!addUrlInputs.url) return alert("Please enter a URL");
      
      const newTrack: Track = {
          id: `url_${Date.now()}`,
          title: addUrlInputs.title || "Unknown Song",
          artist: addUrlInputs.artist || "Web Stream",
          cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop",
          url: addUrlInputs.url,
          duration: 0
      };
      setPlaylist(prev => [newTrack, ...prev]);
      setAddUrlInputs({ url: '', title: '', artist: '' });
      setCurrentTrackIndex(0);
      setIsPlaying(true);
      setShowMenu(false);
  };

  // --- Search Handlers ---
  const handleSearchMusic = async () => {
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      try {
          const results = await searchMusic(searchQuery);
          // Map to internal Track format
          const mappedResults: Track[] = results.map((r: any) => ({
              id: r.id,
              title: r.title,
              artist: r.artist || "Unknown Artist",
              cover: r.cover || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop",
              url: "", // Simulated audio for search results
              duration: 180, // Simulated duration
              isLocal: false
          }));
          setSearchResults(mappedResults);
      } catch (e) {
          alert("Search failed.");
      } finally {
          setIsSearching(false);
      }
  };

  const playSearchResult = (track: Track) => {
      setPlaylist(prev => [track, ...prev]);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
  };

  if (!isOpen) return null;

  const track = playlist[currentTrackIndex];
  const activeDuration = duration || track.duration;

  return (
    <div className="absolute inset-0 bg-[#1c1c1e] text-white z-50 flex flex-col app-transition overflow-hidden">
       <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
       <input type="file" ref={songInputRef} className="hidden" accept="audio/*" onChange={handleSongUpload} />

       {/* Background */}
       <div 
         className="absolute inset-0 z-0 opacity-40 blur-3xl transition-all duration-1000" 
         style={{ 
             backgroundImage: `url(${background || track.cover})`, 
             backgroundSize: 'cover', 
             backgroundPosition: 'center' 
         }}
       ></div>
       
       {/* Explicit Background Layer if Custom is set (for sharper look if user wants, currently blurred style) */}
       {background && (
           <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
       )}

       {/* Header */}
       <div className="relative z-10 h-24 pt-12 px-6 flex items-center justify-between">
           <button onClick={onBack} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors">
               ‹
           </button>
           <div className="flex flex-col items-center">
               <span className="text-xs font-bold tracking-widest uppercase opacity-70">
                   {track.isLocal ? 'Local Audio' : 'Music Player'}
               </span>
           </div>
           <div className="flex gap-3">
               <button 
                    onClick={() => setShowSearch(true)}
                    className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors"
               >
                   🔍
               </button>
               <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors"
               >
                   •••
               </button>
           </div>
       </div>

       {/* Search Overlay */}
       {showSearch && (
           <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col animate-[fadeIn_0.2s]">
               <div className="h-24 pt-12 px-4 flex items-center gap-3 border-b border-white/10">
                   <div className="flex-1 bg-white/10 rounded-full flex items-center px-4 py-2">
                       <span className="text-gray-400 mr-2">🔍</span>
                       <input 
                           type="text" 
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleSearchMusic()}
                           placeholder="Search songs, artists..." 
                           className="bg-transparent outline-none w-full text-sm"
                           autoFocus
                       />
                   </div>
                   <button onClick={() => setShowSearch(false)} className="text-sm font-bold">Cancel</button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-2">
                   {isSearching ? (
                       <div className="text-center text-gray-500 mt-10">Searching...</div>
                   ) : searchResults.length > 0 ? (
                       searchResults.map(res => (
                           <div key={res.id} onClick={() => playSearchResult(res)} className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg cursor-pointer">
                               <img src={res.cover} className="w-12 h-12 rounded-md object-cover" />
                               <div className="flex-1">
                                   <div className="font-bold text-sm">{res.title}</div>
                                   <div className="text-xs text-gray-400">{res.artist}</div>
                               </div>
                               <button className="text-xs bg-white/20 px-2 py-1 rounded-full">Play</button>
                           </div>
                       ))
                   ) : (
                       <div className="text-center text-gray-600 mt-10 text-xs">Enter keywords to search for music</div>
                   )}
               </div>
           </div>
       )}

       {/* Settings Menu Overlay */}
       {showMenu && (
           <div className="absolute inset-x-0 top-0 bottom-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end p-6 animate-[fadeIn_0.2s]">
               <div className="bg-[#2c2c2e] rounded-2xl overflow-hidden mb-4">
                   <div className="p-4 border-b border-white/10 text-center font-bold text-sm">Settings</div>
                   
                   <button onClick={() => bgInputRef.current?.click()} className="w-full p-4 text-left hover:bg-white/5 flex items-center gap-3">
                       <span>🖼️</span> Change Background
                   </button>
                   
                   <button onClick={() => songInputRef.current?.click()} className="w-full p-4 text-left hover:bg-white/5 flex items-center gap-3">
                       <span>📁</span> Upload Local Song
                   </button>
               </div>

               <div className="bg-[#2c2c2e] rounded-2xl p-4 mb-4 space-y-3">
                   <div className="text-xs font-bold text-gray-400 uppercase">Add from URL</div>
                   <input 
                     type="text" 
                     placeholder="Song URL (mp3/wav)..." 
                     value={addUrlInputs.url}
                     onChange={e => setAddUrlInputs({...addUrlInputs, url: e.target.value})}
                     className="w-full bg-black/30 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                   />
                   <div className="flex gap-2">
                       <input 
                         type="text" 
                         placeholder="Title" 
                         value={addUrlInputs.title}
                         onChange={e => setAddUrlInputs({...addUrlInputs, title: e.target.value})}
                         className="flex-1 bg-black/30 rounded-lg p-2 text-sm outline-none"
                       />
                       <input 
                         type="text" 
                         placeholder="Artist" 
                         value={addUrlInputs.artist}
                         onChange={e => setAddUrlInputs({...addUrlInputs, artist: e.target.value})}
                         className="flex-1 bg-black/30 rounded-lg p-2 text-sm outline-none"
                       />
                   </div>
                   <button onClick={handleAddUrl} className="w-full bg-blue-600 py-2 rounded-lg font-bold text-sm">Add Track</button>
               </div>

               <button onClick={() => setShowMenu(false)} className="bg-white text-black font-bold py-3.5 rounded-2xl w-full">Cancel</button>
           </div>
       )}

       {/* Content */}
       <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 space-y-10">
           {/* Album Art / Vinyl */}
           <div className="w-64 h-64 rounded-full bg-black shadow-2xl border-4 border-gray-800 flex items-center justify-center relative overflow-hidden group">
               <img 
                 src={track.cover} 
                 className={`w-full h-full object-cover opacity-80 ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`} 
                 style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
               />
               <div className="absolute inset-0 bg-gradient-to-tr from-black/50 to-transparent pointer-events-none"></div>
               {/* Center Hole */}
               <div className="absolute w-20 h-20 bg-[#1c1c1e] rounded-full flex items-center justify-center border-2 border-gray-700 z-10">
                   <div className="w-3 h-3 bg-white rounded-full"></div>
               </div>
               
               {/* Simulating tone arm or shine */}
               <div className="absolute inset-0 bg-white/5 rounded-full pointer-events-none"></div>
           </div>

           {/* Info */}
           <div className="text-center space-y-1 w-full px-8">
               <h2 className="text-2xl font-bold truncate">{track.title}</h2>
               <p className="text-gray-400 text-sm truncate">{track.artist}</p>
               {!track.url && <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Demo / Simulated</span>}
           </div>

           {/* Controls */}
           <div className="w-full max-w-xs space-y-6">
               {/* Progress Bar */}
               <div className="space-y-2">
                   <input 
                     type="range" 
                     min="0" 
                     max={activeDuration || 100} 
                     value={currentTime} 
                     onChange={handleSeek}
                     className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
                   />
                   <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                       <span>{formatTime(currentTime)}</span>
                       <span>{formatTime(activeDuration)}</span>
                   </div>
               </div>

               {/* Buttons */}
               <div className="flex justify-between items-center px-4">
                   <button onClick={prevTrack} className="text-3xl opacity-80 hover:opacity-100 active:scale-90 transition-transform">⏮</button>
                   <button 
                     onClick={togglePlay} 
                     className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center text-3xl shadow-lg hover:scale-105 active:scale-95 transition-all pl-1"
                   >
                       {isPlaying ? '⏸' : '▶'}
                   </button>
                   <button onClick={nextTrack} className="text-3xl opacity-80 hover:opacity-100 active:scale-90 transition-transform">⏭</button>
               </div>
           </div>
       </div>
    </div>
  );
};

export default MusicApp;
