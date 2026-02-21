
import React, { useState, useEffect, useRef } from 'react';
import { generateForumFeed, generateTrendingTopics, generateTacitQuiz, getPartnerQuizAnswer, generateSuperTopicFeed, generateForumComments, generateChatResponse, generateAIMomentsPost, generateMomentReply, QuizData, ForumContext } from '../../services/geminiService';
import { Contact, ChatSession, Message, MessageType } from '../../types';

interface ForumAppProps {
  onBack: () => void;
  isOpen: boolean;
}

interface ForumComment {
    author: string;
    content: string;
    isReply?: boolean; // To distinguish AI replies visually if needed
}

interface ForumPost {
    id: string;
    author: string;
    authorId?: string; // Link to contact ID for AI logic
    avatar?: string;
    title: string;
    content: string;
    image?: string; // Post image
    likes: number;
    comments: number;
    tags?: string[];
    commentList?: ForumComment[]; // Store generated comments
}

const ForumApp: React.FC<ForumAppProps> = ({ onBack, isOpen }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'discover' | 'square' | 'profile'>('home');
  const [subView, setSubView] = useState<'none' | 'post_detail' | 'quiz' | 'super_topic'>('none');
  
  // --- Data State ---
  const [feed, setFeed] = useState<ForumPost[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [currentPost, setCurrentPost] = useState<ForumPost | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]); // All contacts for interactions
  const [allChats, setAllChats] = useState<ChatSession[]>([]); // Full chat history for context
  
  // --- Context State ---
  const [partner, setPartner] = useState<Contact | null>(null);
  const [chatHistory, setChatHistory] = useState<string>("");
  
  // --- Square State ---
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizResult, setQuizResult] = useState<{ choice: number, partnerAnswer: number, comment: string } | null>(null);
  
  // Super Topic State
  const [activeSuperTopic, setActiveSuperTopic] = useState<string | null>(null);
  const [superTopicFeed, setSuperTopicFeed] = useState<ForumPost[]>([]);
  const [isTopicLoading, setIsTopicLoading] = useState(false);
  const [hasSignedInTopic, setHasSignedInTopic] = useState(false);

  // --- Profile State ---
  const [myPosts, setMyPosts] = useState<ForumPost[]>([]);
  const [fansCount, setFansCount] = useState(() => parseInt(localStorage.getItem('forum_fans') || '342'));

  // --- Share Modal State ---
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShareContactId, setSelectedShareContactId] = useState<string | null>(null);
  const [shareTargetPost, setShareTargetPost] = useState<ForumPost | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Post Creation Modal State ---
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');

  // --- Comment Interaction State ---
  const [commentInput, setCommentInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const commentListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      localStorage.setItem('forum_fans', fansCount.toString());
  }, [fansCount]);

  useEffect(() => {
      if (isOpen) {
          // 1. Load Contacts
          const savedContacts = localStorage.getItem('ephone_contacts');
          if (savedContacts) {
              setContacts(JSON.parse(savedContacts));
          }

          // 2. Load Chats (For AI Context)
          const savedChats = localStorage.getItem('ephone_chats');
          if (savedChats) {
              const parsedChats: ChatSession[] = JSON.parse(savedChats);
              setAllChats(parsedChats);
          }

          // 3. Load Partner
          const savedPartner = localStorage.getItem('ephone_couple_partner');
          const p = savedPartner ? JSON.parse(savedPartner) : null;
          setPartner(p);

          // 4. Partner History specifically
          let historyContext = "";
          if (p && savedChats) {
              const parsedChats: ChatSession[] = JSON.parse(savedChats);
              const chatSession = parsedChats.find(c => c.contactId === p.id);
              if (chatSession && chatSession.messages.length > 0) {
                  const recentMsgs = chatSession.messages.slice(-10).map(m => 
                      `${m.role === 'user' ? 'Me' : p.name}: ${m.content}`
                  ).join('\n');
                  historyContext = recentMsgs;
                  setChatHistory(recentMsgs);
              }
          }

          // 5. Initial Feed Load
          if (feed.length === 0) {
              const context: ForumContext | undefined = p ? {
                  partnerName: p.name,
                  partnerPersona: p.description,
                  history: historyContext
              } : undefined;

              loadFeed(undefined, context);
              loadTrending(context);
          }
      }
  }, [isOpen]);

  // Scroll to bottom of comments when new one adds
  useEffect(() => {
      if (subView === 'post_detail' && currentPost?.commentList) {
          // simple scroll to bottom logic if needed
      }
  }, [currentPost?.commentList]);

  const loadFeed = async (topic?: string, context?: ForumContext) => {
      setIsLoadingFeed(true);
      const finalContext = context || (partner ? {
          partnerName: partner.name,
          partnerPersona: partner.description,
          history: chatHistory
      } : undefined);

      const posts = await generateForumFeed(topic, finalContext);
      
      const enhancedPosts = posts.map(p => ({
          ...p,
          avatar: p.author === partner?.name 
            ? partner.avatar 
            : `https://ui-avatars.com/api/?name=${p.author}&background=random&color=fff`,
          tags: topic ? [topic] : [],
          commentList: []
      }));
      setFeed(enhancedPosts);
      setIsLoadingFeed(false);
  };

  const loadTrending = async (context?: ForumContext) => {
      const topics = await generateTrendingTopics(context);
      setTrendingTopics(topics);
  };

  // --- AI Actions ---

  const handleRefreshFeed = async () => {
      // Logic: 50% chance to generate a specific character post, 50% regular feed refresh
      if (Math.random() > 0.3 && contacts.length > 0) {
          setIsLoadingFeed(true);
          const aiPostData = await generateAIMomentsPost(contacts, allChats);
          
          if (aiPostData) {
              const authorContact = contacts.find(c => c.id === aiPostData.contactId);
              if (authorContact) {
                  const newPost: ForumPost = {
                      id: `ai_${Date.now()}`,
                      author: authorContact.name,
                      authorId: authorContact.id,
                      avatar: authorContact.avatar,
                      title: aiPostData.content.substring(0, 15) + "...",
                      content: aiPostData.content,
                      image: `https://picsum.photos/600/400?random=${Date.now()}`, // Random image
                      likes: Math.floor(Math.random() * 20),
                      comments: 0,
                      tags: ['朋友圈'],
                      commentList: []
                  };
                  setFeed(prev => [newPost, ...prev]);
              }
          } else {
              // Fallback if AI fails
              loadFeed(); 
          }
          setIsLoadingFeed(false);
      } else {
          loadFeed();
      }
  };

  const handleSendComment = async () => {
      if (!commentInput.trim() || !currentPost) return;

      const userComment = commentInput;
      setCommentInput('');

      // 1. Add User Comment
      const newComment: ForumComment = { author: '我', content: userComment };
      const updatedPost = { 
          ...currentPost, 
          commentList: [...(currentPost.commentList || []), newComment],
          comments: (currentPost.comments || 0) + 1
      };
      
      setCurrentPost(updatedPost);
      // Update in feed list too
      setFeed(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));

      // 2. Check if AI should reply (if author is a contact)
      const authorContact = contacts.find(c => c.name === currentPost.author || c.id === currentPost.authorId);
      
      if (authorContact) {
          setIsReplying(true);
          try {
              const replyText = await generateMomentReply(
                  authorContact.name, 
                  authorContact.description, 
                  currentPost.content, 
                  userComment
              );

              const aiReply: ForumComment = { 
                  author: authorContact.name, 
                  content: replyText,
                  isReply: true 
              };

              // Append AI Reply
              const postWithReply = {
                  ...updatedPost,
                  commentList: [...(updatedPost.commentList || []), newComment, aiReply],
                  comments: updatedPost.comments + 1
              };
              setCurrentPost(postWithReply);
              setFeed(prev => prev.map(p => p.id === postWithReply.id ? postWithReply : p));

          } catch (e) {
              console.error("AI Reply failed", e);
          } finally {
              setIsReplying(false);
          }
      }
  };

  const handleCreatePost = async () => {
      if (!newPostContent.trim()) return;
      
      const content = newPostContent;
      setShowPostModal(false);
      setNewPostContent(''); // Clear for next time

      // Immediate UI update
      const newPost: ForumPost = {
          id: `p_${Date.now()}`,
          author: '我',
          title: content.substring(0, 20) + (content.length > 20 ? '...' : ''),
          content: content,
          likes: 0,
          comments: 0,
          avatar: 'https://ui-avatars.com/api/?name=Me&background=000&color=fff',
          commentList: []
      };
      setMyPosts(prev => [newPost, ...prev]);
      
      // Random Fan Change
      const fanChange = Math.floor(Math.random() * 20) - 5; // -5 to +15
      setFansCount(prev => Math.max(0, prev + fanChange));
      
      // Simulate Interactions (Async)
      try {
          // Use loaded contacts or default
          const simContacts = contacts.length > 0 ? contacts : (partner ? [partner] : []);
          const result = await generateForumComments(content, simContacts);
          
          setMyPosts(prev => prev.map(p => {
              if (p.id === newPost.id) {
                  return {
                      ...p,
                      likes: result.likes,
                      comments: result.comments.length,
                      commentList: result.comments
                  };
              }
              return p;
          }));
      } catch (e) {
          console.error("Interaction simulation failed", e);
      }
  };

  // --- Share Logic ---
  const handleShareClick = (post: ForumPost) => {
      setShareTargetPost(post);
      setShowShareModal(true);
      // Default select partner if available, otherwise first contact
      if (partner) setSelectedShareContactId(partner.id);
      else if (contacts.length > 0) setSelectedShareContactId(contacts[0].id);
  };

  const handleConfirmShare = async () => {
      if (!shareTargetPost || !selectedShareContactId) {
          setShowShareModal(false);
          return;
      }

      const contact = contacts.find(c => c.id === selectedShareContactId) || partner;
      if (!contact) {
          alert("未找到联系人");
          return;
      }

      // 1. Get Chat History
      const savedChats = localStorage.getItem('ephone_chats');
      const allChatsList: ChatSession[] = savedChats ? JSON.parse(savedChats) : [];
      
      let targetChat = allChatsList.find(c => c.contactId === contact.id);
      
      // If no chat exists yet, create one
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
          allChatsList.unshift(targetChat);
      }

      // 2. Add Share Message (Special Type)
      const shareContent = JSON.stringify({
          title: shareTargetPost.title || "分享内容",
          description: shareTargetPost.content.substring(0, 100) + (shareTargetPost.content.length > 100 ? '...' : ''),
          source: "同人文章" // Updated source name for flavor
      });

      const shareMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          type: MessageType.Share,
          content: shareContent,
          timestamp: Date.now()
      };
      targetChat.messages.push(shareMsg);

      // 3. Generate AI Response
      // We pass the context that the user shared a post. 
      const response = await generateChatResponse(
          targetChat.messages.map(m => ({ role: m.role, content: m.content })),
          contact.description
      );

      const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          type: MessageType.Text,
          content: response,
          timestamp: Date.now()
      };
      targetChat.messages.push(aiMsg);

      // 4. Save Back & Close
      localStorage.setItem('ephone_chats', JSON.stringify(allChatsList));
      setShowShareModal(false);
      alert(`已分享给 ${contact.name}，快去微信查看回复吧！`);
  };

  const handleStartQuiz = async () => {
      if (!partner) return alert("请先在情侣空间选择一位伴侣！");
      setIsGenerating(true);
      setQuizResult(null);
      const data = await generateTacitQuiz(partner.name);
      setQuizData(data);
      setIsGenerating(false);
  };

  const handleAnswerQuiz = async (index: number) => {
      if (!partner || !quizData) return;
      setIsGenerating(true);
      const result = await getPartnerQuizAnswer(quizData.question, quizData.options, partner.name, partner.description);
      setQuizResult({
          choice: index,
          partnerAnswer: result.answerIndex,
          comment: result.comment
      });
      setIsGenerating(false);
  };

  // --- Super Topic Logic ---
  const handleOpenSuperTopic = async (topicName: string) => {
      setActiveSuperTopic(topicName);
      setSubView('super_topic');
      setHasSignedInTopic(false);
      setIsTopicLoading(true);
      
      try {
          const posts = await generateSuperTopicFeed(topicName);
          const enhancedPosts = posts.map(p => ({
              ...p,
              avatar: `https://ui-avatars.com/api/?name=${p.author}&background=random&color=fff`,
              tags: [topicName],
              commentList: []
          }));
          setSuperTopicFeed(enhancedPosts);
      } catch (e) {
          console.error(e);
      } finally {
          setIsTopicLoading(false);
      }
  };

  const handleTopicSignIn = () => {
      if (hasSignedInTopic) return;
      setHasSignedInTopic(true);
      alert(`签到成功！经验值 +10`);
  };

  if (!isOpen) return null;

  // --- Render Views ---

  const renderHome = () => (
      <div className="flex flex-col h-full bg-[#f6f6f6]">
          {/* Top Header with Back Button */}
          <div className="bg-white px-4 pt-12 pb-2 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
              <button onClick={onBack} className="text-gray-500 text-sm flex items-center gap-1 active:opacity-60">
                  <span className="text-xl">‹</span> 桌面
              </button>
              <div className="flex gap-6">
                  <span onClick={handleRefreshFeed} className="text-lg font-bold text-gray-800 border-b-2 border-red-500 pb-1 cursor-pointer">朋友圈 ↻</span>
                  <span className="text-lg font-bold text-gray-400">关注</span>
              </div>
              <div className="w-10"></div> {/* Spacer for alignment */}
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
              {isLoadingFeed && <div className="text-center py-4 text-gray-400 text-xs">正在刷新内容...</div>}
              <div className="masonry-grid space-y-2">
                  {feed.map(post => (
                      <div key={post.id} onClick={() => { setCurrentPost(post); setSubView('post_detail'); }} className="bg-white rounded-lg p-4 shadow-sm active:opacity-90 transition-opacity cursor-pointer">
                          <div className="flex items-center gap-2 mb-2">
                              <img src={post.avatar} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                              <span className="text-xs font-bold text-gray-700">{post.author}</span>
                          </div>
                          {post.image && <img src={post.image} className="w-full h-40 object-cover rounded-lg mb-2" />}
                          <h3 className="font-bold text-sm text-gray-800 mb-1 line-clamp-2">{post.title}</h3>
                          <p className="text-xs text-gray-600 line-clamp-3 mb-3">{post.content}</p>
                          <div className="flex items-center justify-between mt-2">
                              <div className="flex gap-3 text-gray-400 text-[10px]">
                                  <span>❤️ {post.likes}</span>
                                  <span>💬 {post.comments || post.commentList?.length || 0}</span>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderDiscover = () => (
      <div className="flex flex-col h-full bg-white">
          <div className="pt-12 px-4 pb-4 border-b border-gray-100">
              <div className="bg-gray-100 rounded-full px-4 py-2 flex items-center text-gray-400 text-sm">
                  <span>🔍 搜索...</span>
              </div>
          </div>
          
          <div className="p-4">
              <h2 className="font-bold mb-4 flex items-center gap-2">🔥 微博热搜</h2>
              <div className="space-y-4">
                  {trendingTopics.length > 0 ? trendingTopics.map((topic, i) => (
                      <div 
                        key={topic} 
                        onClick={() => { loadFeed(topic); setActiveTab('home'); }}
                        className="flex items-center justify-between cursor-pointer active:bg-gray-50 p-1 rounded"
                      >
                          <div className="flex items-center gap-3">
                              <span className={`text-sm font-bold w-4 text-center ${i < 3 ? 'text-red-500' : 'text-gray-400'}`}>{i+1}</span>
                              <span className="text-sm text-gray-800">{topic}</span>
                          </div>
                          <span className="text-xs text-gray-400">热</span>
                      </div>
                  )) : (
                      <div className="text-gray-400 text-sm text-center py-4">加载热搜中...</div>
                  )}
              </div>
          </div>
      </div>
  );

  const renderSquare = () => (
      <div className="flex flex-col h-full bg-[#f6f6f6] pt-12 px-4">
          <h2 className="text-xl font-bold mb-6 text-gray-800">社区广场</h2>
          
          <div className="grid grid-cols-2 gap-4">
              {/* Couple Quiz Card */}
              <div 
                onClick={() => setSubView('quiz')}
                className="bg-gradient-to-br from-pink-400 to-rose-400 rounded-2xl p-4 text-white shadow-lg cursor-pointer active:scale-95 transition-transform h-40 flex flex-col justify-between relative overflow-hidden"
              >
                  <div className="relative z-10">
                      <div className="text-2xl mb-1">💑</div>
                      <h3 className="font-bold text-lg">默契问卷</h3>
                      <p className="text-xs opacity-90 mt-1">测试你们的心灵感应！</p>
                  </div>
                  <div className="absolute right-[-10px] bottom-[-10px] text-8xl opacity-20">?</div>
              </div>

              {/* Super Topic Card */}
              <div 
                onClick={() => setSubView('super_topic')} // Reuses the subview state but renders list first
                className="bg-gradient-to-br from-orange-400 to-yellow-500 rounded-2xl p-4 text-white shadow-lg cursor-pointer active:scale-95 transition-transform h-40 flex flex-col justify-between relative overflow-hidden"
              >
                  <div className="relative z-10">
                      <div className="text-2xl mb-1">💎</div>
                      <h3 className="font-bold text-lg">超话社区</h3>
                      <p className="text-xs opacity-90 mt-1">找到你的同好圈子</p>
                  </div>
                  <div className="absolute right-[-10px] bottom-[-10px] text-8xl opacity-20">#</div>
              </div>
          </div>
          
          <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-2">活动中心</h3>
              <div className="text-sm text-gray-500">更多社区活动敬请期待...</div>
          </div>
      </div>
  );

  const renderProfile = () => (
      <div className="flex flex-col h-full bg-[#f6f6f6]">
          <div className="bg-white pb-6 pt-16 px-6 mb-2">
              <div className="flex items-center gap-4">
                  <img src="https://ui-avatars.com/api/?name=Me&background=000&color=fff" className="w-20 h-20 rounded-full border-4 border-gray-100" />
                  <div>
                      <h2 className="text-xl font-bold">我</h2>
                      <p className="text-xs text-gray-500 mt-1">ID: 888888</p>
                  </div>
              </div>
              <div className="flex gap-8 mt-6 text-center">
                  <div><div className="font-bold text-lg">{myPosts.length}</div><div className="text-xs text-gray-400">帖子</div></div>
                  <div><div className="font-bold text-lg">128</div><div className="text-xs text-gray-400">关注</div></div>
                  <div><div className="font-bold text-lg text-red-500 transition-all">{fansCount}</div><div className="text-xs text-gray-400">粉丝</div></div>
              </div>
          </div>

          <div className="flex-1 bg-white p-4 overflow-y-auto">
              <h3 className="font-bold mb-4 border-b pb-2">我的发布</h3>
              {myPosts.length === 0 ? (
                  <div className="text-center text-gray-300 mt-10">暂无内容，快去分享吧！</div>
              ) : (
                  <div className="space-y-4">
                      {myPosts.map(post => (
                          <div key={post.id} onClick={() => { setCurrentPost(post); setSubView('post_detail'); }} className="border-b border-gray-50 pb-3 cursor-pointer active:bg-gray-50 p-2 rounded">
                              <div className="font-medium text-sm line-clamp-2">{post.content}</div>
                              <div className="flex justify-between items-center mt-2">
                                  <div className="text-xs text-gray-400">{new Date(parseInt(post.id.split('_')[1]) || Date.now()).toLocaleDateString()}</div>
                                  <div className="text-xs text-gray-400">❤️ {post.likes} · 💬 {post.comments}</div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          <button 
            onClick={() => setShowPostModal(true)}
            className="absolute bottom-20 right-6 w-14 h-14 bg-red-500 rounded-full text-white text-3xl shadow-lg flex items-center justify-center active:scale-90 transition-transform"
          >
              +
          </button>
      </div>
  );

  // --- Sub Views ---

  if (subView === 'post_detail' && currentPost) {
      return (
          <div className="absolute inset-0 bg-white z-[60] flex flex-col animate-[slideUp_0.2s_ease-out]">
              <div className="h-12 bg-white flex items-center px-4 border-b border-gray-100 pt-10 pb-2 mb-2 sticky top-0 justify-between">
                  <div className="flex items-center">
                      <button onClick={() => setSubView('none')} className="text-2xl mr-4">‹</button>
                      <div className="flex items-center gap-2">
                          <img src={currentPost.avatar} className="w-8 h-8 rounded-full object-cover" />
                          <span className="font-bold text-sm">{currentPost.author}</span>
                      </div>
                  </div>
                  <button 
                    onClick={() => handleShareClick(currentPost)}
                    className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-xs font-bold active:scale-95"
                  >
                      ↗ 分享
                  </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                  {currentPost.image && (
                      <img src={currentPost.image} className="w-full rounded-xl mb-4 shadow-sm" />
                  )}
                  <h1 className="text-xl font-bold mb-4 text-gray-900">{currentPost.title}</h1>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentPost.content}</p>
                  
                  <div className="mt-8 pt-8 border-t border-gray-100">
                      <h3 className="font-bold mb-4">评论 ({currentPost.commentList?.length || currentPost.comments})</h3>
                      {currentPost.commentList && currentPost.commentList.length > 0 ? (
                          <div className="space-y-4">
                              {currentPost.commentList.map((c, i) => (
                                  <div key={i} className="flex gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 ${c.author === '我' ? 'bg-blue-100 text-blue-500' : 'bg-gray-200'}`}>
                                          {c.author[0]}
                                      </div>
                                      <div>
                                          <div className="text-xs font-bold text-gray-500">{c.author}</div>
                                          <div className="text-sm text-gray-800">{c.content}</div>
                                      </div>
                                  </div>
                              ))}
                              {isReplying && (
                                  <div className="flex gap-3 opacity-60">
                                      <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                                      <div className="text-xs text-gray-400 mt-2">对方正在输入...</div>
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="text-center text-gray-400 text-sm">暂无评论。</div>
                      )}
                  </div>
              </div>
              <div className="p-4 border-t flex items-center gap-2 pb-safe bg-white">
                  <input 
                    type="text" 
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    placeholder="写下你的评论..." 
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none" 
                  />
                  <button onClick={handleSendComment} className="text-blue-500 font-bold text-sm px-2">发送</button>
              </div>
          </div>
      );
  }

  if (subView === 'quiz') {
      return (
          <div className="absolute inset-0 bg-[#fefce8] z-[60] flex flex-col p-6 animate-[slideUp_0.2s_ease-out]">
              <div className="flex justify-between items-center mb-8 pt-8">
                  <button onClick={() => setSubView('none')} className="text-2xl text-gray-600">✕</button>
                  <h2 className="font-bold text-lg text-yellow-800">默契大挑战</h2>
                  <div className="w-6"></div>
              </div>

              {isGenerating ? (
                  <div className="flex-1 flex items-center justify-center flex-col text-yellow-600">
                      <div className="animate-spin text-4xl mb-4">🌀</div>
                      <div>出题中...</div>
                  </div>
              ) : !quizData ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="text-6xl mb-6">💞</div>
                      <p className="text-center text-gray-600 mb-8 px-4">
                          看看你和 {partner?.name || '伴侣'} 是否心有灵犀！
                      </p>
                      <button onClick={handleStartQuiz} className="bg-yellow-500 text-white px-8 py-3 rounded-full font-bold shadow-lg active:scale-95">开始测试</button>
                  </div>
              ) : !quizResult ? (
                  <div className="flex-1 flex flex-col justify-center animate-[fadeIn_0.3s]">
                      <h3 className="text-xl font-bold text-center mb-8 text-gray-800">{quizData.question}</h3>
                      <div className="space-y-4">
                          {quizData.options.map((opt, i) => (
                              <button 
                                key={i} 
                                onClick={() => handleAnswerQuiz(i)}
                                className="w-full p-4 bg-white border-2 border-yellow-100 rounded-xl text-left font-medium text-gray-700 hover:border-yellow-400 transition-colors"
                              >
                                  {opt}
                              </button>
                          ))}
                      </div>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center animate-[fadeIn_0.3s] text-center">
                      <div className="text-6xl mb-4">
                          {quizResult.choice === quizResult.partnerAnswer ? '🎉' : '😅'}
                      </div>
                      <h3 className="text-2xl font-bold mb-2">
                          {quizResult.choice === quizResult.partnerAnswer ? '默契满分！' : '还需要磨合哦~'}
                      </h3>
                      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 w-full text-left">
                          <p className="text-sm text-gray-500 mb-1">{partner?.name} 选择了:</p>
                          <p className="font-bold text-lg text-yellow-600 mb-2">{quizData.options[quizResult.partnerAnswer]}</p>
                          <p className="text-sm italic text-gray-600">"{quizResult.comment}"</p>
                      </div>
                      <button onClick={() => { setQuizData(null); setQuizResult(null); }} className="text-yellow-600 font-bold underline">再玩一次</button>
                  </div>
              )}
          </div>
      );
  }

  // --- Super Topic View ---
  if (subView === 'super_topic') {
      // List of available topics
      if (!activeSuperTopic) {
          return (
              <div className="absolute inset-0 bg-white z-[60] flex flex-col animate-[slideUp_0.2s_ease-out]">
                  <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 pt-6 bg-white sticky top-0 z-10">
                      <button onClick={() => setSubView('none')} className="text-2xl text-gray-600">✕</button>
                      <h2 className="font-bold text-lg">超话社区</h2>
                      <div className="w-6"></div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4 overflow-y-auto">
                      {contacts.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => handleOpenSuperTopic(c.name)}
                            className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl cursor-pointer active:scale-95 transition-transform border border-blue-100"
                          >
                              <div className="flex items-center gap-3 mb-2">
                                  <img src={c.avatar} className="w-10 h-10 rounded-full object-cover" />
                                  <span className="font-bold text-sm">{c.name}</span>
                              </div>
                              <div className="text-xs text-gray-500">粉丝: {Math.floor(Math.random() * 10000)}</div>
                          </div>
                      ))}
                      {['美食', '萌宠', '树洞', '游戏'].map(t => (
                          <div 
                            key={t}
                            onClick={() => handleOpenSuperTopic(t)}
                            className="bg-gray-50 p-4 rounded-xl cursor-pointer active:scale-95 transition-transform flex flex-col justify-center items-center h-24"
                          >
                              <span className="text-2xl mb-2">#</span>
                              <span className="font-bold text-gray-700">{t}</span>
                          </div>
                      ))}
                  </div>
              </div>
          );
      }

      // Active Topic Feed
      return (
          <div className="absolute inset-0 bg-[#f6f6f6] z-[60] flex flex-col animate-[slideUp_0.2s_ease-out]">
              {/* Header */}
              <div className="h-40 bg-gradient-to-r from-purple-500 to-indigo-500 p-6 flex flex-col justify-end text-white relative">
                  <button onClick={() => setActiveSuperTopic(null)} className="absolute top-8 left-4 text-2xl">‹</button>
                  <div className="flex justify-between items-end">
                      <div>
                          <h2 className="text-2xl font-bold mb-1">#{activeSuperTopic}</h2>
                          <p className="text-xs opacity-80">今日阅读 10万+</p>
                      </div>
                      <button 
                        onClick={handleTopicSignIn}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${hasSignedInTopic ? 'bg-white/30 text-white' : 'bg-white text-purple-600'}`}
                      >
                          {hasSignedInTopic ? '已签到' : '签到'}
                      </button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                  {isTopicLoading ? (
                      <div className="text-center py-10 text-gray-400">加载中...</div>
                  ) : (
                      <div className="space-y-2">
                          {superTopicFeed.map(post => (
                              <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm">
                                  <div className="flex items-center gap-2 mb-3">
                                      <img src={post.avatar} className="w-8 h-8 rounded-full bg-gray-200" />
                                      <div>
                                          <div className="text-sm font-bold text-gray-800">{post.author}</div>
                                          <div className="text-[10px] text-gray-400">1小时前</div>
                                      </div>
                                  </div>
                                  <p className="text-sm text-gray-800 leading-relaxed mb-3">{post.content}</p>
                                  <div className="flex gap-4 text-xs text-gray-400">
                                      <span>👍 {post.likes}</span>
                                      <span>💬 {post.comments}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- SHARE MODAL ---
  const renderShareModal = () => {
      if (!showShareModal) return null;
      return (
          <div className="absolute inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center sm:p-6 animate-[fadeIn_0.2s]">
              <div className="bg-white w-full sm:max-w-sm rounded-t-[20px] sm:rounded-2xl p-4 shadow-2xl animate-[slideUp_0.2s_ease-out]">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                      <button onClick={() => setShowShareModal(false)} className="text-gray-500">取消</button>
                      <span className="font-bold text-gray-800">分享给...</span>
                      <button onClick={handleConfirmShare} className="text-green-500 font-bold">确定</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                      <div className="space-y-2">
                          {contacts.length === 0 && <div className="text-center text-gray-400 py-4">暂无联系人</div>}
                          {contacts.map(contact => (
                              <div 
                                  key={contact.id} 
                                  onClick={() => setSelectedShareContactId(contact.id)}
                                  className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${selectedShareContactId === contact.id ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50 border border-transparent'}`}
                              >
                                  <img src={contact.avatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover mr-3" />
                                  <span className="flex-1 font-medium">{contact.name}</span>
                                  {selectedShareContactId === contact.id && <span className="text-green-500">✓</span>}
                              </div>
                          ))}
                      </div>
                  </div>
                  {/* Preview of what is being shared */}
                  {shareTargetPost && (
                      <div className="mt-4 p-3 bg-gray-100 rounded-lg flex flex-col border border-gray-200/50">
                          {/* Rich Card Preview matching the chat style */}
                          <div className="flex flex-col min-w-[200px] bg-white p-3 rounded-lg shadow-sm">
                              <div className="font-bold text-black text-[13px] mb-2 leading-snug line-clamp-1">
                                  {shareTargetPost.title || "分享内容"}
                              </div>
                              <div className="flex gap-2 mb-2">
                                  <div className="w-[3px] bg-[#007aff] shrink-0 rounded-full h-auto my-0.5 opacity-90"></div>
                                  <div className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                                      {shareTargetPost.content}
                                  </div>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-gray-400 pt-1 border-t border-gray-100/50">
                                  <span>同人文章</span>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  // --- POST CREATION MODAL ---
  const renderPostModal = () => {
      if (!showPostModal) return null;
      return (
          <div className="absolute inset-0 bg-white z-[100] flex flex-col animate-[slideUp_0.2s_ease-out]">
              <div className="flex justify-between items-center p-4 border-b border-gray-100 pt-10">
                  <button onClick={() => setShowPostModal(false)} className="text-gray-500 text-sm">取消</button>
                  <span className="font-bold text-gray-800">发布动态</span>
                  <button 
                    onClick={handleCreatePost} 
                    className={`bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-bold ${!newPostContent.trim() ? 'opacity-50' : ''}`}
                    disabled={!newPostContent.trim()}
                  >
                      发布
                  </button>
              </div>
              <div className="flex-1 p-4">
                  <textarea 
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="分享你的新鲜事..."
                      className="w-full h-full resize-none outline-none text-base text-gray-800 placeholder-gray-400"
                      autoFocus
                  />
              </div>
          </div>
      );
  };

  // --- Main Tab Bar ---
  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col app-transition overflow-hidden">
        {/* Render Share Modal */}
        {renderShareModal()}
        {/* Render Post Modal */}
        {renderPostModal()}

        <div className="flex-1 overflow-hidden relative">
            {activeTab === 'home' && renderHome()}
            {activeTab === 'discover' && renderDiscover()}
            {activeTab === 'square' && renderSquare()}
            {activeTab === 'profile' && renderProfile()}
        </div>

        <div className="h-14 bg-white border-t border-gray-200 flex items-center justify-around text-[10px] z-20 pb-safe text-gray-500">
            {['home', 'discover', 'square', 'profile'].map((tab) => (
                <div 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)} 
                    className={`flex flex-col items-center gap-0.5 cursor-pointer ${activeTab === tab ? 'text-black font-bold' : ''}`}
                >
                    <span className="text-xl">
                        {tab === 'home' ? '🏠' : tab === 'discover' ? '🧭' : tab === 'square' ? '🎡' : '👤'}
                    </span>
                    <span>
                        {tab === 'home' ? '首页' : tab === 'discover' ? '发现' : tab === 'square' ? '广场' : '我的'}
                    </span>
                </div>
            ))}
        </div>
    </div>
  );
};

export default ForumApp;
