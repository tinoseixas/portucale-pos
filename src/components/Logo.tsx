'use client';

import React, { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export function Logo({ className, variant = 'dark' }: LogoProps) {
  const [imgError, setImgError] = useState(false);
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    // Gera um timestamp para forçar o recarregamento da imagem
    setTimestamp(new Date().getTime().toString());
  }, []);

  const primaryColor = variant === 'dark' ? '#005691' : '#ffffff';
  const accentColor = '#FFD700';

  if (!imgError) {
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <img 
          src={`/logo.png?t=${timestamp}`} 
          alt="TS SERVEIS" 
          className="h-full w-auto max-h-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback visual apenas se a imagem falhar
  return (
    <svg 
      viewBox="0 0 450 100" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M20 15 L55 5 L90 15 L90 55 C90 80 55 95 55 95 C55 95 20 80 20 55 Z" fill={primaryColor} />
      <path d="M40 50 L55 65 L80 35" fill="none" stroke={accentColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <text x="110" y="55" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="42" fill={primaryColor}>TS SERVEIS</text>
      <text x="110" y="82" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="14" fill="#64748b">CONVERTIM LES TEVES IDEES EN REALITAT</text>
    </svg>
  );
}
