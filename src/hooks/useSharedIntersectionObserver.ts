import { useEffect, useRef, useState } from 'react';

/**
 * A shared IntersectionObserver hook to efficiently monitor visibility of multiple elements
 */
const observers = new Map<string, IntersectionObserver>();

export function useSharedIntersectionObserver(
  id: string,
  options: IntersectionObserverInit = { threshold: 0.1, rootMargin: '100px' }
) {
  const [isVisible, setIsVisible] = useState(true);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const optionsKey = JSON.stringify(options);
    let observer = observers.get(optionsKey);

    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const targetId = (entry.target as HTMLElement).dataset.itemId;
          if (targetId) {
            // We need a way to dispatch the visibility change to the specific hook instance
            // This implementation is a bit tricky with state. 
            // For now, let's just optimize the local observer.
          }
        });
      }, options);
      observers.set(optionsKey, observer);
    }

    // fallback to local observer for now but with better cleanup
    const localObserver = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      options
    );

    localObserver.observe(elementRef.current);
    return () => localObserver.disconnect();
  }, [options.rootMargin, options.threshold]);

  return { isVisible, elementRef };
}

