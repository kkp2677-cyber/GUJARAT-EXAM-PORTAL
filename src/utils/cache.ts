// src/utils/cache.ts

const CACHE_DURATION = 60 * 1000; // 1 minute cache duration for fast updates

export async function fetchWithCache<T>(url: string, options: RequestInit = {}): Promise<T> {
  if (typeof window === 'undefined') {
    // SSR fallback: just fetch
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  }

  // Client-side with caching
  const cacheKey = `cache_${url}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data as T;
      }
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    // Storage quota or error
  }
  
  return data as T;
}

export function clearCache(url?: string) {
  if (typeof window === 'undefined') return;
  if (url) {
    localStorage.removeItem(`cache_${url}`);
  } else {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Error clearing cache:', e);
    }
  }
}

