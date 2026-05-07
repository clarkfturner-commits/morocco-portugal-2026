import React, { useState, useEffect } from 'react';
import { Plane, Calendar, Wallet, Heart, Users, Package, NotebookPen, Plus, Trash2, Check, X, MapPin, Loader2, Camera, Settings, Image as ImageIcon, ExternalLink, Globe, Home, CalendarDays, CloudSun, Navigation, Info } from 'lucide-react';
import { loadAllData, subscribeToData, saveKey } from './firebase';

const DEFAULT_FAMILIES = [
  { id: 'turner', label: 'Turner', members: 'Robert, Clark, Jovis', size: 3, color: '#C8553D' },
  { id: 'kristy', label: 'Kristy', members: 'Kristy, Adam, Henry', size: 3, color: '#2E5266' },
  { id: 'tirzah', label: 'Bottcher', members: 'Tirzah, Arrow', size: 2, color: '#D4A24C' },
];

const FAMILY_COLORS = ['#C8553D', '#2E5266', '#D4A24C', '#6B7F5C', '#8B5A8C', '#B5651D', '#3D6B7A', '#A0522D'];

// November 2026 weather almanac, sourced from historical climate averages
const WEATHER_DATA = {
  Casablanca: { highF: 71, lowF: 55, highC: 22, lowC: 13, rainDays: 9, rainIn: 2.4, sunset: '5:35 PM', notes: 'Coastal, breezy, occasional rain. Layers help.' },
  Fes: { highF: 67, lowF: 47, highC: 19, lowC: 8, rainDays: 7, rainIn: 1.7, sunset: '5:25 PM', notes: 'Cool nights in the medina. Bring a warm layer.' },
  Marrakech: { highF: 72, lowF: 49, highC: 22, lowC: 9, rainDays: 7, rainIn: 1.6, sunset: '5:40 PM', notes: 'Warm days, cold nights. Big day-night swing.' },
  Lisbon: { highF: 64, lowF: 53, highC: 18, lowC: 12, rainDays: 13, rainIn: 3.3, sunset: '5:20 PM', notes: 'Wettest month. Pack a real rain jacket.' },
  Sintra: { highF: 61, lowF: 50, highC: 16, lowC: 10, rainDays: 14, rainIn: 4.5, sunset: '5:20 PM', notes: 'Microclimate. Cooler and wetter than Lisbon, often misty.' },
  Porto: { highF: 61, lowF: 49, highC: 16, lowC: 9, rainDays: 14, rainIn: 5.2, sunset: '5:20 PM', notes: 'Rainy and cool. A waterproof jacket is essential.' },
};

const SHARED_TABS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'itinerary', label: 'Shared Itinerary', icon: Calendar },
  { id: 'expenses', label: 'Shared Expenses', icon: Wallet },
  { id: 'meetups', label: 'Meetups', icon: Users },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'packing', label: 'Packing', icon: Package },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
];

const FAMILY_TABS = [
  { id: 'itinerary', label: 'Itinerary', icon: Calendar },
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'expenses', label: 'Expenses', icon: Wallet },
  { id: 'packing', label: 'Packing', icon: Package },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
];

const TRIP_START = new Date('2026-11-05T00:00:00');

let dataStore = {};
const dataListeners = new Set();

function notifyListeners() {
  dataListeners.forEach(fn => fn(dataStore));
}

function useStoreKey(key, fallback) {
  const [value, setValue] = useState(dataStore[key] !== undefined ? dataStore[key] : fallback);
  useEffect(() => {
    const listener = (store) => {
      setValue(store[key] !== undefined ? store[key] : fallback);
    };
    dataListeners.add(listener);
    return () => dataListeners.delete(listener);
  }, [key]);
  return value;
}

function updateKey(key, value) {
  dataStore = { ...dataStore, [key]: value };
  notifyListeners();
  saveKey(key, value);
}

// Helper: open address in user's default map app
function openInMaps(address) {
  if (!address) return;
  const encoded = encodeURIComponent(address);
  // Universal maps URL works on iOS (opens Apple Maps) and Android/desktop (opens Google Maps)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `https://maps.apple.com/?q=${encoded}`
    : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  window.open(url, '_blank');
}

// Helper: format date string (YYYY-MM-DD) for display
function formatDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${parseInt(day)}`;
}

// Helper: get all dates between two ISO dates inclusive
function datesBetween(startISO, endISO) {
  if (!startISO || !endISO) return [];
  const start = new Date(startISO + 'T00:00:00');
  const end = new Date(endISO + 'T00:00:00');
  const dates = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function App() {
  const [view, setView] = useState({ scope: 'shared', familyId: null });
  const [activeTab, setActiveTab] = useState('calendar');
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadAllData().then(data => {
      dataStore = data;
      notifyListeners();
      setLoaded(true);
    });

    const unsubscribe = subscribeToData((data) => {
      dataStore = data;
      notifyListeners();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const tabs = view.scope === 'shared' ? SHARED_TABS : FAMILY_TABS;
    if (!tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [view.scope]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EDE0' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: '#1F3A3D' }} />
      </div>
    );
  }

  const tabs = view.scope === 'shared' ? SHARED_TABS : FAMILY_TABS;

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #F5EDE0 0%, #EFE3D0 100%)',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        .display-font { font-family: 'Cormorant Garamond', Georgia, serif; }
        .body-font { font-family: 'Outfit', sans-serif; }
        .tab-active { background: #1F3A3D; color: #F5EDE0; }
        .card { background: #FBF6EC; border: 1px solid #E0D2BC; }
        .card-elevated { box-shadow: 0 1px 0 #E0D2BC, 0 8px 24px -12px rgba(31, 58, 61, 0.15); }
        input, textarea, select {
          background: #FBF6EC;
          border: 1px solid #D6C5A8;
          color: #2A2018;
          font-family: 'Outfit', sans-serif;
        }
        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: #1F3A3D;
          box-shadow: 0 0 0 2px rgba(31, 58, 61, 0.15);
        }
        input[type="date"] { color-scheme: light; }
        .btn-primary { background: #1F3A3D; color: #F5EDE0; transition: all 0.2s; }
        .btn-primary:hover { background: #142628; }
        .btn-ghost { background: transparent; color: #1F3A3D; border: 1px solid #1F3A3D; }
        .btn-ghost:hover { background: #1F3A3D; color: #F5EDE0; }
        .scrollbar-thin::-webkit-scrollbar { height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #D6C5A8; border-radius: 3px; }
        .map-link {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; color: #1F3A3D; cursor: pointer;
          padding: 2px 6px; border-radius: 6px;
          background: rgba(31, 58, 61, 0.08); transition: all 0.15s;
        }
        .map-link:hover { background: rgba(31, 58, 61, 0.15); }
      `}</style>

      <Header onOpenSettings={() => setShowSettings(true)} view={view} setView={setView} />

      <nav className="px-6 sticky top-0 z-10" style={{ background: '#F5EDE0', borderBottom: '1px solid #E0D2BC' }}>
        <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto scrollbar-thin py-3">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full body-font text-sm whitespace-nowrap transition-all ${isActive ? 'tab-active' : ''}`}
                style={!isActive ? { color: '#5C4F3D' } : {}}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="px-6 py-8 max-w-6xl mx-auto">
        {view.scope === 'shared' && (
          <>
            {activeTab === 'calendar' && <CalendarTab />}
            {activeTab === 'itinerary' && <SharedItineraryTab />}
            {activeTab === 'expenses' && <SharedExpensesTab />}
            {activeTab === 'meetups' && <MeetupsTab />}
            {activeTab === 'wishlist' && <WishlistTab />}
            {activeTab === 'weather' && <WeatherTab />}
            {activeTab === 'photos' && <PhotosTab />}
            {activeTab === 'packing' && <SharedPackingTab />}
            {activeTab === 'notes' && <NotesTab scope="shared" />}
          </>
        )}
        {view.scope === 'family' && (
          <>
            {activeTab === 'itinerary' && <FamilyItineraryTab familyId={view.familyId} />}
            {activeTab === 'flights' && <FlightsTab familyId={view.familyId} />}
            {activeTab === 'expenses' && <FamilyExpensesTab familyId={view.familyId} />}
            {activeTab === 'packing' && <FamilyPackingTab familyId={view.familyId} />}
            {activeTab === 'notes' && <NotesTab scope="family" familyId={view.familyId} />}
          </>
        )}
      </main>

      {showSettings && <FamilySettings onClose={() => setShowSettings(false)} />}

      <footer className="px-6 py-8 text-center body-font text-xs" style={{ color: '#7A6B58' }}>
        Synced live across all travelers · Changes save automatically
      </footer>
    </div>
  );
}

function Header({ onOpenSettings, view, setView }) {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const [countdown, setCountdown] = useState(getCountdown());

  useEffect(() => {
    const id = setInterval(() => setCountdown(getCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  const activeFamily = view.scope === 'family' ? families.find(f => f.id === view.familyId) : null;

  return (
    <header className="px-6 pt-8 pb-6 border-b" style={{ borderColor: '#E0D2BC' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] mb-3 body-font" style={{ color: '#7A6B58' }}>
              <Plane size={14} />
              <span>November 2026</span>
              <span style={{ color: '#C8553D' }}>•</span>
              <span>Three Families</span>
            </div>
            <h1 className="display-font text-5xl md:text-6xl font-medium leading-none" style={{ color: '#1F3A3D' }}>
              Morocco <span style={{ color: '#C8553D', fontStyle: 'italic' }}>&</span> Portugal
            </h1>
            <p className="body-font text-sm mt-3 max-w-xl" style={{ color: '#5C4F3D' }}>
              {activeFamily ? (
                <><span style={{ color: activeFamily.color, fontWeight: 500 }}>{activeFamily.label}</span> private space.</>
              ) : (
                'Shared space — visible to all families.'
              )}
            </p>
          </div>

          <div className="card card-elevated rounded-2xl p-4 min-w-[280px]">
            <div className="body-font text-xs uppercase tracking-wider mb-2" style={{ color: '#7A6B58' }}>
              {countdown.label}
            </div>
            <div className="flex gap-3">
              {countdown.units.map((u, i) => (
                <div key={i} className="text-center">
                  <div className="display-font text-3xl leading-none" style={{ color: '#1F3A3D' }}>
                    {u.value}
                  </div>
                  <div className="body-font text-xs mt-1" style={{ color: '#5C4F3D' }}>{u.label}</div>
                </div>
              ))}
            </div>
            <div className="body-font text-xs mt-3" style={{ color: '#7A6B58' }}>
              Departure: November 5, 2026
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="body-font text-xs uppercase tracking-wider mb-2" style={{ color: '#7A6B58' }}>Viewing as</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setView({ scope: 'shared', familyId: null })}
              className="flex items-center gap-2 px-4 py-2 rounded-full body-font text-sm transition-all"
              style={{
                background: view.scope === 'shared' ? '#1F3A3D' : 'transparent',
                color: view.scope === 'shared' ? '#F5EDE0' : '#1F3A3D',
                border: '1px solid #1F3A3D',
              }}
            >
              <Globe size={14} />
              Shared
            </button>
            {families.map(f => {
              const isActive = view.scope === 'family' && view.familyId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setView({ scope: 'family', familyId: f.id })}
                  className="flex items-center gap-2 px-4 py-2 rounded-full body-font text-sm transition-all"
                  style={{
                    background: isActive ? f.color : 'transparent',
                    color: isActive ? '#FBF6EC' : f.color,
                    border: `1px solid ${f.color}`,
                  }}
                >
                  <Home size={14} />
                  {f.label}
                  <span className="opacity-70 text-xs">({f.size})</span>
                </button>
              );
            })}
            <button onClick={onOpenSettings} className="flex items-center gap-1.5 px-3 py-2 rounded-full body-font text-xs btn-ghost ml-auto">
              <Settings size={12} /> Edit travelers
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function getCountdown() {
  const now = new Date();
  const diff = TRIP_START - now;

  if (diff <= 0) {
    const daysIn = Math.floor(-diff / (1000 * 60 * 60 * 24));
    return {
      label: daysIn < 30 ? 'On the trip' : 'Trip complete',
      units: [{ value: Math.abs(daysIn), label: 'days in' }]
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    label: 'Until takeoff',
    units: [
      { value: days, label: days === 1 ? 'day' : 'days' },
      { value: hours, label: 'hrs' },
      { value: minutes, label: 'min' },
      { value: seconds, label: 'sec' },
    ]
  };
}

function FamilySettings({ onClose }) {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const [draft, setDraft] = useState(families);

  const update = (id, patch) => setDraft(draft.map(f => f.id === id ? { ...f, ...patch } : f));
  const remove = (id) => { if (draft.length > 1) setDraft(draft.filter(f => f.id !== id)); };

  const add = () => {
    const usedColors = draft.map(f => f.color);
    const nextColor = FAMILY_COLORS.find(c => !usedColors.includes(c)) || FAMILY_COLORS[draft.length % FAMILY_COLORS.length];
    setDraft([...draft, {
      id: 'fam_' + Date.now(),
      label: 'New traveler',
      members: '',
      size: 1,
      color: nextColor,
    }]);
  };

  const save = () => { updateKey('families', draft); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(31, 58, 61, 0.6)' }}>
      <div className="card card-elevated rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="display-font text-2xl" style={{ color: '#1F3A3D' }}>Travelers</h2>
            <p className="body-font text-xs mt-1" style={{ color: '#5C4F3D' }}>
              Add, rename, or remove travelers.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#5C4F3D' }}>
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 mt-4">
          {draft.map(f => (
            <div key={f.id} className="p-3 rounded-xl space-y-2" style={{ border: `1px solid ${f.color}40`, background: `${f.color}08` }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="text" placeholder="Label" value={f.label} onChange={e => update(f.id, { label: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
                <input type="text" placeholder="Members" value={f.members} onChange={e => update(f.id, { members: e.target.value })} className="px-3 py-2 rounded-lg text-sm sm:col-span-2" />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="body-font text-xs" style={{ color: '#5C4F3D' }}>Size:</span>
                  <input type="number" min="1" value={f.size} onChange={e => update(f.id, { size: parseInt(e.target.value) || 1 })} className="w-16 px-2 py-1 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="body-font text-xs" style={{ color: '#5C4F3D' }}>Color:</span>
                  <div className="flex gap-1">
                    {FAMILY_COLORS.map(c => (
                      <button key={c} onClick={() => update(f.id, { color: c })} className="w-5 h-5 rounded-full transition-all" style={{ background: c, outline: f.color === c ? '2px solid #1F3A3D' : 'none', outlineOffset: '2px' }} />
                    ))}
                  </div>
                </div>
                <button onClick={() => remove(f.id)} className="ml-auto px-2 py-1 rounded-lg body-font text-xs flex items-center gap-1" style={{ color: '#C8553D' }}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between items-center gap-2">
          <button onClick={add} className="btn-ghost px-3 py-2 rounded-lg body-font text-xs flex items-center gap-1">
            <Plus size={13} /> Add traveler
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg body-font text-xs" style={{ color: '#5C4F3D' }}>Cancel</button>
            <button onClick={save} className="btn-primary px-4 py-2 rounded-lg body-font text-xs">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ CALENDAR (NEW) ============
function CalendarTab() {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const sharedDays = useStoreKey('itinerary-shared', []);

  // Pull each family's itinerary
  const familyDaysMap = {};
  families.forEach(f => {
    familyDaysMap[f.id] = dataStore[`itinerary-${f.id}`] || [];
  });

  // Build a map: dateISO -> { familyId -> { city, country, isShared } }
  const calendarMap = {};

  families.forEach(f => {
    (familyDaysMap[f.id] || []).forEach(day => {
      const dates = day.checkIn && day.checkOut
        ? datesBetween(day.checkIn, day.checkOut)
        : day.date
          ? [day.date]
          : [];
      dates.forEach(d => {
        if (!calendarMap[d]) calendarMap[d] = {};
        calendarMap[d][f.id] = { city: day.city, country: day.country, isShared: false };
      });
    });
  });

  sharedDays.forEach(day => {
    const dates = day.checkIn && day.checkOut
      ? datesBetween(day.checkIn, day.checkOut)
      : day.date
        ? [day.date]
        : [];
    dates.forEach(d => {
      if (!calendarMap[d]) calendarMap[d] = {};
      day.families.forEach(famId => {
        calendarMap[d][famId] = { city: day.city, country: day.country, isShared: true };
      });
    });
  });

  // Build the November 2026 calendar (30 days)
  const monthDates = [];
  for (let i = 1; i <= 30; i++) {
    const dateStr = `2026-11-${String(i).padStart(2, '0')}`;
    monthDates.push(dateStr);
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Calendar" subtitle="Who's where, day by day. November 2026." />

      <div className="card card-elevated rounded-2xl p-4 overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header row with days */}
          <div className="grid gap-px mb-2" style={{ gridTemplateColumns: `120px repeat(30, minmax(28px, 1fr))` }}>
            <div className="body-font text-xs uppercase tracking-wider" style={{ color: '#7A6B58' }}>Family</div>
            {monthDates.map(d => {
              const dayNum = parseInt(d.split('-')[2]);
              const date = new Date(d + 'T00:00:00');
              const dow = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div key={d} className="text-center body-font" style={{ color: isWeekend ? '#C8553D' : '#7A6B58' }}>
                  <div className="text-[10px] uppercase">{dow}</div>
                  <div className="text-xs font-medium">{dayNum}</div>
                </div>
              );
            })}
          </div>

          {/* Family rows */}
          {families.map(f => (
            <div key={f.id} className="grid gap-px py-2 items-center" style={{ gridTemplateColumns: `120px repeat(30, minmax(28px, 1fr))` }}>
              <div className="flex items-center gap-2 body-font text-sm">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: f.color }} />
                <span style={{ color: '#2A2018' }}>{f.label}</span>
              </div>
              {monthDates.map(d => {
                const entry = calendarMap[d]?.[f.id];
                if (!entry) {
                  return <div key={d} className="h-7 rounded" style={{ background: '#F5EDE0' }} />;
                }
                return (
                  <div
                    key={d}
                    className="h-7 rounded flex items-center justify-center body-font text-[9px] cursor-help"
                    style={{
                      background: f.color,
                      color: '#FBF6EC',
                      border: entry.isShared ? '2px solid #1F3A3D' : 'none'
                    }}
                    title={`${entry.city || entry.country} (${entry.isShared ? 'shared day' : 'family-only'})`}
                  >
                    {entry.city ? entry.city.slice(0, 3).toUpperCase() : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="card rounded-xl p-4">
        <div className="body-font text-xs uppercase tracking-wider mb-2" style={{ color: '#7A6B58' }}>How to read this</div>
        <ul className="body-font text-xs space-y-1.5" style={{ color: '#2A2018' }}>
          <li className="flex items-center gap-2">
            <span className="w-4 h-4 rounded" style={{ background: '#C8553D' }} />
            <span>Solid color = that family is in that city on that day (from their family itinerary)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-4 h-4 rounded" style={{ background: '#C8553D', border: '2px solid #1F3A3D' }} />
            <span>Dark border = it's a shared day (from Shared Itinerary, multiple families together)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-4 h-4 rounded" style={{ background: '#F5EDE0', border: '1px solid #E0D2BC' }} />
            <span>Empty = no plan recorded for that family that day</span>
          </li>
          <li className="pt-1" style={{ color: '#5C4F3D' }}>
            Hover any cell for the city name and whether it's a shared or family-only day. Add check-in / check-out dates to your itinerary days for the bands to span multiple days automatically.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ============ WEATHER (NEW) ============
function WeatherTab() {
  const cities = Object.keys(WEATHER_DATA);

  return (
    <div className="space-y-4">
      <SectionHeader title="November Weather" subtitle="Historical averages for November. Real forecasts available about a week out from your travel dates." />

      <div className="card card-elevated rounded-2xl p-4" style={{ background: '#1F3A3D08', border: '1px solid #1F3A3D20' }}>
        <div className="flex items-start gap-3">
          <Info size={18} style={{ color: '#1F3A3D', flexShrink: 0, marginTop: 2 }} />
          <div className="body-font text-xs leading-relaxed" style={{ color: '#2A2018' }}>
            <strong>Quick read:</strong> Morocco runs warm by day (60s–70s F) and chilly at night (high 40s–50s F). Marrakech has the biggest day-night swing. Portugal is mild and rainy — Lisbon and Sintra get the most rain of the year in November. Pack layers and a real waterproof jacket.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cities.map(city => {
          const w = WEATHER_DATA[city];
          return (
            <div key={city} className="card card-elevated rounded-2xl p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="display-font text-2xl" style={{ color: '#1F3A3D' }}>{city}</h3>
                <CloudSun size={20} style={{ color: '#D4A24C' }} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="body-font text-xs uppercase tracking-wider" style={{ color: '#7A6B58' }}>High</div>
                  <div className="display-font text-2xl" style={{ color: '#C8553D' }}>{w.highF}°F</div>
                  <div className="body-font text-xs" style={{ color: '#5C4F3D' }}>{w.highC}°C</div>
                </div>
                <div>
                  <div className="body-font text-xs uppercase tracking-wider" style={{ color: '#7A6B58' }}>Low</div>
                  <div className="display-font text-2xl" style={{ color: '#2E5266' }}>{w.lowF}°F</div>
                  <div className="body-font text-xs" style={{ color: '#5C4F3D' }}>{w.lowC}°C</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: '#E0D2BC' }}>
                <div>
                  <div className="body-font text-xs uppercase tracking-wider" style={{ color: '#7A6B58' }}>Rain</div>
                  <div className="body-font text-sm" style={{ color: '#2A2018' }}>{w.rainDays} days · {w.rainIn}"</div>
                </div>
                <div>
                  <div className="body-font text-xs uppercase tracking-wider" style={{ color: '#7A6B58' }}>Sunset</div>
                  <div className="body-font text-sm" style={{ color: '#2A2018' }}>{w.sunset}</div>
                </div>
              </div>

              {w.notes && (
                <p className="body-font text-xs mt-3 pt-3 border-t italic" style={{ color: '#5C4F3D', borderColor: '#E0D2BC' }}>
                  {w.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="body-font text-xs text-center pt-2" style={{ color: '#7A6B58' }}>
        Source: 30-year climate averages. Actual conditions vary year to year.
      </div>
    </div>
  );
}

// ============ ITINERARY ============
function SharedItineraryTab() {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const days = useStoreKey('itinerary-shared', getDefaultSharedItinerary(families));
  const [editingId, setEditingId] = useState(null);

  const persist = (next) => updateKey('itinerary-shared', next);

  const addDay = () => {
    const next = [...days, {
      id: Date.now().toString(), date: '', checkIn: '', checkOut: '', city: '', country: 'Morocco',
      activities: '', lodging: '', address: '', families: families.map(f => f.id),
    }];
    persist(next);
    setEditingId(next[next.length - 1].id);
  };

  const updateDay = (id, patch) => persist(days.map(d => d.id === id ? { ...d, ...patch } : d));
  const removeDay = (id) => persist(days.filter(d => d.id !== id));

  const toggleFamily = (dayId, famId) => {
    const day = days.find(d => d.id === dayId);
    const fams = day.families.includes(famId) ? day.families.filter(f => f !== famId) : [...day.families, famId];
    updateDay(dayId, { families: fams });
  };

  return (
    <div className="space-y-3">
      <SectionHeader title="Shared Itinerary" subtitle="Days when two or more families overlap. Add check-in / check-out for multi-day stays." />

      {days.map((day, idx) => (
        <div key={day.id} className="card card-elevated rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="display-font text-3xl font-medium leading-none pt-1" style={{ color: '#C8553D' }}>
              {String(idx + 1).padStart(2, '0')}
            </div>
            <div className="flex-1 min-w-0">
              {editingId === day.id ? (
                <DayEditor day={day} families={families} updateDay={(p) => updateDay(day.id, p)} toggleFamily={(fid) => toggleFamily(day.id, fid)} onDone={() => setEditingId(null)} onDelete={() => removeDay(day.id)} />
              ) : (
                <DayDisplay day={day} families={families} onClick={() => setEditingId(day.id)} />
              )}
            </div>
          </div>
        </div>
      ))}

      <button onClick={addDay} className="btn-ghost w-full py-3 rounded-xl body-font text-sm flex items-center justify-center gap-2">
        <Plus size={16} /> Add a shared day
      </button>
    </div>
  );
}

function getDefaultSharedItinerary(families) {
  const allIds = families.map(f => f.id);
  return [
    { id: '1', date: '', checkIn: '2026-11-05', checkOut: '2026-11-06', city: 'Casablanca', country: 'Morocco', activities: 'Welcome dinner, all families', lodging: '', address: '', families: allIds },
    { id: '2', date: '', checkIn: '2026-11-09', checkOut: '2026-11-12', city: 'Marrakech', country: 'Morocco', activities: 'Group souk walk + Jemaa el-Fna at dusk', lodging: '', address: '', families: allIds },
    { id: '3', date: '', checkIn: '2026-11-13', checkOut: '2026-11-15', city: 'Lisbon', country: 'Portugal', activities: 'Group dinner in Alfama', lodging: '', address: '', families: allIds },
  ];
}

function FamilyItineraryTab({ familyId }) {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const family = families.find(f => f.id === familyId);
  const days = useStoreKey(`itinerary-${familyId}`, []);
  const [editingId, setEditingId] = useState(null);

  const persist = (next) => updateKey(`itinerary-${familyId}`, next);

  const addDay = () => {
    const next = [...days, { id: Date.now().toString(), date: '', checkIn: '', checkOut: '', city: '', country: 'Morocco', activities: '', lodging: '', address: '' }];
    persist(next);
    setEditingId(next[next.length - 1].id);
  };

  const updateDay = (id, patch) => persist(days.map(d => d.id === id ? { ...d, ...patch } : d));
  const removeDay = (id) => persist(days.filter(d => d.id !== id));

  if (!family) return null;

  return (
    <div className="space-y-3">
      <SectionHeader title={`${family.label} Itinerary`} subtitle="Your family's full day-by-day. Add check-in / check-out for hotel stays." color={family.color} />

      {days.length === 0 && (
        <div className="card rounded-2xl p-8 text-center body-font text-sm" style={{ color: '#7A6B58' }}>
          No days yet.
        </div>
      )}

      {days.map((day, idx) => (
        <div key={day.id} className="card card-elevated rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="display-font text-3xl font-medium leading-none pt-1" style={{ color: family.color }}>
              {String(idx + 1).padStart(2, '0')}
            </div>
            <div className="flex-1 min-w-0">
              {editingId === day.id ? (
                <DayEditor day={day} updateDay={(p) => updateDay(day.id, p)} onDone={() => setEditingId(null)} onDelete={() => removeDay(day.id)} hideFamilies />
              ) : (
                <DayDisplay day={day} onClick={() => setEditingId(day.id)} hideFamilies />
              )}
            </div>
          </div>
        </div>
      ))}

      <button onClick={addDay} className="btn-ghost w-full py-3 rounded-xl body-font text-sm flex items-center justify-center gap-2">
        <Plus size={16} /> Add a day
      </button>
    </div>
  );
}

function DayEditor({ day, families, updateDay, toggleFamily, onDone, onDelete, hideFamilies }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="body-font text-[10px] uppercase tracking-wider" style={{ color: '#7A6B58' }}>Check-in</label>
          <input type="date" value={day.checkIn || ''} onChange={e => updateDay({ checkIn: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
        </div>
        <div>
          <label className="body-font text-[10px] uppercase tracking-wider" style={{ color: '#7A6B58' }}>Check-out</label>
          <input type="date" value={day.checkOut || ''} onChange={e => updateDay({ checkOut: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input type="text" placeholder="City" value={day.city || ''} onChange={e => updateDay({ city: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
        <select value={day.country || 'Morocco'} onChange={e => updateDay({ country: e.target.value })} className="px-3 py-2 rounded-lg text-sm">
          <option>Morocco</option>
          <option>Portugal</option>
          <option>Travel Day</option>
        </select>
      </div>
      <textarea placeholder="Activities" value={day.activities || ''} onChange={e => updateDay({ activities: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm resize-none" rows={2} />
      <input type="text" placeholder="Lodging name (e.g. Riad Yasmine)" value={day.lodging || ''} onChange={e => updateDay({ lodging: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
      <input type="text" placeholder="Full address (for map link)" value={day.address || ''} onChange={e => updateDay({ address: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
      {!hideFamilies && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="body-font text-xs uppercase tracking-wider" style={{ color: '#7A6B58' }}>Joining:</span>
          {families.map(f => (
            <button key={f.id} onClick={() => toggleFamily(f.id)} className="px-2 py-1 rounded-full body-font text-xs transition-all" style={{ background: day.families.includes(f.id) ? f.color : 'transparent', color: day.families.includes(f.id) ? '#FBF6EC' : f.color, border: `1px solid ${f.color}` }}>
              {f.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onDelete} className="px-3 py-1.5 rounded-lg body-font text-xs flex items-center gap-1" style={{ color: '#C8553D' }}>
          <Trash2 size={13} /> Delete
        </button>
        <button onClick={onDone} className="btn-primary px-3 py-1.5 rounded-lg body-font text-xs flex items-center gap-1">
          <Check size={13} /> Done
        </button>
      </div>
    </div>
  );
}

function DayDisplay({ day, families, onClick, hideFamilies }) {
  const dateLabel = day.checkIn && day.checkOut
    ? `${formatDate(day.checkIn)} – ${formatDate(day.checkOut)}`
    : day.checkIn
      ? formatDate(day.checkIn)
      : day.date || 'Date';

  return (
    <div onClick={onClick} className="cursor-pointer">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="body-font text-xs uppercase tracking-wider" style={{ color: '#7A6B58' }}>{dateLabel}</span>
        <span className="display-font text-2xl" style={{ color: '#1F3A3D' }}>{day.city || 'Add city'}</span>
        <span className="body-font text-xs px-2 py-0.5 rounded-full" style={{ background: '#1F3A3D15', color: '#1F3A3D' }}>{day.country}</span>
      </div>
      {day.activities && <p className="body-font text-sm mt-1.5" style={{ color: '#2A2018' }}>{day.activities}</p>}
      {day.lodging && (
        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          <p className="body-font text-xs flex items-center gap-1" style={{ color: '#5C4F3D' }}>
            <MapPin size={11} /> {day.lodging}
          </p>
          {day.address && (
            <button onClick={(e) => { e.stopPropagation(); openInMaps(day.address); }} className="map-link">
              <Navigation size={10} /> Open in Maps
            </button>
          )}
        </div>
      )}
      {!hideFamilies && families && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {families.filter(f => day.families.includes(f.id)).map(f => (
            <span key={f.id} className="px-2 py-0.5 rounded-full body-font text-xs" style={{ background: `${f.color}20`, color: f.color }}>{f.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ FLIGHTS ============
function FlightsTab({ familyId }) {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const family = families.find(f => f.id === familyId);
  const flights = useStoreKey(`flights-${familyId}`, []);
  const [form, setForm] = useState({ airline: '', flightNum: '', from: '', to: '', date: '', departTime: '', arriveTime: '', confirmation: '', notes: '' });
  const [showForm, setShowForm] = useState(false);

  const persist = (next) => updateKey(`flights-${familyId}`, next);

  const add = () => {
    if (!form.airline && !form.flightNum && !form.from) return;
    persist([...flights, { ...form, id: Date.now().toString() }]);
    setForm({ airline: '', flightNum: '', from: '', to: '', date: '', departTime: '', arriveTime: '', confirmation: '', notes: '' });
    setShowForm(false);
  };

  const remove = (id) => persist(flights.filter(f => f.id !== id));

  if (!family) return null;

  return (
    <div className="space-y-4">
      <SectionHeader title={`${family.label} Flights`} subtitle="Your family's flights and confirmations." color={family.color} />

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 rounded-xl body-font text-sm flex items-center justify-center gap-2">
          <Plus size={16} /> Add a flight
        </button>
      ) : (
        <div className="card card-elevated rounded-2xl p-5 space-y-2">
          <h3 className="display-font text-xl" style={{ color: '#1F3A3D' }}>New flight</h3>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Airline" value={form.airline} onChange={e => setForm({ ...form, airline: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
            <input type="text" placeholder="Flight number" value={form.flightNum} onChange={e => setForm({ ...form, flightNum: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="From (LAX)" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
            <input type="text" placeholder="To (CMN)" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="date" placeholder="Date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
            <input type="text" placeholder="Depart" value={form.departTime} onChange={e => setForm({ ...form, departTime: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
            <input type="text" placeholder="Arrive" value={form.arriveTime} onChange={e => setForm({ ...form, arriveTime: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
          </div>
          <input type="text" placeholder="Confirmation #" value={form.confirmation} onChange={e => setForm({ ...form, confirmation: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
          <textarea placeholder="Seats, baggage, notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm resize-none" rows={2} />
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg body-font text-xs" style={{ color: '#5C4F3D' }}>Cancel</button>
            <button onClick={add} className="btn-primary px-4 py-1.5 rounded-lg body-font text-xs">Add</button>
          </div>
        </div>
      )}

      {flights.length === 0 && !showForm && (
        <div className="card rounded-2xl p-8 text-center body-font text-sm" style={{ color: '#7A6B58' }}>No flights yet.</div>
      )}

      {flights.map(f => (
        <div key={f.id} className="card card-elevated rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-baseline gap-3 flex-wrap mb-2">
                <span className="display-font text-2xl" style={{ color: '#1F3A3D' }}>{f.from || '—'}</span>
                <Plane size={16} style={{ color: family.color }} />
                <span className="display-font text-2xl" style={{ color: '#1F3A3D' }}>{f.to || '—'}</span>
              </div>
              <div className="body-font text-sm" style={{ color: '#2A2018' }}>
                <strong>{f.airline}</strong> {f.flightNum && `· ${f.flightNum}`}
              </div>
              <div className="body-font text-xs mt-1" style={{ color: '#5C4F3D' }}>
                {f.date && <span>{formatDate(f.date) || f.date}</span>}
                {f.departTime && <span> · Depart {f.departTime}</span>}
                {f.arriveTime && <span> · Arrive {f.arriveTime}</span>}
              </div>
              {f.confirmation && <div className="body-font text-xs mt-1" style={{ color: '#5C4F3D' }}>Confirmation: <strong>{f.confirmation}</strong></div>}
              {f.notes && <div className="body-font text-xs mt-2 pt-2 border-t" style={{ color: '#2A2018', borderColor: '#E0D2BC' }}>{f.notes}</div>}
            </div>
            <button onClick={() => remove(f.id)} className="p-1.5 rounded-lg" style={{ color: '#C8553D' }}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ SHARED EXPENSES ============
function SharedExpensesTab() {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const expenses = useStoreKey('expenses-shared', []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', paidBy: families[0]?.id || '', splitAmong: families.map(f => f.id), date: '' });

  const persist = (next) => updateKey('expenses-shared', next);

  const addExpense = () => {
    if (!form.description || !form.amount || form.splitAmong.length === 0) return;
    persist([...expenses, { ...form, id: Date.now().toString(), amount: parseFloat(form.amount) }]);
    setForm({ description: '', amount: '', paidBy: families[0]?.id || '', splitAmong: families.map(f => f.id), date: '' });
    setShowForm(false);
  };

  const removeExpense = (id) => persist(expenses.filter(e => e.id !== id));
  const toggleSplit = (famId) => setForm(f => ({ ...f, splitAmong: f.splitAmong.includes(famId) ? f.splitAmong.filter(x => x !== famId) : [...f.splitAmong, famId] }));

  const balances = {};
  families.forEach(f => balances[f.id] = 0);

  expenses.forEach(exp => {
    const splitFamilies = families.filter(f => exp.splitAmong.includes(f.id));
    const totalPeople = splitFamilies.reduce((sum, f) => sum + f.size, 0);
    if (totalPeople === 0) return;
    const perPerson = exp.amount / totalPeople;
    if (balances[exp.paidBy] !== undefined) balances[exp.paidBy] += exp.amount;
    splitFamilies.forEach(f => { balances[f.id] -= perPerson * f.size; });
  });

  const settlements = calculateSettlements(balances);

  return (
    <div className="space-y-5">
      <SectionHeader title="Shared Expenses" subtitle="Costs split across multiple families. Pick who's in on each one." />

      <div className="card card-elevated rounded-2xl p-5">
        <h3 className="display-font text-xl mb-4" style={{ color: '#1F3A3D' }}>Where things stand</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {families.map(f => {
            const bal = balances[f.id] || 0;
            const isPositive = bal > 0.01, isNegative = bal < -0.01;
            return (
              <div key={f.id} className="p-4 rounded-xl" style={{ background: `${f.color}10`, border: `1px solid ${f.color}30` }}>
                <div className="body-font text-xs uppercase tracking-wider" style={{ color: f.color }}>{f.label}</div>
                <div className="display-font text-2xl mt-1" style={{ color: '#1F3A3D' }}>${Math.abs(bal).toFixed(2)}</div>
                <div className="body-font text-xs mt-0.5" style={{ color: '#5C4F3D' }}>{isPositive ? 'is owed' : isNegative ? 'owes' : 'settled up'}</div>
              </div>
            );
          })}
        </div>

        {settlements.length > 0 && (
          <div className="pt-4 border-t" style={{ borderColor: '#E0D2BC' }}>
            <div className="body-font text-xs uppercase tracking-wider mb-2" style={{ color: '#7A6B58' }}>To settle up</div>
            <div className="space-y-1.5">
              {settlements.map((s, i) => {
                const from = families.find(f => f.id === s.from);
                const to = families.find(f => f.id === s.to);
                if (!from || !to) return null;
                return (
                  <div key={i} className="body-font text-sm flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: from.color, color: '#FBF6EC' }}>{from.label}</span>
                    <span style={{ color: '#5C4F3D' }}>pays</span>
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: to.color, color: '#FBF6EC' }}>{to.label}</span>
                    <span className="display-font text-lg" style={{ color: '#1F3A3D' }}>${s.amount.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 rounded-xl body-font text-sm flex items-center justify-center gap-2">
          <Plus size={16} /> Log a shared expense
        </button>
      ) : (
        <div className="card card-elevated rounded-2xl p-5 space-y-3">
          <h3 className="display-font text-xl" style={{ color: '#1F3A3D' }}>New shared expense</h3>
          <input type="text" placeholder="What was it?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Amount (USD)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
          </div>
          <div>
            <div className="body-font text-xs uppercase tracking-wider mb-1.5" style={{ color: '#7A6B58' }}>Paid by</div>
            <div className="flex gap-2 flex-wrap">
              {families.map(f => (
                <button key={f.id} onClick={() => setForm({ ...form, paidBy: f.id })} className="px-3 py-1.5 rounded-full body-font text-xs transition-all" style={{ background: form.paidBy === f.id ? f.color : 'transparent', color: form.paidBy === f.id ? '#FBF6EC' : f.color, border: `1px solid ${f.color}` }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="body-font text-xs uppercase tracking-wider mb-1.5" style={{ color: '#7A6B58' }}>Split among (tap to add or remove)</div>
            <div className="flex gap-2 flex-wrap">
              {families.map(f => (
                <button key={f.id} onClick={() => toggleSplit(f.id)} className="px-3 py-1.5 rounded-full body-font text-xs transition-all" style={{ background: form.splitAmong.includes(f.id) ? f.color : 'transparent', color: form.splitAmong.includes(f.id) ? '#FBF6EC' : f.color, border: `1px solid ${f.color}` }}>
                  {f.label} ({f.size})
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg body-font text-xs" style={{ color: '#5C4F3D' }}>Cancel</button>
            <button onClick={addExpense} className="btn-primary px-4 py-1.5 rounded-lg body-font text-xs">Add</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {expenses.length === 0 && <div className="text-center py-12 body-font text-sm" style={{ color: '#7A6B58' }}>No shared expenses yet.</div>}
        {expenses.slice().reverse().map(exp => {
          const paidBy = families.find(f => f.id === exp.paidBy);
          const splitFams = families.filter(f => exp.splitAmong.includes(f.id));
          return (
            <div key={exp.id} className="card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="display-font text-lg leading-tight" style={{ color: '#1F3A3D' }}>{exp.description}</div>
                  <div className="body-font text-xs mt-1" style={{ color: '#5C4F3D' }}>
                    {exp.date && <span>{formatDate(exp.date) || exp.date} · </span>}
                    <span style={{ color: paidBy?.color || '#5C4F3D' }}>{paidBy?.label || 'Unknown'}</span> paid
                  </div>
                  <div className="flex gap-1 mt-1.5 flex-wrap items-center">
                    <span className="body-font text-[10px] uppercase tracking-wider" style={{ color: '#7A6B58' }}>Between:</span>
                    {splitFams.map(f => (
                      <span key={f.id} className="px-2 py-0.5 rounded-full body-font text-[10px]" style={{ background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}40` }}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="display-font text-xl whitespace-nowrap" style={{ color: '#1F3A3D' }}>${exp.amount.toFixed(2)}</div>
                <button onClick={() => removeExpense(exp.id)} className="p-1.5 rounded-lg" style={{ color: '#C8553D' }}><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function calculateSettlements(balances) {
  const creditors = [], debtors = [];
  Object.entries(balances).forEach(([id, bal]) => {
    if (bal > 0.01) creditors.push({ id, amount: bal });
    else if (bal < -0.01) debtors.push({ id, amount: -bal });
  });
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].amount, creditors[j].amount);
    if (amt > 0.01) settlements.push({ from: debtors[i].id, to: creditors[j].id, amount: amt });
    debtors[i].amount -= amt;
    creditors[j].amount -= amt;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }
  return settlements;
}

// ============ FAMILY EXPENSES ============
function FamilyExpensesTab({ familyId }) {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const family = families.find(f => f.id === familyId);
  const expenses = useStoreKey(`expenses-${familyId}`, []);
  const [form, setForm] = useState({ description: '', amount: '', category: 'Food', date: '' });
  const [showForm, setShowForm] = useState(false);

  const persist = (next) => updateKey(`expenses-${familyId}`, next);

  const add = () => {
    if (!form.description || !form.amount) return;
    persist([...expenses, { ...form, id: Date.now().toString(), amount: parseFloat(form.amount) }]);
    setForm({ description: '', amount: '', category: form.category, date: '' });
    setShowForm(false);
  };

  const remove = (id) => persist(expenses.filter(e => e.id !== id));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  if (!family) return null;

  return (
    <div className="space-y-5">
      <SectionHeader title={`${family.label} Expenses`} subtitle="Your family's private spending." color={family.color} />

      <div className="card card-elevated rounded-2xl p-5">
        <div className="body-font text-xs uppercase tracking-wider" style={{ color: family.color }}>Total spent</div>
        <div className="display-font text-4xl mt-1" style={{ color: '#1F3A3D' }}>${total.toFixed(2)}</div>
        {Object.keys(byCategory).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t" style={{ borderColor: '#E0D2BC' }}>
            {Object.entries(byCategory).map(([cat, amt]) => (
              <div key={cat}>
                <div className="body-font text-xs" style={{ color: '#7A6B58' }}>{cat}</div>
                <div className="display-font text-lg" style={{ color: '#1F3A3D' }}>${amt.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 rounded-xl body-font text-sm flex items-center justify-center gap-2">
          <Plus size={16} /> Log expense
        </button>
      ) : (
        <div className="card card-elevated rounded-2xl p-5 space-y-2">
          <input type="text" placeholder="What was it?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-3 py-2 rounded-lg text-sm">
              <option>Food</option><option>Lodging</option><option>Transport</option><option>Activities</option><option>Shopping</option><option>Other</option>
            </select>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg body-font text-xs" style={{ color: '#5C4F3D' }}>Cancel</button>
            <button onClick={add} className="btn-primary px-4 py-1.5 rounded-lg body-font text-xs">Add</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {expenses.length === 0 && !showForm && <div className="text-center py-12 body-font text-sm" style={{ color: '#7A6B58' }}>No expenses yet.</div>}
        {expenses.slice().reverse().map(exp => (
          <div key={exp.id} className="card rounded-xl p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="display-font text-lg leading-tight" style={{ color: '#1F3A3D' }}>{exp.description}</div>
              <div className="body-font text-xs mt-1" style={{ color: '#5C4F3D' }}>
                <span style={{ color: family.color }}>{exp.category}</span>
                {exp.date && <span> · {formatDate(exp.date) || exp.date}</span>}
              </div>
            </div>
            <div className="display-font text-xl whitespace-nowrap" style={{ color: '#1F3A3D' }}>${exp.amount.toFixed(2)}</div>
            <button onClick={() => remove(exp.id)} className="p-1.5 rounded-lg" style={{ color: '#C8553D' }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ MEETUPS ============
function MeetupsTab() {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const meetups = useStoreKey('meetups', []);
  const [form, setForm] = useState({ title: '', date: '', time: '', where: '', address: '', families: families.map(f => f.id), notes: '' });

  const persist = (next) => updateKey('meetups', next);

  const add = () => {
    if (!form.title) return;
    persist([...meetups, { ...form, id: Date.now().toString() }]);
    setForm({ title: '', date: '', time: '', where: '', address: '', families: families.map(f => f.id), notes: '' });
  };

  const remove = (id) => persist(meetups.filter(m => m.id !== id));
  const toggleFam = (famId) => setForm(f => ({ ...f, families: f.families.includes(famId) ? f.families.filter(x => x !== famId) : [...f.families, famId] }));

  return (
    <div className="space-y-5">
      <SectionHeader title="Meetups" subtitle="Group dinners, shared excursions, the moments where families overlap." />

      <div className="card card-elevated rounded-2xl p-5 space-y-2">
        <input type="text" placeholder="What's the meetup?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
          <input type="text" placeholder="Time (e.g. 7pm)" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
        </div>
        <input type="text" placeholder="Place name" value={form.where} onChange={e => setForm({ ...form, where: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
        <input type="text" placeholder="Full address (for map link)" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
        <textarea placeholder="Notes, reservation info..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm resize-none" rows={2} />
        <div>
          <div className="body-font text-xs uppercase tracking-wider mb-1.5" style={{ color: '#7A6B58' }}>Who's joining</div>
          <div className="flex gap-2 flex-wrap">
            {families.map(f => (
              <button key={f.id} onClick={() => toggleFam(f.id)} className="px-3 py-1.5 rounded-full body-font text-xs" style={{ background: form.families.includes(f.id) ? f.color : 'transparent', color: form.families.includes(f.id) ? '#FBF6EC' : f.color, border: `1px solid ${f.color}` }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <button onClick={add} className="btn-primary px-4 py-1.5 rounded-lg body-font text-xs flex items-center gap-1"><Plus size={13} /> Add meetup</button>
        </div>
      </div>

      <div className="space-y-2">
        {meetups.length === 0 && <div className="text-center py-12 body-font text-sm" style={{ color: '#7A6B58' }}>No meetups planned yet.</div>}
        {meetups.map(m => (
          <div key={m.id} className="card rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="display-font text-lg leading-tight" style={{ color: '#1F3A3D' }}>{m.title}</div>
                <div className="body-font text-xs mt-1 flex flex-wrap gap-x-3 items-center" style={{ color: '#5C4F3D' }}>
                  {m.date && <span>{formatDate(m.date) || m.date}</span>}
                  {m.time && <span>{m.time}</span>}
                  {m.where && <span className="flex items-center gap-1"><MapPin size={11} /> {m.where}</span>}
                  {m.address && (
                    <button onClick={() => openInMaps(m.address)} className="map-link">
                      <Navigation size={10} /> Open in Maps
                    </button>
                  )}
                </div>
                {m.notes && <p className="body-font text-sm mt-2" style={{ color: '#2A2018' }}>{m.notes}</p>}
                <div className="flex gap-1 mt-2.5 flex-wrap">
                  {families.filter(f => m.families.includes(f.id)).map(f => (
                    <span key={f.id} className="px-2 py-0.5 rounded-full body-font text-xs" style={{ background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}40` }}>{f.label}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => remove(m.id)} className="p-1.5 rounded-lg" style={{ color: '#C8553D' }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ WISHLIST ============
function WishlistTab() {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const items = useStoreKey('wishlist', []);
  const [newItem, setNewItem] = useState({ title: '', addedBy: families[0]?.id || '', location: '', notes: '' });

  const persist = (next) => updateKey('wishlist', next);

  const add = () => {
    if (!newItem.title) return;
    persist([...items, { ...newItem, id: Date.now().toString(), votes: [] }]);
    setNewItem({ title: '', addedBy: newItem.addedBy, location: '', notes: '' });
  };

  const toggleVote = (id, famId) => {
    persist(items.map(i => i.id === id ? { ...i, votes: i.votes.includes(famId) ? i.votes.filter(v => v !== famId) : [...i.votes, famId] } : i));
  };

  const remove = (id) => persist(items.filter(i => i.id !== id));

  return (
    <div className="space-y-5">
      <SectionHeader title="Wishlist" subtitle="Things to do, see, eat. Vote with the heart." />

      <div className="card card-elevated rounded-2xl p-5 space-y-2">
        <input type="text" placeholder="Add a place, activity, or restaurant..." value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} onKeyDown={e => e.key === 'Enter' && add()} className="w-full px-3 py-2 rounded-lg text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="Location (city or address)" value={newItem.location} onChange={e => setNewItem({ ...newItem, location: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
          <select value={newItem.addedBy} onChange={e => setNewItem({ ...newItem, addedBy: e.target.value })} className="px-3 py-2 rounded-lg text-sm">
            {families.map(f => <option key={f.id} value={f.id}>Added by {f.label}</option>)}
          </select>
        </div>
        <textarea placeholder="Notes, link, why it's interesting..." value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm resize-none" rows={2} />
        <div className="flex justify-end">
          <button onClick={add} className="btn-primary px-4 py-1.5 rounded-lg body-font text-xs flex items-center gap-1"><Plus size={13} /> Add</button>
        </div>
      </div>

      <div className="space-y-2">
        {items.length === 0 && <div className="text-center py-12 body-font text-sm" style={{ color: '#7A6B58' }}>Nothing on the wishlist yet.</div>}
        {items.slice().sort((a, b) => b.votes.length - a.votes.length).map(item => {
          const addedBy = families.find(f => f.id === item.addedBy);
          return (
            <div key={item.id} className="card rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="display-font text-lg leading-tight" style={{ color: '#1F3A3D' }}>{item.title}</div>
                  <div className="body-font text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: '#5C4F3D' }}>
                    {item.location && <span>{item.location}</span>}
                    {item.location && (
                      <button onClick={() => openInMaps(item.location)} className="map-link">
                        <Navigation size={10} /> Maps
                      </button>
                    )}
                    <span style={{ color: addedBy?.color }}>· added by {addedBy?.label || '—'}</span>
                  </div>
                  {item.notes && <p className="body-font text-sm mt-2" style={{ color: '#2A2018' }}>{item.notes}</p>}
                </div>
                <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg" style={{ color: '#C8553D' }}><Trash2 size={14} /></button>
              </div>
              <div className="flex gap-1.5 mt-3 pt-3 border-t flex-wrap" style={{ borderColor: '#E0D2BC' }}>
                {families.map(f => {
                  const voted = item.votes.includes(f.id);
                  return (
                    <button key={f.id} onClick={() => toggleVote(item.id, f.id)} className="flex items-center gap-1 px-2 py-1 rounded-full body-font text-xs transition-all" style={{ background: voted ? f.color : 'transparent', color: voted ? '#FBF6EC' : f.color, border: `1px solid ${f.color}` }}>
                      <Heart size={11} fill={voted ? '#FBF6EC' : 'none'} />
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ PHOTOS ============
function PhotosTab() {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const photos = useStoreKey('photos', []);
  const albums = useStoreKey('albums', []);
  const [form, setForm] = useState({ url: '', caption: '', addedBy: families[0]?.id || '', location: '' });
  const [albumForm, setAlbumForm] = useState({ name: '', url: '', addedBy: families[0]?.id || '' });
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const persistPhotos = (next) => updateKey('photos', next);
  const persistAlbums = (next) => updateKey('albums', next);

  const addPhoto = () => {
    if (!form.url) return;
    persistPhotos([{ ...form, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...photos]);
    setForm({ url: '', caption: '', addedBy: form.addedBy, location: '' });
  };

  const addAlbum = () => {
    if (!albumForm.url || !albumForm.name) return;
    persistAlbums([...albums, { ...albumForm, id: Date.now().toString() }]);
    setAlbumForm({ name: '', url: '', addedBy: albumForm.addedBy });
    setShowAlbumForm(false);
  };

  const removePhoto = (id) => persistPhotos(photos.filter(p => p.id !== id));
  const removeAlbum = (id) => persistAlbums(albums.filter(a => a.id !== id));

  return (
    <div className="space-y-5">
      <SectionHeader title="Photos" subtitle="Share photo links from iCloud, Google Photos, or anywhere. Originals stay safe in your photo app." />

      <button onClick={() => setShowInstructions(!showInstructions)} className="card rounded-2xl p-4 w-full text-left transition-all" style={{ background: showInstructions ? '#1F3A3D08' : '#FBF6EC', border: `1px solid ${showInstructions ? '#1F3A3D40' : '#E0D2BC'}` }}>
        <div className="flex items-center gap-2">
          <Info size={16} style={{ color: '#1F3A3D' }} />
          <span className="body-font text-sm font-medium" style={{ color: '#1F3A3D' }}>How to share photo links {showInstructions ? '(tap to hide)' : '(tap to expand)'}</span>
        </div>
      </button>

      {showInstructions && (
        <div className="card rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="display-font text-lg mb-2" style={{ color: '#C8553D' }}>iPhone — iCloud Shared Album (best for groups)</h4>
            <ol className="body-font text-sm space-y-1.5 list-decimal pl-5" style={{ color: '#2A2018' }}>
              <li>Open Photos app → Albums tab → tap the <strong>+</strong> in the top left</li>
              <li>Choose <strong>New Shared Album</strong>, name it (e.g., "Marrakech Day 3")</li>
              <li>Add photos to it, then tap the album → People icon → <strong>Public Website: ON</strong></li>
              <li>Copy the link that appears</li>
              <li>Paste it below as an album link</li>
            </ol>
          </div>

          <div className="pt-4 border-t" style={{ borderColor: '#E0D2BC' }}>
            <h4 className="display-font text-lg mb-2" style={{ color: '#2E5266' }}>Android / Google Photos</h4>
            <ol className="body-font text-sm space-y-1.5 list-decimal pl-5" style={{ color: '#2A2018' }}>
              <li>Open Google Photos → Library → Albums → <strong>Create album</strong></li>
              <li>Add your photos and name the album</li>
              <li>Tap the album → Share icon → <strong>Create link</strong></li>
              <li>Copy and paste the link below</li>
            </ol>
          </div>

          <div className="pt-4 border-t" style={{ borderColor: '#E0D2BC' }}>
            <h4 className="display-font text-lg mb-2" style={{ color: '#D4A24C' }}>Single photo (for the photo wall)</h4>
            <p className="body-font text-sm" style={{ color: '#2A2018' }}>
              You need a <strong>direct image URL</strong> ending in .jpg, .png, or .heic. The easiest source: post the photo to any image host (Imgur, your own website, a public Google Drive folder), then right-click and "Copy image address." Paste that into the photo wall below.
            </p>
            <p className="body-font text-xs mt-2 italic" style={{ color: '#5C4F3D' }}>
              Note: iCloud and Google Photos links don't work in the photo wall (they're album viewers, not direct image links). Use those as albums instead.
            </p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="display-font text-xl" style={{ color: '#1F3A3D' }}>Shared albums</h3>
          <button onClick={() => setShowAlbumForm(!showAlbumForm)} className="btn-ghost px-3 py-1.5 rounded-lg body-font text-xs flex items-center gap-1">
            <Plus size={12} /> Add album link
          </button>
        </div>

        {showAlbumForm && (
          <div className="card rounded-xl p-4 space-y-2 mb-3">
            <input type="text" placeholder="Album name" value={albumForm.name} onChange={e => setAlbumForm({ ...albumForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
            <input type="url" placeholder="Album URL" value={albumForm.url} onChange={e => setAlbumForm({ ...albumForm, url: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
            <div className="flex justify-between items-center">
              <select value={albumForm.addedBy} onChange={e => setAlbumForm({ ...albumForm, addedBy: e.target.value })} className="px-3 py-1.5 rounded-lg text-xs">
                {families.map(f => <option key={f.id} value={f.id}>Shared by {f.label}</option>)}
              </select>
              <button onClick={addAlbum} className="btn-primary px-3 py-1.5 rounded-lg body-font text-xs">Add album</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {albums.length === 0 && !showAlbumForm && (
            <div className="col-span-full body-font text-sm py-6 text-center" style={{ color: '#7A6B58' }}>No shared albums yet.</div>
          )}
          {albums.map(a => {
            const author = families.find(f => f.id === a.addedBy);
            return (
              <div key={a.id} className="card rounded-xl p-3 flex items-center justify-between gap-2">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${author?.color}20` }}>
                    <Camera size={16} style={{ color: author?.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="body-font text-sm font-medium truncate" style={{ color: '#1F3A3D' }}>{a.name}</div>
                    <div className="body-font text-xs" style={{ color: author?.color }}>{author?.label}</div>
                  </div>
                  <ExternalLink size={14} style={{ color: '#5C4F3D', flexShrink: 0 }} />
                </a>
                <button onClick={() => removeAlbum(a.id)} className="p-1 rounded-lg" style={{ color: '#C8553D' }}><Trash2 size={13} /></button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="display-font text-xl mb-2" style={{ color: '#1F3A3D' }}>Photo wall</h3>
        <div className="card card-elevated rounded-2xl p-4 space-y-2 mb-3">
          <input type="url" placeholder="Direct image URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
          <input type="text" placeholder="Caption" value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Where" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
            <select value={form.addedBy} onChange={e => setForm({ ...form, addedBy: e.target.value })} className="px-3 py-2 rounded-lg text-sm">
              {families.map(f => <option key={f.id} value={f.id}>By {f.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end">
            <button onClick={addPhoto} className="btn-primary px-4 py-1.5 rounded-lg body-font text-xs flex items-center gap-1"><Plus size={13} /> Post photo</button>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-12 body-font text-sm" style={{ color: '#7A6B58' }}>No photos yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map(p => {
              const author = families.find(f => f.id === p.addedBy);
              return (
                <div key={p.id} className="card rounded-xl overflow-hidden group relative">
                  <div className="aspect-square cursor-pointer overflow-hidden" onClick={() => setLightbox(p)} style={{ background: '#E0D2BC' }}>
                    <img src={p.url} alt={p.caption || 'photo'} className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = 'w-full h-full flex items-center justify-center body-font text-xs px-2 text-center';
                        fallback.style.color = '#7A6B58';
                        fallback.textContent = 'Image unavailable';
                        e.target.parentElement.appendChild(fallback);
                      }}
                    />
                  </div>
                  <div className="p-2.5">
                    {p.caption && <div className="body-font text-xs font-medium truncate" style={{ color: '#1F3A3D' }}>{p.caption}</div>}
                    <div className="body-font text-xs flex items-center justify-between mt-0.5">
                      <span style={{ color: author?.color }}>{author?.label}</span>
                      {p.location && <span style={{ color: '#5C4F3D' }} className="truncate ml-2">{p.location}</span>}
                    </div>
                  </div>
                  <button onClick={() => removePhoto(p.id)} className="absolute top-1.5 right-1.5 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: '#FBF6EC', color: '#C8553D' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(31, 58, 61, 0.92)' }} onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-2 rounded-full" style={{ background: '#FBF6EC', color: '#1F3A3D' }}>
            <X size={20} />
          </button>
          <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption} className="w-full max-h-[80vh] object-contain rounded-lg" />
            {(lightbox.caption || lightbox.location) && (
              <div className="text-center mt-3 body-font" style={{ color: '#F5EDE0' }}>
                {lightbox.caption && <div className="display-font text-xl">{lightbox.caption}</div>}
                {lightbox.location && <div className="text-sm mt-1 opacity-80">{lightbox.location}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SHARED PACKING ============
function SharedPackingTab() {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const items = useStoreKey('packing-shared', getDefaultSharedPacking());
  const [newItem, setNewItem] = useState({ name: '', category: 'Group gear' });

  const persist = (next) => updateKey('packing-shared', next);

  const add = () => {
    if (!newItem.name) return;
    persist([...items, { ...newItem, id: Date.now().toString(), assignedTo: '', packed: false }]);
    setNewItem({ name: '', category: newItem.category });
  };

  const update = (id, patch) => persist(items.map(i => i.id === id ? { ...i, ...patch } : i));
  const remove = (id) => persist(items.filter(i => i.id !== id));

  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="space-y-5">
      <SectionHeader title="Shared Packing" subtitle="Group gear and 'who's bringing what' so we don't end up with three first-aid kits." />

      <div className="card card-elevated rounded-2xl p-4 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="text" placeholder="Item" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} onKeyDown={e => e.key === 'Enter' && add()} className="px-3 py-2 rounded-lg text-sm" />
          <input type="text" placeholder="Category" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
        </div>
        <div className="flex justify-end">
          <button onClick={add} className="btn-primary px-3 py-1.5 rounded-lg body-font text-xs flex items-center gap-1"><Plus size={13} /> Add</button>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <h3 className="display-font text-xl mb-2" style={{ color: '#1F3A3D' }}>{cat}</h3>
          <div className="card rounded-xl overflow-hidden">
            {items.filter(i => i.category === cat).map((item, idx, arr) => {
              const assignedFam = families.find(f => f.id === item.assignedTo);
              return (
                <div key={item.id} className={`p-3 flex items-center gap-3 ${idx < arr.length - 1 ? 'border-b' : ''}`} style={{ borderColor: '#E0D2BC' }}>
                  <button onClick={() => update(item.id, { packed: !item.packed })} className="w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0" style={{ background: item.packed ? '#1F3A3D' : 'transparent', border: `1px solid #1F3A3D`, color: '#FBF6EC' }}>
                    {item.packed && <Check size={12} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="body-font text-sm" style={{ color: '#2A2018', textDecoration: item.packed ? 'line-through' : 'none', opacity: item.packed ? 0.6 : 1 }}>
                      {item.name}
                    </div>
                  </div>
                  <select value={item.assignedTo} onChange={e => update(item.id, { assignedTo: e.target.value })} className="px-2 py-1 rounded-lg text-xs" style={{ color: assignedFam?.color || '#5C4F3D' }}>
                    <option value="">Unassigned</option>
                    {families.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                  <button onClick={() => remove(item.id)} className="p-1 rounded-lg" style={{ color: '#C8553D' }}><X size={14} /></button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function getDefaultSharedPacking() {
  return [
    { id: 's1', name: 'First aid kit', category: 'Group gear', assignedTo: '', packed: false },
    { id: 's2', name: 'Universal adapter (extra)', category: 'Group gear', assignedTo: '', packed: false },
    { id: 's3', name: 'Snacks for group transit days', category: 'Food', assignedTo: '', packed: false },
  ];
}

// ============ FAMILY PACKING ============
function FamilyPackingTab({ familyId }) {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const family = families.find(f => f.id === familyId);
  const items = useStoreKey(`packing-${familyId}`, getDefaultFamilyPacking());
  const [newItem, setNewItem] = useState({ name: '', category: 'Clothing' });

  const persist = (next) => updateKey(`packing-${familyId}`, next);

  const add = () => {
    if (!newItem.name) return;
    persist([...items, { ...newItem, id: Date.now().toString(), packed: false }]);
    setNewItem({ name: '', category: newItem.category });
  };

  const update = (id, patch) => persist(items.map(i => i.id === id ? { ...i, ...patch } : i));
  const remove = (id) => persist(items.filter(i => i.id !== id));

  const categories = [...new Set(items.map(i => i.category))];
  const packedCount = items.filter(i => i.packed).length;

  if (!family) return null;

  return (
    <div className="space-y-5">
      <SectionHeader title={`${family.label} Packing`} subtitle={`${packedCount} of ${items.length} packed.`} color={family.color} />

      <div className="card card-elevated rounded-2xl p-4 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="text" placeholder="Item" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} onKeyDown={e => e.key === 'Enter' && add()} className="px-3 py-2 rounded-lg text-sm" />
          <input type="text" placeholder="Category" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="px-3 py-2 rounded-lg text-sm" />
        </div>
        <div className="flex justify-end">
          <button onClick={add} className="btn-primary px-3 py-1.5 rounded-lg body-font text-xs flex items-center gap-1"><Plus size={13} /> Add</button>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <h3 className="display-font text-xl mb-2" style={{ color: '#1F3A3D' }}>{cat}</h3>
          <div className="card rounded-xl overflow-hidden">
            {items.filter(i => i.category === cat).map((item, idx, arr) => (
              <div key={item.id} className={`p-3 flex items-center gap-3 ${idx < arr.length - 1 ? 'border-b' : ''}`} style={{ borderColor: '#E0D2BC' }}>
                <button onClick={() => update(item.id, { packed: !item.packed })} className="w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0" style={{ background: item.packed ? family.color : 'transparent', border: `1px solid ${family.color}`, color: '#FBF6EC' }}>
                  {item.packed && <Check size={12} />}
                </button>
                <div className="flex-1 min-w-0 body-font text-sm" style={{ color: '#2A2018', textDecoration: item.packed ? 'line-through' : 'none', opacity: item.packed ? 0.6 : 1 }}>
                  {item.name}
                </div>
                <button onClick={() => remove(item.id)} className="p-1 rounded-lg" style={{ color: '#C8553D' }}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function getDefaultFamilyPacking() {
  return [
    { id: 'fp1', name: 'Layers (warm days, cool nights)', category: 'Clothing', packed: false },
    { id: 'fp2', name: 'Light rain jacket', category: 'Clothing', packed: false },
    { id: 'fp3', name: 'Walking shoes', category: 'Clothing', packed: false },
    { id: 'fp4', name: 'Modest layers for medina/mosques', category: 'Clothing', packed: false },
    { id: 'fp5', name: 'Universal adapter', category: 'Tech', packed: false },
    { id: 'fp6', name: 'Portable battery', category: 'Tech', packed: false },
    { id: 'fp7', name: 'Passports + copies', category: 'Documents', packed: false },
    { id: 'fp8', name: 'Travel insurance info', category: 'Documents', packed: false },
  ];
}

// ============ NOTES ============
function NotesTab({ scope, familyId }) {
  const families = useStoreKey('families', DEFAULT_FAMILIES);
  const family = familyId ? families.find(f => f.id === familyId) : null;
  const storageKey = scope === 'family' ? `notes-${familyId}` : 'notes-shared';
  const notes = useStoreKey(storageKey, []);
  const [draft, setDraft] = useState({ title: '', body: '', author: families[0]?.id || '' });

  const persist = (next) => updateKey(storageKey, next);

  const add = () => {
    if (!draft.title && !draft.body) return;
    persist([{ ...draft, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...notes]);
    setDraft({ title: '', body: '', author: draft.author });
  };

  const remove = (id) => persist(notes.filter(n => n.id !== id));

  return (
    <div className="space-y-5">
      <SectionHeader
        title={family ? `${family.label} Notes` : 'Shared Notes'}
        subtitle={family ? "Your family's private notes." : 'Logistics, links, intel everyone should see.'}
        color={family?.color}
      />

      <div className="card card-elevated rounded-2xl p-5 space-y-2">
        <input type="text" placeholder="Title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" />
        <textarea placeholder="Write your note..." value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm resize-none" rows={4} />
        <div className="flex justify-between items-center">
          {scope === 'shared' ? (
            <select value={draft.author} onChange={e => setDraft({ ...draft, author: e.target.value })} className="px-3 py-1.5 rounded-lg text-xs">
              {families.map(f => <option key={f.id} value={f.id}>Posting as {f.label}</option>)}
            </select>
          ) : <div />}
          <button onClick={add} className="btn-primary px-4 py-1.5 rounded-lg body-font text-xs flex items-center gap-1"><Plus size={13} /> Post</button>
        </div>
      </div>

      <div className="space-y-2">
        {notes.length === 0 && <div className="text-center py-12 body-font text-sm" style={{ color: '#7A6B58' }}>No notes yet.</div>}
        {notes.map(n => {
          const author = families.find(f => f.id === n.author);
          return (
            <div key={n.id} className="card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {n.title && <div className="display-font text-lg leading-tight" style={{ color: '#1F3A3D' }}>{n.title}</div>}
                  <div className="body-font text-xs mt-0.5" style={{ color: author?.color || '#5C4F3D' }}>
                    {scope === 'shared' && author ? `${author.label} · ` : ''}{new Date(n.createdAt).toLocaleDateString()}
                  </div>
                  {n.body && <p className="body-font text-sm mt-2 whitespace-pre-wrap" style={{ color: '#2A2018' }}>{n.body}</p>}
                </div>
                <button onClick={() => remove(n.id)} className="p-1.5 rounded-lg" style={{ color: '#C8553D' }}><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, color }) {
  return (
    <div className="mb-2">
      <h2 className="display-font text-3xl" style={{ color: color || '#1F3A3D' }}>{title}</h2>
      {subtitle && <p className="body-font text-sm mt-1" style={{ color: '#5C4F3D' }}>{subtitle}</p>}
    </div>
  );
}
