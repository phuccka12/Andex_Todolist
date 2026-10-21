'use client';

import { useEffect } from 'react';

/**
 * Global hook to enable buttery-smooth auto-scrolling when dragging tasks
 * near the top or bottom edges of the screen.
 */
export function useDragAutoScroll() {
  useEffect(() => {
    let isDragging = false;
    let animId: number | null = null;
    let currentSpeed = 0;
    let originalScrollBehavior = '';

    const getScrollContainer = (): HTMLElement | null => {
      return (
        document.querySelector('#main-content-scroll') ||
        document.querySelector('main') ||
        null
      );
    };

    const loop = () => {
      if (currentSpeed !== 0) {
        const container = getScrollContainer();
        if (container) {
          container.scrollTop += currentSpeed;
        }
      }
      if (isDragging) {
        animId = requestAnimationFrame(loop);
      }
    };

    const handleDragStart = () => {
      isDragging = true;
      currentSpeed = 0;
      const container = getScrollContainer();
      if (container) {
        originalScrollBehavior = container.style.scrollBehavior;
        container.style.scrollBehavior = 'auto'; // Prevent CSS smooth-scroll stutter
      }
      if (animId) cancelAnimationFrame(animId);
      animId = requestAnimationFrame(loop);
    };

    const handleDragOver = (e: DragEvent) => {
      if (!isDragging) isDragging = true;

      const clientY = e.clientY;
      const windowHeight = window.innerHeight;

      // Top threshold zone: top 180px
      const topThreshold = 180;
      // Bottom threshold zone: bottom 120px
      const bottomThreshold = 120;

      if (clientY < topThreshold) {
        // Dragging near top -> scroll UP
        const ratio = (topThreshold - Math.max(0, clientY)) / topThreshold;
        // Speed scales smoothly from 6px to 28px per frame
        currentSpeed = -Math.max(6, Math.round(ratio * 28));
      } else if (clientY > windowHeight - bottomThreshold) {
        // Dragging near bottom -> scroll DOWN
        const ratio = (clientY - (windowHeight - bottomThreshold)) / bottomThreshold;
        currentSpeed = Math.max(6, Math.round(ratio * 28));
      } else {
        currentSpeed = 0;
      }
    };

    const handleDragEnd = () => {
      isDragging = false;
      currentSpeed = 0;
      const container = getScrollContainer();
      if (container) {
        container.style.scrollBehavior = originalScrollBehavior;
      }
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };

    window.addEventListener('dragstart', handleDragStart, { passive: true });
    window.addEventListener('dragover', handleDragOver, { passive: false });
    window.addEventListener('dragend', handleDragEnd, { passive: true });
    window.addEventListener('drop', handleDragEnd, { passive: true });

    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('drop', handleDragEnd);
      if (animId) cancelAnimationFrame(animId);
      const container = getScrollContainer();
      if (container && originalScrollBehavior !== undefined) {
        container.style.scrollBehavior = originalScrollBehavior;
      }
    };
  }, []);
}
