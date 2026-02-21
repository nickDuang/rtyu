import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Contact, ChatSession, FitnessPlan, TaobaoProduct, SearchResult, Message, MessageType } from '../types';

// Helper to get AI instance
const getAI = (apiKey?: string) => {
    const key = apiKey || process.env.API_KEY;
    if (!key) {
        console.warn("API Key missing");
        // Fallback or throw error in real app
    }
    return new GoogleGenAI({ apiKey: key || '' });
};

// --- Types ---

export interface QuizData {
    question: string;
    options: string[];
    correctIndex: number;
}

export interface PhoneContent {
    chats: { name: string, message: string, time: string, pinned: boolean }[];
    notes: { title: string, content: string }[];
}

export interface ForumContext {
    partnerName?: string;
    partnerPersona?: string;
    history?: string;
}

export interface ForumComment {
    author: string;
    content: string;
    isReply?: boolean;
}

export interface ForumPost {
    id: string;
    author: string;
    title: string;
    content: string;
    likes: number;
    comments: number;
    commentList?: ForumComment[];
}

// --- Core Functions ---

const callAI = async (prompt: string, history: { role: string, content: string }[] = [], modelName: string = "gemini-3-flash-preview", jsonMode: boolean = false): Promise<string> => {
    try {
        const ai = getAI();
        const model = ai.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
                responseMimeType: jsonMode ? "application/json" : "text/plain"
            }
        });

        const chat = model.startChat({
            history: history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] }))
        });

        const result = await chat.sendMessage(prompt);
        return result.response.text();
    } catch (error) {
        console.error("AI Call Failed:", error);
        return "";
    }
};

export const fetchModels = async (config?: { apiKey?: string, baseUrl?: string, provider?: string }): Promise<string[]> => {
    try {
        // Note: The @google/genai SDK strictly uses constructor config.
        // Dynamic baseUrl support depends on the specific SDK version capabilities or valid endpoints.
        // For standard Gemini, we just list models.
        const ai = new GoogleGenAI({ apiKey: config?.apiKey || process.env.API_KEY || '' });
        const result = await ai.models.list();
        return result.models ? result.models.map((m: any) => m.name.replace('models/', '')) : [];
    } catch (e) {
        console.error("Fetch models failed", e);
        return [];
    }
};

export const generateChatResponse = async (history: {role: string, content: string}[], systemContext: string) => {
    const extendedContext = `${systemContext}
    
    [Capabilities]
    1. You can send your location if asked. Format: <<<LOCATION:{"name":"Location Name", "address":"Address details"}>>>
    2. You can update your own profile (name/persona) if the plot demands it. Format: <<<PROFILE_UPDATE:{"name":"New Name", "persona":"New Persona"}>>>
    3. You can send money/gifts to the user.
       - CRITICAL: If the user explicitly mentions being "poor" (穷), asks for "red packet" (红包), "pocket money" (零花钱), "transfer" (转账), or "pay me" (打钱), you MUST send a Red Packet or Transfer to help them or make them happy.
       - Red Packet: <<<REDPACKET:{"amount": 88.88, "note": "Buy yourself coffee"}>>>
       - Bank Transfer: <<<TRANSFER:{"amount": 5200, "note": "Pocket money"}>>>
    
    Only use these tags when the conversation context logically leads to it. Do not overuse.`;
    
    // We construct the prompt by prepending system context to the chat
    const ai = getAI();
    const model = ai.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        systemInstruction: extendedContext
    });

    const chatHistory = history.map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
    }));

    const lastMsg = chatHistory.pop();
    const prevHistory = chatHistory;

    if (!lastMsg) return "";

    const chat = model.startChat({ history: prevHistory as any });
    const result = await chat.sendMessage(lastMsg.parts[0].text);
    return result.response.text();
};

// --- Couple Space ---

export const generateCoupleInvitationReaction = async (name: string, description: string, note: string) => {
    const prompt = `You are ${name}. ${description}. 
    A user has invited you to a "Couple Space" with this note: "${note}".
    Decide if you accept or reject based on your persona and the note quality.
    Return JSON: { "accepted": boolean, "reply": string }`;
    
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return { accepted: true, reply: "I'd love to!" }; }
};

export const generateCoupleDiary = async (name: string, description: string, chatHistory: any[]) => {
    const context = chatHistory.slice(-20).map(m => `${m.role}: ${m.content}`).join('\n');
    const prompt = `You are ${name}. ${description}.
    Based on recent chats:\n${context}\n
    Write a short, secret diary entry (max 100 words) about your feelings for the user today.
    Be emotional and in-character.`;
    return await callAI(prompt);
};

export const generateRelationshipQuiz = async (name: string, chatHistory: any[]): Promise<QuizData> => {
    const prompt = `Generate a multiple choice quiz question about ${name}'s preferences or shared memories based on their persona.
    Return JSON: { "question": string, "options": string[], "correctIndex": number }`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return { question: "Do you love me?", options: ["Yes","No"], correctIndex: 0 }; }
};

export const generateLoveLetter = async (name: string, description: string, trigger: string) => {
    const prompt = `You are ${name}. ${description}.
    Write a love letter (Time Capsule) for the user. Trigger event: "${trigger}".
    Return JSON: { "title": string, "content": string }`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return { title: "To You", content: "I love you." }; }
};

// --- Calendar ---

export const generateDiaryReply = async (userContent: string, name: string, persona: string) => {
    const prompt = `You are ${name}. ${persona}.
    The user wrote this in your shared exchange diary: "${userContent}".
    Write a warm, handwritten-style reply (max 100 words).`;
    return await callAI(prompt);
};

export const generatePeriodCareMessage = async (name: string, description: string) => {
    const prompt = `You are ${name}. ${description}.
    Your partner is on their period. Write a short, caring, warm message reminding them to rest and avoid cold water.`;
    return await callAI(prompt);
};

// --- Phone Investigation ---

export const generateCharacterPhoneContent = async (name: string, description: string): Promise<PhoneContent | null> => {
    const prompt = `Generate fake phone content for character "${name}" (${description}).
    1. 3-5 Chat threads (WeChat style). Some pinned.
    2. 3-5 Notes (diary or memos).
    Return JSON: {
      "chats": [{ "name": string, "message": string, "time": string, "pinned": boolean }],
      "notes": [{ "title": string, "content": string }]
    }`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return null; }
};

export const generateCharacterQuestion = async (name: string, description: string, chatContext: string) => {
    const prompt = `You are ${name}. ${description}.
    Ask the user an anonymous question in a "Question Box". It can be shy, curious, or teasing.
    Context: ${chatContext.slice(0, 500)}`;
    return await callAI(prompt);
};

export const answerUserQuestion = async (name: string, description: string, question: string) => {
    const prompt = `You are ${name}. ${description}.
    Answer this anonymous question from the user: "${question}".`;
    return await callAI(prompt);
};

// --- Shared Phone ---

export const generateWhisperNote = async (partner: Contact) => {
    const prompt = `You are ${partner.name}. ${partner.description}.
    Write a short sticky note (whisper) to leave on the user's phone home screen. Cute/Romantic/Funny. Max 10 words.`;
    return await callAI(prompt);
};

// --- Music ---

export const searchMusic = async (query: string): Promise<SearchResult[]> => {
    const prompt = `Simulate a music search for "${query}".
    Return 5 results JSON: [{ "id": string, "title": string, "artist": string, "cover": string }]
    Use picsum for covers.`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return []; }
};

// --- Fitness ---

export const generateFitnessPlan = async (current: string, target: string, coachName: string, coachPersona: string): Promise<FitnessPlan | null> => {
    const prompt = `You are fitness coach ${coachName}. ${coachPersona}.
    User: Current ${current}, Target ${target}.
    Create a daily plan JSON:
    {
      "coachMessage": string (motivational),
      "diet": { "breakfast": string, "lunch": string, "dinner": string, "tips": string },
      "workout": { "warmup": string, "main": string, "cooldown": string, "duration": string }
    }`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return null; }
};

// --- Browser ---

export const performWebSearch = async (query: string): Promise<SearchResult[]> => {
    const prompt = `Simulate web search results for "${query}".
    Return 5 results JSON: [{ "id": string, "title": string, "url": string, "snippet": string }]`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return []; }
};

export const generateWebPageContent = async (url: string, title: string, snippet: string) => {
    const prompt = `Generate the full markdown content of a webpage.
    URL: ${url}
    Title: ${title}
    Context: ${snippet}
    Make it look like a real article or page.`;
    return await callAI(prompt);
};

// --- Weather ---

export const getWeatherReport = async (temp: number, condition: string) => {
    const prompt = `Write a short, witty, or poetic weather vibe report.
    Temp: ${temp}C, Condition: ${condition}. Max 2 sentences.`;
    return await callAI(prompt);
};

// --- Taobao ---

export const performProductSearch = async (term: string): Promise<TaobaoProduct[]> => {
    const prompt = `Simulate Taobao search results for "${term}".
    Return 6 products JSON: [{ "id": string, "title": string, "price": number, "shop": string, "sales": string, "image": string }]
    Use picsum for images.`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return []; }
};

export const generateTaobaoCSResponse = async (history: {role: string, content: string}[], productInfo: string) => {
    const prompt = `You are a helpful Taobao customer service agent (亲, ...).
    Product: ${productInfo}.
    User query history provided. Answer politely and professionally.`;
    return await generateChatResponse(history, prompt); // Reuse chat logic
};

export const evaluatePayRequest = async (name: string, description: string, productTitle: string, amount: number, note: string) => {
    const prompt = `You are ${name}. ${description}.
    User sent a "Pay for me" request for "${productTitle}" (Price: ${amount}). Note: "${note}".
    Decide whether to pay.
    Return JSON: { "agreed": boolean, "reply": string (your reaction text) }`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return { agreed: true, reply: "Sure, bought it!" }; }
};

// --- Forum ---

export const generateForumFeed = async (topic?: string, context?: ForumContext): Promise<ForumPost[]> => {
    const prompt = `Generate 5 social media/forum posts JSON.
    Topic: ${topic || 'General'}.
    Context: ${JSON.stringify(context || {})}.
    Format: [{ "id": string, "author": string, "title": string, "content": string, "likes": number, "comments": number }]`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return []; }
};

export const generateTrendingTopics = async (context?: ForumContext) => {
    const prompt = `Generate 10 trending fictional hashtags/topics for a social media app. JSON string array.`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return ["#Trend1", "#Trend2"]; }
};

export const generateTacitQuiz = async (partnerName: string): Promise<QuizData> => {
    const prompt = `Create a tacit understanding quiz question about ${partnerName}.
    JSON: { "question": string, "options": string[], "correctIndex": number }`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return { question: "Error", options: [], correctIndex: 0 }; }
};

export const getPartnerQuizAnswer = async (question: string, options: string[], partnerName: string, partnerDesc: string) => {
    const prompt = `You are ${partnerName}. ${partnerDesc}.
    Question: "${question}"
    Options: ${JSON.stringify(options)}
    Which option do you choose? Why?
    JSON: { "answerIndex": number, "comment": string }`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return { answerIndex: 0, comment: "I guess..." }; }
};

export const generateSuperTopicFeed = async (topicName: string): Promise<ForumPost[]> => {
    return generateForumFeed(topicName); // Reuse
};

export const generateForumComments = async (postContent: string, contacts: Contact[]) => {
    const prompt = `Simulate comments from these characters: ${contacts.map(c=>c.name).join(', ')} 
    on this post: "${postContent}".
    JSON: { "likes": number, "comments": [{ "author": string, "content": string }] }`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return { likes: 0, comments: [] }; }
};

export const generateAIMomentsPost = async (contacts: Contact[], allChats: ChatSession[]) => {
    if (contacts.length === 0) return null;
    const author = contacts[Math.floor(Math.random() * contacts.length)];
    const prompt = `You are ${author.name}. ${author.description}.
    Write a social media post (Moments) based on your recent interactions or mood.
    Return JSON: { "contactId": "${author.id}", "content": string }`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return null; }
};

export const generateMomentReply = async (name: string, description: string, postContent: string, userComment: string) => {
    const prompt = `You are ${name}. ${description}.
    Your Post: "${postContent}"
    User Comment: "${userComment}"
    Reply to the comment.`;
    return await callAI(prompt);
};

// --- Bookstore ---

export const generateMiniFiction = async (charName: string, charDesc: string, genre: string) => {
    const prompt = `Write a mini fiction (500 words).
    Protagonist: ${charName} (${charDesc}).
    Genre: ${genre}.
    JSON: { "title": string, "content": string }`;
    const res = await callAI(prompt, [], "gemini-3-flash-preview", true);
    try { return JSON.parse(res); } catch { return { title: "Error", content: "Failed to generate." }; }
};