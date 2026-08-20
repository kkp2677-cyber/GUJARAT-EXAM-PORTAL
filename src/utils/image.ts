/**
 * Utility functions for handling images and bypassing hotlink protection/mixed content issues.
 */
export const getProxiedImageUrl = (url: string, defaultWidth?: number): string => {
  if (!url) return '';
  
  // If it's already an Unsplash image, it doesn't need to be proxied
  if (url.includes('images.unsplash.com')) {
    if (defaultWidth && !url.includes('w=')) {
      // Keep existing format/crop parameters if any, otherwise append w
      const joinChar = url.includes('?') ? '&' : '?';
      return `${url}${joinChar}w=${defaultWidth}`;
    }
    return url;
  }
  
  // If it's a relative URL or local asset, don't proxy it
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  // Bypass proxy for ibb.co or standard HTTPS URLs to prevent Google Search Console from blocking weserv.nl
  // GSC bots often block third-party proxies, causing the onError fallback image to trigger.
  if (url.includes('ibb.co') || url.startsWith('https://')) {
    return url;
  }
  
  // Clean the protocol for images.weserv.nl proxy (mainly used for HTTP to prevent mixed content)
  let cleanUrl = url.trim();
  
  // Some URLs might be double-slashed or malformed, normalize it
  if (cleanUrl.startsWith('//')) {
    cleanUrl = 'https:' + cleanUrl;
  }
  
  // Return the proxied URL using images.weserv.nl
  // weserv.nl is a free, fast, and secure image proxy with Cloudflare CDN caching
  return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}${defaultWidth ? `&w=${defaultWidth}` : ''}`;
};
