/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Delete, Globe, ArrowUp, Space, CornerDownLeft, Type, Hash, Smile, Mic } from 'lucide-react';

// --- Constants & Types ---

type LayoutType = 'en' | 'ar' | 'symbols' | 'numbers';

interface KeyProps {
  label: string | React.ReactNode;
  value?: string;
  type?: 'char' | 'action' | 'space' | 'switch';
  width?: string;
  onClick: () => void;
  isFocused?: boolean;
}

// --- Sound Effects (Base64 for reliability) ---
const CLICK_SOUND = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="; // Placeholder, will use a synthesized sound or a better one if possible.
// For a real iOS sound, I'll try to find a public URL or synthesize a short click.
const IOS_CLICK_URL = "https://www.soundjay.com/buttons/sounds/button-16.mp3";

// --- Keyboard Layouts ---

const EN_LAYOUT = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'delete'],
  ['123', 'globe', 'space', 'return']
];

const AR_LAYOUT = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['shift', 'ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', 'delete'],
  ['123', 'globe', 'space', 'return']
];

const SYMBOLS_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
  ['#+=', '.', ',', '?', '!', "'", 'delete'],
  ['ABC', 'globe', 'space', 'return']
];

const MORE_SYMBOLS_LAYOUT = [
  ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
  ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'],
  ['123', '.', ',', '?', '!', "'", 'delete'],
  ['ABC', 'globe', 'space', 'return']
];

// --- Components ---

const Key = ({ label, type = 'char', width = 'flex-1', onClick, isFocused }: KeyProps) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.8)' }}
      className={`
        ${width} h-11 m-1 rounded-md flex items-center justify-center text-lg font-medium shadow-sm transition-colors
        ${type === 'char' ? 'bg-white text-black' : 'bg-gray-400/50 text-black'}
        ${isFocused ? 'ring-4 ring-blue-400 scale-105 z-10' : ''}
        active:bg-gray-200 select-none touch-none
      `}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      tabIndex={-1} // Controlled by D-pad logic
    >
      {label}
    </motion.button>
  );
};

export default function App() {
  const [inputText, setInputText] = useState('');
  const [layout, setLayout] = useState<LayoutType>('en');
  const [isShift, setIsShift] = useState(false);
  const [isCaps, setIsCaps] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState({ row: 0, col: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio(IOS_CLICK_URL);
  }, []);

  const playClick = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const [showToast, setShowToast] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inputText);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleKeyClick = useCallback((key: string) => {
    playClick();
    
    if (key === 'delete') {
      setInputText(prev => prev.slice(0, -1));
    } else if (key === 'space') {
      setInputText(prev => prev + ' ');
    } else if (key === 'return') {
      setInputText(prev => prev + '\n');
    } else if (key === 'shift') {
      setIsShift(!isShift);
    } else if (key === '123' || key === 'ABC') {
      setLayout(prev => (prev === 'en' || prev === 'ar' ? 'symbols' : 'en'));
    } else if (key === '#+=') {
      setLayout('numbers');
    } else if (key === 'globe') {
      setLayout(prev => (prev === 'en' ? 'ar' : 'en'));
    } else {
      let char = key;
      if (layout === 'en') {
        char = isShift || isCaps ? key.toUpperCase() : key.toLowerCase();
      }
      setInputText(prev => prev + char);
      if (isShift && !isCaps) setIsShift(false);
    }
  }, [isShift, isCaps, layout]);

  // D-pad Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentLayout = getCurrentLayout();
      const rowCount = currentLayout.length;

      setFocusedIndex(prev => {
        let newRow = prev.row;
        let newCol = prev.col;

        switch (e.key) {
          case 'ArrowUp':
            newRow = Math.max(0, prev.row - 1);
            break;
          case 'ArrowDown':
            newRow = Math.min(rowCount - 1, prev.row + 1);
            break;
          case 'ArrowLeft':
            newCol = Math.max(0, prev.col - 1);
            break;
          case 'ArrowRight':
            newCol = Math.min(currentLayout[prev.row].length - 1, prev.col + 1);
            break;
          case 'Enter':
            const key = currentLayout[prev.row][prev.col];
            handleKeyClick(key);
            return prev;
          default:
            return prev;
        }

        // Adjust column if the new row is shorter
        const newRowColCount = currentLayout[newRow].length;
        if (newCol >= newRowColCount) {
          newCol = newRowColCount - 1;
        }

        return { row: newRow, col: newCol };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyClick, layout]);

  const getCurrentLayout = () => {
    if (layout === 'en') return EN_LAYOUT;
    if (layout === 'ar') return AR_LAYOUT;
    if (layout === 'symbols') return SYMBOLS_LAYOUT;
    return MORE_SYMBOLS_LAYOUT;
  };

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const onKeyPressStart = (key: string) => {
    setActiveKey(key);
    handleKeyClick(key);
  };

  const onKeyPressEnd = () => {
    setActiveKey(null);
  };

  const renderKey = (key: string, rowIndex: number, colIndex: number) => {
    const isFocused = focusedIndex.row === rowIndex && focusedIndex.col === colIndex;
    const isActive = activeKey === key;
    
    let label: React.ReactNode = key;
    let type: 'char' | 'action' | 'space' | 'switch' = 'char';
    let width = 'flex-1';

    if (key === 'shift') {
      label = <ArrowUp className={isShift ? 'fill-black' : ''} size={20} />;
      type = 'action';
    } else if (key === 'delete') {
      label = <Delete size={20} />;
      type = 'action';
    } else if (key === 'space') {
      label = <Space size={20} />;
      type = 'char';
      width = 'flex-[4]';
    } else if (key === 'return') {
      label = <CornerDownLeft size={20} />;
      type = 'action';
      width = 'flex-[1.5]';
    } else if (key === 'globe') {
      label = <Globe size={20} />;
      type = 'action';
    } else if (['123', 'ABC', '#+='].includes(key)) {
      type = 'action';
      width = 'flex-[1.5]';
    }

    return (
      <div key={`${rowIndex}-${colIndex}-${key}`} className={`${width} relative m-0.5`}>
        {/* iOS Key Popup */}
        <AnimatePresence>
          {isActive && type === 'char' && key !== 'space' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.5 }}
              animate={{ opacity: 1, y: -45, scale: 1.2 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-x-0 bottom-full mb-2 bg-white rounded-xl shadow-xl flex items-center justify-center h-16 z-50 pointer-events-none"
            >
              <span className="text-3xl font-semibold text-black">
                {layout === 'en' ? (isShift ? key.toUpperCase() : key.toLowerCase()) : key}
              </span>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onPointerDown={() => onKeyPressStart(key)}
          onPointerUp={onKeyPressEnd}
          onPointerLeave={onKeyPressEnd}
          className={`
            w-full h-11 rounded-md flex items-center justify-center text-lg font-medium shadow-sm transition-all duration-75
            ${type === 'char' ? 'bg-white text-black' : 'bg-gray-400/50 text-black'}
            ${isFocused ? 'ring-4 ring-blue-500 scale-105 z-10 bg-blue-50' : ''}
            select-none touch-none
          `}
          tabIndex={-1}
        >
          {label}
        </motion.button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-end p-4 font-sans overflow-hidden">
      {/* Input Display */}
      <div className="w-full max-w-2xl flex-1 flex flex-col justify-center mb-8">
        <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 min-h-[200px] shadow-2xl backdrop-blur-xl relative group">
          <p className="text-white text-2xl whitespace-pre-wrap break-all leading-relaxed" dir={layout === 'ar' ? 'rtl' : 'ltr'}>
            {inputText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-block w-0.5 h-7 bg-blue-500 ml-1 align-middle"
            />
          </p>
          
          {/* Quick Actions */}
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={copyToClipboard}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-sm backdrop-blur-md border border-white/10 flex items-center gap-1"
            >
              Copy
            </button>
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    text: inputText,
                  }).catch(() => {});
                } else {
                  copyToClipboard();
                  alert('Share not supported, text copied instead!');
                }
              }}
              className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 px-3 py-1 rounded-lg text-sm backdrop-blur-md border border-blue-500/20"
            >
              Share
            </button>
            <button 
              onClick={() => setInputText('')}
              className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-1 rounded-lg text-sm backdrop-blur-md border border-red-500/20"
            >
              Clear
            </button>
          </div>

          {/* Toast Notification */}
          <AnimatePresence>
            {showToast && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium shadow-lg z-[100]"
              >
                Copied to clipboard!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Keyboard Controls (Floating) */}
      <div className="fixed top-4 left-4 flex flex-col gap-2 z-[100] bg-gray-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl">
        <span className="text-white/50 text-[10px] uppercase font-bold tracking-tighter">Keyboard Size</span>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
            className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white"
          >
            -
          </button>
          <span className="text-white font-mono text-sm w-10 text-center">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(prev => Math.min(1.5, prev + 0.1))}
            className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white"
          >
            +
          </button>
        </div>
        <button 
          onClick={() => { setPosition({ x: 0, y: 0 }); setScale(1); }}
          className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 uppercase font-bold"
        >
          Reset Position
        </button>
        <button 
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen();
            } else {
              document.exitFullscreen();
            }
          }}
          className="mt-2 text-[10px] text-gray-400 hover:text-white uppercase font-bold"
        >
          Toggle Fullscreen
        </button>
      </div>

      {/* Keyboard Container */}
      <motion.div 
        drag
        dragMomentum={false}
        style={{ x: position.x, y: position.y, scale }}
        onDragEnd={(_, info) => setPosition(prev => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }))}
        className="w-full max-w-2xl bg-gray-300/90 backdrop-blur-2xl rounded-3xl p-2 pb-8 shadow-2xl select-none relative"
      >
        {/* Drag Handle */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing p-2 bg-gray-800/50 rounded-full border border-white/10 backdrop-blur-md">
          <div className="w-12 h-1.5 bg-white/30 rounded-full" />
        </div>

        <div className="flex flex-col gap-1">
          {getCurrentLayout().map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center px-1">
              {row.map((key, colIndex) => renderKey(key, rowIndex, colIndex))}
            </div>
          ))}
        </div>
        
        {/* Home Indicator */}
        <div className="w-32 h-1 bg-black/20 rounded-full mx-auto mt-4" />
      </motion.div>

      {/* Instructions for TV Box */}
      <div className="mt-4 text-gray-500 text-xs uppercase tracking-widest flex gap-4">
        <span>Use Arrows to Navigate</span>
        <span>•</span>
        <span>Enter to Type</span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Vazirmatn:wght@400;500;600&display=swap');
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        /* Arabic support */
        [dir="rtl"] {
          font-family: 'Vazirmatn', 'Inter', 'Arial', sans-serif;
        }
      `}} />
    </div>
  );
}
