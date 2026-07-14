import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Share2, Bookmark, Clock, Copy, Check, ChevronRight, BookOpen } from 'lucide-react';
import { BlogPost } from '../types';
import { navigateToPost, navigateToCategory, navigateToHome } from '../utils/navigation';
import { safeFormatDate } from '../utils/date';

interface BlogPostDetailProps {
  post: BlogPost;
  onBack: () => void;
  onPostClick?: (post: BlogPost) => void;
}

const SocialShareButtons = ({ url, title, desc }: { url: string; title: string; desc: string }) => {
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
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-gray-150">
      <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mr-1">શેર કરો:</span>
      
      {/* WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02]"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.022-5.11-2.885-6.974C16.518 1.881 14.04 .856 11.4 1.157 11.4 1.157c-2.63 0-5.1 1.025-6.961 2.89-1.86 1.865-2.883 4.341-2.885 6.976-.002 1.81.488 3.402 1.413 4.961l-.995 3.637 3.737-.981zm12.333-6.232c-.302-.151-1.786-.882-2.051-.978-.264-.097-.456-.145-.648.145-.191.29-.741.978-.907 1.171-.166.194-.333.219-.635.068-.302-.151-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.086-.176-.302-.019-.465.132-.614.136-.135.302-.35.454-.527.151-.176.201-.302.302-.503.101-.201.05-.378-.025-.529-.075-.151-.648-1.562-.888-2.144-.233-.563-.469-.487-.648-.496-.168-.008-.36-.01-.552-.01s-.504.072-.768.36c-.264.29-1.01.987-1.01 2.405 0 1.417 1.03 2.784 1.174 2.977.144.193 2.027 3.096 4.91 4.34.686.296 1.222.473 1.639.605.69.219 1.319.188 1.816.114.553-.083 1.786-.73 2.039-1.435.252-.705.252-1.31.176-1.435-.076-.125-.276-.2-.578-.35z"/>
        </svg>
        WhatsApp
      </a>

      {/* Telegram */}
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02]"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M11.944 0C5.352 0 0 5.352 0 11.944c0 6.59 5.352 11.944 11.944 11.944 6.59 0 11.944-5.353 11.944-11.944C23.888 5.352 18.534 0 11.944 0zm5.666 8.3c-.166 1.75-1.017 6.758-1.45 9.07-.183.983-.545 1.313-.895 1.343-.762.066-1.341-.508-2.079-1.002-1.156-.774-1.81-1.253-2.932-1.996-1.296-.856-.455-1.327.283-2.094.193-.2 3.551-3.256 3.616-3.535.008-.035.015-.166-.063-.235-.078-.07-.193-.047-.276-.028-.117.026-1.986 1.261-5.61 3.71-.531.365-1.012.544-1.442.535-.474-.01-1.387-.267-2.065-.487-.831-.27-1.492-.413-1.434-.872.03-.24.36-.486.992-.738 3.893-1.694 6.488-2.81 7.785-3.348 3.705-1.536 4.475-1.802 4.977-1.81.11-.002.356.025.514.153.133.107.17.25.188.35.02.112.024.322.01.464z"/>
        </svg>
        Telegram
      </a>

      {/* Twitter (X) */}
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02]"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        X (Twitter)
      </a>

      {/* Copy link */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'કોપી થઈ ગઈ!' : 'લિંક કોપી'}
      </button>
    </div>
  );
};

export default function BlogPostDetail({ post, onBack, onPostClick }: BlogPostDetailProps) {
  const [copied, setCopied] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(true);

  // Set the document title dynamically like a real news website
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${post.title} | ગુજરાત પરીક્ષા પોર્ટલ`;
    
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-4" id="blog-post-detail">
      {/* Main Article Container */}
      <article className="bg-white border border-gray-150 shadow-sm p-6 md:p-10 space-y-6">
        
        {/* Category & Meta Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wide ${getCategoryColor(post.category)}`}>
              {getCategoryLabel(post.category)}
            </span>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{safeFormatDate(post.createdAt || post.date, 'gu-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>
            <div className="items-center gap-1.5 text-xs text-gray-500 font-medium hidden sm:flex">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>આશરે {readingTime} મિનિટ વાંચન</span>
            </div>
          </div>

          {/* Social Interactions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCopyLink}
              className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl border border-gray-200 hover:border-blue-200 transition-colors cursor-pointer"
              title="લિંક કોપી કરો"
            >
              {copied ? <Check className="h-4.5 w-4.5 text-emerald-600" /> : <Copy className="h-4.5 w-4.5" />}
            </button>
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: post.title,
                    text: post.metaDesc || '',
                    url: window.location.href,
                  });
                } else {
                  handleCopyLink();
                }
              }}
              className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl border border-gray-200 hover:border-blue-200 transition-colors cursor-pointer"
              title="શેર કરો"
            >
              <Share2 className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Big Main Title */}
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-snug tracking-tight font-sans">
          {post.title}
        </h1>

        <SocialShareButtons url={window.location.href} title={post.title} desc={post.metaDesc || ''} />

        {/* Featured Image */}
        <div className="overflow-hidden bg-slate-50 border border-gray-150 max-h-[420px] relative">
          <img
            src={post.thumbnail || 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200'}
            alt={post.title}
            className="w-full object-cover max-h-[420px] w-full"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200';
            }}
          />
        </div>

        {/* Rich HTML Content Body */}
        <div className="pt-4 pb-6">
          <div
            className="prose max-w-none text-slate-800 font-sans text-base md:text-lg leading-relaxed space-y-6 focus:outline-none blog-news-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        <div className="pt-2 pb-4">
          <SocialShareButtons url={window.location.href} title={post.title} desc={post.metaDesc || ''} />
        </div>

        {/* Author / Source attribution */}
        <div className="border-t border-gray-150 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>સ્રોત: <strong>સરકારી સત્તાવાર પોર્ટલ અને સમાચાર બોર્ડ</strong></p>
          <p>છેલ્લે અપડેટ કરેલ: {safeFormatDate(post.createdAt || post.date)} {(() => {
            const d = new Date(post.createdAt || post.date);
            return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('gu-IN', { hour: '2-digit', minute: '2-digit' });
          })()}</p>
        </div>

        {/* SEO Metadata Card */}
        {post.metaTitle && (
          <div className="bg-slate-50 p-5 border border-slate-200/60 flex items-start gap-4 shadow-inner">
            <span className="p-2 bg-blue-100 text-blue-800 rounded-xl shrink-0 mt-0.5 font-bold">
              🔎
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">SEO પૃષ્ઠ વિગતો (મેટા સર્ચ વિગત)</h4>
              <p className="text-xs text-slate-600"><strong>મેટા શીર્ષક:</strong> {post.metaTitle}</p>
              <p className="text-xs text-slate-600"><strong>મેટા વર્ણન:</strong> {post.metaDesc || 'કોઈ ખાસ વર્ણન નથી'}</p>
            </div>
          </div>
        )}
      </article>

      {/* Related Articles list */}
      <section className="space-y-4" id="related-articles">
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
                        src={rPost.thumbnail || 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400'}
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
  );
}
