
import React, { useState, useEffect } from 'react';
import { FitnessPlan, Contact } from '../../types';
import { generateFitnessPlan } from '../../services/geminiService';

interface FitnessAppProps {
  onBack: () => void;
  isOpen: boolean;
}

// Default contacts fallback in case list is empty
const DEFAULT_CONTACTS: Contact[] = [
    { id: 'c1', name: 'Alice (AI)', avatar: 'https://picsum.photos/200/200?random=1', description: "A friendly and cheerful AI assistant who loves using emojis." },
    { id: 'c2', name: 'Bob (Group)', avatar: 'https://picsum.photos/200/200?random=2', description: "A cynical tech support agent who is always tired.", isSystem: true },
    { id: 'c3', name: 'Luna', avatar: 'https://picsum.photos/200/200?random=3', description: "A mysterious girl who likes poetry and the moon." }
];

const FitnessApp: React.FC<FitnessAppProps> = ({ onBack, isOpen }) => {
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  
  // Dynamic Coaches from Contacts
  const [coaches, setCoaches] = useState<Contact[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  
  const [plan, setPlan] = useState<FitnessPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load data
  useEffect(() => {
      if (isOpen) {
        // 1. Load Contacts from Storage
        const savedContacts = localStorage.getItem('ephone_contacts');
        let loadedContacts: Contact[] = savedContacts ? JSON.parse(savedContacts) : [];
        
        if (loadedContacts.length === 0) {
            loadedContacts = DEFAULT_CONTACTS;
        }

        setCoaches(loadedContacts);

        // 2. Select first coach if none selected
        if (loadedContacts.length > 0) {
            setSelectedCoachId(loadedContacts[0].id);
        }

        // 3. Load saved plan and stats
        const savedPlan = localStorage.getItem('ephone_fitness_plan');
        if (savedPlan) setPlan(JSON.parse(savedPlan));
        
        const savedStats = localStorage.getItem('ephone_fitness_stats');
        if (savedStats) {
            const { current, target } = JSON.parse(savedStats);
            setCurrentWeight(current);
            setTargetWeight(target);
        }
      }
  }, [isOpen]);

  const handleGenerate = async () => {
      if (!currentWeight || !targetWeight) return alert("Please enter your weight goals.");
      
      const coach = coaches.find(c => c.id === selectedCoachId);
      if (!coach) return alert("Please select a coach.");

      setIsLoading(true);
      
      // Save stats
      localStorage.setItem('ephone_fitness_stats', JSON.stringify({ current: currentWeight, target: targetWeight }));

      // Generate Plan using Contact's Persona
      const generatedPlan = await generateFitnessPlan(
          currentWeight,
          targetWeight,
          coach.name,
          coach.description // Use the contact's description as the coach persona
      );

      if (generatedPlan) {
          setPlan(generatedPlan);
          localStorage.setItem('ephone_fitness_plan', JSON.stringify(generatedPlan));
      } else {
          alert("Failed to generate plan. Please check your connection/settings.");
      }
      setIsLoading(false);
  };

  if (!isOpen) return null;

  const activeCoach = coaches.find(c => c.id === selectedCoachId);

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col z-50 app-transition overflow-hidden">
        
        {/* Header */}
        <div className="h-24 pt-12 px-6 flex items-center justify-between bg-white/80 backdrop-blur-md shadow-sm z-20">
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full">
                ‹
            </button>
            <h1 className="font-bold text-lg text-emerald-800 tracking-wide">Fitness Coach</h1>
            <div className="w-8"></div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-20 p-6 space-y-6">
            
            {/* 1. Stats Input */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100/50">
                <div className="flex items-center justify-between mb-4">
                     <h2 className="font-bold text-gray-700">My Goals</h2>
                     <span className="text-2xl">⚖️</span>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Current</label>
                        <div className="relative mt-1">
                            <input 
                                type="number" 
                                value={currentWeight}
                                onChange={(e) => setCurrentWeight(e.target.value)}
                                className="w-full bg-gray-50 rounded-2xl p-3 text-lg font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-200"
                                placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">kg/jin</span>
                        </div>
                    </div>
                    <div className="flex items-center pt-5">
                        <span className="text-gray-300">➜</span>
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Target</label>
                        <div className="relative mt-1">
                            <input 
                                type="number" 
                                value={targetWeight}
                                onChange={(e) => setTargetWeight(e.target.value)}
                                className="w-full bg-gray-50 rounded-2xl p-3 text-lg font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-200"
                                placeholder="0"
                            />
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">kg/jin</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Coach Selection (From Contacts) */}
            <div>
                <h3 className="font-bold text-gray-700 mb-3 ml-1">Choose Personal Trainer</h3>
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                    {coaches.map(coach => (
                        <div 
                            key={coach.id}
                            onClick={() => setSelectedCoachId(coach.id)}
                            className={`
                                flex-shrink-0 w-28 p-3 rounded-2xl border-2 cursor-pointer transition-all active:scale-95
                                ${selectedCoachId === coach.id ? 'bg-white border-emerald-500 shadow-md' : 'bg-white/50 border-transparent opacity-70'}
                            `}
                        >
                            <div className="flex justify-center mb-2">
                                <img src={coach.avatar} className="w-12 h-12 rounded-full bg-gray-200 object-cover" />
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-xs text-gray-800 mb-0.5 truncate px-1">{coach.name}</div>
                                <div className="text-[9px] text-emerald-600 font-bold bg-emerald-50 rounded-full px-2 py-0.5 inline-block">Coach</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Generate Button */}
            <button 
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-900/10 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <>
                        <span className="animate-spin text-xl">↻</span>
                        Asking {activeCoach?.name.split(' ')[0]}...
                    </>
                ) : (
                    <>
                        <span>⚡</span>
                        Generate Plan
                    </>
                )}
            </button>

            {/* 4. The Plan */}
            {plan && (
                <div className="space-y-4 animate-[slideUp_0.5s_ease-out]">
                    
                    {/* Message Bubble */}
                    <div className="flex gap-3">
                        <img src={activeCoach?.avatar} className="w-10 h-10 rounded-full bg-gray-300 border-2 border-white shadow-sm object-cover" />
                        <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-gray-700 italic border border-gray-100">
                            "{plan.coachMessage}"
                        </div>
                    </div>

                    {/* Workout Card */}
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-orange-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-orange-100 p-2 rounded-xl text-orange-500">💪</span>
                            <h3 className="font-bold text-gray-800">Today's Workout</h3>
                            <span className="ml-auto text-xs font-bold text-gray-400">{plan.workout.duration}</span>
                        </div>
                        <div className="space-y-3">
                            <div className="pl-3 border-l-2 border-orange-200">
                                <div className="text-xs font-bold text-orange-400 uppercase">Warmup</div>
                                <div className="text-sm text-gray-700">{plan.workout.warmup}</div>
                            </div>
                            <div className="pl-3 border-l-2 border-orange-400">
                                <div className="text-xs font-bold text-orange-600 uppercase">Main Routine</div>
                                <div className="text-sm text-gray-800 font-medium whitespace-pre-wrap">{plan.workout.main}</div>
                            </div>
                            <div className="pl-3 border-l-2 border-orange-200">
                                <div className="text-xs font-bold text-orange-400 uppercase">Cooldown</div>
                                <div className="text-sm text-gray-700">{plan.workout.cooldown}</div>
                            </div>
                        </div>
                    </div>

                    {/* Diet Card */}
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-green-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-green-100 p-2 rounded-xl text-green-600">🥗</span>
                            <h3 className="font-bold text-gray-800">Meal Plan</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-3 items-center">
                                <span className="text-xl">🍳</span>
                                <div className="flex-1 border-b border-gray-50 pb-2">
                                    <div className="text-xs font-bold text-gray-400">Breakfast</div>
                                    <div className="text-sm text-gray-700">{plan.diet.breakfast}</div>
                                </div>
                            </div>
                            <div className="flex gap-3 items-center">
                                <span className="text-xl">🍱</span>
                                <div className="flex-1 border-b border-gray-50 pb-2">
                                    <div className="text-xs font-bold text-gray-400">Lunch</div>
                                    <div className="text-sm text-gray-700">{plan.diet.lunch}</div>
                                </div>
                            </div>
                            <div className="flex gap-3 items-center">
                                <span className="text-xl">🍽️</span>
                                <div className="flex-1 border-b border-gray-50 pb-2">
                                    <div className="text-xs font-bold text-gray-400">Dinner</div>
                                    <div className="text-sm text-gray-700">{plan.diet.dinner}</div>
                                </div>
                            </div>
                             <div className="bg-green-50 p-3 rounded-xl text-xs text-green-700 font-medium flex gap-2">
                                <span>💡</span> {plan.diet.tips}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default FitnessApp;
