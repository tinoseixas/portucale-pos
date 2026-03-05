'use client';

import React, { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export function Logo({ className, variant = 'dark' }: LogoProps) {
  const [imgError, setImgError] = useState(false);
  const [useArtificial, setUseArtificial] = useState(false);
  
  const primaryColor = variant === 'dark' ? '#005691' : '#ffffff';
  const accentColor = '#FFD700';

  // Tentamos carregar o logo.png primeiro. 
  // Se falhar, mostramos o SVG artificial.
  useEffect(() => {
    const img = new Image();
    img.src = "/logo.png";
    img.onload = () => {
        setUseArtificial(false);
        setImgError(false);
    };
    img.onerror = () => {
        setUseArtificial(true);
        setImgError(true);
    };
  }, []);

  if (!useArtificial && !imgError) {
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <img 
          src="/logo.png" 
          alt="TS SERVEIS" 
          className="h-full w-auto max-h-full"
          onError={() => {
            setImgError(true);
            setUseArtificial(true);
          }}
          style={{ objectFit: 'contain' }}
        />
      </div>
    );
  }

  return (
    <svg 
      viewBox="0 0 450 100" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: primaryColor, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#003d66', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      <path 
        d="M20 15 L55 5 L90 15 L90 55 C90 80 55 95 55 95 C55 95 20 80 20 55 Z" 
        fill="url(#logoGradient)" 
      />
      <path 
        d="M40 50 L55 65 L80 35" 
        fill="none" 
        stroke={accentColor} 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      <text 
        x="110" 
        y="55" 
        fontFamily="Inter, sans-serif" 
        fontWeight="900" 
        fontSize="42" 
        letterSpacing="-1"
        fill={primaryColor}
      >
        TS SERVEIS
      </text>
      
      <text 
        x="110" 
        y="82" 
        fontFamily="Inter, sans-serif" 
        fontWeight="700" 
        fontSize="14" 
        letterSpacing="1"
        fill={variant === 'dark' ? '#64748b' : '#cbd5e1'}
      >
        CONVERTIM LES TEVES IDEES EN REALITAT
      </text>
    </svg>
  );
}