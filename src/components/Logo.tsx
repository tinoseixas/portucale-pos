
'use client';

import React, { useState, useEffect } from 'react';
import { BRANDING } from '@/lib/branding';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export function Logo({ className, variant = 'dark' }: LogoProps) {
  const [imgError, setImgError] = useState(false);
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    setTimestamp(new Date().getTime().toString());
  }, []);

  const primaryColor = variant === 'dark' ? BRANDING.primaryColor : '#ffffff';
  const accentColor = BRANDING.accentColor;
  const secondaryColor = BRANDING.secondaryColor; // Red

  if (!imgError) {
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <img 
          src={`${BRANDING.logoPath}?v=${timestamp}`} 
          alt={BRANDING.companyName} 
          className="h-full w-auto max-h-full object-contain"
          onError={() => setImgError(true)}
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
      {/* Escut Blau */}
      <path d="M20 15 L55 5 L90 15 L90 55 C90 80 55 95 55 95 C55 95 20 80 20 55 Z" fill={primaryColor} />
      {/* Detall Vermell a l'escut */}
      <path d="M20 35 L90 35 L90 40 L20 40 Z" fill={secondaryColor} opacity="0.3" />
      {/* Checkmark Groc */}
      <path d="M40 50 L55 65 L80 35" fill="none" stroke={accentColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <text x="110" y="55" fontFamily="Outfit, sans-serif" fontWeight="900" fontSize="42" fill={primaryColor}>{BRANDING.companyName}</text>
      <text x="110" y="82" fontFamily="Outfit, sans-serif" fontWeight="700" fontSize="14" fill="#64748b">{BRANDING.subSlogan}</text>
    </svg>
  );
}
