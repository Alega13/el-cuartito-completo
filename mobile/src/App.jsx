import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from './firebase';
import QRScannerScreen from './QRScannerScreen';

// ── Theme tokens (light) ───────────────────────────────────────
const ORANGE = '#F05A28';
const T = {
  bg:        'oklch(97.5% 0.011 58)',
  surface:   '#ffffff',
  surface2:  'oklch(95% 0.009 55)',
  border:    'rgba(0,0,0,0.07)',
  text:      'oklch(15% 0.02 265)',
  textSub:   'oklch(50% 0.012 265)',
  textMuted: 'oklch(68% 0.008 265)',
  orange:    ORANGE,
  orangeBg:  'oklch(95% 0.055 48)',
  inputBg:   'oklch(92.5% 0.008 55)',
  navBg:     'rgba(255,254,250,0.94)',
  shadowSm:  '0 2px 8px rgba(0,0,0,0.05)',
};

// ── Vinyl cover palette ────────────────────────────────────────
const PALETTES = [
  ['#1a1a2e','#e94560'],['#0f3460','#8338ec'],['#2d6a4f','#95d5b2'],
  ['#5c2d08','#d4a373'],['#3d1a78','#c77dff'],['#1d3557','#e63946'],
  ['#264653','#2a9d8f'],['#370617','#f48c06'],['#0d1b2a','#4cc9f0'],
  ['#1b1b2f','#ff6b6b'],['#1a1a35','#ff793f'],['#0a1628','#6ab04c'],
];

function hashId(id) {
  let h = 0;
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return h;
}

// ── VinylCover ─────────────────────────────────────────────────
function VinylCover({ record, size = 56, radius = 10 }) {
  if (record.cover_image) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0, background: T.surface2 }}>
        <img src={record.cover_image} alt={record.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
      </div>
    );
  }
  const [c1, c2] = PALETTES[hashId(record.id) % PALETTES.length];
  const cx = size / 2;
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0, position: 'relative', background: `linear-gradient(145deg,${c1},${c2})` }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        {[0.88, 0.65, 0.42].map((f, i) => (
          <circle key={i} cx={cx} cy={cx} r={size * f * 0.5} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={0.8} />
        ))}
        <circle cx={cx} cy={cx} r={size * 0.27} fill="rgba(0,0,0,0.58)" />
        <circle cx={cx} cy={cx} r={size * 0.06} fill={c2} opacity={0.9} />
      </svg>
    </div>
  );
}

// ── Chip ───────────────────────────────────────────────────────
function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
      background: active ? ORANGE : T.inputBg,
      color: active ? '#fff' : T.textSub,
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
      fontFamily: 'DM Sans, sans-serif',
    }}>{label}</button>
  );
}

// ── SectionLabel ───────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
      {children}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────
function Spinner({ size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.08)', borderTopColor: ORANGE, animation: 'spin 0.8s linear infinite' }} />
  );
}

// ── Toast ──────────────────────────────────────────────────────
function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', top: 60, left: 20, right: 20, zIndex: 200,
      background: 'rgba(20,16,30,0.84)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      color: '#fff', padding: '11px 16px', borderRadius: 14,
      fontSize: 14, fontWeight: 600, textAlign: 'center',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      border: '0.5px solid rgba(255,255,255,0.12)',
    }}>{message}</div>
  );
}

// ── SuccessOverlay ─────────────────────────────────────────────
function SuccessOverlay({ onDone }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 50);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => onDone(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 80,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: phase === 2 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.55)',
      backdropFilter: phase === 2 ? 'blur(0px)' : 'blur(8px)',
      WebkitBackdropFilter: phase === 2 ? 'blur(0px)' : 'blur(8px)',
      transition: 'background 0.4s, backdrop-filter 0.4s',
      gap: 20, pointerEvents: 'all',
    }}>
      <div style={{
        width: 120, height: 120, borderRadius: '50%',
        background: 'linear-gradient(145deg, #22c55e, #16a34a)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 0 16px rgba(34,197,94,0.15), 0 12px 48px rgba(34,197,94,0.45)',
        transform: phase === 0 ? 'scale(0.4)' : phase === 2 ? 'scale(0.6)' : 'scale(1)',
        opacity: phase === 0 ? 0 : phase === 2 ? 0 : 1,
        transition: phase === 0
          ? 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s'
          : 'transform 0.3s ease-in, opacity 0.3s ease-in',
      }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: phase >= 1 ? 'scale(1)' : 'scale(0)', transition: 'transform 0.2s 0.15s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: -0.5, opacity: phase === 1 ? 1 : 0, transition: 'opacity 0.3s 0.2s', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        Venta procesada
      </div>
      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 600, opacity: phase === 1 ? 1 : 0, transition: 'opacity 0.3s 0.3s' }}>
        El stock fue actualizado
      </div>
    </div>
  );
}

// ── BottomNav ──────────────────────────────────────────────────
function BottomNav({ activeTab, setActiveTab, cartCount }) {
  const tabs = [
    {
      id: 'home', label: 'Inicio',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>,
    },
    {
      id: 'search', label: 'Catálogo',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>,
    },
    {
      id: 'cart', label: 'Carrito',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>,
    },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      paddingTop: 8, paddingLeft: 4, paddingRight: 4,
      paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
      background: T.navBg,
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderTop: `0.5px solid ${T.border}`,
    }}>
      {tabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'none', border: 'none', cursor: 'pointer',
            color: active ? ORANGE : T.textMuted,
            position: 'relative', padding: '4px 24px',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {tab.id === 'cart' && cartCount > 0 && (
              <div style={{
                position: 'absolute', top: 0, right: 8,
                background: ORANGE, color: '#fff',
                fontSize: 9, fontWeight: 700, borderRadius: 999,
                minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px',
              }}>{cartCount}</div>
            )}
            <div style={{ opacity: active ? 1 : 0.65 }}>{tab.icon}</div>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: 0.3, lineHeight: 1 }}>{tab.label}</span>
            {active && (
              <div style={{ position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)', width: 18, height: 3, borderRadius: 99, background: ORANGE }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── HomeScreen ─────────────────────────────────────────────────
function HomeScreen({ recordCount, onNavigate, onOpenHistory, onOpenScanner }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden', paddingBottom: 80 }}>
      {/* Hero */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, oklch(95% 0.03 48) 0%, oklch(97.5% 0.011 58) 100%)',
      }}>
        {[360, 260, 180, 110, 60].map((r, i) => (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: r, height: r, borderRadius: '50%',
            border: '1px solid rgba(240,90,40,0.1)',
            pointerEvents: 'none',
          }} />
        ))}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(240,90,40,0.12)',
          border: '1px solid rgba(240,90,40,0.25)',
          marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: ORANGE }} />
        </div>
        <img src="/logo.png" alt="El Cuartito" style={{ height: 38, objectFit: 'contain' }} />
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: T.textSub, marginTop: 8 }}>
          Discos de Vinilo · Copenhague
        </p>
        {/* Stats card */}
        <div style={{
          display: 'flex', marginTop: 28,
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden',
        }}>
          {[[recordCount || '—', 'En catálogo'], ['CPH', 'Ciudad'], ['Vinilo', 'Formato']].map(([val, lbl], i) => (
            <div key={lbl} style={{
              padding: '14px 22px', textAlign: 'center',
              borderRight: i < 2 ? `0.5px solid ${T.border}` : 'none',
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1, fontFamily: 'DM Mono, monospace' }}>{val}</div>
              <div style={{ fontSize: 10, color: T.textSub, marginTop: 4, fontWeight: 600, letterSpacing: 0.3 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Action tiles */}
      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => onNavigate('search')} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          background: ORANGE, color: '#fff', border: 'none', borderRadius: 18,
          cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 6px 20px rgba(240,90,40,0.38)',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.1} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>Buscar Discos</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3, fontWeight: 500 }}>Catálogo completo · filtros · precios</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2.5} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>

        {/* ── QR Scanner FAB ── */}
        <button onClick={onOpenScanner} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          background: 'oklch(15% 0.02 265)', color: '#fff', border: 'none', borderRadius: 18,
          cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth={2.1} strokeLinecap="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>Escanear Disco</div>
            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 3, fontWeight: 500 }}>Lee el QR de la etiqueta para agregar</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2.5} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
        <button onClick={onOpenHistory} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: 18,
          cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif', boxShadow: T.shadowSm,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: T.orangeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth={2} strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>Historial de Ventas</div>
            <div style={{ fontSize: 12, color: T.textSub, marginTop: 3, fontWeight: 500 }}>Últimas 50 transacciones</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth={2.5} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  );
}

// ── SearchScreen ───────────────────────────────────────────────
function SearchScreen({ records, isLoading, onSelectRecord }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('newest');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isLoading]);

  const genres = useMemo(() => [...new Set(records.map(r => r.genre).filter(Boolean))].sort(), [records]);
  const locations = useMemo(() => [...new Set(records.map(r => r.storageLocation).filter(Boolean))].sort(), [records]);

  const filtered = useMemo(() => {
    let r = records;
    if (genre) r = r.filter(x => x.genre === genre);
    if (location) r = r.filter(x => x.storageLocation === location);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      r = r.filter(x =>
        (x.album || '').toLowerCase().includes(q) ||
        (x.artist || '').toLowerCase().includes(q) ||
        (x.sku || '').toLowerCase().includes(q) ||
        (x.label || x.sello || '').toLowerCase().includes(q)
      );
    }
    if (sort === 'price-asc')  return [...r].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === 'price-desc') return [...r].sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === 'alpha')      return [...r].sort((a, b) => (a.album || '').localeCompare(b.album || ''));
    return [...r].reverse();
  }, [searchQuery, genre, location, sort, records]);

  const getEff = r => r.is_rsd_discount ? Math.round(r.price * 0.9) : r.price;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden' }}>
      {/* Sticky header */}
      <div style={{ flexShrink: 0, background: T.navBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: `0.5px solid ${T.border}`, padding: '10px 16px 12px', paddingTop: 'max(10px, env(safe-area-inset-top, 10px))' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <img src="/logo.png" alt="El Cuartito" style={{ height: 22, objectFit: 'contain' }} />
        </div>
        {/* Search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.inputBg, borderRadius: 12, padding: '0 12px', height: 40 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth={2.3} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Artista, álbum, sello o SKU..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, fontWeight: 500, color: T.text, fontFamily: 'DM Sans, sans-serif' }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }} style={{ background: T.textMuted, border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round"><path d="M1 1l8 8M9 1L1 9" /></svg>
            </button>
          )}
        </div>
        {/* Genre chips */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto', paddingBottom: 2 }}>
          <Chip label="Todos" active={!genre} onClick={() => setGenre('')} />
          {genres.map(g => <Chip key={g} label={g} active={genre === g} onClick={() => setGenre(genre === g ? '' : g)} />)}
        </div>
        {/* Location + sort chips */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, marginTop: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {locations.map(l => <Chip key={l} label={`📍 ${l}`} active={location === l} onClick={() => setLocation(location === l ? '' : l)} />)}
          {locations.length > 0 && <div style={{ width: 0.5, background: T.border, flexShrink: 0, margin: '4px 2px' }} />}
          {[['newest', '↓ Recientes'], ['price-asc', 'Precio ↑'], ['price-desc', 'Precio ↓'], ['alpha', 'A–Z']].map(([v, l]) => (
            <Chip key={v} label={l} active={sort === v} onClick={() => setSort(v)} />
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.7 }}>
          {isLoading ? 'Cargando catálogo...' : `${filtered.length} discos`}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', gap: 8 }}>
            <div style={{ fontSize: 40, marginBottom: 4 }}>🔍</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>Sin resultados</div>
            <div style={{ fontSize: 14, color: T.textSub }}>Probá con otro término</div>
          </div>
        ) : filtered.map(record => {
          const eff = getEff(record);
          const out = record.stock <= 0;
          return (
            <div key={record.id} onClick={() => onSelectRecord(record)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
              borderBottom: `0.5px solid ${T.border}`,
              opacity: out ? 0.45 : 1, cursor: 'pointer',
              background: T.surface,
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <VinylCover record={record} size={52} radius={9} />
                <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: out ? '#ef4444' : '#22c55e', border: '2px solid white' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.album || 'Sin Título'}</div>
                <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{record.artist || 'Artista Desconocido'}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, fontFamily: 'DM Mono, monospace', marginTop: 2, letterSpacing: 0.5 }}>{record.sku || 'N/A'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {record.is_rsd_discount ? (
                  <>
                    <div style={{ fontSize: 10, color: T.textMuted, textDecoration: 'line-through', fontFamily: 'DM Mono, monospace' }}>{record.price} DKK</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: ORANGE, fontFamily: 'DM Mono, monospace' }}>{eff} DKK</div>
                    <div style={{ fontSize: 8, fontWeight: 800, color: '#fff', background: ORANGE, padding: '1px 5px', borderRadius: 4, marginTop: 1, display: 'inline-block', letterSpacing: 0.5 }}>RSD</div>
                  </>
                ) : (
                  <div style={{ fontSize: 15, fontWeight: 800, color: ORANGE, fontFamily: 'DM Mono, monospace' }}>{record.price || 0} DKK</div>
                )}
                <div style={{ fontSize: 10, color: out ? '#ef4444' : T.textMuted, fontWeight: 600, marginTop: 2 }}>
                  {out ? 'Agotado' : `Disp. ${record.stock}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DetailModal ────────────────────────────────────────────────
function DetailModal({ record, onClose, onAddToCart }) {
  const eff = record.is_rsd_discount ? Math.round(record.price * 0.9) : record.price;
  const out = record.stock <= 0;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: '24px 24px 0 0', boxShadow: '0 -12px 48px rgba(0,0,0,0.22)', paddingBottom: 'max(28px, env(safe-area-inset-bottom, 28px))' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: T.border }} />
        </div>
        {/* Cover + info */}
        <div style={{ display: 'flex', gap: 16, padding: '8px 20px 20px', alignItems: 'flex-start' }}>
          <VinylCover record={record} size={96} radius={14} />
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: T.text, letterSpacing: -0.5, lineHeight: 1.2 }}>{record.album}</div>
            <div style={{ fontSize: 14, color: T.textSub, fontWeight: 600, marginTop: 4 }}>{record.artist}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {[record.genre, record.label || record.sello, record.storageLocation && `📍 ${record.storageLocation}`].filter(Boolean).map(tag => (
                <span key={tag} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: T.surface2, color: T.textSub }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
        {/* Price / stock */}
        <div style={{ margin: '0 20px', padding: '16px 18px', background: T.bg, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <SectionLabel>Precio</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              {record.is_rsd_discount && <span style={{ fontSize: 14, color: T.textMuted, textDecoration: 'line-through', fontFamily: 'DM Mono, monospace' }}>{record.price}</span>}
              <span style={{ fontSize: 30, fontWeight: 800, color: ORANGE, fontFamily: 'DM Mono, monospace', letterSpacing: -1, lineHeight: 1 }}>{eff}</span>
              <span style={{ fontSize: 14, color: T.textMuted, fontWeight: 600 }}>DKK</span>
            </div>
            {record.is_rsd_discount && <div style={{ fontSize: 11, fontWeight: 700, color: ORANGE, marginTop: 4 }}>RSD −10%</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <SectionLabel>Stock</SectionLabel>
            <div style={{ fontSize: 28, fontWeight: 800, color: out ? '#ef4444' : T.text, fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>
              {out ? '0' : record.stock}
            </div>
          </div>
        </div>
        {/* SKU + location */}
        <div style={{ display: 'flex', gap: 10, margin: '12px 20px 20px' }}>
          {[['SKU', record.sku || 'N/A'], ['Ubicación', record.storageLocation || '—']].map(([lbl, val]) => (
            <div key={lbl} style={{ flex: 1, padding: '10px 14px', background: T.surface2, borderRadius: 12, border: `1px solid ${T.border}` }}>
              <SectionLabel>{lbl}</SectionLabel>
              <div style={{ fontSize: 14, color: T.text, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{val}</div>
            </div>
          ))}
        </div>
        {/* CTA */}
        <div style={{ padding: '0 20px' }}>
          <button
            onClick={() => { if (!out) { onAddToCart(record); onClose(); } }}
            disabled={out}
            style={{
              width: '100%', padding: '16px', borderRadius: 16, border: 'none',
              cursor: out ? 'not-allowed' : 'pointer',
              background: out ? T.surface2 : ORANGE,
              color: out ? T.textMuted : '#fff',
              fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
              boxShadow: out ? 'none' : '0 4px 16px rgba(240,90,40,0.38)',
            }}
          >
            {out ? 'Sin stock disponible' : '+ Agregar al carrito'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CartScreen ─────────────────────────────────────────────────
function CartScreen({ liveCart, onRemove, onCheckout }) {
  const getEff = i => i.is_rsd_discount ? Math.round(i.price * 0.9) : i.price;
  const total = liveCart.reduce((s, i) => s + getEff(i) * i.quantity, 0);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px 14px', paddingTop: 'max(12px, env(safe-area-inset-top, 12px))', borderBottom: `0.5px solid ${T.border}`, background: T.navBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <img src="/logo.png" alt="El Cuartito" style={{ height: 22, objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: T.textSub, letterSpacing: 0.4 }}>Tu Carrito</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 100 }}>
        {liveCart.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, opacity: 0.6, minHeight: 240 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth={1.2} strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>Carrito vacío</div>
            <div style={{ fontSize: 14, color: T.textSub }}>Buscá discos en el catálogo</div>
          </div>
        ) : (
          <>
            <div style={{ background: T.surface, borderRadius: 18, overflow: 'hidden', border: `1px solid ${T.border}` }}>
              {liveCart.map((item, i) => {
                const eff = getEff(item);
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < liveCart.length - 1 ? `0.5px solid ${T.border}` : 'none' }}>
                    <VinylCover record={item} size={44} radius={8} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.album}</div>
                      <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>{item.artist}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: ORANGE, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                        {eff} DKK <span style={{ color: T.textMuted, fontWeight: 500, fontSize: 12 }}>×{item.quantity}</span>
                        {item.is_rsd_discount && <span style={{ fontSize: 9, fontWeight: 800, background: ORANGE, color: '#fff', padding: '1px 4px', borderRadius: 4, marginLeft: 5 }}>RSD</span>}
                      </div>
                    </div>
                    <button onClick={() => onRemove(item.id)} style={{ background: T.surface2, border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={T.textMuted} strokeWidth={2.2} strokeLinecap="round"><path d="M1 1l8 8M9 1L1 9" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ background: T.surface, borderRadius: 18, padding: '18px 20px', border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Total</span>
                <div>
                  <span style={{ fontSize: 32, fontWeight: 800, color: T.text, fontFamily: 'DM Mono, monospace', letterSpacing: -1 }}>{total}</span>
                  <span style={{ fontSize: 14, color: T.textMuted, fontWeight: 600, marginLeft: 4 }}>DKK</span>
                </div>
              </div>
              <button onClick={onCheckout} style={{
                width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: ORANGE, color: '#fff', fontSize: 17, fontWeight: 700,
                fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 16px rgba(240,90,40,0.38)',
              }}>Cobrar →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── CheckoutModal ──────────────────────────────────────────────
function CheckoutModal({ liveCart, onClose, onConfirm, onSuccess }) {
  const [method, setMethod] = useState('MobilePay');
  const [channel, setChannel] = useState('tienda');
  const [rsd, setRsd] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);

  const getEff = i => i.is_rsd_discount ? Math.round(i.price * 0.9) : i.price;
  const subtotal = liveCart.reduce((s, i) => s + getEff(i) * i.quantity, 0);
  const totalItems = liveCart.reduce((s, i) => s + i.quantity, 0);
  const total = (rsd && totalItems >= 3) ? Math.round(subtotal * 0.95) : subtotal;

  const handleConfirm = async () => {
    setError(null);
    setIsProcessing(true);
    if (method === 'Tarjeta') {
      window.location.href = 'stripe://';
    }
    try {
      await onConfirm({ method, channel, rsdDiscount: rsd });
      setShowSuccess(true);
    } catch (err) {
      setError(err.message || 'Error al procesar venta');
    } finally {
      setIsProcessing(false);
    }
  };

  const METHODS = [
    { id: 'MobilePay', label: 'MobilePay', col: '#6b21b6', emoji: '📱' },
    { id: 'Tarjeta', label: 'Tarjeta', col: '#2563eb', emoji: '💳' },
    { id: 'Efectivo', label: 'Efectivo', col: '#16a34a', emoji: '💵' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={!isProcessing && !showSuccess ? onClose : undefined}>
      {showSuccess && <SuccessOverlay onDone={onSuccess} />}
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: '24px 24px 0 0', maxHeight: '94%', overflowY: 'auto', boxShadow: '0 -12px 48px rgba(0,0,0,0.22)', paddingBottom: 'max(28px, env(safe-area-inset-bottom, 28px))' }}>
        {/* Header: back button + drag handle */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px 8px', gap: 12 }}>
          <button
            onClick={!isProcessing && !showSuccess ? onClose : undefined}
            disabled={isProcessing || showSuccess}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: isProcessing ? 'default' : 'pointer',
              color: isProcessing ? T.textMuted : ORANGE,
              fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
              padding: 0, opacity: isProcessing ? 0.4 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Volver al carrito
          </button>
          {/* Centred drag handle */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: T.border }} />
          </div>
          {/* Spacer to balance the back button */}
          <div style={{ width: 90 }} />
        </div>
        {/* Total */}
        <div style={{ textAlign: 'center', padding: '12px 20px 20px', borderBottom: `0.5px solid ${T.border}` }}>
          <SectionLabel>Total a Cobrar</SectionLabel>
          {rsd && totalItems >= 3 && (
            <div style={{ fontSize: 14, color: T.textMuted, textDecoration: 'line-through', fontFamily: 'DM Mono, monospace' }}>{subtotal} DKK</div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 52, fontWeight: 800, color: T.text, fontFamily: 'DM Mono, monospace', letterSpacing: -2, lineHeight: 1 }}>{total}</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: T.textSub }}>DKK</span>
          </div>
          {rsd && totalItems >= 3 && <div style={{ fontSize: 12, color: ORANGE, fontWeight: 700, marginTop: 4 }}>−5% descuento RSD aplicado</div>}
        </div>

        <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Payment method */}
          <div>
            <SectionLabel>Método de Pago</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {METHODS.map(m => {
                const active = method === m.id;
                return (
                  <button key={m.id} onClick={() => setMethod(m.id)} style={{
                    padding: '13px 6px', borderRadius: 14,
                    border: `1.5px solid ${active ? m.col : T.border}`,
                    background: active ? `${m.col}15` : T.surface2,
                    color: active ? m.col : T.textSub,
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                    <span style={{ fontSize: 22 }}>{m.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MobilePay QR */}
          {method === 'MobilePay' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: 0.8 }}>Escanear con MobilePay</div>
              <div style={{ background: '#fff', borderRadius: 16, padding: 14, boxShadow: '0 4px 24px rgba(91,33,182,0.18)', border: '2px solid #ede9fe' }}>
                <img src="/mobilepay-qr.png" alt="MobilePay QR" style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 8 }} />
              </div>
              <div style={{ fontSize: 13, color: T.textSub, fontWeight: 600, textAlign: 'center' }}>
                El cliente escanea · <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, color: T.text }}>{total} DKK</span>
              </div>
            </div>
          )}

          {/* Stripe notice */}
          {method === 'Tarjeta' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>💳</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>Abre Stripe al confirmar</div>
                <div style={{ fontSize: 11, color: T.textSub, fontWeight: 500, marginTop: 2 }}>Se lanzará la app Stripe para procesar el cobro</div>
              </div>
            </div>
          )}

          {/* RSD toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, border: `1px solid ${totalItems >= 3 ? 'rgba(240,90,40,0.3)' : T.border}`, background: totalItems >= 3 ? T.orangeBg : T.surface2, opacity: totalItems >= 3 ? 1 : 0.5 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: totalItems >= 3 ? ORANGE : T.textSub }}>🎉 5% extra RSD</div>
              {totalItems < 3 && <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, marginTop: 2 }}>Mínimo 3 ítems en el carrito</div>}
            </div>
            <button disabled={totalItems < 3} onClick={() => totalItems >= 3 && setRsd(p => !p)} style={{
              width: 48, height: 28, borderRadius: 999, border: 'none',
              cursor: totalItems >= 3 ? 'pointer' : 'default',
              background: rsd && totalItems >= 3 ? ORANGE : 'rgba(0,0,0,0.15)',
              position: 'relative', padding: 0, flexShrink: 0,
            }}>
              <div style={{ position: 'absolute', top: 2, left: 2, width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transform: `translateX(${rsd && totalItems >= 3 ? 20 : 0}px)`, transition: 'transform 0.18s' }} />
            </button>
          </div>

          {/* Channel */}
          <div>
            <SectionLabel>Canal de Venta</SectionLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['tienda', 'Tienda'], ['feria', 'Feria'], ['discogs', 'Discogs']].map(([v, l]) => (
                <button key={v} onClick={() => setChannel(v)} style={{
                  flex: 1, padding: '10px 4px', borderRadius: 12,
                  border: `1.5px solid ${channel === v ? ORANGE : T.border}`,
                  background: channel === v ? T.orangeBg : T.surface2,
                  color: channel === v ? ORANGE : T.textSub,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 700,
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
              ❌ {error}
            </div>
          )}

          {/* Confirm */}
          <button onClick={handleConfirm} disabled={isProcessing} style={{
            width: '100%', padding: '16px', borderRadius: 16, border: 'none',
            cursor: isProcessing ? 'default' : 'pointer',
            background: 'oklch(15% 0.02 265)', color: '#fff',
            fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: isProcessing ? 0.7 : 1,
          }}>
            {isProcessing
              ? <><Spinner size={20} /> Procesando...</>
              : 'Confirmar y Pagar'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SalesHistoryScreen ─────────────────────────────────────────
function SalesHistoryScreen({ salesHistory, isLoadingSales, onClose, onRefresh }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: T.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 20px', paddingTop: 'max(14px, env(safe-area-inset-top, 14px))', borderBottom: `0.5px solid ${T.border}`, background: T.navBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: ORANGE, fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          Volver
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Historial de Ventas</div>
        <button onClick={onRefresh} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, fontSize: 20, lineHeight: 1 }}>↻</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoadingSales ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
            <Spinner />
            <div style={{ fontSize: 13, color: T.textSub }}>Cargando ventas...</div>
          </div>
        ) : salesHistory.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8, opacity: 0.6, minHeight: 240 }}>
            <div style={{ fontSize: 40 }}>📋</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>Sin ventas registradas</div>
          </div>
        ) : salesHistory.map(sale => {
          const total = sale.total_amount || sale.total || 0;
          const date = sale.date || (sale.timestamp?.toDate ? sale.timestamp.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha');
          const channelLabel = { tienda: 'Tienda', local: 'Local', feria: 'Feria', online: 'Online', discogs: 'Discogs' }[sale.channel] || sale.channel;
          return (
            <div key={sale.id} style={{ background: T.surface, borderRadius: 18, padding: '16px', border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500, marginBottom: 3 }}>{date}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: 'DM Mono, monospace', letterSpacing: -1, lineHeight: 1 }}>
                    {total} <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>DKK</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 8, background: '#dcfce7', color: '#16a34a', flexShrink: 0 }}>✓ Completada</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12, paddingBottom: 12, borderBottom: `0.5px solid ${T.border}` }}>
                {(sale.items || []).slice(0, 3).map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8 }}>{item.album || item.title || 'Artículo'}</span>
                    <span style={{ color: T.textSub, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{item.qty || item.quantity || 1}×{item.priceAtSale || item.unitPrice || 0}</span>
                  </div>
                ))}
                {(sale.items || []).length > 3 && <span style={{ fontSize: 11, color: T.textMuted }}>+{sale.items.length - 3} más</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[channelLabel, sale.paymentMethod || sale.payment_method].filter(Boolean).map(tag => (
                  <span key={tag} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: T.surface2, color: T.textSub }}>{tag}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────
function App() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSalesHistoryOpen, setIsSalesHistoryOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    const setup = async () => {
      try {
        await signInWithEmailAndPassword(auth, 'el.cuartito.cph@gmail.com', 'Rosario123');
        unsubscribe = onSnapshot(collection(db, 'products'), snap => {
          setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setIsLoading(false);
        }, () => setIsLoading(false));
      } catch {
        setIsLoading(false);
      }
    };
    setup();
    return () => unsubscribe();
  }, []);

  const liveCart = useMemo(() => cart.map(cartItem => {
    const record = records.find(r => r.id === cartItem.id);
    return { ...record, ...cartItem, price: record?.price ?? cartItem.price, is_rsd_discount: record?.is_rsd_discount ?? false };
  }), [cart, records]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  }, []);

  const addToCart = useCallback((record) => {
    if (record.stock <= 0) { showToast('❌ Sin stock disponible'); return; }
    setCart(prev => {
      const ex = prev.find(i => i.id === record.id);
      if (ex) {
        const live = records.find(r => r.id === record.id);
        if (ex.quantity >= (live?.stock || 0)) { showToast('❌ No hay más stock'); return prev; }
        showToast('Agregado al carrito ✓');
        return prev.map(i => i.id === record.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      showToast('Agregado al carrito ✓');
      return [...prev, { ...record, quantity: 1 }];
    });
  }, [records, showToast]);

  const fetchSalesHistory = useCallback(async () => {
    setIsLoadingSales(true);
    try {
      const snap = await getDocs(query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(50)));
      setSalesHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { /* silent */ }
    setIsLoadingSales(false);
  }, []);

  const openSalesHistory = () => {
    setIsSalesHistoryOpen(true);
    fetchSalesHistory();
  };

  const handleConfirm = async ({ method, channel, rsdDiscount }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No autenticado. Reiniciá la app.');
    const idToken = await currentUser.getIdToken();
    const getEff = i => i.is_rsd_discount ? Math.round(i.price * 0.9) : i.price;
    const subtotal = liveCart.reduce((s, i) => s + getEff(i) * i.quantity, 0);
    const totalItems = liveCart.reduce((s, i) => s + i.quantity, 0);
    const totalAmount = rsdDiscount && totalItems >= 3 ? Math.round(subtotal * 0.95) : subtotal;
    const items = liveCart.map(i => ({ productId: i.id, qty: i.quantity, priceAtSale: getEff(i), album: i.album || 'Venta App' }));
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ items, channel, totalAmount, paymentMethod: method, customerName: 'Venta Mostrador' }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al procesar venta');
  };

  const cartCount = liveCart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, fontFamily: 'DM Sans, sans-serif', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', background: T.bg, overflow: 'hidden' }}>
      <Toast message={toastMessage} />

      {activeTab === 'home' && (
        <HomeScreen
          recordCount={records.length}
          onNavigate={setActiveTab}
          onOpenHistory={openSalesHistory}
          onOpenScanner={() => setIsScannerOpen(true)}
        />
      )}
      {activeTab === 'search' && (
        <SearchScreen records={records} isLoading={isLoading} onSelectRecord={setSelectedRecord} />
      )}
      {activeTab === 'cart' && (
        <CartScreen liveCart={liveCart} onRemove={id => setCart(p => p.filter(i => i.id !== id))} onCheckout={() => setIsCheckoutOpen(true)} />
      )}

      {selectedRecord && (
        <DetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onAddToCart={record => { addToCart(record); setActiveTab('cart'); setSelectedRecord(null); }}
        />
      )}
      {isCheckoutOpen && (
        <CheckoutModal
          liveCart={liveCart}
          onClose={() => setIsCheckoutOpen(false)}
          onConfirm={handleConfirm}
          onSuccess={() => {
            setCart([]);
            setIsCheckoutOpen(false);
            showToast('Venta procesada ✓');
          }}
        />
      )}
      {isSalesHistoryOpen && (
        <SalesHistoryScreen
          salesHistory={salesHistory}
          isLoadingSales={isLoadingSales}
          onClose={() => setIsSalesHistoryOpen(false)}
          onRefresh={fetchSalesHistory}
        />
      )}

      {isScannerOpen && (
        <QRScannerScreen
          records={records}
          onAddToCart={addToCart}
          onGoToCart={() => {
            setIsScannerOpen(false);
            setActiveTab('cart');
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} cartCount={cartCount} />
    </div>
  );
}

export default App;
