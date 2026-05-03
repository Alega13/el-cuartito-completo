import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';

// ── Theme tokens (must match App.jsx) ─────────────────────────
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
  navBg:     'rgba(255,254,250,0.94)',
};

// ── Vinyl cover (mini, copied from App.jsx) ────────────────────
const PALETTES = [
  ['#1a1a2e','#e94560'],['#0f3460','#8338ec'],['#2d6a4f','#95d5b2'],
  ['#5c2d08','#d4a373'],['#3d1a78','#c77dff'],['#1d3557','#e63946'],
  ['#264653','#2a9d8f'],['#370617','#f48c06'],['#0d1b2a','#4cc9f0'],
];
function hashId(id) {
  let h = 0;
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return h;
}
function VinylCover({ record, size = 80, radius = 12 }) {
  if (record.cover_image) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0 }}>
        <img src={record.cover_image} alt={record.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

// ── Haptic feedback helper ─────────────────────────────────────
function vibrate(ms = 40) {
  try { navigator.vibrate?.(ms); } catch (_) {}
}

// ── Scan confirmation bottom sheet ────────────────────────────
function ScanConfirmSheet({ record, scanCount, onContinue, onCheckout, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const eff = record.is_rsd_discount ? Math.round(record.price * 0.9) : record.price;

  // Slide-in on mount
  useEffect(() => { const t = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(t); }, []);

  const slideStyle = {
    transform: visible ? 'translateY(0)' : 'translateY(110%)',
    transition: 'transform 0.36s cubic-bezier(0.32, 0.72, 0, 1)',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(4px)' : 'none',
        WebkitBackdropFilter: visible ? 'blur(4px)' : 'none',
        transition: 'background 0.3s, backdrop-filter 0.3s',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={onDismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...slideStyle,
          background: T.surface,
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.28)',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: T.border }} />
        </div>

        {/* Scan counter badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
            textTransform: 'uppercase', color: ORANGE,
            background: T.orangeBg, padding: '4px 12px', borderRadius: 99,
          }}>
            Disco #{scanCount} escaneado
          </span>
        </div>

        {/* Record info */}
        <div style={{ display: 'flex', gap: 16, padding: '14px 22px 18px', alignItems: 'center' }}>
          <VinylCover record={record} size={84} radius={14} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 20, fontWeight: 800, color: T.text,
              letterSpacing: -0.5, lineHeight: 1.2,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {record.album}
            </div>
            <div style={{ fontSize: 14, color: T.textSub, fontWeight: 600, marginTop: 5 }}>
              {record.artist}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {[record.condition, record.genre, record.storageLocation && `📍 ${record.storageLocation}`]
                .filter(Boolean)
                .map(tag => (
                  <span key={tag} style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px',
                    borderRadius: 7, background: T.surface2, color: T.textSub,
                  }}>{tag}</span>
                ))
              }
            </div>
          </div>
        </div>

        {/* Price row */}
        <div style={{
          margin: '0 20px 20px',
          padding: '14px 18px',
          background: T.bg, borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>Precio</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              {record.is_rsd_discount && (
                <span style={{ fontSize: 13, color: T.textMuted, textDecoration: 'line-through', fontFamily: 'DM Mono, monospace' }}>{record.price}</span>
              )}
              <span style={{ fontSize: 34, fontWeight: 800, color: ORANGE, fontFamily: 'DM Mono, monospace', letterSpacing: -1, lineHeight: 1 }}>{eff}</span>
              <span style={{ fontSize: 15, color: T.textMuted, fontWeight: 600 }}>DKK</span>
            </div>
          </div>
          {record.is_rsd_discount && (
            <span style={{ fontSize: 11, fontWeight: 800, background: ORANGE, color: '#fff', padding: '4px 10px', borderRadius: 8 }}>RSD −10%</span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, padding: '0 20px' }}>
          {/* Continue scanning — outlined */}
          <button
            onClick={onContinue}
            style={{
              flex: 1, padding: '15px 12px',
              borderRadius: 16,
              border: `1.5px solid ${T.border}`,
              background: T.surface,
              color: T.text,
              fontSize: 15, fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth={2.1} strokeLinecap="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
            <span style={{ fontSize: 13 }}>Seguir</span>
            <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>escaneando</span>
          </button>

          {/* Go to checkout — solid primary */}
          <button
            onClick={onCheckout}
            style={{
              flex: 2, padding: '15px 18px',
              borderRadius: 16,
              border: 'none',
              background: ORANGE,
              color: '#fff',
              fontSize: 16, fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(240,90,40,0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.1} strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            Ir al Carrito
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Not found bottom sheet ─────────────────────────────────────
function NotFoundSheet({ sku, onDismiss }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(t); }, []);
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
        transition: 'background 0.3s',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={onDismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.surface, borderRadius: '24px 24px 0 0',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.22)',
          padding: '14px 24px',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
          transform: visible ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.36s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: T.border }} />
        </div>
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 6 }}>Disco no encontrado</div>
          <div style={{ fontSize: 13, color: T.textSub, fontFamily: 'DM Mono, monospace', marginBottom: 20 }}>SKU: {sku}</div>
          <button
            onClick={onDismiss}
            style={{
              width: '100%', padding: '14px', borderRadius: 16, border: 'none',
              background: T.surface2, color: T.text,
              fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            }}
          >
            Volver a escanear
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main QR Scanner Screen ─────────────────────────────────────
export default function QRScannerScreen({ records, onAddToCart, onGoToCart, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null); // zxing decode controls
  const isActiveRef = useRef(true); // guards against stale callbacks after unmount

  const [scanCount, setScanCount] = useState(0);   // how many discs scanned this session
  const [scannedRecord, setScannedRecord] = useState(null); // confirmed record → show sheet
  const [unknownSku, setUnknownSku] = useState(null);       // sku not in catalogue
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [flash, setFlash] = useState(false); // brief white flash on scan

  // ── Start camera & decoder ───────────────────────────────────
  const startScanner = useCallback(async () => {
    if (!isActiveRef.current) return;
    try {
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };

      controlsRef.current = await reader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, err, controls) => {
          if (!isActiveRef.current) return;
          if (!result) return;

          const sku = result.getText().trim();

          // ── Flash + vibrate ────────────────────────────────
          vibrate(45);
          setFlash(true);
          setTimeout(() => setFlash(false), 180);

          // ── Pause decoding while sheet is open ────────────
          controls.stop();

          // ── Look up SKU in loaded catalogue ───────────────
          const found = records.find(r =>
            (r.sku || '').toUpperCase() === sku.toUpperCase()
          );

          if (found) {
            setScanCount(prev => prev + 1);
            setScannedRecord(found);
          } else {
            setUnknownSku(sku);
          }
        }
      );

      setCameraReady(true);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setPermissionDenied(true);
      } else {
        console.error('[QRScanner] camera error:', err);
      }
    }
  }, [records]);

  useEffect(() => {
    isActiveRef.current = true;
    startScanner();
    return () => {
      isActiveRef.current = false;
      controlsRef.current?.stop();
    };
  }, [startScanner]);

  // ── Resume scanning after sheet dismissal ───────────────────
  const resumeScanner = useCallback(async () => {
    setScannedRecord(null);
    setUnknownSku(null);
    // Re-create the decoder to resume (zxing controls can't restart once stopped)
    await startScanner();
  }, [startScanner]);

  // ── Handle "Seguir escaneando" ───────────────────────────────
  const handleContinue = useCallback(() => {
    if (scannedRecord) {
      onAddToCart(scannedRecord);
    }
    setScannedRecord(null);
    resumeScanner();
  }, [scannedRecord, onAddToCart, resumeScanner]);

  // ── Handle "Ir al Carrito" ───────────────────────────────────
  const handleCheckout = useCallback(() => {
    if (scannedRecord) {
      onAddToCart(scannedRecord);
    }
    setScannedRecord(null);
    controlsRef.current?.stop();
    onGoToCart();
  }, [scannedRecord, onAddToCart, onGoToCart]);

  // ── Viewfinder corner SVG ────────────────────────────────────
  const Corner = ({ style }) => (
    <svg width={28} height={28} viewBox="0 0 28 28" fill="none" style={style}>
      <path d="M2 14V2h12" stroke={ORANGE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // ── Permission denied state ──────────────────────────────────
  if (permissionDenied) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: '#000', color: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: '0 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48 }}>📷</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Cámara bloqueada</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
          Habilitá el acceso a la cámara en la configuración de tu navegador para poder escanear.
        </div>
        <button onClick={onClose} style={{
          marginTop: 8, padding: '14px 28px', borderRadius: 14,
          border: `1.5px solid rgba(255,255,255,0.25)`,
          background: 'transparent', color: '#fff',
          fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
        }}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#000', overflow: 'hidden' }}>

      {/* ── Live camera feed ── */}
      <video
        ref={videoRef}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: cameraReady ? 1 : 0,
          transition: 'opacity 0.4s',
        }}
        playsInline
        muted
      />

      {/* ── Loading state ── */}
      {!cameraReady && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: `3px solid rgba(255,255,255,0.15)`,
            borderTopColor: ORANGE,
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600 }}>
            Iniciando cámara…
          </div>
        </div>
      )}

      {/* ── Scan flash overlay ── */}
      {flash && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(255,255,255,0.35)',
          pointerEvents: 'none',
          animation: 'flashFade 180ms ease-out forwards',
        }} />
      )}

      {/* ── Dark overlay with cutout (top + bottom) ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.55) 100%)',
      }} />

      {/* ── Top bar: back + session counter ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingTop: 'max(52px, env(safe-area-inset-top, 52px))',
        paddingBottom: 16,
        paddingLeft: 20, paddingRight: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onClose} style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)',
          border: '0.5px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Scan counter pill */}
        <div style={{
          background: 'rgba(0,0,0,0.50)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '0.5px solid rgba(255,255,255,0.2)',
          borderRadius: 99, padding: '7px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>
            Escaneando disco {scanCount + 1}
          </span>
        </div>

        {/* Cart shortcut */}
        <button onClick={onGoToCart} style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)',
          border: '0.5px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
        </button>
      </div>

      {/* ── Viewfinder (centred square) ── */}
      {cameraReady && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -60%)',  // slightly above centre for thumb reach
          width: 220, height: 220,
        }}>
          {/* Four corners */}
          <Corner style={{ position: 'absolute', top: 0,    left: 0 }} />
          <Corner style={{ position: 'absolute', top: 0,    right: 0,  transform: 'scaleX(-1)' }} />
          <Corner style={{ position: 'absolute', bottom: 0, left: 0,   transform: 'scaleY(-1)' }} />
          <Corner style={{ position: 'absolute', bottom: 0, right: 0,  transform: 'scale(-1)' }} />

          {/* Scanning line animation */}
          <div style={{
            position: 'absolute', left: 8, right: 8, height: 2,
            background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)`,
            borderRadius: 99,
            animation: 'scanLine 2s ease-in-out infinite',
            boxShadow: `0 0 8px ${ORANGE}`,
          }} />
        </div>
      )}

      {/* ── Bottom hint ── */}
      {cameraReady && !scannedRecord && !unknownSku && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))',
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.50)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            borderRadius: 99, padding: '10px 20px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>
              Apuntá al código QR de la etiqueta
            </span>
          </div>
        </div>
      )}

      {/* ── Keyframe styles injected once ── */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 8px;   opacity: 0.9; }
          50%  { top: calc(100% - 10px); opacity: 1; }
          100% { top: 8px;   opacity: 0.9; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes flashFade {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>

      {/* ── Confirmation sheet (found) ── */}
      {scannedRecord && (
        <ScanConfirmSheet
          record={scannedRecord}
          scanCount={scanCount}
          onContinue={handleContinue}
          onCheckout={handleCheckout}
          onDismiss={resumeScanner}
        />
      )}

      {/* ── Not found sheet ── */}
      {unknownSku && (
        <NotFoundSheet sku={unknownSku} onDismiss={resumeScanner} />
      )}
    </div>
  );
}
