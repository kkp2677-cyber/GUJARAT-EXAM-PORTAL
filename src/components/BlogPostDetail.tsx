import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Share2, Bookmark, Clock, Copy, Check, ChevronRight, BookOpen } from 'lucide-react';
import { BlogPost } from '../types';
import { navigateToPost, navigateToCategory, navigateToHome } from '../utils/navigation';
import { safeFormatDate } from '../utils/date';
import { getProxiedImageUrl } from '../utils/image';
import AdSpace from './AdSpace';

interface BlogPostDetailProps {
  post: BlogPost;
  onBack: () => void;
  onPostClick?: (post: BlogPost) => void;
}

const SocialShareButtons = ({ url, title, desc, noBg = false }: { url: string; title: string; desc: string; noBg?: boolean }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `📢 *મહત્વપૂર્ણ સરકારી ભરતી અપડેટ*\n\n📌 *${title}*\n\n${desc ? desc + '\n\n' : ''}વધુ વિગતો અને અરજી પ્રક્રિયા માટે નીચેની લિંક ઓપન કરો: 👇\n`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + url)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('📢 મહત્વપૂર્ણ સરકારી ભરતી અપડેટ:\n\n' + title)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent('📢 ' + title)}`;

  return (
    <div className={noBg ? "flex flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-2xl"}>
      <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mr-1">શેર કરો:</span>
      
      {/* WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02]"
        title="WhatsApp પર શેર કરો"
      >
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.949h.004c4.368 0 7.927-3.558 7.93-7.93a7.896 7.896 0 0 0-2.327-5.593zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.69-4.98c-.202-.101-1.202-.594-1.392-.661-.18-.067-.312-.1-.443.1-.129.19-.5.594-.614.724-.115.13-.23.144-.43.041-.2-.1-.843-.311-1.607-.994-.594-.53-1.002-1.185-1.118-1.383-.116-.197-.013-.303.088-.403.09-.09.197-.23.296-.346.1-.116.133-.197.2-.329.065-.13.033-.245-.017-.346-.05-.1-.443-1.068-.607-1.464-.159-.387-.32-.334-.44-.34-.11-.006-.239-.006-.368-.006-.129 0-.34.049-.517.243-.177.195-.678.662-.678 1.613 0 .95.69 1.868.788 1.996.098.128 1.355 2.07 3.28 2.906.459.199.818.318 1.098.406.46.147.88.126 1.213.076.371-.056 1.202-.492 1.37-.967.168-.475.168-.88.118-.967-.05-.088-.18-.139-.382-.239z"/>
        </svg>
        <span className="hidden sm:inline">WhatsApp</span>
      </a>

      {/* Telegram */}
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02]"
        title="Telegram પર શેર કરો"
      >
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 16 16">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.329.213-.033.435-.233.548-.839.266-1.423.785-4.475.9-5.61a.48.48 0 0 0-.01-.223.144.144 0 0 0-.114-.101c-.131-.027-.33-.008-.636.12z"/>
        </svg>
        <span className="hidden sm:inline">Telegram</span>
      </a>

      {/* Twitter (X) */}
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-black hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02]"
        title="X પર શેર કરો"
      >
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 16 16">
          <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/>
        </svg>
        <span className="hidden sm:inline">X (Twitter)</span>
      </a>

      {/* Copy link */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-white text-slate-700 hover:bg-gray-50 text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02] cursor-pointer border-0"
        title="લિંક કોપી કરો"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
        <span className="hidden sm:inline">{copied ? 'કોપી થઈ ગઈ!' : 'લિંક કોપી'}</span>
      </button>
    </div>
  );
};

export default function BlogPostDetail({ post, onBack, onPostClick }: BlogPostDetailProps) {
  const [copied, setCopied] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([]);
  const [loadingLatest, setLoadingLatest] = useState(true);

  const [adsPostBelowHeader, setAdsPostBelowHeader] = useState('');
  const [adsPostBelowThumb, setAdsPostBelowThumb] = useState('');
  const [adsPostAboveRelated, setAdsPostAboveRelated] = useState('');
  const [adsSidebarBottom, setAdsSidebarBottom] = useState('');

  // Fetch ads settings
  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to load tracking settings');
      })
      .then((data) => {
        setAdsPostBelowHeader(data.adsPostBelowHeader || '');
        setAdsPostBelowThumb(data.adsPostBelowThumb || '');
        setAdsPostAboveRelated(data.adsPostAboveRelated || '');
        setAdsSidebarBottom(data.adsSidebarBottom || '');
      })
      .catch((err) => {
        console.warn('Could not load public tracking settings:', err);
      });
  }, []);

  // Set the document title and social meta tags dynamically
  useEffect(() => {
    const originalTitle = document.title;
    const pageTitle = `${post.title} | OJAS EXAM`;
    const plainContent = (post.content || '').replace(/<[^>]*>/g, '');
    const metaDescription = post.metaDesc || (plainContent.substring(0, 155).trim() + (plainContent.length > 155 ? '...' : ''));
    const postImage = post.thumbnail || '/logo.svg';
    const absoluteImage = postImage.startsWith('http') ? postImage : `${window.location.origin}${postImage.startsWith('/') ? '' : '/'}${postImage}`;
    const pageUrl = window.location.href;

    document.title = pageTitle;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        const [key, val] = selector.replace('meta[', '').replace(']', '').split('=');
        el.setAttribute(key, val.replace(/"/g, ''));
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', metaDescription);
    setMeta('meta[property="og:title"]', 'content', pageTitle);
    setMeta('meta[property="og:description"]', 'content', metaDescription);
    setMeta('meta[property="og:image"]', 'content', absoluteImage);
    setMeta('meta[property="og:url"]', 'content', pageUrl);
    setMeta('meta[property="og:type"]', 'content', 'article');
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', pageTitle);
    setMeta('meta[name="twitter:description"]', 'content', metaDescription);
    setMeta('meta[name="twitter:image"]', 'content', absoluteImage);

    // Scroll to top when post opens
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      document.title = originalTitle;
    };
  }, [post]);

  // Fetch related posts from the same category
  useEffect(() => {
    setLoadingRelated(true);
    fetch('/api/posts')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: BlogPost[]) => {
        // Filter posts in the same category, excluding the current post, and slice top 3
        const filtered = data
          .filter((p) => p.category === post.category && p.id !== post.id)
          .slice(0, 3);
        setRelatedPosts(filtered);
        setLoadingRelated(false);
      })
      .catch((err) => {
        console.error('Error fetching related posts:', err);
        setLoadingRelated(false);
      });
  }, [post]);

  // Fetch latest 10 posts across all categories
  useEffect(() => {
    setLoadingLatest(true);
    fetch('/api/posts')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: BlogPost[]) => {
        const sorted = [...data].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.date).getTime();
          const dateB = new Date(b.createdAt || b.date).getTime();
          return dateB - dateA;
        });
        setLatestPosts(sorted.slice(0, 10));
        setLoadingLatest(false);
      })
      .catch((err) => {
        console.error('Error fetching latest posts:', err);
        setLoadingLatest(false);
      });
  }, []);

  function getCategoryLabel(cat: string) {
    switch (cat) {
      case 'job': return 'નવી ભરતીઓ';
      case 'answer_key': return 'આન્સર કી';
      case 'result': return 'રિઝલ્ટ';
      case 'selection_list': return 'સિલેક્શન લિસ્ટ';
      case 'news': return 'સમાચાર';
      default: return 'માહિતી બોર્ડ';
    }
  }

  function getCategoryColor(cat: string) {
    switch (cat) {
      case 'job': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'answer_key': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'result': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'selection_list': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'news': return 'bg-sky-50 text-sky-800 border-sky-200';
      default: return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Estimate reading time
  const wordCount = post.content ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 120)); // Approx 120 Gujarati/English words per min

  // Extract focus keyword and generate tags dynamically based on post contents
  const getFocusKeywordAndTags = () => {
    let focusKeyword = post.focusKeyword && post.focusKeyword.trim() !== ''
      ? post.focusKeyword.trim()
      : '';
      
    if (!focusKeyword) {
      if (post.metaTitle) {
        focusKeyword = post.metaTitle.split('|')[0].trim();
      } else {
        focusKeyword = post.title.split(' ').slice(0, 5).join(' ');
      }
    }

    let allTags: string[] = [];
    if (post.tags && post.tags.trim() !== '') {
      allTags = post.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    } else {
      const defaultTagsMap: Record<string, string[]> = {
        job: ['નવી ભરતી', 'સરકારી નોકરી', 'Gujarat Job', 'Maru Gujarat', 'Sarkari Bharti', 'Recruitment 2026'],
        answer_key: ['આન્સર કી', 'Gujarat Exam Key', 'Exam Solution', 'Answer Sheet', 'Provisional Answer Key'],
        result: ['પરીક્ષા પરિણામ', 'Exam Result', 'Cut Off Marks', 'Result 2026', 'Gujarat Results'],
        selection_list: ['સિલેક્શન લિસ્ટ', 'Merit List', 'Document Verification', 'Waiting List', 'Selection 2026'],
        news: ['શિક્ષણ સમાચાર', 'Education News', 'Gujarat Exam News', 'Latest Update', 'Board News']
      };

      const categoryTags = defaultTagsMap[post.category] || ['Gujarat Exam', 'Sarkari Update'];
      
      // Clean and split title for tag keywords
      const cleanedTitle = post.title.replace(/[^\w\u0a80-\u0aff\s-]+/g, '');
      const titleWords = cleanedTitle.split(/\s+/);
      const stopWords = ['માટે', 'અને', 'સાથે', 'થી', 'ની', 'ના', 'પર', 'આવ્યો', 'હશે', 'થશે', 'છે', 'હતી', 'તરીકે', 'દ્વારા', 'કરવામાં', 'આવી', 'આવશે', 'જાહેર'];
      const keyTerms = titleWords.filter(word => word.length > 2 && !stopWords.includes(word));
      
      allTags = Array.from(new Set([...categoryTags, ...keyTerms.slice(0, 5)]));
    }
    return { focusKeyword, tags: allTags };
  };

  // Generate safe NewsArticle JSON-LD schema for Google indexation
  const getSchemaJson = () => {
    let dateStr = new Date().toISOString();
    try {
      if (post.createdAt || post.date) {
        const d = new Date(post.createdAt || post.date);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString();
        }
      }
    } catch (e) {
      // Keep fallback
    }

    const imageUrl = post.thumbnail && post.thumbnail.trim() !== ''
      ? (post.thumbnail.startsWith('http') ? post.thumbnail : `${window.location.origin}${post.thumbnail.startsWith('/') ? '' : '/'}${post.thumbnail}`)
      : `${window.location.origin}/logo.svg`;

    const description = post.metaDesc && post.metaDesc.trim() !== ''
      ? post.metaDesc
      : post.content
        ? post.content.replace(/<[^>]*>/g, '').slice(0, 165).trim() + '...'
        : post.title;

    const schema = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": post.title,
      "description": description,
      "image": [imageUrl],
      "datePublished": dateStr,
      "dateModified": dateStr,
      "author": {
        "@type": "Organization",
        "name": "OJAS Exam",
        "url": window.location.origin
      },
      "publisher": {
        "@type": "Organization",
        "name": "OJAS Exam",
        "logo": {
          "@type": "ImageObject",
          "url": `${window.location.origin}/logo.svg`
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": window.location.href
      }
    };
    return JSON.stringify(schema);
  };

  const renderLatestUpdatesSidebar = () => (
    <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
          Latest Updates..!
        </h3>
      </div>

      {loadingLatest ? (
        <div className="py-6 text-center text-xs text-gray-500">તાજી અપડેટ્સ લોડ થઈ રહી છે...</div>
      ) : latestPosts.length === 0 ? (
        <p className="text-xs text-gray-500 text-center">કોઈ તાજી અપડેટ ઉપલબ્ધ નથી.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {latestPosts.map((lPost) => (
            <div
              key={lPost.id}
              onClick={() => {
                if (onPostClick) {
                  onPostClick(lPost);
                } else {
                  navigateToPost(lPost);
                }
              }}
              className="py-3 cursor-pointer group flex gap-3 items-start hover:bg-slate-50/50 -mx-2 px-2 rounded-xl transition-all"
            >
              <span className={`w-1 h-10 rounded-full shrink-0 ${
                lPost.category === 'job' ? 'bg-blue-500' :
                lPost.category === 'answer_key' ? 'bg-emerald-500' :
                lPost.category === 'result' ? 'bg-amber-500' :
                lPost.category === 'selection_list' ? 'bg-purple-500' :
                lPost.category === 'news' ? 'bg-sky-500' : 'bg-slate-400'
              }`} />
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-850 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                  {lPost.title}
                </h4>
                <p className="text-[9px] text-gray-400 font-medium">
                  {safeFormatDate(lPost.createdAt || lPost.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-fade-in py-0 sm:py-4 px-0 sm:px-6" id="blog-post-detail">
      {/* Schema.org NewsArticle Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: getSchemaJson() }}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-bold px-4 sm:px-0 pt-4 sm:pt-0">
        <button
          onClick={navigateToHome}
          className="hover:text-blue-600 transition-colors cursor-pointer text-slate-500 uppercase tracking-wide font-extrabold"
        >
          Home
        </button>
        <span className="text-slate-300 font-bold">{" >> "}</span>
        <button
          onClick={() => navigateToCategory(post.category)}
          className="hover:text-blue-600 transition-colors cursor-pointer text-slate-700 font-extrabold"
        >
          {getCategoryLabel(post.category)}
        </button>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Main content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Main Article Container */}
          <article className="bg-white p-4 md:p-6 space-y-5 border-x-0 sm:border border-gray-150 rounded-none sm:rounded-2xl shadow-none sm:shadow-xs">
            
            {/* Big Main Title */}
            <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-slate-900 leading-snug tracking-tight font-sans">
              {post.title}
            </h1>

            {/* Combined Author/Date & Share Block */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3 shadow-sm">
              {/* Top: Author & Date */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 font-medium pb-2.5 border-b border-gray-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold">✍️ Author:</span>
                  <strong className="text-slate-800">OJAS Exam</strong>
                </div>
                <div className="hidden md:block w-px h-3.5 bg-gray-200"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold">📅 Published on:</span>
                  <strong className="text-slate-800">{safeFormatDate(post.createdAt || post.date, 'gu-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                </div>
              </div>
              {/* Bottom: Share */}
              <div className="pt-0.5">
                <SocialShareButtons url={window.location.href} title={post.title} desc={post.metaDesc || ''} noBg />
              </div>
            </div>

            {/* (૧) સિંગલ પોસ્ટમાં હેડરની નીચે એડ સ્પેસ */}
            <AdSpace htmlCode={adsPostBelowHeader} className="my-2" />

            {/* Featured Image */}
            <div className="overflow-hidden bg-slate-50 border border-gray-150 max-h-[420px] relative md:max-w-[60%] md:mx-auto rounded-2xl shadow-sm">
              <img
                src={getProxiedImageUrl(post.thumbnail, 1200) || 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200'}
                alt={post.title}
                className="w-full object-cover max-h-[420px]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200';
                }}
              />
            </div>

            {/* (૨) thumb ની નીચે કન્ટેન્ટ પહેલા એડ સ્પેસ */}
            <AdSpace htmlCode={adsPostBelowThumb} className="my-2" />

            {/* Rich HTML Content Body */}
            <div className="pt-2 pb-4">
              <div
                className="prose max-w-none text-slate-800 font-sans text-base md:text-lg leading-relaxed space-y-6 focus:outline-none blog-news-content"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>

            {/* Dynamic SEO Tags */}
            {(() => {
              const { tags } = getFocusKeywordAndTags();
              return (
                tags && tags.length > 0 && (
                  <div className="border-t border-dashed border-gray-200 pt-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 text-xs">
                      <span className="font-extrabold text-slate-700 uppercase tracking-wider min-w-[120px] pt-1 flex items-center gap-1.5">
                        🏷️ ટેગ્સ (Tags):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, idx) => (
                          <span key={idx} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-xl font-bold transition-all hover:scale-[1.02]">
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              );
            })()}

            <div className="pt-2 pb-4">
              <SocialShareButtons url={window.location.href} title={post.title} desc={post.metaDesc || ''} />
            </div>

            {/* Author / Source attribution */}
            <div className="border-t border-gray-150 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
              <p>સ્રોત: <strong>સરકારી સત્તાવાર પોર્ટલ અને સમાચાર બોર્ડ</strong></p>
              <p>છેલ્લે અપડેટ કરેલ: {safeFormatDate(post.updatedAt || post.createdAt || post.date)} {(() => {
                const d = new Date(post.updatedAt || post.createdAt || post.date);
                return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('gu-IN', { hour: '2-digit', minute: '2-digit' });
              })()}</p>
            </div>
          </article>

          {/* (૩) સંબંધિત અન્ય માહિતી અને સમાચાર ની ઉપર એડ સ્પેસ */}
          <AdSpace htmlCode={adsPostAboveRelated} className="my-4 px-4 sm:px-0" />

          {/* Related Articles list */}
          <section className="space-y-4 px-4 sm:px-0" id="related-articles">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span>સંબંધિત અન્ય માહિતી અને સમાચાર</span>
            </h3>

            {loadingRelated ? (
              <div className="py-8 text-center text-xs text-gray-500">અન્ય સંબંધિત માહિતી લોડ થઈ રહી છે...</div>
            ) : relatedPosts.length === 0 ? (
              <p className="text-xs text-gray-500 bg-slate-50 p-4 rounded-xl text-center border border-gray-100">આ કેટેગરીમાં અન્ય કોઈ પોસ્ટ્સ ઉપલબ્ધ નથી.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((rPost) => {
                  // Estimate reading time for related post
                  const rWordCount = rPost.content ? rPost.content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
                  const rReadingTime = Math.max(1, Math.ceil(rWordCount / 120));

                  return (
                    <div
                      key={rPost.id}
                      onClick={() => {
                        if (onPostClick) {
                          onPostClick(rPost);
                        } else {
                          navigateToPost(rPost);
                        }
                      }}
                      className="bg-white rounded-none border border-gray-150 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer flex flex-col group justify-between"
                    >
                      <div>
                        {/* Thumbnail */}
                        <div className="h-36 w-full relative overflow-hidden bg-slate-100">
                          <img
                            src={getProxiedImageUrl(rPost.thumbnail, 400) || 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400'}
                            alt={rPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400';
                            }}
                          />
                        </div>
                        {/* Content */}
                        <div className="p-4 space-y-2">
                          <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{safeFormatDate(rPost.createdAt || rPost.date)}</span>
                            <span className="text-gray-200">•</span>
                            <span>{rReadingTime} મિનિટ</span>
                          </p>
                          <h4 className="font-extrabold text-xs text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                            {rPost.title}
                          </h4>
                        </div>
                      </div>
                      <div className="p-4 pt-0 text-[10px] font-bold text-blue-600 flex items-center justify-between group-hover:text-blue-700">
                        <span>વિગતવાર વાંચો</span>
                        <ChevronRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Side: Sticky Sidebar on Desktop */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-4 space-y-6">
          {renderLatestUpdatesSidebar()}
          {/* (૪) sidebar ની નીચે એડ સ્પેસ (ડેસ્કટોપ) */}
          <AdSpace htmlCode={adsSidebarBottom} className="mt-4" />
        </aside>
      </div>

      {/* Mobile Only: Below the related articles list */}
      <div className="block lg:hidden mt-8 px-4">
        {renderLatestUpdatesSidebar()}
        {/* (૪) sidebar ની નીચે એડ સ્પેસ (મોબાઇલ) */}
        <AdSpace htmlCode={adsSidebarBottom} className="mt-4" />
      </div>
    </div>
  );
}
