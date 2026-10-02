import { useEffect, useState } from 'react';

export type Device = 'phone' | 'tablet' | 'desktop';

/** phone < 640 ≤ tablet < 1100 ≤ desktop */
export function useDevice() {
  const [w, setW] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const dev: Device = w < 640 ? 'phone' : w < 1100 ? 'tablet' : 'desktop';
  return { w, dev, phone: dev === 'phone', tablet: dev === 'tablet', desktop: dev === 'desktop' };
}
