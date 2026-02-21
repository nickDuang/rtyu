
export enum AppID {
  Home = 'home',
  Chat = 'chat', // Generic Chat / Messages
  WeChat = 'wechat',
  WorldBook = 'worldbook',
  Beautify = 'beautify', 
  Settings = 'settings',
  ApiSettings = 'apisettings',
  Phone = 'phone',
  Calendar = 'calendar',
  CoupleSpace = 'couplespace',
  Mail = 'mail',
  Fitness = 'fitness',
  Music = 'music',
  Investigation = 'investigation',
  Taobao = 'taobao',
  Payment = 'payment',
  Bookstore = 'bookstore',
  Weather = 'weather',
  ReverseInvestigation = 'reverse_investigation', // New App
  Forum = 'forum',
  Archive = 'archive'
}

export enum MessageType {
  Text = 'text',
  Image = 'image',
  System = 'system',
  Transfer = 'transfer',
  RedPacket = 'red_packet',
  Gift = 'gift',
  Share = 'share',
  Location = 'location',
  PayRequest = 'pay_request' // New: Role Pay Request
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type: MessageType;
  timestamp: number;
  metadata?: any;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  description: string; // Persona/Description
  isSystem?: boolean; // For static system contacts like Group
}

export interface ChatSession {
  id: string;
  contactId: string; // Link to contact
  name: string; // Cache name
  avatar: string; // Cache avatar
  messages: Message[];
  isPinned: boolean;
  unreadCount: number;
  persona: string;
  linkedWorldBooks?: string[]; // IDs of linked WorldBook entries
}

export interface MomentComment {
  id: string;
  contactId: string;
  name: string;
  content: string;
}

export interface Moment {
  id: string;
  userId: string; // 'user' for current user
  content: string;
  images: string[];
  timestamp: number;
  likes: string[]; // List of names
  comments: MomentComment[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

// --- World Book Types ---
export interface WorldBookCategory {
    id: string;
    name: string;
    isGlobal: boolean;
}

export interface WorldBookEntry {
    id: string;
    name: string;
    content: string;
    categoryId: string | null;
    isGlobal: boolean;
    isEnabled: boolean; // For global prompt injection
}

// --- Settings Types ---
export type ApiProvider = 'gemini' | 'openai' | 'anthropic';

export type ActivityFrequency = 'none' | 'low' | 'medium' | 'high';

export interface AppSettings {
    // API Config
    provider: ApiProvider;
    baseUrl: string;
    apiKey: string;
    modelName: string;
    
    // Background Activity
    enableBackgroundActivity: boolean;
    backgroundActivityInterval: number; // Seconds
    blockCooldownHours: number; // Hours before re-messaging
    backgroundActivityConfig?: Record<string, ActivityFrequency>; // Character ID -> Frequency
}

export interface ApiPreset {
    id: string;
    name: string;
    provider: ApiProvider;
    baseUrl: string;
    apiKey: string;
    modelName: string;
}

export interface FitnessPlan {
    coachMessage: string;
    diet: {
        breakfast: string;
        lunch: string;
        dinner: string;
        tips: string;
    };
    workout: {
        warmup: string;
        main: string;
        cooldown: string;
        duration: string;
    };
}

export interface TaobaoProduct {
    id: string;
    title: string;
    price: number;
    shop: string;
    sales: string;
    image: string;
}

export interface SearchResult {
    id: string;
    url: string;
    title: string;
    snippet: string;
    cover?: string; // For music
    artist?: string; // For music
}

export interface QuestionBoxItem {
    id: string;
    type: 'user_ask' | 'char_ask';
    question: string;
    answer: string;
    timestamp: number;
    isAnonymous?: boolean;
}

export interface BookStory {
    id: string;
    title: string;
    content: string;
    author: string;
    genre: string;
    coverColor: string;
    timestamp: number;
}

export interface Dossier {
    id: string;
    charName: string;
    charAvatar: string;
    charPersona: string;
    userName: string;
    userAvatar: string;
    userPersona: string;
    timestamp: number;
}
