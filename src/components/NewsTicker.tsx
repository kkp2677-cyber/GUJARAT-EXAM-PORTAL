import React, { useEffect, useState } from 'react';
import { Megaphone, ExternalLink, Flame } from 'lucide-react';
import { NewsTickerItem } from '../types';

export default function NewsTicker() {
  const [tickers, setTickers] = useState<NewsTickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/news-tickers')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load news ticker');
        return res.json();
      })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setTickers(data);
        }
      })
      .catch((err) => {
        console.warn('Silent note: Error loading news ticker:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || tickers.length === 0) {
    return null;
  }

  const handleHeadlineClick = (e: React.MouseEvent, item: NewsTickerItem) => {
    if (!item.link) return;
    
    // If it's a link, handle click
    if (item.link.startsWith('http://') || item.link.startsWith('https://')) {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = item.link;
    }
  };

  // Duplicate items for continuous marquee loop if items exist
  const displayItems = tickers.length > 0 ? [...tickers, ...tickers, ...tickers] : [];

  return (
    <div className="w-full bg-slate-900 dark:bg-[#0b0f17] text-white border-b border-slate-800 shadow-sm relative overflow-hidden z-30 select-none">
      <div className="max-w-full mx-auto flex items-center h-10 px-2 sm:px-4">
        
        {/* Left Fixed Badge: "Updates :" */}
        <div className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-amber-600 text-white px-3 py-1 rounded-lg text-xs md:text-sm font-black uppercase tracking-wide shadow-md z-10 mr-2 md:mr-3 border border-red-400/30">
          <Flame className="w-3.5 h-3.5 animate-pulse text-yellow-300" />
          <span>Updates :</span>
        </div>

        {/* Ticker Container with Overflow Hidden */}
        <div className="flex-1 overflow-hidden relative h-full flex items-center group">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-6 py-1">
            {displayItems.map((item, idx) => (
              <React.Fragment key={`${item.id}-${idx}`}>
                <span
                  onClick={(e) => handleHeadlineClick(e, item)}
                  className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold font-sans transition-all duration-150 ${
                    item.link
                      ? 'text-amber-300 hover:text-white cursor-pointer underline underline-offset-4 decoration-amber-400/50 hover:decoration-white'
                      : 'text-slate-200 cursor-default'
                  }`}
                  title={item.link ? `ક્લિક કરી લિંક ખોલો: ${item.link}` : item.title}
                >
                  <span>{item.title}</span>
                  {item.link && (
                    <ExternalLink className="w-3 h-3 text-amber-400 shrink-0 inline-block opacity-80 group-hover:opacity-100" />
                  )}
                </span>
                
                {/* Separator "|" */}
                <span className="text-slate-600 font-bold select-none text-xs">|</span>
              </React.Fragment>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
