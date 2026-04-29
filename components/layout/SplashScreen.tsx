'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function SplashScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('evacuaid_visited')) {
      setShow(true);
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem('evacuaid_visited', '1');
    }, 1800);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, delay: 1.4 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {/* Shield — stroke draws in, then fills */}
            <motion.svg
              width="56" height="56" viewBox="0 0 32 32"
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1, 0.88] }}
              transition={{ times: [0, 0.45, 0.9], duration: 0.9, ease: 'easeInOut' }}
            >
              <motion.path
                d="M16 2 L28 7 L28 16 C28 23.5 22.5 28.5 16 30.5 C9.5 28.5 4 23.5 4 16 L4 7 Z"
                fill="#FF4B4B"
                initial={{ fillOpacity: 0 }}
                animate={{ fillOpacity: 1 }}
                transition={{ duration: 0.3, delay: 0.45, ease: 'easeOut' }}
              />
              <motion.path
                d="M16 2 L28 7 L28 16 C28 23.5 22.5 28.5 16 30.5 C9.5 28.5 4 23.5 4 16 L4 7 Z"
                fill="none"
                stroke="#FF4B4B"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
              <motion.path
                d="M10 16.5 L14 20.5 L22 12.5"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.65, ease: 'easeOut' }}
              />
            </motion.svg>

            {/* Text */}
            <motion.div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.9, ease: 'easeOut' }}
            >
              <span style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: 24,
                color: '#111827',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                EvacuAid
              </span>
              <motion.span
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: 12,
                  color: '#9CA3AF',
                  letterSpacing: '0.01em',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 1.1 }}
              >
                Emergency Response · Tagum City
              </motion.span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
