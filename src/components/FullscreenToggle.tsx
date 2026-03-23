"use client";

import React, { useState, useEffect } from "react";
import { Maximize, Minimize } from "lucide-react";

export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <button
      onClick={toggleFullscreen}
      className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group shadow-sm border ${
        isFullscreen 
          ? "bg-slate-900 text-white border-slate-800" 
          : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600"
      }`}
      title={isFullscreen ? "Sair de Ecrã Inteiro" : "Ecrã Inteiro"}
    >
      {isFullscreen ? (
        <Minimize className="w-4 h-4 transition-transform group-hover:scale-110" />
      ) : (
        <Maximize className="w-4 h-4 transition-transform group-hover:scale-110" />
      )}
      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
        {isFullscreen ? "Sair" : "Full Screen"}
      </span>
    </button>
  );
}
