import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, BookOpen, Briefcase, Key, Award, FileCheck, Search, Clock, ChevronRight, X, ExternalLink, Users, CalendarDays } from 'lucide-react';
import { BlogPost, ExamCalendarEvent } from '../types';
import { navigateToPost } from '../utils/navigation';
import { safeFormatDate } from '../utils/date';
import { getProxiedImageUrl } from '../utils/image';

interface BlogCategoryViewProps {
  category: 'job' | 'answer_key' | 'result' | 'selection_list' | 'news';
  onBack: () => void;
}

export default function BlogCategoryView({ category, onBack }: BlogCategoryViewProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Listen for the select-blog-post custom event (e.g. from related posts view)
  useEffect(() => {
    const handleSelectBlogPost = (e: Event) => {
      const customEvent = e as CustomEvent<BlogPost>;
      if (customEvent.detail) {
        navigateToPost(customEvent.detail);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('select-blog-post', handleSelectBlogPost);
    return () => {
      window.removeEventListener('select-blog-post', handleSelectBlogPost);
    };
  }, []);

  useEffect(() => {
    fetch('/api/posts')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: BlogPost[]) => {
        // Filter by category and exclude drafts
        const filtered = data.filter((p) => p.category === category && p.status !== 'draft');
        // Sort so that isPinned is at the top, then by date (createdAt desc)
        const sorted = [...filtered].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const dateB = b.createdAt || b.date;
          const dateA = a.createdAt || a.date;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        setPosts(sorted);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching category posts:', err);
        setLoading(false);
      });
  }, [category]);



  // Handle HTML document title for SEO
  useEffect(() => {
    const catLabel = getCategoryLabel(category);
    document.title = `${catLabel} - સરકારી અપડેટ્સ | ગુજરાત પરીક્ષા પોર્ટલ`;
  }, [category]);

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

  function getCategoryIcon(cat: string) {
    switch (cat) {
      case 'job': return <Briefcase className="h-6 w-6 text-blue-600" />;
      case 'answer_key': return <Key className="h-6 w-6 text-emerald-600" />;
      case 'result': return <Award className="h-6 w-6 text-amber-600" />;
      case 'selection_list': return <FileCheck className="h-6 w-6 text-purple-600" />;
      case 'news': return <BookOpen className="h-6 w-6 text-sky-600" />;
      default: return <BookOpen className="h-6 w-6 text-slate-600" />;
    }
  }

  function getCategoryColorClass(cat: string) {
    switch (cat) {
      case 'job': return 'from-blue-500/10 to-indigo-500/5 text-blue-800 border-blue-100';
      case 'answer_key': return 'from-emerald-500/10 to-teal-500/5 text-emerald-800 border-emerald-100';
      case 'result': return 'from-amber-500/10 to-orange-500/5 text-amber-800 border-amber-100';
      case 'selection_list': return 'from-purple-500/10 to-fuchsia-500/5 text-purple-800 border-purple-100';
      case 'news': return 'from-sky-500/10 to-blue-500/5 text-sky-800 border-sky-100';
      default: return 'from-slate-500/10 to-slate-500/5 text-slate-800 border-slate-100';
    }
  }

  const filteredAndSearchedPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8" id="blog-category-view">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-150 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-sm"
            title="પાછા જાઓ"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-slate-100 rounded-lg">
                {getCategoryIcon(category)}
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                {getCategoryLabel(category)}
              </h2>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              તમામ સત્તાવાર વિગતવાર અપડેટ્સ અને માહિતી પત્રકો.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="સર્ચ કરો..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-gray-400" />
        </div>
      </div>



      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-500 mt-4 font-sans text-sm">માહિતી લોડ થઈ રહી છે...</p>
        </div>
      ) : filteredAndSearchedPosts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            {getCategoryIcon(category)}
          </div>
          <h3 className="text-lg font-bold text-slate-800">હાલ કોઈ પોસ્ટ ઉપલબ્ધ નથી!</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
            {searchQuery 
              ? 'તમારી શોધ મુજબ કોઈ પરિણામ મળ્યું નથી. કૃપા કરીને અન્ય શબ્દોનો ઉપયોગ કરો.' 
              : 'આ કેટેગરીમાં ટૂંક સમયમાં નવી માહિતી અપડેટ કરવામાં આવશે.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-xs font-bold text-blue-600 hover:underline"
            >
              ફિલ્ટર સાફ કરો
            </button>
          )}
        </div>
      ) : (
        /* Blog Posts List Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSearchedPosts.map((post) => (
            <article
              key={post.id}
              onClick={() => navigateToPost(post)}
              className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer flex flex-col group h-full justify-between"
            >
              <div>
                {/* Thumbnail */}
                <div className="h-44 w-full relative overflow-hidden bg-slate-100">
                  <img
                    src={getProxiedImageUrl(post.thumbnail, 800) || 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800'}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800';
                    }}
                  />
                  <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-extrabold border bg-white/95 backdrop-blur-sm shadow-sm ${
                    post.category === 'job' ? 'text-blue-700 border-blue-200' :
                    post.category === 'answer_key' ? 'text-emerald-700 border-emerald-200' :
                    post.category === 'result' ? 'text-amber-700 border-amber-200' :
                    post.category === 'selection_list' ? 'text-purple-700 border-purple-200' :
                    'text-sky-700 border-sky-200'
                  }`}>
                    {getCategoryLabel(post.category)}
                  </div>
                  {post.isPinned && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-[9px] font-extrabold border bg-orange-600 text-white border-orange-500 shadow-sm flex items-center gap-1 animate-pulse">
                      <span>📌 પિન કરેલ</span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{safeFormatDate(post.createdAt || post.date)}</span>
                    </span>
                    {post.views ? (
                      <span className="flex items-center gap-1 text-slate-400">
                        <span>•</span>
                        <span>👁 {post.views} વ્યુઝ</span>
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-extrabold text-base text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h3>
                  {post.metaDesc && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {post.metaDesc}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-5 pb-5 pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-blue-600 font-bold group-hover:text-blue-700">
                <span>વિગતવાર માહિતી વાંચો</span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
