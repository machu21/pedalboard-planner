'use client';

import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { usePedalStore, PIXELS_PER_INCH } from '@/store/usePedalStore';
import DraggablePedal from '@/components/DraggablePedal';
import { PedalData, BoardData } from '@/types/pedal';
import { useVirtualizer } from '@tanstack/react-virtual';
import { fetchRealPedalPrice } from './actions/getPrice';

interface PedalPlannerClientProps {
    initialPedalDatabase: PedalData[];
    initialBoardDatabase: BoardData[];
}

const GITHUB_RAW_BASE =
    'https://raw.githubusercontent.com/PedalPlayground/PedalPlayground.github.io/master/public/';

// ── DESIGN TOKENS (all hardcoded, no CSS vars needed) ──
const T = {
    bg:         '#f9f6f0',
    surface:    '#ffffff',
    surfaceHi:  '#f0eadd',
    border:     '#e5d5c5',
    borderHi:   '#d0bba5',
    muted:      '#a0856d',
    textDim:    '#6d5340',
    text:       '#3d2c1d',
    textHi:     '#1a1008',
    amber:      '#d97706',
    amberBrt:   '#b45309',
    amberGlow:  '#f59e0b',
    woodDark:   '#f4ede4',
    woodGrain:  '#e6d8c8',
};

// ── SVG WOOD GRAIN (rendered inline, never missing) ──
function WoodGrainBg() {
    return (
        <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
        >
            <defs>
                <filter id="grain">
                    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                    <feColorMatrix type="saturate" values="0" />
                    <feBlend in="SourceGraphic" mode="multiply" />
                </filter>
                <linearGradient id="woodBase" x1="0" y1="0" x2="1" y2="0.15">
                    <stop offset="0%"   stopColor="#f2e8de" />
                    <stop offset="18%"  stopColor="#e8d9c8" />
                    <stop offset="35%"  stopColor="#dfcbb5" />
                    <stop offset="52%"  stopColor="#d6bea4" />
                    <stop offset="68%"  stopColor="#e8d9c8" />
                    <stop offset="82%"  stopColor="#dfcbb5" />
                    <stop offset="100%" stopColor="#d6bea4" />
                </linearGradient>
                {/* Grain lines */}
                <pattern id="grainLines" x="0" y="0" width="4" height="200" patternUnits="userSpaceOnUse">
                    <line x1="1" y1="0" x2="1.5" y2="200" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
                    <line x1="3" y1="0" x2="2.8" y2="200" stroke="rgba(0,0,0,0.02)" strokeWidth="0.3" />
                </pattern>
                <pattern id="grainWide" x="0" y="0" width="22" height="200" patternUnits="userSpaceOnUse">
                    <line x1="8" y1="0" x2="9" y2="200" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
                    <line x1="18" y1="0" x2="17.5" y2="200" stroke="rgba(0,0,0,0.03)" strokeWidth="0.8" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#woodBase)" />
            <rect width="100%" height="100%" fill="url(#grainLines)" />
            <rect width="100%" height="100%" fill="url(#grainWide)" />
            {/* Vignette */}
            <radialGradient id="vignette" cx="50%" cy="45%" r="65%" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="transparent" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
            </radialGradient>
            <rect width="100%" height="100%" fill="url(#vignette)" />
            {/* Ambient amber glow from center-top */}
            <radialGradient id="spotlight" cx="50%" cy="0%" r="80%" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.4)" />
                <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <rect width="100%" height="100%" fill="url(#spotlight)" />
        </svg>
    );
}

export default function PedalPlannerClient({
    initialPedalDatabase,
    initialBoardDatabase,
}: PedalPlannerClientProps) {
    const { activeBoard, movePedal, addPedal, selectedBoard, setBoard } = usePedalStore();
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState('');
    const [boardImageFailed, setBoardImageFailed] = useState(false);
    const [zoom, setZoom] = useState(1);

    useEffect(() => setMounted(true), []);
    useEffect(() => setBoardImageFailed(false), [selectedBoard]);

    const handleAddPedal = async (pedal: PedalData) => {
        const realPricePHP = await fetchRealPedalPrice(pedal.brand, pedal.name);
        const pedalWithRealPrice = {
            ...pedal,
            pricePHP: realPricePHP > 0 ? realPricePHP : pedal.pricePHP,
            isRealPrice: realPricePHP > 0,
        };
        addPedal(pedalWithRealPrice, 20, 20);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        if (!active) return;
        const p = activeBoard.find((p) => p.instanceId === active.id);
        if (p) movePedal(active.id as string, p.x + delta.x / zoom, p.y + delta.y / zoom);
    };

    const filteredPedals = useMemo(() => {
        if (!search.trim()) return initialPedalDatabase;
        const q = search.toLowerCase();
        return initialPedalDatabase.filter(
            (p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
        );
    }, [search, initialPedalDatabase]);

    const allPedals = useMemo(() => {
        const grouped = filteredPedals.reduce((acc, pedal) => {
            if (!acc[pedal.brand]) acc[pedal.brand] = [];
            acc[pedal.brand].push(pedal);
            return acc;
        }, {} as Record<string, PedalData[]>);
        return Object.entries(grouped).flatMap(([brand, pedals]) => [
            { type: 'header' as const, brand },
            ...pedals.map((p) => ({ type: 'pedal' as const, ...p })),
        ]);
    }, [filteredPedals]);

    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: allPedals.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 36,
        overscan: 10,
    });

    if (!mounted) return null;

    const boardW = selectedBoard ? selectedBoard.width * PIXELS_PER_INCH : 600;
    const boardH = selectedBoard ? selectedBoard.height * PIXELS_PER_INCH : 340;
    const safeBoardImage = selectedBoard?.image.startsWith('images/')
        ? selectedBoard.image
        : `images/pedalboards/${selectedBoard?.image}`;

    const totalPHP = activeBoard.reduce((s, p) => s + (p.pricePHP || 0), 0);
    const fmtPHP = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);

    return (
        <div style={{
            display: 'flex', height: '100vh', overflow: 'hidden',
            background: T.bg, color: T.text,
            fontFamily: "'DM Sans', sans-serif",
        }}>

            {/* ══════════════════════════════════════
                SIDEBAR
            ══════════════════════════════════════ */}
            <aside style={{
                width: 232, display: 'flex', flexDirection: 'column',
                background: T.surface, borderRight: `1px solid ${T.border}`,
                flexShrink: 0, overflow: 'hidden',
            }}>

                {/* Logo */}
                <div style={{
                    padding: '18px 16px 14px',
                    borderBottom: `1px solid ${T.border}`,
                    background: `linear-gradient(180deg, ${T.woodDark} 0%, ${T.surface} 100%)`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                            <div style={{
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: 22, letterSpacing: '0.12em',
                                color: T.amberBrt, lineHeight: 1,
                            }}>
                                BUDOL
                            </div>
                            <div style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 9, letterSpacing: '0.22em',
                                color: T.muted, textTransform: 'uppercase', marginTop: 1,
                            }}>
                                PEDAL PLANNER
                            </div>
                        </div>
                        {activeBoard.length > 0 && (
                            <div style={{
                                background: T.woodGrain,
                                border: `1px solid ${T.borderHi}`,
                                borderRadius: 20, padding: '2px 9px',
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 10, color: T.amberGlow,
                            }}>
                                {activeBoard.length}
                            </div>
                        )}
                    </div>

                    {/* Board selector */}
                    <select
                        value={selectedBoard?.name || ''}
                        onChange={(e) => {
                            const board = initialBoardDatabase.find((b) => b.name === e.target.value);
                            if (board) setBoard(board);
                        }}
                        style={{
                            width: '100%', background: T.woodDark,
                            border: `1px solid ${T.border}`,
                            borderRadius: 6, padding: '7px 10px',
                            color: T.text, fontSize: 11,
                            fontFamily: "'DM Sans', sans-serif",
                            outline: 'none', appearance: 'none',
                            cursor: 'pointer', marginBottom: 10,
                        }}
                    >
                        <option value="">Choose a board…</option>
                        {initialBoardDatabase.map((b) => (
                            <option key={`${b.brand}-${b.name}`} value={b.name}>
                                {b.brand} {b.name}
                            </option>
                        ))}
                    </select>

                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none' }}
                            width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search pedals…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%', background: T.woodDark,
                                border: `1px solid ${T.border}`,
                                borderRadius: 6, padding: '7px 10px 7px 28px',
                                color: T.text, fontSize: 11,
                                fontFamily: "'DM Sans', sans-serif",
                                outline: 'none',
                            }}
                        />
                    </div>
                </div>

                {/* Pedal list */}
                <div ref={parentRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                        {virtualizer.getVirtualItems().map((vi) => {
                            const item = allPedals[vi.index];
                            return (
                                <div key={vi.key} style={{ position: 'absolute', top: vi.start, left: 0, right: 0, height: vi.size }}>
                                    {item.type === 'header' ? (
                                        <div style={{ padding: '8px 14px 4px' }}>
                                            <span style={{
                                                fontFamily: "'DM Mono', monospace",
                                                fontSize: 8, fontWeight: 500,
                                                letterSpacing: '0.2em', textTransform: 'uppercase',
                                                color: T.muted,
                                            }}>
                                                {item.brand}
                                            </span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleAddPedal(item as PedalData)}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center',
                                                padding: '6px 14px', background: 'transparent',
                                                border: 'none', cursor: 'pointer', textAlign: 'left',
                                                color: T.text, fontSize: 12,
                                                fontFamily: "'DM Sans', sans-serif",
                                                transition: 'background 0.12s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,131,26,0.12)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.name}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </aside>

            {/* ══════════════════════════════════════
                MAIN
            ══════════════════════════════════════ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

                {/* Topbar */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 20px', height: 52, flexShrink: 0,
                    background: `linear-gradient(180deg, ${T.woodDark} 0%, ${T.surface} 100%)`,
                    borderBottom: `1px solid ${T.border}`,
                }}>
                    {/* Left: board name */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                        {selectedBoard ? (
                            <>
                                <span style={{
                                    fontFamily: "'Bebas Neue', sans-serif",
                                    fontSize: 17, letterSpacing: '0.1em', color: T.amberBrt,
                                }}>
                                    {selectedBoard.brand} {selectedBoard.name}
                                </span>
                                <span style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: 10, color: T.textDim,
                                }}>
                                    {selectedBoard.width}" × {selectedBoard.height}"
                                </span>
                            </>
                        ) : (
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.muted }}>
                                SELECT A BOARD TO BEGIN
                            </span>
                        )}
                    </div>

                    {/* Right: controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

                        {/* Est. Value */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 8, letterSpacing: '0.18em',
                                color: T.muted, textTransform: 'uppercase',
                            }}>
                                Est. Value{activeBoard.some(p => p.isRealPrice) ? ' ✦' : ''}
                            </span>
                            <span style={{
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: 20, letterSpacing: '0.06em', color: T.amberGlow,
                                lineHeight: 1,
                            }}>
                                {fmtPHP(totalPHP)}
                            </span>
                        </div>

                        {/* Divider */}
                        <div style={{ width: 1, height: 28, background: T.border }} />

                        {/* Zoom */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 2,
                            background: T.woodDark, border: `1px solid ${T.border}`,
                            borderRadius: 6, padding: '3px 4px',
                        }}>
                            {[
                                { label: '−', fn: () => setZoom(z => Math.max(0.2, +(z - 0.1).toFixed(1))) },
                                { label: '+', fn: () => setZoom(z => Math.min(2.5, +(z + 0.1).toFixed(1))) },
                            ].map(({ label, fn }, i) => (
                            <Fragment key={label}>
                                    {i === 1 && (
                                    <span style={{
                                            fontFamily: "'DM Mono', monospace",
                                            fontSize: 10, color: T.text,
                                            width: 38, textAlign: 'center',
                                        }}>
                                            {Math.round(zoom * 100)}%
                                        </span>
                                    )}
                                    <button
                                        onClick={fn}
                                        style={{
                                            width: 22, height: 22, display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            background: 'transparent', border: 'none',
                                            borderRadius: 4, cursor: 'pointer',
                                            color: T.textDim, fontSize: 16, lineHeight: 1,
                                            transition: 'all 0.1s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = T.woodGrain; e.currentTarget.style.color = T.amberGlow; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textDim; }}
                                    >
                                        {label}
                                    </button>
                            </Fragment>
                            ))}
                        </div>

                        {/* Pedal count pill */}
                        <span style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 10, color: T.textDim,
                        }}>
                            {activeBoard.length} pedal{activeBoard.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Canvas */}
                <div style={{
                    flex: 1, overflow: 'auto', padding: 40,
                    display: 'flex', position: 'relative',
                }}>
                    {/* Wood grain fills the entire canvas area */}
                    <WoodGrainBg />

                    <DndContext onDragEnd={handleDragEnd}>
                        <div style={{
                            margin: 'auto', position: 'relative', zIndex: 1,
                            width: boardW * zoom, height: boardH * zoom,
                            transition: 'width 0.2s, height 0.2s',
                        }}>
                            <div style={{
                                position: 'relative', borderRadius: 12,
                                width: boardW, height: boardH,
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top left',
                                border: `2px solid ${T.borderHi}`,
                                boxShadow: `0 0 0 1px ${T.woodDark}, 0 8px 40px rgba(0,0,0,0.15), 0 0 60px rgba(200,131,26,0.04)`,
                                background: '#fcfaf8',
                            }}>
                                {/* Inner dot grid */}
                                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.4 }}>
                                    <defs>
                                        <pattern id="boarddots" width="20" height="20" patternUnits="userSpaceOnUse">
                                            <circle cx="1" cy="1" r="0.8" fill="rgba(0,0,0,0.1)" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#boarddots)" />
                                </svg>

                                {/* Board image */}
                                {selectedBoard && !boardImageFailed && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={`${GITHUB_RAW_BASE}${safeBoardImage}`}
                                        alt="Pedalboard"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none', opacity: 0.85 }}
                                        onError={() => setBoardImageFailed(true)}
                                    />
                                )}

                                {/* Empty state */}
                                {activeBoard.length === 0 && (
                                    <div style={{
                                        position: 'absolute', inset: 0, display: 'flex',
                                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        gap: 6, pointerEvents: 'none', userSelect: 'none',
                                    }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1">
                                            <rect x="3" y="8" width="18" height="13" rx="2" />
                                            <path d="M8 8V6a4 4 0 0 1 8 0v2" />
                                        </svg>
                                        <p style={{ fontFamily: "'Bebas Neue'", fontSize: 14, letterSpacing: '0.15em', color: T.muted }}>
                                            BOARD IS EMPTY
                                        </p>
                                        <p style={{ fontFamily: "'DM Mono'", fontSize: 10, color: T.textDim }}>
                                            click a pedal in the sidebar
                                        </p>
                                    </div>
                                )}

                                {activeBoard.map((pedal) => (
                                    <DraggablePedal key={pedal.instanceId} pedal={pedal} />
                                ))}
                            </div>
                        </div>
                    </DndContext>
                </div>
            </div>

            {/* ══════════════════════════════════════
                ORDER LIST PANEL
            ══════════════════════════════════════ */}
            {activeBoard.length > 0 && (
                <aside style={{
                    width: 210, display: 'flex', flexDirection: 'column',
                    background: T.surface, borderLeft: `1px solid ${T.border}`,
                    flexShrink: 0, overflow: 'hidden',
                }}>
                    {/* Panel header */}
                    <div style={{
                        padding: '14px 16px 12px',
                        borderBottom: `1px solid ${T.border}`,
                        background: `linear-gradient(180deg, ${T.woodDark} 0%, ${T.surface} 100%)`,
                    }}>
                        <div style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: 16, letterSpacing: '0.12em', color: T.amberBrt,
                        }}>
                            LAZADA SEARCH
                        </div>
                        <div style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 9, color: T.muted, marginTop: 2, letterSpacing: '0.08em',
                        }}>
                            click to search on lazada.ph
                        </div>
                    </div>

                    {/* List */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {activeBoard.map((pedal) => {
                            const q = encodeURIComponent(`${pedal.brand} ${pedal.name} guitar pedal`);
                            return (
                                <a
                                    key={pedal.instanceId}
                                    href={`https://www.lazada.com.ph/catalog/?q=${q}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        gap: 8, padding: '10px 14px',
                                        borderBottom: `1px solid ${T.border}`,
                                        textDecoration: 'none', transition: 'background 0.12s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,131,26,0.1)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{
                                            fontSize: 11, fontWeight: 600, color: T.textHi,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            fontFamily: "'DM Sans', sans-serif",
                                        }}>
                                            {pedal.name}
                                        </div>
                                        <div style={{
                                            fontSize: 10, color: T.textDim, marginTop: 1,
                                            fontFamily: "'DM Mono', monospace",
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {pedal.brand}
                                        </div>
                                        {pedal.pricePHP > 0 && (
                                            <div style={{
                                                fontSize: 11, color: T.amberGlow,
                                                fontFamily: "'DM Mono', monospace",
                                                marginTop: 3, fontWeight: 500,
                                            }}>
                                                {fmtPHP(pedal.pricePHP)}
                                                {pedal.isRealPrice && (
                                                    <span style={{ color: T.amber, marginLeft: 3, fontSize: 9 }}>✦</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {/* Arrow */}
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                        stroke={T.borderHi} strokeWidth="2.5" strokeLinecap="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </a>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '12px 16px',
                        borderTop: `1px solid ${T.border}`,
                        background: T.woodDark,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 8, letterSpacing: '0.2em',
                                color: T.muted, textTransform: 'uppercase',
                            }}>
                                Total
                            </span>
                            <span style={{
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: 18, letterSpacing: '0.06em', color: T.amberGlow,
                            }}>
                                {fmtPHP(totalPHP)}
                            </span>
                        </div>
                        {activeBoard.some(p => p.isRealPrice) && (
                            <div style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 8, color: T.muted, marginTop: 4,
                            }}>
                                ✦ includes reverb.com market data
                            </div>
                        )}
                    </div>
                </aside>
            )}
        </div>
    );
}