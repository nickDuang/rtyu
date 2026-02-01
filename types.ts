
export enum AppID {
  Home = 'home',
  Chat = 'chat', // Generic Chat / Messages
  WeChat = 'wechat',
  WorldBook = 'worldbook',
  Beautify = 'beautify', 
  Settings = 'settings',
  Phone = 'phone',
  Calendar = 'calendar',
  CoupleSpace = 'couplespace',
  Mail = 'mail',
  Fitness = 'fitness',
  Music = 'music',
  Calculator = 'calculator',
  Investigation = 'investigation'
}

export enum MessageType {
  Text = 'text',
  Image = 'image',
  System = 'system',
  Transfer = 'transfer',
  RedPacket = 'red_packet',
  Gift = 'gift'
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
  categoryId: string | null; // null means 'Uncategorized'
  isGlobal: boolean;
  isEnabled: boolean; // Only relevant for Global books
}

export interface AppSettings {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

// --- Fitness Types ---
export interface FitnessCoach {
  id: string;
  name: string;
  avatar: string;
  persona: string;
  style: string; // e.g. "Strict", "Gentle", "Scientific"
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
