import React, { useState, useEffect } from 'react';
import { Briefcase, Key, Award, FileCheck, Calendar, ArrowRight, Eye, ChevronRight, X, BookOpen, FileText, Clock, Search, ExternalLink, CalendarDays, CheckCircle2, HelpCircle, Sparkles, Calculator, Cake, RefreshCw, Compass, ArrowDown, Users } from 'lucide-react';
import { BlogPost, Exam, User, ExamCalendarEvent } from '../types';
import { navigateToPost, navigateToSection } from '../utils/navigation';
import { safeFormatDate } from '../utils/date';
import { fetchWithCache } from '../utils/cache';

interface PublicHomeProps {
  onStartExamRequest: () => void;
  onPostClick?: (post: BlogPost) => void;
  onViewCategory?: (category: 'job' | 'answer_key' | 'result' | 'selection_list' | 'news') => void;
  user: User | null;
  onTakeExam: (examId: string) => void;
  onGoToMockTests?: () => void;
}

export default function PublicHome({ onStartExamRequest, onViewCategory, user, onTakeExam, onPostClick , onGoToMockTests}: PublicHomeProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [exams, setExams] = useState<Exam[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Calendar States
  const [calendarEvents, setCalendarEvents] = useState<ExamCalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarSearch, setCalendarSearch] = useState('');
  const [calendarDeptFilter, setCalendarDeptFilter] = useState('all');
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<'all' | 'ongoing' | 'upcoming' | 'completed' | 'delayed'>('all');

  useEffect(() => {
    const handleSelectBlogPost = (e: Event) => {
      const customEvent = e as CustomEvent<BlogPost>;
      if (customEvent.detail && onPostClick) {
        onPostClick(customEvent.detail);
      }
    };
    window.addEventListener("select-blog-post", handleSelectBlogPost);
    return () => {
      window.removeEventListener("select-blog-post", handleSelectBlogPost);
    };
  }, [onPostClick]);


  useEffect(() => {
    fetchWithCache<BlogPost[]>('/api/posts')
      .then(data => {
        // filter out drafts, sort so pinned is at the top
        const publicPosts = data.filter((p: any) => p.status !== 'draft');
        const sorted = [...publicPosts].sort((a: any, b: any) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const dateB = b.createdAt || b.date;
          const dateA = a.createdAt || a.date;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        setPosts(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching posts:', err);
        setLoading(false);
      });

    // Fetch exams
    fetchWithCache<Exam[]>('/api/exams')
      .then(data => {
        setExams(data);
        setExamsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching exams:', err);
        setExamsLoading(false);
      });

    // Fetch calendar events
    fetchWithCache<ExamCalendarEvent[]>('/api/calendar')
      .then(data => {
        setCalendarEvents(data);
        setCalendarLoading(false);
      })
      .catch(err => {
        console.error('Error fetching calendar events:', err);
        setCalendarLoading(false);
      });
  }, []);

  // Dynamic SEO meta tags management on home page mount
  useEffect(() => {
    document.title = 'OJAS EXAM | Online Exam Mock Test, OJAS Job Alerts & Results';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'ગુજરાતની તમામ સ્પર્ધાત્મક પરીક્ષાઓ (GPSC, Class 3, TET/TAT, Police Bharti) માટે ફ્રી Online Mock Test આપો, ન્યૂઝ Job Notifications મેળવો, Answer Key અને Result જુઓ ફક્ત OJAS EXAM પર.');
    }
  }, []);

  const categories = [
    { id: 'all', name: 'બધા અપડેટ્સ', icon: null, color: 'bg-gray-100 text-gray-800' },
    { id: 'job', name: 'નવી ભરતીઓ', icon: Briefcase, color: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'answer_key', name: 'આન્સર કી', icon: Key, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'result', name: 'રિઝલ્ટ', icon: Award, color: 'bg-amber-50 text-amber-800 border-amber-200' },
    { id: 'selection_list', name: 'સિલેક્શન લિસ્ટ', icon: FileCheck, color: 'bg-purple-50 text-purple-800 border-purple-200' },
    { id: 'news', name: 'સમાચાર', icon: BookOpen, color: 'bg-sky-50 text-sky-800 border-sky-200' },
  ];

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'job':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">નવી ભરતી</span>;
      case 'answer_key':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">આન્સર કી</span>;
      case 'result':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">રિઝલ્ટ</span>;
      case 'selection_list':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">સિલેક્શન લિસ્ટ</span>;
      case 'news':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100">સમાચાર</span>;
      default:
        return null;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'job': return <Briefcase className="h-5 w-5 text-blue-600" />;
      case 'answer_key': return <Key className="h-5 w-5 text-emerald-600" />;
      case 'result': return <Award className="h-5 w-5 text-amber-600" />;
      case 'selection_list': return <FileCheck className="h-5 w-5 text-purple-600" />;
      case 'news': return <BookOpen className="h-5 w-5 text-sky-600" />;
      default: return null;
    }
  };

  const filteredPosts = activeCategory === 'all' 
    ? posts 
    : posts.filter(p => p.category === activeCategory);

  // Group posts for homepage category grids
  const allJobs = posts.filter(p => p.category === 'job');
  const allAnswerKeys = posts.filter(p => p.category === 'answer_key');
  const allResults = posts.filter(p => p.category === 'result');
  const allSelectionLists = posts.filter(p => p.category === 'selection_list');
  const allNews = posts.filter(p => p.category === 'news');

  const jobs = allJobs.slice(0, 5);
  const answerKeys = allAnswerKeys.slice(0, 5);
  const results = allResults.slice(0, 5);
  const selectionLists = allSelectionLists.slice(0, 5);
  const news = allNews.slice(0, 5);

  const filteredCalendarEvents = calendarEvents.filter(evt => {
    const matchesSearch = evt.examName.toLowerCase().includes(calendarSearch.toLowerCase()) || 
                          evt.department.toLowerCase().includes(calendarSearch.toLowerCase());
    const matchesStatus = calendarStatusFilter === 'all' || evt.status === calendarStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderSectionPanel = (
    title: string,
    engTitle: string,
    catId: 'job' | 'answer_key' | 'result' | 'selection_list' | 'news',
    items: BlogPost[],
    totalCount: number,
    colorClasses: { bg: string; border: string; badgeBg: string; text: string; hoverBorder: string },
    IconComponent: React.ComponentType<any>
  ) => {
    return (
      <div className={`${colorClasses.bg} p-4.5 rounded-2xl border ${colorClasses.border} flex flex-col justify-between h-full hover:shadow-md transition-all duration-200`}>
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-150">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-xl ${colorClasses.badgeBg}`}>
                <IconComponent className="h-4.5 w-4.5" />
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">{title}</h3>
            </div>
            <span className={`text-xs font-extrabold ${colorClasses.text} bg-white/80 px-2 py-0.5 rounded-md border border-white/50 shadow-xs font-mono`}>
              {totalCount}
            </span>
          </div>
          <div className="space-y-4 mt-2">
            {items.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">ટૂંક સમયમાં ઉમેરવામાં આવશે</p>
            ) : (
              <ul className="space-y-3 pl-1">
                {items.map(p => (
                  <li 
                    key={p.id} 
                    onClick={() => navigateToPost(p)}
                    className="flex items-start gap-2.5 cursor-pointer group"
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 transition-transform group-hover:scale-125 ${
                      catId === 'job' ? 'bg-blue-600' :
                      catId === 'answer_key' ? 'bg-emerald-600' :
                      catId === 'result' ? 'bg-amber-600' :
                      catId === 'selection_list' ? 'bg-purple-600' :
                      'bg-sky-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-sm sm:text-[15px] text-gray-800 leading-snug group-hover:text-blue-600 transition-colors flex items-center flex-wrap gap-1">
                        {p.isPinned && <span className="bg-orange-100 text-orange-700 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider inline-flex items-center gap-0.5 shrink-0">📌 પિન કરેલ</span>}
                        <span>{p.title}</span>
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-2 font-medium">
                        <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> {safeFormatDate(p.createdAt || p.date)}</span>
                        {p.views ? <span className="text-slate-400">• 👁 {p.views} વ્યુઝ</span> : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {totalCount > 5 ? (
          <button 
            onClick={() => {
              if (onViewCategory) {
                onViewCategory(catId);
              } else {
                setActiveCategory(catId);
              }
            }} 
            className={`${colorClasses.text} hover:opacity-85 text-[11px] font-black mt-4 inline-flex items-center gap-1 hover:underline transition-all cursor-pointer`}
          >
            વધુ જુઓ <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          items.length > 0 && (
            <button 
              onClick={() => {
                if (onViewCategory) {
                  onViewCategory(catId);
                } else {
                  setActiveCategory(catId);
                }
              }} 
              className={`${colorClasses.text} hover:opacity-85 text-[11px] font-black mt-4 inline-flex items-center gap-1 hover:underline transition-all cursor-pointer`}
            >
              બધા જુઓ <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <div className="space-y-10 py-2">
      {/* Hero Banner Section */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-6 md:p-10 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 to-transparent"></div>
        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-semibold text-xs tracking-wide uppercase">
            🏆 સરકારી ભરતીની તૈયારી માટે બેસ્ટ પ્લેટફોર્મ
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-sans leading-tight">
            તમારી સરકારી નોકરી મેળવવાની સફરને <span className="text-blue-400">ઝડપી બનાવો</span>
          </h1>
          <p className="text-base md:text-lg text-indigo-100 font-sans max-w-2xl leading-relaxed">
            તલાટી, જુનિયર ક્લાર્ક, બિન સચિવાલય, GPSC, અને પોલીસ ભરતી માટેના વિશિષ્ટ મોક ટેસ્ટ, લેટેસ્ટ આન્સર કી અને મેરિટ એનાલિસિસ.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={onStartExamRequest}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 text-sm"
            >
              પરીક્ષા આપો (ટેસ્ટ આપો) <ArrowRight className="h-4.5 w-4.5" />
            </button>
            <a
              href="#updates-section"
              className="bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 rounded-xl border border-white/20 active:scale-[0.98] transition-all flex items-center gap-2 text-sm"
            >
              લેટેસ્ટ નોટિફિકેશન જુઓ
            </a>
          </div>
        </div>
      </section>

      {/* COMBINED EXAMS (ભરતી પરીક્ષા મોક ટેસ્ટ) */}
      <section className="bg-white rounded-2xl border border-gray-150 shadow-sm p-5 md:p-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-2.5 font-sans">
          <Award className="h-5 w-5 text-indigo-600" />
          ભરતી પરીક્ષા મોક ટેસ્ટ
        </h3>

        {examsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-500 mt-4">પરીક્ષાઓ લોડ થઈ રહી છે...</p>
          </div>
        ) : exams.length === 0 ? (
          <p className="text-gray-500">હાલમાં કોઈ પરીક્ષાઓ ઉપલબ્ધ નથી.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.slice(0, 4).map((exam) => (
                <div key={exam.id} className={`border rounded-2xl p-3.5 sm:p-4 md:p-5 hover:shadow-xl transition-all flex flex-col justify-between bg-slate-50/50 ${
                  exam.type === 'bharti' ? 'border-indigo-150 hover:border-indigo-500 shadow-sm' : 'border-blue-150 hover:border-blue-500 shadow-sm'
                }`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-3 border-b border-slate-100 pb-2 w-full">
                      {exam.type === 'bharti' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase bg-indigo-50 text-indigo-700 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-indigo-100">
                          💼 સત્તાવાર ભરતી
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-blue-100">
                          📝 મોક ટેસ્ટ
                        </span>
                      )}
                      {exam.type === 'bharti' && exam.totalVacancies && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] sm:text-[10px] md:text-[11px] font-bold">
                          <span className="bg-teal-50 text-teal-800 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full border border-teal-100 flex items-center gap-1 font-sans">
                            💼 જગ્યાઓ: <strong className="font-extrabold">{exam.totalVacancies}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <h4 className="font-black text-gray-800 text-lg md:text-xl leading-snug tracking-tight mb-2.5">{exam.name}</h4>
                    <div className="flex flex-wrap gap-4 text-sm font-semibold text-gray-500 mb-3">
                      {exam.type === 'bharti' && exam.examDate && (
                        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-400" /> પરીક્ષા તારીખ: {exam.examDate}</span>
                      )}
                      <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-slate-400" /> {exam.totalQuestions} પ્રશ્નો</span>
                      <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" /> {exam.duration} મિનિટ</span>
                    </div>
                    
                    {exam.type === 'bharti' && (
                      <div className="mt-3">
                        {exam.answerKeyUploaded ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 font-bold px-2.5 py-1 rounded-full border border-emerald-100">✔ ઓફિશિયલ આન્સર કી ઉપલબ્ધ</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 font-bold px-2.5 py-1 rounded-full border border-amber-100">⏳ પરિણામ બાકી (આન્સર કી અપલોડ બાકી)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Professional Banner & CTA */}
            <div className="mt-8 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles className="h-40 w-40" />
              </div>
              <div className="relative z-10 space-y-2 text-center md:text-left max-w-2xl">
                <h4 className="text-lg md:text-xl font-extrabold tracking-tight font-sans">
                  {user ? "સફળતા તરફ એક ડગલું આગળ વધો!" : "તમારી સફળતાની શરૂઆત અહીંથી કરો!"}
                </h4>
                <p className="text-sm md:text-base text-indigo-100 leading-relaxed font-medium">
                  {user 
                    ? "અમારા પોર્ટલ પર ઓનલાઈન પરીક્ષા આપો અને તમારી તૈયારીનું સાચું મૂલ્યાંકન કરો." 
                    : "રજીસ્ટ્રેશન કરો અને ૩ ફ્રી મોક ટેસ્ટ સાથે તમારી ક્ષમતા ચકાસો. મોડું ન કરો, હમણાં જ શરૂ કરો!"}
                </p>
              </div>
              {user ? (
                <button
                  onClick={() => onGoToMockTests?.()}
                  className="relative z-10 whitespace-nowrap bg-amber-500 hover:bg-amber-400 text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-base font-sans"
                >
                  મોક ટેસ્ટ આપો
                </button>
              ) : (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))}
                  className="relative z-10 whitespace-nowrap bg-amber-500 hover:bg-amber-400 text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-base font-sans"
                >
                  ફ્રી ટેસ્ટ આપો
                </button>
              )}
            </div>
          </>
        )}
      </section>





      <section className="space-y-6" id="updates-section">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-extrabold text-gray-900">મહત્વપૂર્ણ માહિતી બોર્ડ</h2>
          <p className="text-gray-600 mt-1 text-sm">નવીનતમ જાહેરાતો અને સત્તાવાર અપડેટ્સ મેળવો</p>
        </div>

        <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-100 justify-center md:justify-start">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  if (cat.id !== 'all' && onViewCategory) {
                    onViewCategory(cat.id as any);
                  }
                }}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border flex items-center gap-2 cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/15' 
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {cat.name}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-500 mt-4">માહિતી લોડ થઈ રહી છે...</p>
          </div>
        ) : filteredPosts.length === 0 ? (

          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">આ કેટેગરીમાં હાલ કોઈ નવી પોસ્ટ ઉપલબ્ધ નથી.</p>
          </div>
        ) : (
          /* Bento-style Category Highlight Grids */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            
            {/* NEW JOBS PANEL */}
            {(activeCategory === 'all' || activeCategory === 'job') && renderSectionPanel(
              'નવી ભરતીઓ',
              'New Jobs',
              'job',
              jobs,
              allJobs.length,
              { bg: 'bg-blue-50/50', border: 'border-blue-100/80', badgeBg: 'bg-blue-100 text-blue-800', text: 'text-blue-700', hoverBorder: 'border-blue-300' },
              Briefcase
            )}

            {/* ANSWER KEY PANEL */}
            {(activeCategory === 'all' || activeCategory === 'answer_key') && renderSectionPanel(
              'આન્સર કી',
              'Answer Keys',
              'answer_key',
              answerKeys,
              allAnswerKeys.length,
              { bg: 'bg-emerald-50/50', border: 'border-emerald-100/80', badgeBg: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-700', hoverBorder: 'border-emerald-300' },
              Key
            )}

            {/* RESULTS PANEL */}
            {(activeCategory === 'all' || activeCategory === 'result') && renderSectionPanel(
              'રિઝલ્ટ',
              'Results',
              'result',
              results,
              allResults.length,
              { bg: 'bg-amber-50/50', border: 'border-amber-100/80', badgeBg: 'bg-amber-100 text-amber-800', text: 'text-amber-700', hoverBorder: 'border-amber-300' },
              Award
            )}

            {/* SELECTION LIST PANEL */}
            {(activeCategory === 'all' || activeCategory === 'selection_list') && renderSectionPanel(
              'સિલેક્શન લિસ્ટ',
              'Selection Lists',
              'selection_list',
              selectionLists,
              allSelectionLists.length,
              { bg: 'bg-purple-50/50', border: 'border-purple-100/80', badgeBg: 'bg-purple-100 text-purple-800', text: 'text-purple-700', hoverBorder: 'border-purple-300' },
              FileCheck
            )}

            {/* NEWS/PORTAL PANEL */}
            {(activeCategory === 'all' || activeCategory === 'news') && renderSectionPanel(
              'સમાચાર',
              'News & Updates',
              'news',
              news,
              allNews.length,
              { bg: 'bg-sky-50/50', border: 'border-sky-100/80', badgeBg: 'bg-sky-100 text-sky-800', text: 'text-sky-700', hoverBorder: 'border-sky-300' },
              BookOpen
            )}

          </div>
        )}
      </section>

      {/* Exam Calendar Section */}
      <section className="bg-white rounded-2xl border border-gray-150 shadow-sm p-5 md:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shrink-0">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight font-sans">
                પરીક્ષા કેલેન્ડર (Exam Calendar)
              </h3>
              <p className="text-gray-500 text-xs mt-0.5 font-medium">
                સરકારી ભરતીઓની મહત્વપૂર્ણ તારીખો અને લાઈવ સમયપત્રક.
              </p>
            </div>
          </div>

          {/* Calendar Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl">
              {(['all', 'ongoing', 'upcoming', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setCalendarStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    calendarStatusFilter === st
                      ? 'bg-[#008080] text-white shadow-sm font-black'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900 bg-transparent border border-transparent'
                  }`}
                >
                  {st === 'all' ? 'બધા' :
                   st === 'ongoing' ? '🟢 ફોર્મ ચાલુ' :
                   st === 'upcoming' ? '⏳ આગામી' :
                   '✔ પૂર્ણ'}
                </button>
              ))}
            </div>

            {/* Calendar Search */}
            <div className="relative shrink-0 sm:w-60">
              <input
                type="text"
                placeholder="કેલેન્ડર શોધો..."
                value={calendarSearch}
                onChange={(e) => setCalendarSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#008080] focus:border-transparent shadow-sm"
              />
              <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>
        </div>

        {calendarLoading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="text-gray-400 text-xs mt-3">કેલેન્ડર લોડ થઈ રહ્યું છે...</p>
          </div>
        ) : filteredCalendarEvents.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
            <p className="text-gray-500 text-xs font-semibold">કેલેન્ડરમાં કોઈ સમયપત્રક મળ્યું નથી.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCalendarEvents.map((evt) => {
              let statusText = '⏳ આગામી ભરતી';
              let statusClasses = 'bg-amber-50 text-amber-700 border-amber-200';
              if (evt.status === 'ongoing') {
                statusText = '🟢 ફોર્મ ચાલુ';
                statusClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              } else if (evt.status === 'completed') {
                statusText = '✔ પૂર્ણ';
                statusClasses = 'bg-slate-100 text-slate-600 border-slate-200';
              } else if (evt.status === 'delayed') {
                statusText = '⚠️ નવી તારીખ';
                statusClasses = 'bg-rose-50 text-rose-700 border-rose-200';
              }

              // Color coordinate the departments beautifully
              let deptClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              if (evt.department === 'GPSSB') {
                deptClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              } else if (evt.department === 'GSSSB') {
                deptClasses = 'bg-purple-50 text-purple-700 border-purple-200';
              } else if (evt.department === 'GPSC') {
                deptClasses = 'bg-sky-50 text-sky-700 border-sky-200';
              } else if (evt.department === 'GPRB') {
                deptClasses = 'bg-blue-50 text-blue-700 border-blue-200';
              } else if (evt.department === 'HC') {
                deptClasses = 'bg-teal-50 text-teal-700 border-teal-200';
              } else {
                deptClasses = 'bg-slate-50 text-slate-700 border-slate-200';
              }

              return (
                <div
                  key={evt.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden hover:border-[#008080] group"
                >
                  {/* Subtle top indicator bar matching status */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    evt.status === 'ongoing' ? 'bg-emerald-500' :
                    evt.status === 'completed' ? 'bg-slate-400' :
                    evt.status === 'delayed' ? 'bg-rose-500' : 'bg-amber-500'
                  }`} />

                  <div className="space-y-4">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 pt-1.5">
                      <span className={`text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-full uppercase border tracking-wider ${deptClasses}`}>
                        {evt.department}
                      </span>
                      <span className={`text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-full border ${statusClasses}`}>
                        {statusText}
                      </span>
                    </div>

                    {/* Exam Name */}
                    <h4 className="font-extrabold text-[#003366] text-base sm:text-[17px] leading-snug group-hover:text-[#008080] transition-colors mt-2 tracking-tight min-h-[50px] line-clamp-2">
                      {evt.examName}
                    </h4>

                    {/* Dates Layout - Vertical Stack for crisp clarity and optional handling */}
                    <div className="space-y-2.5 mt-4">
                      {/* Start Date */}
                      <div className="flex items-center gap-3 bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100/50">
                        <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="block text-[10px] text-emerald-800 font-bold leading-none">ફોર્મ ભરવાની શરૂઆત</span>
                          <span className="block text-xs sm:text-sm font-black text-slate-900 mt-1">{safeFormatDate(evt.startDate)}</span>
                        </div>
                      </div>

                      {/* End Date */}
                      <div className="flex items-center gap-3 bg-rose-50/40 p-3 rounded-2xl border border-rose-100/50">
                        <div className="p-1.5 bg-rose-500 text-white rounded-lg">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="block text-[10px] text-rose-800 font-bold leading-none">છેલ્લી તારીખ</span>
                          <span className="block text-xs sm:text-sm font-black text-rose-950 mt-1">{safeFormatDate(evt.endDate)}</span>
                        </div>
                      </div>

                      {/* Optional Exam Date */}
                      {evt.examDate && evt.examDate !== '-' && evt.examDate.trim() !== '' && (
                        <div className="flex items-center gap-3 bg-blue-50/40 p-3 rounded-2xl border border-blue-100/50">
                          <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                            <CalendarDays className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="block text-[10px] text-blue-800 font-bold leading-none">પરીક્ષા તારીખ</span>
                            <span className="block text-xs sm:text-sm font-black text-slate-900 mt-1">{safeFormatDate(evt.examDate)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vacancies Panel & Action Button */}
                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between gap-3 px-1">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-500 font-bold">કુલ જગ્યાઓ</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {evt.expectedVacancies ? `${evt.expectedVacancies.toLocaleString('gu-IN')} જગ્યાઓ` : '૩૫૦૦ (અંદાજિત)'}
                      </span>
                    </div>

                    {evt.officialLink ? (
                      <a
                        href={evt.officialLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-[#008080] hover:bg-[#006666] text-white font-extrabold text-center py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> સત્તાવાર લિંક (Apply)
                      </a>
                    ) : (
                      <div className="w-full bg-slate-50 text-slate-400 font-bold text-center py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center border border-slate-200">
                        લિંક ટૂંક સમયમાં
                      </div>
                    )}
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
