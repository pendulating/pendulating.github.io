import React, { useEffect, useState, useMemo } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import WhiteboardLayout from './Whiteboard';
import type { WhiteboardProps } from '../types/whiteboard';

const BrainPage: React.FC<WhiteboardProps> = (props) => {
  const [isLoading, setIsLoading] = useState(true);

  // Detect if we're actually on a mobile device
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    window.innerWidth <= 768
  );

  // Apply device-appropriate optimizations
  useEffect(() => {
    const htmlElement = document.documentElement;
    
    if (isMobile) {
      // Apply mobile optimizations for actual mobile devices
      htmlElement.classList.add('mobile-optimized', 'reduce-motion', 'perf-low');
      
      // Set CSS custom properties for mobile performance
      htmlElement.style.setProperty('--enable-animations', '0');
      htmlElement.style.setProperty('--enable-3d-effects', '0');
      htmlElement.style.setProperty('--max-items', '20'); // Limit items for mobile
      
      // Simplified background for mobile
      htmlElement.classList.add('simplified-background');
      
      console.log('Mobile device detected - mobile optimizations applied');
    } else {
      // Apply desktop-appropriate settings
      htmlElement.classList.remove('mobile-optimized', 'reduce-motion', 'perf-low');
      htmlElement.classList.remove('simplified-background');
      
      // Enable full functionality for desktop
      htmlElement.style.setProperty('--enable-animations', '1');
      htmlElement.style.setProperty('--enable-3d-effects', '1');
      htmlElement.style.setProperty('--max-items', '50'); // More items for desktop
      
      console.log('Desktop device detected - full functionality enabled');
    }
  }, [isMobile]);

  // Handle component mounting and loading states
  useEffect(() => {
    // Mark that React has hydrated
    document.documentElement.classList.add('react-loaded');
    
    // Adjust loading time based on device type
    const loadingTimer = setTimeout(() => {
      // Hide loading indicator
      const loader = document.getElementById('brain-loading');
      if (loader) {
        loader.style.display = 'none';
      }
      
      setIsLoading(false);
    }, isMobile ? 100 : 300); // Faster on mobile, allow time for desktop animations

    return () => clearTimeout(loadingTimer);
  }, [isMobile]);

  // Optimize props based on actual device type
  const optimizedProps = useMemo(() => {
    if (isMobile) {
      // On mobile, we still pass all items to ensure searchability and filtering work,
      // but we signal WhiteboardLayout to use optimized rendering.
      return {
        ...props,
        useOptimizedRendering: true,
        performanceMode: 'mobile' as const,
      };
    } else {
      // Use all items and full functionality for desktop
      return {
        ...props,
        useOptimizedRendering: false,
        performanceMode: 'desktop' as const,
      };
    }
  }, [props, isMobile]);

  // Show loading screen appropriate for device type
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }
  
  return (
    <Router basename="/brain">
      <Routes>
        <Route path="/" element={
          <WhiteboardLayout {...optimizedProps} />
        } />
        <Route path="album/:slug" element={
          <WhiteboardLayout {...optimizedProps} />
        } />
        <Route path="snip/:slug" element={
          <WhiteboardLayout {...optimizedProps} />
        } />
        <Route path="playlist/:slug" element={
          <WhiteboardLayout {...optimizedProps} />
        } />
      </Routes>
    </Router>
  );
};

export default BrainPage;