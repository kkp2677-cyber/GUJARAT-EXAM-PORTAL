import React, { useEffect, useRef } from 'react';

interface AdSpaceProps {
  htmlCode: string;
  className?: string;
}

export default function AdSpace({ htmlCode, className = '' }: AdSpaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!htmlCode || !containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    try {
      // Create a range/document fragment to execute scripts when injected
      const fragment = document.createRange().createContextualFragment(htmlCode);
      
      // Recreate scripts to ensure browser executes them
      const scripts = Array.from(fragment.querySelectorAll('script'));
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        if (oldScript.innerHTML) {
          newScript.innerHTML = oldScript.innerHTML;
        }
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });

      containerRef.current.appendChild(fragment);

      // Trigger Google AdSense push if required
      if (htmlCode.includes('adsbygoogle')) {
        setTimeout(() => {
          try {
            const adsbygoogle = (window as any).adsbygoogle || [];
            adsbygoogle.push({});
          } catch (e) {
            console.warn('AdSense push handled:', e);
          }
        }, 100);
      }
    } catch (err) {
      console.error('Failed to parse or inject ad code:', err);
    }
  }, [htmlCode]);

  if (!htmlCode || htmlCode.trim() === '') {
    return null;
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full overflow-hidden flex items-center justify-center transition-all duration-300 ${className}`}
    />
  );
}
