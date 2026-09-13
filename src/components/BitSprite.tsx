import React from 'react';

interface BitSpriteProps {
  className?: string;
  size?: number;
  isViolating?: boolean;
}

export const BitSprite: React.FC<BitSpriteProps> = ({ className = '', size = 28, isViolating = false }) => {
  return (
    <div 
      className={`relative flex items-center justify-center transition-transform transform active:scale-95 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className={`w-full h-full drop-shadow-sm ${
          isViolating 
            ? 'text-rose-400 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' 
            : 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]'
        }`}
        shapeRendering="crispEdges"
      >
        {/* Kawaii Space Invader / 8-bit Bit creature */}
        {/* Antennas */}
        <rect x="3" y="1" width="1" height="2" />
        <rect x="12" y="1" width="1" height="2" />
        <rect x="4" y="2" width="1" height="2" />
        <rect x="11" y="2" width="1" height="2" />

        {/* Head and Body */}
        <rect x="3" y="4" width="10" height="6" />
        <rect x="2" y="5" width="12" height="4" />
        <rect x="1" y="6" width="14" height="2" />

        {/* Cute Eyes (cutouts) */}
        <rect x="4" y="6" width="2" height="2" fill="#0B0F19" />
        <rect x="10" y="6" width="2" height="2" fill="#0B0F19" />
        {/* Eye sparkles */}
        <rect x="4" y="6" width="1" height="1" fill="#FFFFFF" />
        <rect x="10" y="6" width="1" height="1" fill="#FFFFFF" />

        {/* Cute Kawaii Blush */}
        <rect x="2" y="8" width="2" height="1" fill={isViolating ? '#f43f5e' : '#f472b6'} opacity="0.9" />
        <rect x="12" y="8" width="2" height="1" fill={isViolating ? '#f43f5e' : '#f472b6'} opacity="0.9" />

        {/* Legs */}
        <rect x="2" y="10" width="2" height="2" />
        <rect x="5" y="10" width="2" height="2" />
        <rect x="9" y="10" width="2" height="2" />
        <rect x="12" y="10" width="2" height="2" />

        <rect x="1" y="12" width="2" height="2" />
        <rect x="13" y="12" width="2" height="2" />
      </svg>
    </div>
  );
};
