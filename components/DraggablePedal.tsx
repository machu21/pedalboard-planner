'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import Image from 'next/image';
import { ActivePedal } from '@/types/pedal';
import { usePedalStore } from '@/store/usePedalStore';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/PedalPlayground/PedalPlayground.github.io/master/public/';

const T = {
    surface:   '#ffffff',
    border:    '#e5d5c5',
    borderHi:  '#d0bba5',
    muted:     '#a0856d',
    textDim:   '#6d5340',
    text:      '#3d2c1d',
    textHi:    '#1a1008',
    amber:     '#d97706',
    amberGlow: '#f59e0b',
    woodDark:  '#f4ede4',
};

export default function DraggablePedal({ pedal }: { pedal: ActivePedal }) {
    const removePedal = usePedalStore((s) => s.removePedal);
    const rotatePedal = usePedalStore((s) => s.rotatePedal);

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: pedal.instanceId,
        data: pedal,
    });

    const imgPath = pedal.image?.toLowerCase() || '';
    const safeImagePath = imgPath.startsWith('images/')
        ? pedal.image
        : imgPath.startsWith('pedals/')
            ? `images/${pedal.image}`
            : `images/pedals/${pedal.image}`;

    const [imgSrc, setImgSrc] = useState(`${GITHUB_RAW_BASE}${safeImagePath}`);
    const isFallback = imgSrc.startsWith('data:');

    const combinedTransform = transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${pedal.rotation}deg)`
        : `rotate(${pedal.rotation}deg)`;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onContextMenu={(e) => { e.preventDefault(); removePedal(pedal.instanceId); }}
            className="group"
            style={{
                position: 'absolute',
                left: pedal.x, top: pedal.y,
                width: pedal.width, height: pedal.height,
                transform: combinedTransform,
                transformOrigin: 'center center',
                cursor: 'grab', touchAction: 'none',
                zIndex: 10,
            }}
        >
            <Image
                src={imgSrc}
                alt={pedal.name || 'Guitar Pedal'}
                fill
                sizes={`${pedal.width}px`}
                style={{ objectFit: 'contain', pointerEvents: 'none', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
                draggable={false}
                priority
                onError={() => setImgSrc('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')}
            />

            {/* Tooltip */}
            <div
                className="opacity-0 group-hover:opacity-100"
                style={{
                    position: 'absolute', bottom: '100%', left: '50%',
                    transform: 'translateX(-50%)', marginBottom: 6,
                    background: T.woodDark,
                    border: `1px solid ${T.borderHi}`,
                    borderRadius: 6, padding: '6px 10px',
                    pointerEvents: 'none', whiteSpace: 'nowrap',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    transition: 'opacity 0.15s',
                    zIndex: 50,
                }}
            >
                <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11, fontWeight: 600, color: T.textHi,
                }}>
                    {pedal.brand} {pedal.name}
                </div>
                <div style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9, color: T.muted, marginTop: 2,
                }}>
                    right-click to remove
                </div>
            </div>

            {/* Rotate button */}
            <button
                className="opacity-0 group-hover:opacity-100"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); rotatePedal(pedal.instanceId); }}
                title="Rotate"
                style={{
                    position: 'absolute', top: -10, right: -10,
                    width: 22, height: 22,
                    background: T.woodDark,
                    border: `1px solid ${T.borderHi}`,
                    borderRadius: '50%', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: T.amber, zIndex: 50,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'opacity 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.borderColor = T.amber; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = T.borderHi; }}
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                </svg>
            </button>

            {/* Fallback label */}
            {isFallback && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: 6,
                    pointerEvents: 'none',
                }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: T.textHi, fontFamily: "'DM Mono'", textAlign: 'center' }}>
                        {pedal.brand}
                    </span>
                    <span style={{ fontSize: 8, color: T.textDim, fontFamily: "'DM Mono'", textAlign: 'center', marginTop: 2 }}>
                        {pedal.name}
                    </span>
                </div>
            )}
        </div>
    );
}