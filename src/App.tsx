import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map as MapIcon, 
  Users, 
  Clock, 
  Bell, 
  Settings, 
  Navigation, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Zap,
  X,
  ShieldAlert,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Scan,
  Hotel,
  Utensils,
  Car,
  Smartphone,
  ArrowLeft,
  Ticket
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---

type Page = 'home' | 'inside-menu' | 'navigation' | 'safety-outside' | 'staff-dashboard' | 'role-selection';
type NavMode = 'access' | 'route';
type SafetyTab = 'safety' | 'outside';
type ZoneStatus = 'free' | 'moderate' | 'crowded';
type UserRole = 'public' | 'staff';

interface Zone {
  id: string;
  name: string;
  status: ZoneStatus;
  density: number; // 0 to 100
  type: 'gate' | 'food' | 'restroom' | 'exit' | 'seating';
  waitTime?: number; // minutes
}

interface Incident {
  id: string;
  location: string;
  type: 'panic' | 'crowd' | 'medical';
  time: string;
  status: 'active' | 'resolved';
}

interface Notification {
  id: string;
  type: 'alert' | 'update' | 'emergency';
  message: string;
  time: string;
}

interface NavStep {
  instruction: string;
  distance: string;
}

interface ActiveRoute {
  destination: string;
  steps: NavStep[];
  totalTime: string;
  isAlternate?: boolean;
}

interface OutsideItem {
  name: string;
  distance: string;
  rating: string;
}

// --- Mock Data ---

const INITIAL_ZONES: Zone[] = [
  { id: 'gate-1', name: 'Gate 1 (North)', status: 'moderate', density: 45, type: 'gate', waitTime: 12 },
  { id: 'gate-2', name: 'Gate 2 (South)', status: 'free', density: 20, type: 'gate', waitTime: 5 },
  { id: 'food-a', name: 'Burger Hub', status: 'crowded', density: 85, type: 'food', waitTime: 25 },
  { id: 'food-b', name: 'Pizza Point', status: 'moderate', density: 55, type: 'food', waitTime: 15 },
  { id: 'rest-1', name: 'Restroom Block A', status: 'crowded', density: 90, type: 'restroom', waitTime: 10 },
  { id: 'rest-2', name: 'Restroom Block B', status: 'free', density: 15, type: 'restroom', waitTime: 2 },
  { id: 'exit-main', name: 'Main Exit', status: 'free', density: 10, type: 'exit' },
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'alert', message: 'High density detected near Gate 1. Consider using Gate 2.', time: '2 mins ago' },
  { id: '2', type: 'update', message: 'Goal! Home Team scores. Current score: 1-0', time: '5 mins ago' },
  { id: '3', type: 'emergency', message: 'Medical assistance available at Section 4B.', time: '10 mins ago' },
];

// --- Components ---

const LiveScoreBoard = () => {
  return (
    <div className="w-full bg-slate-900 border-x border-b border-slate-800 rounded-b-3xl p-4 flex items-center justify-between shadow-2xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-fuchsia-500/5" />
      <div className="flex items-center gap-4 relative z-10">
        <div className="text-right">
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Home</div>
          <div className="text-xl font-black text-white italic">WARRIORS</div>
        </div>
        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
          <span className="text-2xl font-black text-cyan-400 tabular-nums">2</span>
          <span className="text-slate-600 font-bold">-</span>
          <span className="text-2xl font-black text-slate-400 tabular-nums">1</span>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Away</div>
          <div className="text-xl font-black text-slate-400 italic">STRIKERS</div>
        </div>
      </div>
      <div className="flex flex-col items-end relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
          <span className="text-sm font-black text-white italic">2nd Half</span>
        </div>
        <div className="text-[10px] font-bold text-slate-500 font-mono tracking-tighter">64:12</div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: ZoneStatus }) => {
  const colors = {
    free: 'bg-lime-500/20 text-lime-400 border-lime-500/50',
    moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
    crowded: 'bg-rose-500/20 text-rose-400 border-rose-500/50',
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", colors[status])}>
      {status}
    </span>
  );
};

export default function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('role-selection');
  const [navMode, setNavMode] = useState<NavMode>('access');
  const [safetyTab, setSafetyTab] = useState<SafetyTab>('safety');
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [incidents, setIncidents] = useState<Incident[]>([
    { id: 'inc-1', location: 'Section 204', type: 'panic', time: '2 mins ago', status: 'active' },
  ]);
  
// --- Feature State ---
  const [seatInfo, setSeatInfo] = useState({ stand: '', row: '', seat: '' });
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [isPanicMode, setIsPanicMode] = useState(false);
  const [globalEmergency, setGlobalEmergency] = useState(false);
  const [staffDirectives, setStaffDirectives] = useState<{ [key: string]: string }>({});
  const [staffMessage, setStaffMessage] = useState('');
  const [announcements, setAnnouncements] = useState<Notification[]>([]);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Clear speech feedback
  useEffect(() => {
    if (speechFeedback) {
      const timer = setTimeout(() => setSpeechFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [speechFeedback]);

  // Sync Global Emergency
  useEffect(() => {
    if (globalEmergency) {
      setIsPanicMode(true);
      if (userRole === 'public') {
        speak("Emergency mode activated. Please follow exit signs and stay calm.");
      }
    }
  }, [globalEmergency, userRole]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechFeedback("Voice recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase();
      setSpeechFeedback(`Voice: "${command}"`);
      handleVoiceCommand(command);
    };

    recognition.onspeechend = () => {
      recognition.stop();
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setSpeechFeedback(`Speech error: ${event.error}`);
    };
  };

  const handleVoiceCommand = (command: string) => {
    if (userRole === 'staff') {
      setStaffMessage(command);
      return;
    }

    if (command.includes('exit') || command.includes('gate') || command.includes('out')) {
      handleQuickNav('exit');
      speak("Navigating to the nearest exit. Please follow the blue markers.");
    } else if (command.includes('food') || command.includes('eat') || command.includes('hungry')) {
      handleQuickNav('food');
      speak("Finding the best food stalls with shortest lines.");
    } else if (command.includes('route') || command.includes('path') || command.includes('best')) {
      handleSuggestBestRoute();
    } else if (command.includes('restroom') || command.includes('washroom') || command.includes('toilet')) {
      handleQuickNav('restroom');
      speak("Directing you to the nearest vacant restroom.");
    } else {
      setSpeechFeedback(`Unknown command: "${command}"`);
    }
  };

  const handleSuggestBestRoute = () => {
    // Find zone with lowest density
    const bestZone = [...zones].sort((a, b) => a.density - b.density)[0];
    const route: ActiveRoute = {
      destination: bestZone.name,
      totalTime: '3 mins',
      steps: [
        { instruction: `Following low-congestion path to ${bestZone.name}`, distance: 'Start' },
        { instruction: 'Keep right for 50m', distance: '50m' },
        { instruction: 'Destination reached', distance: 'Reached' }
      ],
      isAlternate: true
    };
    setActiveRoute(route);
    setNavMode('route');
    setCurrentPage('navigation');
    speak(`Redirecting you to the least crowded path near ${bestZone.name}`);
  };

  const sendAnnouncement = () => {
    if (!staffMessage.trim()) return;
    const newAnn: Notification = {
      id: Date.now().toString(),
      type: 'alert',
      message: staffMessage,
      time: 'Just now'
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    setNotifications(prev => [newAnn, ...prev]);
    setStaffMessage('');
    if (userRole === 'public') {
      speak(`Priority announcement: ${staffMessage}`);
    }
  };

  const triggerPanic = (active: boolean) => {
    setIsPanicMode(active);
    if (active) {
      const newInc: Incident = { 
        id: `panic-${Date.now()}`, 
        location: 'Section 204 (Fan reported)', 
        type: 'panic', 
        time: 'Just now', 
        status: 'active' 
      };
      setIncidents(prev => [newInc, ...prev]);
    }
  };
  const [isNavigating, setIsNavigating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [outsideResults, setOutsideResults] = useState<{ type: string, items: OutsideItem[] } | null>(null);
  const [safetyOutput, setSafetyOutput] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Suggestions based on roles and context
  const suggestions = [
    { label: 'Find my seat', intent: 'seat', icon: <Ticket size={14} /> },
    { label: 'Nearest food', intent: 'food', icon: <Utensils size={14} /> },
    { label: 'Empty restrooms', intent: 'restroom', icon: <Users size={14} /> },
    { label: 'Best exit path', intent: 'exit', icon: <ArrowRight size={14} /> },
    { label: 'Stadium help', intent: 'safety', icon: <ShieldAlert size={14} /> },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const q = query.toLowerCase();
    if (q.includes('seat') || q.includes('ticket')) {
      setCurrentPage('navigation');
      setNavMode('access');
    } else if (q.includes('food') || q.includes('eat') || q.includes('burger')) {
      handleQuickNav('food');
    } else if (q.includes('restroom') || q.includes('washroom')) {
      handleQuickNav('restroom');
    } else if (q.includes('exit') || q.includes('out') || q.includes('leave')) {
      handleQuickNav('exit');
    } else if (q.includes('safety') || q.includes('help') || q.includes('unsafe')) {
      setCurrentPage('safety-outside');
      setSafetyTab('safety');
    } else if (q.includes('parking') || q.includes('hotel')) {
      setCurrentPage('safety-outside');
      setSafetyTab('outside');
    }
    setSearchQuery('');
    setSpeechFeedback(null);
  };

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setZones(prev => prev.map(zone => ({
        ...zone,
        density: Math.max(0, Math.min(100, zone.density + (Math.random() * 10 - 5))),
        waitTime: zone.waitTime ? Math.max(1, Math.min(60, zone.waitTime + Math.floor(Math.random() * 3 - 1))) : undefined,
        status: zone.density > 75 ? 'crowded' : zone.density > 40 ? 'moderate' : 'free'
      })));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleScanTicket = () => {
    setIsScanning(true);
    setScanSuccess(false);
    setTimeout(() => {
      setScanSuccess(true);
      setSeatInfo({ stand: 'B', row: '12', seat: '45' });
      
      // Show success for 1.5s then navigate
      setTimeout(() => {
        setIsScanning(false);
        setScanSuccess(false);
        handleSeatNavigation();
      }, 1500);
    }, 2500);
  };

  const handleSeatNavigation = () => {
    const route: ActiveRoute = {
      destination: `Stand ${seatInfo.stand || 'B'}, Row ${seatInfo.row || '12'}, Seat ${seatInfo.seat || '45'}`,
      totalTime: '4 mins',
      steps: [
        { instruction: 'You are at Gate A', distance: 'Start' },
        { instruction: 'Go straight 40m', distance: '40m' },
        { instruction: 'Turn right to Stand B', distance: '10m' },
        { instruction: 'Climb to Row 12', distance: '20 steps' },
        { instruction: 'Seat 45 is on your left', distance: 'Reached' }
      ],
      isAlternate: Math.random() > 0.5
    };
    setActiveRoute(route);
    setNavMode('route');
    setCurrentPage('navigation');
  };

  const handleQuickNav = (type: string) => {
    const data: Record<string, { dest: string, time: string, dist: string, steps: NavStep[], highlight: string }> = {
      food: {
        dest: 'Zone B (Burger Hub)',
        time: '5 minutes',
        dist: '120m',
        steps: [
          { instruction: 'Go straight 30m', distance: '30m' },
          { instruction: 'Turn left at the corridor', distance: '50m' },
          { instruction: 'Reach food stall on your right', distance: '40m' }
        ],
        highlight: 'Best option: Zone B (least crowded)'
      },
      restroom: {
        dest: 'Zone A (Restroom Block B)',
        time: '2 minutes',
        dist: '80m',
        steps: [
          { instruction: 'Go straight towards the exit sign', distance: '40m' },
          { instruction: 'Turn right at the first turn', distance: '20m' },
          { instruction: 'Reach washroom entrance', distance: '20m' }
        ],
        highlight: 'Fastest option available'
      },
      exit: {
        dest: 'Gate 3 (East Exit)',
        time: '4 minutes',
        dist: '200m',
        steps: [
          { instruction: 'Go straight to the main concourse', distance: '100m' },
          { instruction: 'Turn left towards the stadium gates', distance: '50m' },
          { instruction: 'Exit through Gate 3', distance: '50m' }
        ],
        highlight: 'Crowd Level: Medium'
      }
    };
    
    const selected = data[type];
    if (!selected) return;

    const route: ActiveRoute = {
      destination: selected.dest,
      totalTime: selected.time,
      steps: selected.steps,
      isAlternate: false
    };
    setActiveRoute(route);
    setNavMode('route');
    setCurrentPage('navigation');
    
    const newNotif: Notification = { 
      id: Date.now().toString(), 
      type: 'update', 
      message: `${selected.highlight}. Distance: ${selected.dist}. ETA: ${selected.time}.`, 
      time: 'Just now' 
    };
    setNotifications([newNotif, ...notifications]);
  };

  const handleNavigateToZone = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    const route: ActiveRoute = {
      destination: zone.name,
      totalTime: `${zone.waitTime || 3} mins`,
      steps: [
        { instruction: 'Exit current section', distance: '10m' },
        { instruction: `Follow signs for ${zone.name}`, distance: '30m' },
        { instruction: `Your destination is on the right`, distance: 'Reached' }
      ]
    };
    setActiveRoute(route);
    setNavMode('route');
    setCurrentPage('navigation');
  };

  const handleSafetyAction = (action: string) => {
    let output = "";
    let steps: NavStep[] = [];
    
    if (action === 'guide') {
      output = "Avoid Zone C (crowded). Use Zone A route for a safer experience.";
      steps = [
        { instruction: 'Go straight towards Section 102', distance: '50m' },
        { instruction: 'Take alternate path on the left', distance: '30m' },
        { instruction: 'Reach safely at the destination', distance: 'Reached' }
      ];
      const route: ActiveRoute = {
        destination: 'Safe Zone A',
        totalTime: '6 mins',
        steps: steps,
        isAlternate: true
      };
      setActiveRoute(route);
      setNavMode('route');
      setCurrentPage('navigation');
    } else if (action === 'late') {
      output = "Estimated Delay: 10 minutes due to crowd congestion. Suggestion: Use alternate route to save 5 minutes.";
    } else if (action === 'predict') {
      output = "AI Forecast: North Gate density increasing in 10m. Use South Gate for faster exit.";
    }
    setSafetyOutput(output);
  };

  const handleOutsideSearch = (type: string) => {
    let items: OutsideItem[] = [];
    if (type === 'Hotels') {
      items = [
        { name: 'Stadium Grand Hotel', distance: '450m', rating: '4.8' },
        { name: 'Fan Stay Inn', distance: '800m', rating: '4.2' }
      ];
    } else if (type === 'Restaurants') {
      items = [
        { name: 'Goal Post Grill', distance: '200m', rating: '4.6' },
        { name: 'The Pitch Pizza', distance: '350m', rating: '4.4' }
      ];
    } else if (type === 'Parking') {
      items = [
        { name: 'Zone A Parking', distance: '150m', rating: 'Secure' },
        { name: 'West Lot B', distance: '400m', rating: 'Available' }
      ];
    } else if (type === 'Stadium') {
      items = [
        { name: 'Main Entrance', distance: '300m', rating: 'Moderate' },
        { name: 'VIP Gate', distance: '450m', rating: 'Fast' }
      ];
    }
    setOutsideResults({ type, items });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {currentPage !== 'home' && currentPage !== 'role-selection' && (
            <button 
              onClick={() => {
                if (currentPage === 'inside-menu') setCurrentPage('home');
                else if (currentPage === 'navigation') setCurrentPage('inside-menu');
                else if (currentPage === 'safety-outside') setCurrentPage('home');
                else if (currentPage === 'staff-dashboard') setCurrentPage('home');
              }}
              className="p-3 hover:bg-slate-800 rounded-full transition-colors mr-1 text-slate-400 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="text-white fill-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none">
              SmartStadium <span className="text-cyan-400">AI</span>
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              <span className={cn("w-2 h-2 rounded-full animate-pulse", globalEmergency ? "bg-rose-500" : "bg-lime-500")} />
              {globalEmergency ? <span className="text-rose-500">Facility Crisis Mode</span> : 
               currentPage === 'role-selection' ? 'Initialize' : 
               userRole === 'staff' ? 'Staff Interface' : 'Fan Interface'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {userRole === 'public' && (
            <button 
              onClick={() => triggerPanic(!isPanicMode)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-full text-sm font-black uppercase tracking-widest transition-all min-h-[48px]",
                isPanicMode ? "bg-rose-600 text-white animate-pulse" : "bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20"
              )}
            >
              <ShieldAlert size={18} />
              <span className="hidden sm:inline">{isPanicMode ? "Panic Mode Active" : "Help"}</span>
            </button>
          )}
          {userRole && (
            <button 
              onClick={() => setCurrentPage('role-selection')}
              className="p-3 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white min-h-[48px] min-w-[48px] flex items-center justify-center"
              title="Switch Role"
            >
              <Users size={24} />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {currentPage === 'home' && <LiveScoreBoard />}

        {/* Global Announcement Banner */}
        <AnimatePresence>
          {announcements.length > 0 && currentPage !== 'role-selection' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-cyan-600 px-6 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-cyan-600/20">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-white animate-bounce" />
                  <p className="text-xs font-black text-white uppercase tracking-wider italic">
                    {announcements[0].message}
                  </p>
                </div>
                <button 
                  onClick={() => setAnnouncements([])}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Feedback Tooltip */}
        <AnimatePresence>
          {(isListening || speechFeedback) && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl"
            >
              {isListening ? (
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              ) : (
                <Smartphone size={16} className="text-cyan-400" />
              )}
              <span className="text-xs font-black uppercase text-white tracking-widest italic">
                {isListening ? "Listening..." : speechFeedback}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* 0. ROLE SELECTION */}
          {currentPage === 'role-selection' && (
            <motion.div 
              key="role-selection"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="min-h-[70vh] flex flex-col items-center justify-center space-y-12"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-cyan-500/10 text-cyan-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-cyan-500/20">
                  <Zap size={40} />
                </div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Welcome to SmartStadium</h2>
                <p className="text-slate-400 font-medium">Please select your operational profile</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                <button 
                  onClick={() => {
                    setUserRole('public');
                    setCurrentPage('home');
                  }}
                  className="group relative overflow-hidden bg-slate-900 border border-slate-800 p-10 rounded-3xl hover:border-cyan-500 transition-all text-left shadow-2xl"
                >
                  <Users className="text-cyan-400 mb-6 group-hover:scale-110 transition-transform" size={40} />
                  <h3 className="text-2xl font-black text-white uppercase italic mb-2">Public / Fan</h3>
                  <p className="text-slate-400 text-sm">Navigating, seat access, facility locating, and fan safety tools.</p>
                </button>

                <button 
                  onClick={() => {
                    setUserRole('staff');
                    setCurrentPage('home');
                  }}
                  className="group relative overflow-hidden bg-slate-900 border border-slate-800 p-10 rounded-3xl hover:border-fuchsia-500 transition-all text-left shadow-2xl"
                >
                  <ShieldAlert className="text-fuchsia-400 mb-6 group-hover:scale-110 transition-transform" size={40} />
                  <h3 className="text-2xl font-black text-white uppercase italic mb-2">Stadium Staff</h3>
                  <p className="text-slate-400 text-sm">Monitoring, crowd management, emergency response, and system alerts.</p>
                </button>
              </div>
            </motion.div>
          )}

          {/* 1. HOME PAGE */}
          {currentPage === 'home' && userRole === 'public' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="min-h-[65vh] flex flex-col items-center justify-center space-y-10 py-10"
            >
              {/* Central Hub Branding */}
              <div className="text-center space-y-6 max-w-xl">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-fuchsia-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/30"
                >
                  <Zap className="text-white fill-white" size={40} />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter">
                    Good Evening, <span className="text-cyan-400">Fan</span>
                  </h2>
                  <p className="text-slate-400 font-medium text-lg leading-relaxed px-4">
                    How can SmartStadium assist your game day experience today?
                  </p>
                </div>
              </div>

              {/* Smart Command Hub (Search) */}
              <div className="w-full max-w-2xl px-4 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/20 to-cyan-500/20 blur-3xl opacity-30 -z-10 animate-pulse" />
                <div className="relative flex items-center bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-2 rounded-[2rem] shadow-2xl">
                  <div className="pl-6 pr-4 text-slate-500 hidden sm:block">
                    <MapIcon size={24} />
                  </div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                    placeholder="Ask about seats, food, or safety..."
                    className="flex-1 bg-transparent py-5 text-lg font-medium text-white placeholder:text-slate-600 outline-none pl-4 sm:pl-0"
                  />
                  <div className="flex items-center gap-2 pr-2">
                    <button 
                      onClick={startListening}
                      className={cn(
                        "p-4 rounded-full transition-all shrink-0",
                        isListening ? "bg-cyan-600 text-white animate-pulse" : "bg-slate-800 text-slate-400 hover:text-white"
                      )}
                    >
                      <Smartphone size={20} />
                    </button>
                    <button 
                      onClick={() => handleSearch(searchQuery)}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-[1.5rem] px-8 py-4 font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-600/20 hidden min-[400px]:block"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                  {suggestions.map((s) => (
                    <button 
                      key={s.label}
                      onClick={() => handleSearch(s.intent)}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-6 py-4 rounded-full text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-xl"
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Insight Feed */}
              <div className="pt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl px-4">
                <div className="bg-slate-900/40 border border-slate-800/50 p-7 rounded-[2rem] flex items-center gap-5 group hover:border-cyan-500/30 transition-colors">
                  <div className="w-14 h-14 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center shrink-0">
                    <TrendingUp size={28} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-1">AI Recommendation</div>
                    <p className="text-sm font-semibold text-slate-300 leading-snug">Section 204 has 20% less congestion. Better visibility route found.</p>
                  </div>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/50 p-7 rounded-[2rem] flex items-center gap-5 group hover:border-fuchsia-500/30 transition-colors">
                  <div className="w-14 h-14 bg-fuchsia-500/10 text-fuchsia-400 rounded-2xl flex items-center justify-center shrink-0">
                    <Utensils size={28} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500 mb-1">Live Suggestion</div>
                    <p className="text-sm font-semibold text-slate-300 leading-snug">Burger Point stall current wait time is under 4 minutes.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 1.1 STAFF HOME PAGE */}
          {currentPage === 'home' && userRole === 'staff' && (
            <motion.div 
              key="staff-home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8 py-4 "
            >
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-6">
                  <span className="flex items-center gap-2 bg-rose-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                    <TrendingUp size={12} /> Live Ops Active
                  </span>
                </div>
                <h2 className="text-4xl font-black text-white uppercase italic mb-2 tracking-tighter">Command Center</h2>
                <p className="text-slate-500 font-medium">Global Stadium Monitoring & Response Interface</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12">
                  <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-3xl text-center space-y-1">
                    <div className="text-4xl font-black text-white tabular-nums tracking-tighter">48,291</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Attendance</div>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-3xl text-center space-y-1">
                    <div className="text-4xl font-black text-amber-500 tabular-nums tracking-tighter">14</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Alerts</div>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-3xl text-center space-y-1">
                    <div className="text-4xl font-black text-rose-500 tabular-nums tracking-tighter">1</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Panic Reported</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button 
                  onClick={() => setCurrentPage('staff-dashboard')}
                  className="group bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] hover:border-cyan-500 transition-all text-left shadow-2xl"
                >
                  <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <Users size={36} />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase italic mb-3">Crowd Intelligence</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Access real-time heatmaps and predictive density forecasting models.</p>
                  <div className="mt-8 flex items-center gap-3 text-cyan-400 text-xs font-black uppercase tracking-widest">
                    Enter Intelligence Hub <ArrowRight size={16} />
                  </div>
                </button>

                <button 
                  onClick={() => {
                    const newInc: Incident = { 
                      id: `inc-${Date.now()}`, 
                      location: 'Food Court B', 
                      type: 'medical', 
                      time: 'Just now', 
                      status: 'active' 
                    };
                    setIncidents([newInc, ...incidents]);
                    setCurrentPage('staff-dashboard');
                  }}
                  className="group bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] hover:border-rose-500 transition-all text-left shadow-2xl"
                >
                  <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <ShieldAlert size={36} />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase italic mb-3">Incident Control</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Dispatch security units and manage emergency response priorities.</p>
                  <div className="mt-8 flex items-center gap-3 text-rose-500 text-xs font-black uppercase tracking-widest">
                    Open Control Panel <ArrowRight size={16} />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* 1.2 STAFF DASHBOARD PAGE */}
          {currentPage === 'staff-dashboard' && (
            <motion.div 
              key="staff-dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Staff Operations</h2>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setGlobalEmergency(!globalEmergency);
                      if (!globalEmergency) speak("Global emergency mode activated. Exits prioritized.");
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all",
                      globalEmergency ? "bg-rose-600 text-white border-rose-500" : "bg-slate-900 text-rose-500 border-slate-800"
                    )}
                  >
                    {globalEmergency ? "Deactivate Global Alert" : "Global Emergency Mode"}
                  </button>
                  <button className="bg-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-400 border border-slate-800 hover:text-white transition-colors">Export Report</button>
                </div>
              </div>

              {/* Advanced Controls & Announcement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <h3 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
                    <Bell size={16} className="text-cyan-400" /> Dispatch Announcement
                  </h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={staffMessage}
                      onChange={(e) => setStaffMessage(e.target.value)}
                      placeholder="Type priority message..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                    <button 
                      onClick={startListening}
                      className={cn("p-2 rounded-xl border transition-colors", isListening ? "bg-cyan-600 border-cyan-400 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white")}
                    >
                      <Smartphone size={18} />
                    </button>
                  </div>
                  <button 
                    onClick={sendAnnouncement}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Push to All Fan Devices
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <h3 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
                    <Navigation size={16} className="text-fuchsia-400" /> Crowd Control Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Redirect Gate 3', 'Close Gate 1', 'Route A Clear', 'Reset Gates'].map(action => (
                      <button 
                        key={action}
                        onClick={() => {
                          const msg = action === 'Reset Gates' ? "All gates operational." : `Directive: ${action}`;
                          setStaffMessage(msg);
                          sendAnnouncement();
                          setStaffDirectives(prev => ({ ...prev, [action]: 'active' }));
                          speak(`Sending directive: ${action}`);
                        }}
                        className="bg-slate-950 border border-slate-800 py-2 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:border-fuchsia-500 hover:text-white transition-all"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Zone Density List */}
                <div className="lg:col-span-12 space-y-4">
                  <h3 className="text-lg font-black text-white uppercase italic tracking-wide">Infrastructure Load Monitoring</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {zones.map(zone => (
                      <div key={zone.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-20">
                           {zone.type === 'food' ? <Utensils size={40} /> : <MapPin size={40} />}
                        </div>
                        <div className="flex justify-between items-start relative z-10">
                          <div className="font-bold text-white">{zone.name}</div>
                          <StatusBadge status={zone.status} />
                        </div>
                        <div className="space-y-2 relative z-10">
                          <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                            <span>Infrastructure Load</span>
                            <span className={cn(
                              "font-black",
                              zone.density > 75 ? "text-rose-500" : zone.density > 40 ? "text-amber-500" : "text-lime-500"
                            )}>
                              {zone.status === 'crowded' ? 'HIGH' : zone.status === 'moderate' ? 'MEDIUM' : 'LOW'}
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${zone.density}%` }}
                              className={cn(
                                "h-full",
                                zone.density > 75 ? "bg-rose-500" : zone.density > 40 ? "bg-amber-500" : "bg-lime-500"
                              )}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                          {zone.waitTime && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                              <Clock size={12} /> {zone.waitTime}m wait
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 font-bold uppercase">
                            Load: <span className={cn(
                              zone.status === 'crowded' ? 'text-rose-500' : 
                              zone.status === 'moderate' ? 'text-amber-500' : 'text-lime-500'
                            )}>{zone.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Incident Queue */}
                <div className="lg:col-span-12 space-y-4 mt-8">
                  <h3 className="text-lg font-black text-rose-500 uppercase italic tracking-wide">Incident Queue</h3>
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="divide-y divide-slate-800">
                      {incidents.map(inc => (
                        <div key={inc.id} className="p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-6">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                              inc.type === 'panic' ? "bg-rose-500/20 text-rose-500" : "bg-blue-500/20 text-blue-500"
                            )}>
                              {inc.type === 'panic' ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
                            </div>
                            <div>
                              <div className="text-lg font-black text-white uppercase italic">{inc.location}</div>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{inc.type} alert • {inc.time}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {inc.status === 'active' ? (
                              <button 
                                onClick={() => {
                                  setIncidents(prev => prev.map(i => i.id === inc.id ? { ...i, status: 'resolved' } : i));
                                }}
                                className="bg-rose-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 transition-all"
                              >
                                Resolve
                              </button>
                            ) : (
                              <span className="flex items-center gap-2 text-lime-400 text-xs font-black uppercase">
                                <CheckCircle2 size={16} /> Resolved
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {incidents.length === 0 && (
                        <div className="p-12 text-center text-slate-600 font-bold uppercase">No active incidents</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. INSIDE STADIUM (MAIN MENU) */}
          {currentPage === 'inside-menu' && (
            <motion.div 
              key="inside-menu"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 py-12"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Main Menu</h2>
                <p className="text-slate-400">Select an option to proceed</p>
              </div>

              <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                {[
                  { label: 'Access My Seat', page: 'navigation', mode: 'access', icon: <Ticket className="text-cyan-400" /> },
                  { label: 'Navigate Inside', page: 'navigation', mode: 'route', icon: <Navigation className="text-fuchsia-400" /> },
                  { label: 'Safety & Help', page: 'safety-outside', mode: 'safety', icon: <ShieldAlert className="text-amber-400" /> },
                ].map((item) => (
                  <button 
                    key={item.label}
                    onClick={() => {
                      setCurrentPage(item.page as Page);
                      if (item.page === 'navigation') setNavMode(item.mode as NavMode);
                      if (item.page === 'safety-outside') setSafetyTab('safety');
                    }}
                    className="flex items-center gap-6 bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-slate-600 transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="text-xl font-black text-white uppercase italic tracking-wide">{item.label}</span>
                    <ChevronRight className="ml-auto text-slate-600" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          {/* 3. ACCESS & NAVIGATION PAGE */}
          {currentPage === 'navigation' && (
            <motion.div 
              key="navigation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 relative"
            >
              {/* Scanner Simulation Overlay */}
              <AnimatePresence>
                {isScanning && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6"
                  >
                    <div className="relative w-64 h-64 border-2 border-cyan-500/30 rounded-3xl overflow-hidden">
                      {!scanSuccess && (
                        <motion.div 
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="absolute left-0 right-0 h-1 bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.8)] z-10"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent" />
                      <div className="h-full w-full flex items-center justify-center">
                        {scanSuccess ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-lime-400"
                          >
                            <CheckCircle2 size={64} />
                          </motion.div>
                        ) : (
                          <Scan size={64} className="text-cyan-500/20" />
                        )}
                      </div>
                    </div>
                    <div className="mt-8 text-center space-y-2">
                      <h3 className="text-xl font-black text-white uppercase italic tracking-widest">
                        {scanSuccess ? "Ticket Scanned Successfully" : "Scanning Ticket..."}
                      </h3>
                      <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">
                        {scanSuccess ? "Stand B | Row 12 | Seat 45" : "Please hold steady"}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {navMode === 'access' ? (
                <div className="max-w-md mx-auto space-y-8 py-8">
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Access Your Seat</h2>
                    <p className="text-slate-400">Identify your location to start navigation</p>
                  </div>

                  <div className="space-y-4">
                    <button 
                      onClick={handleScanTicket}
                      className="w-full bg-cyan-600/10 border border-cyan-500/30 p-8 rounded-3xl hover:bg-cyan-600/20 transition-all text-left group"
                    >
                      <div className="flex items-center gap-4 mb-2">
                        <Scan className="text-cyan-400" size={24} />
                        <h3 className="text-xl font-black text-white uppercase italic">Scan Ticket</h3>
                      </div>
                      <p className="text-sm text-cyan-400/70 font-bold uppercase tracking-wider">Quick and automatic</p>
                    </button>

                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                      <h3 className="text-lg font-black text-white uppercase italic">Enter Seat Details</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {['Stand', 'Row', 'Seat'].map(field => (
                          <div key={field}>
                            <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">{field}</label>
                            <input 
                              type="text" 
                              placeholder="--"
                              value={seatInfo[field.toLowerCase() as keyof typeof seatInfo]}
                              onChange={(e) => setSeatInfo(prev => ({ ...prev, [field.toLowerCase()]: e.target.value }))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-4 text-center font-bold text-white focus:border-cyan-500 outline-none transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={handleSeatNavigation}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all"
                      >
                        Proceed
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
                      {activeRoute ? `Route to ${activeRoute.destination}` : 'Navigation'}
                    </h2>
                    {activeRoute && (
                      <div className="flex items-center gap-2 text-cyan-400 font-black uppercase text-xs">
                        <Clock size={14} /> {activeRoute.totalTime}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Directions List */}
                    <div className="lg:col-span-6 space-y-4">
                      {activeRoute ? (
                        <div className="space-y-3">
                          {activeRoute.isAlternate && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-400 font-bold uppercase flex items-center gap-2 mb-4">
                              <AlertTriangle size={16} />
                              Main path crowded, showing alternate route
                            </div>
                          )}
                          {activeRoute.steps.map((step, i) => (
                            <motion.div 
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-black text-cyan-400">
                                {i + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-white">{step.instruction}</p>
                                <p className="text-[10px] text-cyan-500/60 font-mono uppercase mt-1 tracking-tight">{step.distance}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center">
                          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Select a destination to start</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Nav Buttons */}
                    <div className="lg:col-span-6 space-y-6">
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <h3 className="text-lg font-black text-white uppercase italic mb-6">Quick Navigation</h3>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { label: 'Go to Food', type: 'food', icon: <Utensils size={18} /> },
                            { label: 'Find Washroom', type: 'restroom', icon: <Users size={18} /> },
                            { label: 'Go to Exit', type: 'exit', icon: <ArrowRight size={18} /> },
                          ].map(btn => (
                            <button 
                              key={btn.label}
                              onClick={() => handleQuickNav(btn.type)}
                              className="flex items-center gap-4 bg-slate-950 border border-slate-800 p-5 rounded-2xl hover:border-cyan-500/50 transition-all group"
                            >
                              <div className="text-cyan-400 group-hover:scale-110 transition-transform">{btn.icon}</div>
                              <span className="text-sm font-black text-white uppercase italic tracking-wide">{btn.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 4. SAFETY & OUTSIDE PAGE */}
          {currentPage === 'safety-outside' && (
            <motion.div 
              key="safety-outside"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              {/* Tabs */}
              <div className="flex bg-slate-900 p-1 rounded-2xl max-w-sm mx-auto border border-slate-800">
                {(['safety', 'outside'] as SafetyTab[]).map(tab => (
                  <button 
                    key={tab}
                    onClick={() => {
                      setSafetyTab(tab);
                      setSafetyOutput(null);
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      safetyTab === tab ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {safetyTab === 'safety' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Crowd Levels */}
                  <div className="lg:col-span-5 space-y-6">
                    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                      <h3 className="text-lg font-black text-white uppercase italic mb-6">Crowd Levels</h3>
                      <div className="space-y-4">
                        {[
                          { name: 'Gate A', status: 'free', label: 'Low crowd' },
                          { name: 'Gate B', status: 'crowded', label: 'High crowd' },
                          { name: 'Food Court', status: 'moderate', label: 'Medium crowd' },
                        ].map(gate => (
                          <div key={gate.name} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                            <span className="font-bold text-white">{gate.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "w-2 h-2 rounded-full",
                                gate.status === 'free' ? "bg-lime-500" : gate.status === 'moderate' ? "bg-amber-500" : "bg-rose-500"
                              )} />
                              <span className="text-[10px] font-black uppercase text-slate-400">{gate.label}</span>
                            </div>
                          </div>
                        ))}
                        <div className="mt-4 p-4 bg-lime-500/10 border border-lime-500/30 rounded-2xl text-center">
                          <p className="text-xs font-black text-lime-400 uppercase tracking-widest">Recommended: Gate A</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Safety Actions */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Guide Me Safely', action: 'guide', icon: <Navigation size={18} /> },
                        { label: 'Will I Be Late?', action: 'late', icon: <Clock size={18} /> },
                        { label: 'Predict Crowd (10m)', action: 'predict', icon: <TrendingUp size={18} /> },
                        { label: 'View Alerts', action: 'alerts', icon: <Bell size={18} /> },
                      ].map(btn => (
                        <button 
                          key={btn.label}
                          onClick={() => {
                            if (btn.action === 'alerts') {
                              const newNotif: Notification = { id: Date.now().toString(), type: 'alert', message: 'Gate B is crowded. Use Gate A instead for faster entry.', time: 'Just now' };
                              setNotifications([newNotif, ...notifications]);
                              setSafetyOutput("Alert: Gate B is crowded. Use Gate A instead.");
                            } else {
                              handleSafetyAction(btn.action);
                            }
                          }}
                          className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-slate-600 transition-all text-left group"
                        >
                          <div className="text-slate-400 mb-4 group-hover:scale-110 transition-transform">{btn.icon}</div>
                          <span className="text-sm font-black text-white uppercase italic tracking-wide">{btn.label}</span>
                        </button>
                      ))}
                    </div>

                    {safetyOutput && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-3xl"
                      >
                        <p className="text-sm font-bold text-cyan-400 leading-relaxed">{safetyOutput}</p>
                      </motion.div>
                    )}

                    <button 
                      onClick={() => triggerPanic(true)}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest py-6 rounded-3xl shadow-2xl shadow-rose-500/20 transition-all flex items-center justify-center gap-3"
                    >
                      <ShieldAlert size={24} />
                      I Feel Unsafe (Panic Mode)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Hotels', icon: <Hotel size={24} />, color: 'text-blue-400' },
                      { label: 'Restaurants', icon: <Utensils size={24} />, color: 'text-orange-400' },
                      { label: 'Parking', icon: <Car size={24} />, color: 'text-lime-400' },
                      { label: 'Stadium', icon: <MapIcon size={24} />, color: 'text-cyan-400' },
                    ].map(cat => (
                      <button 
                        key={cat.label}
                        onClick={() => handleOutsideSearch(cat.label)}
                        className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-slate-600 transition-all group"
                      >
                        <div className={cn("mb-4 p-3 w-fit mx-auto rounded-2xl bg-slate-950 border border-slate-800 group-hover:scale-110 transition-transform", cat.color)}>
                          {cat.icon}
                        </div>
                        <div className="text-sm font-black text-white uppercase tracking-widest">{cat.label}</div>
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {outsideResults && (
                      <motion.section 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8"
                      >
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Nearby {outsideResults.type}</h3>
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{outsideResults.items.length} RESULTS FOUND</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {outsideResults.items.map((item, i) => (
                            <div key={i} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-white text-lg">{item.name}</h4>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <MapPin size={12} /> {item.distance} away
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                                  <CheckCircle2 size={12} /> {item.rating}
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const newNotif: Notification = { id: Date.now().toString(), type: 'update', message: `Opening ${item.name} in External Maps...`, time: 'Just now' };
                                  setNotifications([newNotif, ...notifications]);
                                }}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-white uppercase tracking-widest py-3 rounded-xl transition-all"
                              >
                                Open in Maps
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.section>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Panic Mode Overlay */}
      <AnimatePresence>
        {isPanicMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-rose-950/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full text-center space-y-8">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-24 h-24 bg-rose-600 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(225,29,72,0.5)]"
              >
                <ShieldAlert size={48} className="text-white" />
              </motion.div>
              
              <div>
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">Emergency Mode</h2>
                <p className="text-rose-200 font-medium">Help is on the way. Please follow the instructions below.</p>
              </div>

              <div className="bg-rose-900/50 border border-rose-500/30 rounded-3xl p-6 text-left space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shrink-0">
                    <Navigation size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase">Nearest Safe Exit</h4>
                    <p className="text-xs text-rose-200">Gate 2 (South) - 120m away. Path is clear.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shrink-0">
                    <Users size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase">Security Status</h4>
                    <p className="text-xs text-rose-200">Officers dispatched to Section 204. ETA: 2 mins.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button className="w-full bg-white text-rose-600 font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl hover:scale-105 transition-transform">
                  Call Stadium Security
                </button>
                <button 
                  onClick={() => triggerPanic(false)}
                  className="w-full bg-rose-800/50 text-rose-200 font-bold uppercase tracking-widest py-3 rounded-2xl hover:bg-rose-800 transition-colors"
                >
                  Cancel Alert
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant Floating Bubble */}
      {userRole === 'public' && (
        <button 
          onClick={() => {
            speak("Hello! I'm your AI Stadium Assistant. You can ask me to find your seat, locate food stalls, or suggest the safest exit route.");
            setSpeechFeedback("How can I help you?");
          }}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-cyan-500 to-fuchsia-600 rounded-full flex items-center justify-center shadow-2xl shadow-cyan-500/40 z-50 hover:scale-110 active:scale-95 transition-transform"
        >
          <div className="absolute inset-0 bg-white/10 rounded-full animate-ping opacity-20" />
          <Smartphone className="text-white" size={28} />
        </button>
      )}

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
