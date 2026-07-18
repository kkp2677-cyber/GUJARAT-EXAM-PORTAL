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
  
  // Clean the protocol for images.weserv.nl proxy
  let cleanUrl = url.trim();
  
  // Some URLs might be double-slashed or malformed, normalize it
  if (cleanUrl.startsWith('//')) {
    cleanUrl = 'https:' + cleanUrl;
  }
  
  // Return the proxied URL using images.weserv.nl
  // weserv.nl is a free, fast, and secure image proxy with Cloudflare CDN caching
  return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}${defaultWidth ? `&w=${defaultWidth}` : ''}`;
};
