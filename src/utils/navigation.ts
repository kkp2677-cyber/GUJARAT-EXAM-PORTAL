/**
 * Simple routing helper for clean URLs without React Router
 */

export const navigateToPost = (post: { id: string; slug?: string; category?: string }) => {
  const targetSlug = post.slug && post.slug.trim() !== '' ? post.slug.trim() : post.id;
  const category = post.category || 'job';
  const url = `/${category}/${targetSlug}/`;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new Event('popstate'));
  window.scrollTo(0, 0);
};

export const navigateToCategory = (category: string) => {
  const url = `/blog/${category}`;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new Event('popstate'));
  window.scrollTo(0, 0);
};

export const navigateToHome = () => {
  window.history.pushState({}, '', '/');
  window.dispatchEvent(new Event('popstate'));
  window.scrollTo(0, 0);
};

export const navigateToSection = (section: string) => {
  const url = section === 'home' ? '/' : `/${section}`;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new Event('popstate'));
  window.scrollTo(0, 0);
};
