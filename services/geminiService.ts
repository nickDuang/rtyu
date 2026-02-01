
import { GoogleGenAI } from "@google/genai";
import { AppSettings, Contact, ChatSession, FitnessPlan } from "../types";

const SETTINGS_KEY = 'ephone_settings';
const DEFAULT_MODEL = 'gemini-3-flash-preview';

const FALLBACK_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
  'veo-3.1-generate-preview',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-flash-native-audio-preview-12-2025'
];

const getSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to parse settings", e);
  }
  return {
    baseUrl: '',
    apiKey: '',
    modelName: DEFAULT_MODEL
  };
};

const getClient = () => {
  const settings = getSettings();
  
  // Sanitize inputs: trim whitespace
  const rawApiKey = settings.apiKey || process.env.API_KEY || '';
  const apiKey = rawApiKey.trim();
  
  const rawBaseUrl = settings.baseUrl || '';
  const baseUrl = rawBaseUrl.trim().replace(/\/$/, ""); // Remove trailing slash

  const clientOptions: any = { apiKey };
  
  // Only add baseUrl if it is not empty
  if (baseUrl) {
    clientOptions.baseUrl = baseUrl;
  }

  // Sanitize model name
  const modelName = (settings.modelName || DEFAULT_MODEL).trim();

  return {
    ai: new GoogleGenAI(clientOptions),
    model: modelName
  };
};

export const fetchModels = async () => {
  const { ai } = getClient();
  try {
    const response = await ai.models.list();
    // Map response to a simple array of names
    // Check if response.models exists (standard list response)
    if ((response as any).models) {
      const models = (response as any).models.map((m: any) => m.name.replace('models/', ''));
      // Merge with fallback to ensure we have the latest ones even if list is partial
      const uniqueModels = Array.from(new Set([...models, ...FALLBACK_MODELS]));
      return uniqueModels;
    }
    return FALLBACK_MODELS;
  } catch (error) {
    console.warn("Error fetching models, using fallback list:", error);
    return FALLBACK_MODELS;
  }
};

export const generateChatResponse = async (
  history: { role: string; content: string }[],
  persona: string
): Promise<string> => {
  const { ai, model } = getClient();
  
  // --- Context Injection for Period Tracking ---
  let contextNote = "";
  try {
      const savedPeriod = localStorage.getItem('ephone_calendar_period');
      if (savedPeriod) {
          const dates: string[] = JSON.parse(savedPeriod);
          const today = new Date().toISOString().split('T')[0];
          
          // Check if today or yesterday was marked
          // We check yesterday too because sometimes people mark it late or timezones differ
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          
          if (dates.includes(today) || dates.includes(yesterday)) {
              contextNote = `
              [PRIVATE CONTEXT INFO - DO NOT REVEAL UNLESS PROMPTED]
              The user has privately marked 'Period/Menstruation' on their calendar for today.
              RULES:
              1. DO NOT actively mention this. Ignore it completely in normal conversation.
              2. ONLY if the user explicitly complains about pain, cramps, low mood, or feeling tired, you may take this context into account.
              3. If you do respond to it, be brief, gentle, and sympathetic (e.g., "warm water," "rest"). 
              4. NEVER give medical advice. NEVER sound like a period tracker app. Be a friend/partner.
              `;
          }
      }
  } catch (e) {
      // Ignore errors in context loading
  }

  try {
    const systemInstruction = `
      You are a roleplay AI character. 
      Your persona: ${persona}
      
      Rules:
      1. Stay in character at all times.
      2. Keep responses concise and like a chat message.
      3. Use emojis occasionally.
      4. If the user asks for a picture, use [IMAGE: description] format.
      ${contextNote}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      }
    });

    return response.text || "...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "[Connection Error] I can't reach the server right now. Check your Settings.";
  }
};

export const generateEventReaction = async (
    eventType: 'RedPacket' | 'Gift',
    detail: string,
    characterName: string,
    characterPersona: string
): Promise<string> => {
    const { ai, model } = getClient();

    try {
        const prompt = `
        You are ${characterName}.
        Persona: ${characterPersona}
        
        Event: The user just sent you a ${eventType}.
        Details: ${detail}
        
        Task: React to this event in character.
        
        Rules:
        1. If it's a Red Packet:
           - Large amount: Be surprised, happy, or refuse politely depending on persona.
           - Small amount: Be funny, grateful, or sarcastic depending on persona.
        2. If it's a Gift:
           - Like it or dislike it based on your persona description.
        3. Keep it short (chat message style). Max 30 words.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { temperature: 0.8 }
        });

        return response.text || "Wow, thank you!";
    } catch (error) {
        return "Thank you! ❤️";
    }
};

export const interpretDream = async (dreamText: string): Promise<{ interpretation: string; visualPrompt: string }> => {
  const { ai, model } = getClient();
  
  try {
    const prompt = `
      Analyze this dream: "${dreamText}"
      
      Return a JSON object with two fields:
      1. "interpretation": A mystical and psychological interpretation of the dream.
      2. "visualPrompt": A descriptive prompt to generate an image of this dream.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const json = JSON.parse(response.text || "{}");
    return {
        interpretation: json.interpretation || "A mysterious dream...",
        visualPrompt: json.visualPrompt || "Abstract dreamscape"
    };
  } catch (error) {
    return {
        interpretation: "The mists of time obscure this dream's meaning.",
        visualPrompt: "Foggy dreamscape"
    };
  }
};

export const generateMomentsReaction = async (
  postContent: string,
  contacts: Contact[]
): Promise<{ likes: string[]; comments: { contactId: string; name: string; content: string }[] }> => {
  const { ai, model } = getClient();

  const characters = contacts.map(c => `${c.id} (${c.name}): ${c.description}`).join('\n');

  try {
    const prompt = `
      The user posted a status update on social media: "${postContent}"
      
      Here is a list of characters (friends):
      ${characters}
      
      Decide which characters would 'like' this post and which would 'comment'.
      Return a JSON object with:
      1. "likes": Array of contact names who liked the post.
      2. "comments": Array of objects { "contactId": string, "name": string, "content": string }.
      
      Rules:
      - Be consistent with their personas.
      - Not everyone has to react.
      - Comments should be short and social.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{ "likes": [], "comments": [] }');
  } catch (error) {
    console.error("Moment reaction error", error);
    return { likes: [], comments: [] };
  }
};

export const generateAIMomentsPost = async (
  contacts: Contact[]
): Promise<{ contactId: string; content: string; imageDescription?: string } | null> => {
  const { ai, model } = getClient();

  // Filter out system contacts or current user if any
  const eligibleContacts = contacts.filter(c => !c.isSystem);
  const characters = eligibleContacts.map(c => `${c.id} (${c.name}): ${c.description}`).join('\n');

  try {
    const prompt = `
      Select ONE character from the list below to post a new social media update (WeChat Moment).
      
      Characters:
      ${characters}
      
      Return a JSON object with:
      1. "contactId": The ID of the selected character.
      2. "content": The text content of the post (casual, daily life, reflects persona).
      3. "imageDescription": A short description of an image they might attach (optional, return null if text only).
      
      Rules:
      - The content should be interesting and specific to the character's personality.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || 'null');
  } catch (error) {
    console.error("AI Post generation error", error);
    return null;
  }
};

export const generateCoupleInvitationReaction = async (
  characterName: string,
  characterPersona: string,
  userNote: string
): Promise<{ accepted: boolean; reply: string }> => {
  const { ai, model } = getClient();

  try {
    const prompt = `
      The user is inviting you (${characterName}) to open a digital "Couple Space" (a romantic relationship app feature) together.
      
      Your Persona: ${characterPersona}
      User's Invitation Note: "${userNote}"
      
      Respond to this invitation.
      
      Return a JSON object with:
      1. "accepted": Boolean (true if you accept, false if you reject based on persona - but generally lean towards accepting for this app unless the note is offensive).
      2. "reply": A short, in-character response message to the user (max 20 words).
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{ "accepted": true, "reply": "I would love to!" }');
  } catch (error) {
    return { accepted: true, reply: "I'd love to allow it, but my connection is weak! Let's try." };
  }
};

export const generateDiaryReply = async (
    userContent: string,
    characterName: string,
    characterPersona: string
): Promise<string> => {
    const { ai, model } = getClient();
    
    try {
        const prompt = `
        You are ${characterName}, currently writing a private Exchange Diary entry to your romantic partner (the user).
        
        Your Persona: ${characterPersona}
        
        The user just wrote this entry to you:
        "${userContent}"
        
        Task: Write your diary entry in response.
        Rules:
        1. Write in FIRST PERSON (I...).
        2. Do NOT use headers like "Dear User" or "Title". Just start writing the content.
        3. Be intimate, vulnerable, and authentic. This is a private space.
        4. Reference what they wrote, but also share your own feelings or small daily details.
        5. Keep it under 150 words.
        `;
        
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 0.9 // Higher creativity for letters
            }
        });
        
        return response.text || "Reading your words made me smile. I'm thinking of you too.";
    } catch (error) {
        return "I read your diary, but I can't find the right words right now... (Connection Error)";
    }
};

export const generateWhisperNote = async (
    partner: Contact
): Promise<string> => {
    const { ai, model } = getClient();

    // Try to get recent chat history for context
    let context = "";
    try {
        const savedChats = localStorage.getItem('ephone_chats');
        if (savedChats) {
            const chats: ChatSession[] = JSON.parse(savedChats);
            const chat = chats.find(c => c.contactId === partner.id);
            if (chat && chat.messages.length > 0) {
                // Get last 5 messages
                const recent = chat.messages.slice(-5).map(m => `${m.role === 'user' ? 'User' : partner.name}: ${m.content}`).join('\n');
                context = `Recent conversation:\n${recent}`;
            }
        }
    } catch (e) {
        // Ignore context load error
    }

    try {
        const prompt = `
        You are ${partner.name}. You are leaving a cute "sticky note" / "post-it" message on the fridge/desk for your romantic partner (the user).
        
        Your Persona: ${partner.description}
        ${context}
        
        Task: Write a very short, handwritten-style note.
        Rules:
        1. It can be sweet, flirty, funny, or slightly clingy/possessive depending on your persona.
        2. Max 25 words. Keep it punchy.
        3. NO greetings like "Dear User". Just the message.
        4. Do not use emojis, as this is handwritten.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 1.0 // High creativity for varied notes
            }
        });

        return response.text?.trim() || "Missing you...";
    } catch (error) {
        return "Thinking of you...";
    }
};

export const generatePeriodCareMessage = async (
    name: string,
    persona: string
): Promise<string> => {
    const { ai, model } = getClient();
    try {
        const prompt = `
        You are ${name}. 
        Persona: ${persona}
        
        Your partner (the user) is on their period/menstruation cycle today.
        Task: Write a short, caring, warm text message reminding them to take care.
        Rules:
        1. Strictly stay in character (e.g., if cold/tsundere, be slightly awkward but caring; if sweet, be very gentle).
        2. Remind them to avoid cold food/drinks or rest well.
        3. Keep it intimate and natural, like a WeChat/text message.
        4. Max 40 words.
        `;
        
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { temperature: 1.0 }
        });
        
        return response.text || "Take care of yourself today. No cold drinks, okay? ❤️";
    } catch (e) {
        return "Take care of yourself today. No cold drinks, okay? ❤️";
    }
};

export const generateFitnessPlan = async (
    currentWeight: string,
    targetWeight: string,
    coachName: string,
    coachPersona: string
): Promise<FitnessPlan | null> => {
    const { ai, model } = getClient();

    try {
        const prompt = `
        You are ${coachName}, a fitness coach.
        Your Persona: ${coachPersona}
        
        User Stats:
        Current Weight: ${currentWeight}
        Target Weight: ${targetWeight}
        
        Task: Create a 1-day personalized fitness & diet plan for the user to help them reach their goal.
        
        Return STRICT JSON format with the following structure:
        {
            "coachMessage": "A short, in-character motivational message (max 30 words).",
            "diet": {
                "breakfast": "Breakfast recommendation",
                "lunch": "Lunch recommendation",
                "dinner": "Dinner recommendation",
                "tips": "One key diet tip"
            },
            "workout": {
                "warmup": "Warmup exercise",
                "main": "Main workout routine details",
                "cooldown": "Cooldown routine",
                "duration": "Estimated duration (e.g. 45 mins)"
            }
        }
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        return JSON.parse(response.text || 'null');
    } catch (error) {
        console.error("Fitness generation error", error);
        return null;
    }
};
