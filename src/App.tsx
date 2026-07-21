import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BookOpen, Trophy, Award, LogIn, LogOut, ShieldAlert, User as UserIcon, Menu, X, ArrowLeft, Sun, Moon, Phone, Mail, Check, Loader2 } from 'lucide-react';
import { User, Exam, BlogPost } from './types';
import PublicHome from './components/PublicHome';
const AgeCalculator = lazy(() => import('./components/AgeCalculator'));
const AuthPages = lazy(() => import('./components/AuthPages'));
const UserDashboard = lazy(() => import('./components/UserDashboard'));
const ExamEngine = lazy(() => import('./components/ExamEngine'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
import NotificationBell from './components/NotificationBell';
const BlogCategoryView = lazy(() => import('./components/BlogCategoryView'));
const BlogPostDetail = lazy(() => import('./components/BlogPostDetail'));
const ExamInstructionsModal = lazy(() => import('./components/ExamInstructionsModal'));
const StaticPage = lazy(() => import('./components/StaticPage'));
import { navigateToHome, navigateToCategory, navigateToSection, navigateToPost } from './utils/navigation';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentSection, setCurrentSection] = useState<'home' | 'leaderboard' | 'dashboard' | 'admin' | 'auth' | 'blog' | 'age_calculator' | 'static_page'>('home');
  const [activeStaticPageKey, setActiveStaticPageKey] = useState<'about' | 'privacy' | 'terms' | 'disclaimer' | 'refund'>('about');
  const [selectedBlogCategory, setSelectedBlogCategory] = useState<'job' | 'answer_key' | 'result' | 'selection_list' | 'news'>('job');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examToConfirm, setExamToConfirm] = useState<Exam | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [examResultView, setExamResultView] = useState(false);
  const [activeBlogPost, setActiveBlogPost] = useState<BlogPost | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [subStatus, setSubStatus] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    const isAlreadyInstalled = localStorage.getItem('pwa_installed') === 'true';
    const isDismissed = sessionStorage.getItem('pwa_install_dismissed') === 'true';

    if (isStandalone || isAlreadyInstalled) {
      localStorage.setItem('pwa_installed', 'true');
      setShowInstallBanner(false);
      return;
    }

    // Check if the app is already installed using the getInstalledRelatedApps API
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
        if (relatedApps && relatedApps.length > 0) {
          localStorage.setItem('pwa_installed', 'true');
          setShowInstallBanner(false);
        }
      }).catch(() => {});
    }

    // iOS check since iOS doesn't fire beforeinstallprompt but can be installed manually
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && !isDismissed) {
      setShowInstallBanner(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed && localStorage.getItem('pwa_installed') !== 'true') {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      localStorage.setItem('pwa_installed', 'true');
      setShowInstallBanner(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("તમારા બ્રાઉઝરમાં ઇન્સ્ટોલ કરવા માટે: બ્રાઉઝરના સેટિંગ્સ મેનૂ (ત્રણ ટપકાં) પર ક્લિક કરો અને 'Add to Home screen' અથવા 'Install App' પસંદ કરો.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice outcome: ${outcome}`);
    if (outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismissBanner = () => {
    sessionStorage.setItem('pwa_install_dismissed', 'true');
    setShowInstallBanner(false);
  };
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  // Restore logged-in user session from localStorage if exists

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);



  useEffect(() => {
    const stored = localStorage.getItem('exam_user');
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);

        // Verify if the logged-in user is blocked on app startup
        if (parsedUser.token) {
          fetch('/api/user/subscription-status', {
            headers: { 'Authorization': `Bearer ${parsedUser.token}` }
          }).then(async res => {
            if (res.status === 401) {
              window.dispatchEvent(new CustomEvent('user-blocked', { detail: 'તમારી લોગીન વિગતો અમાન્ય છે અથવા સેકશન સમાપ્ત થઈ ગઈ છે. કૃપા કરીને ફરી લોગીન કરો.' }));
            } else if (res.status === 423) {
              window.dispatchEvent(new CustomEvent('user-blocked', { detail: 'તમારૂ એકાઉન્ટ એડમિન દ્વારા સસ્પેન્ડ કરવામાં આવ્યું છે. વધુ માહિતી માટે એડમિનનો સંપર્ક કરો.' }));
            } else if (res.ok) {
              const data = await res.json();
              setSubStatus(data);
              if (parsedUser.subscriptionPlan !== data.subscriptionPlan || parsedUser.subscriptionExpiry !== data.subscriptionExpiry) {
                const updatedUser = { ...parsedUser, subscriptionPlan: data.subscriptionPlan, subscriptionExpiry: data.subscriptionExpiry };
                setUser(updatedUser);
                localStorage.setItem('exam_user', JSON.stringify(updatedUser));
              }
            }
          }).catch(err => {
            console.warn('Silent note: Error checking user block status on load:', err);
          });
        }
      } catch (err) {
        console.error('Error parsing stored user:', err);
      }
    }
  }, []);

  useEffect(() => {
    const handleUserBlocked = (e: Event) => {
      setUser(null);
      setSubStatus(null);
      localStorage.removeItem('exam_user');
      const detail = (e as CustomEvent).detail;
      alert(detail || 'તમારૂ એકાઉન્ટ એડમિન દ્વારા સસ્પેન્ડ કરવામાં આવ્યું છે. વધુ માહિતી માટે એડમિનનો સંપર્ક કરો.');
      navigateToHome();
    };
    window.addEventListener('user-blocked', handleUserBlocked);
    return () => {
      window.removeEventListener('user-blocked', handleUserBlocked);
    };
  }, []);

  useEffect(() => {
    const handleOpenAuth = (e: Event) => {
      const mode = (e as CustomEvent).detail || 'register';
      setAuthMode(mode);
      navigateToSection('auth');
    };
    window.addEventListener('open-auth', handleOpenAuth);
    return () => {
      window.removeEventListener('open-auth', handleOpenAuth);
    };
  }, []);

  // URL router state-synchronizer
  const handleUrlRouting = async () => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    const validCategories = ['job', 'answer_key', 'result', 'selection_list', 'news'];
    
    if (segments.length === 2 && validCategories.includes(segments[0])) {
      const category = segments[0];
      const slug = decodeURIComponent(segments[1]);
      if (slug) {
        setLoadingPost(true);
        setCurrentSection('blog');
        try {
          const res = await fetch(`/api/posts/slug/${encodeURIComponent(slug)}`);
          if (res.ok) {
            const postData = await res.json();
            setActiveBlogPost(postData);
            setSelectedBlogCategory(category as any);
            setCurrentSection('blog');
          } else {
            console.error('Failed to load post by slug:', slug);
            setActiveBlogPost(null);
            setCurrentSection('home');
          }
        } catch (err) {
          console.error('Error fetching post:', err);
          setActiveBlogPost(null);
          setCurrentSection('home');
        } finally {
          setLoadingPost(false);
        }
      }
    } else if (path.startsWith('/post/')) {
      const slug = decodeURIComponent(path.substring(6)); // Get the part after "/post/"
      if (slug) {
        setLoadingPost(true);
        setCurrentSection('blog');
        try {
          const res = await fetch(`/api/posts/slug/${encodeURIComponent(slug)}`);
          if (res.ok) {
            const postData = await res.json();
            setActiveBlogPost(postData);
            setSelectedBlogCategory(postData.category || 'job');
            setCurrentSection('blog');
            // Redirect / rewrite URL in address bar to new category permalink structure
            window.history.replaceState({}, '', `/${postData.category || 'job'}/${slug}/`);
          } else {
            console.error('Failed to load post by slug:', slug);
            setActiveBlogPost(null);
            setCurrentSection('home');
          }
        } catch (err) {
          console.error('Error fetching post:', err);
          setActiveBlogPost(null);
          setCurrentSection('home');
        } finally {
          setLoadingPost(false);
        }
      }
    } else if (path.startsWith('/blog/')) {
      const category = path.substring(6);
      if (['job', 'answer_key', 'result', 'selection_list', 'news'].includes(category)) {
        setSelectedBlogCategory(category as any);
        setActiveBlogPost(null);
        setCurrentSection('blog');
      } else {
        setCurrentSection('home');
      }
    } else if (path === '/leaderboard') {
      setActiveBlogPost(null);
      setCurrentSection('leaderboard');
    } else if (path === '/dashboard') {
      setActiveBlogPost(null);
      if (!localStorage.getItem('exam_user')) {
        setAuthMode('login');
        setCurrentSection('auth');
        window.history.replaceState({}, '', '/auth');
      } else {
        setCurrentSection('dashboard');
      }
    } else if (path === '/admin') {
      setActiveBlogPost(null);
      setCurrentSection('admin');
    } else if (path === '/auth') {
      setActiveBlogPost(null);
      setCurrentSection('auth');
    } else if (path === '/about' || path === '/about/') {
      setActiveBlogPost(null);
      setActiveStaticPageKey('about');
      setCurrentSection('static_page');
    } else if (path === '/privacy' || path === '/privacy/') {
      setActiveBlogPost(null);
      setActiveStaticPageKey('privacy');
      setCurrentSection('static_page');
    } else if (path === '/terms' || path === '/terms/') {
      setActiveBlogPost(null);
      setActiveStaticPageKey('terms');
      setCurrentSection('static_page');
    } else if (path === '/disclaimer' || path === '/disclaimer/') {
      setActiveBlogPost(null);
      setActiveStaticPageKey('disclaimer');
      setCurrentSection('static_page');
    } else if (path === '/refund' || path === '/refund/') {
      setActiveBlogPost(null);
      setActiveStaticPageKey('refund');
      setCurrentSection('static_page');
    } else if (path === '/age_calculator') {
      setActiveBlogPost(null);
      setCurrentSection('age_calculator');
    } else {
      setActiveBlogPost(null);
      setCurrentSection('home');
    }
  };

  useEffect(() => {
    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => {
      window.removeEventListener('popstate', handleUrlRouting);
    };
  }, []);

  // Scroll to top of window when active section, blog category or active blog post changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentSection, selectedBlogCategory, activeBlogPost]);

  const handleNavigateToStaticPage = (key: 'about' | 'privacy' | 'terms' | 'disclaimer' | 'refund') => {
    setActiveStaticPageKey(key);
    setCurrentSection('static_page');
    window.history.pushState({}, '', `/${key}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const handleAuthSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('exam_user', JSON.stringify(loggedInUser));
    
    // Fetch subscription status for the newly logged-in user
    if (loggedInUser.token) {
      fetch('/api/user/subscription-status', {
        headers: { 'Authorization': `Bearer ${loggedInUser.token}` }
      }).then(async res => {
        if (res.ok) {
          const data = await res.json();
          setSubStatus(data);
        }
      }).catch(err => {
        console.warn('Error fetching subscription status on login:', err);
      });
    } else {
      setSubStatus(null);
    }

    if (!loggedInUser.name || !loggedInUser.email || !loggedInUser.dob) {
      setCurrentSection('dashboard');
    } else {
      navigateToSection('dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSubStatus(null);
    localStorage.removeItem('exam_user');
    navigateToHome();
  };


  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    try {
      setPaymentLoading(plan);
      const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
      
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan })
      });
      if (!orderRes.ok) throw new Error('Order creation failed');
      const orderData = await orderRes.json();

      const keyRes = await fetch('/api/settings/razorpay-key');
      const keyData = await keyRes.json();

      const options = {
        key: keyData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ગુજરાત પરીક્ષા પોર્ટલ",
        description: plan === 'monthly' ? "Monthly Mock Test Subscription" : "Yearly Mock Test Subscription",
        order_id: orderData.id,
        handler: async function (response: any) {
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ...response, plan })
          });
          if (verifyRes.ok) {
             alert('સબસ્ક્રિપ્શન સફળતાપૂર્વક અપડેટ થયું છે!');
             setShowPaywall(false);
             // reload user details
             window.location.reload();
          } else {
             alert('ચુકવણી નિષ્ફળ ગઈ. કૃપા કરીને ફરી પ્રયાસ કરો.');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone
        },
        theme: {
          color: "#4f46e5"
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (e) {
      alert('એડમીન દ્વારા હજી આ મોડ્યુલ ચાલુ કરવામાં નથી આવ્યું.');
    } finally {
      setPaymentLoading(null);
    }
  };

  const handleTakeExamRequest = async (examId: string) => {
    console.log("TAKING EXAM", examId);
    if (!user) {
      setAuthMode('login');
      setCurrentSection('auth');
      return;
    }

    try {

      // Check subscription
      const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
      if (token) {
         const subRes = await fetch('/api/user/subscription-status', {
           headers: { 'Authorization': `Bearer ${token}` }
         });
         if (subRes.status === 401) {
           window.dispatchEvent(new CustomEvent('user-blocked', { detail: 'તમારી લોગીન વિગતો અમાન્ય છે અથવા સેકશન સમાપ્ત થઈ ગઈ છે. કૃપા કરીને ફરી લોગીન કરો.' }));
           return;
         }
         if (subRes.status === 403) {
           window.dispatchEvent(new CustomEvent('user-blocked'));
           return;
         }
         if (subRes.ok) {
           const subData = await subRes.json();
           setSubStatus(subData);
           if (!subData.canTakeTest) {
             setShowPaywall(true);
             return;
           }
         }

         // Check if user has already taken this exam
         const historyRes = await fetch(`/api/user/exams/${user.id}`, {
           headers: { 'Authorization': `Bearer ${token}` }
         });
         if (historyRes.ok) {
           const historyData = await historyRes.json();
           const alreadyTaken = historyData.some((h: any) => h.examId === Number(examId));
           if (alreadyTaken && (!user.subscriptionPlan || user.subscriptionPlan === 'free')) {
             alert('આ મોકટેસ્ટ તમે આપી દીધેલ છે. અનલિમિટેડ વખત આપવા માટે પ્રીમિયમ સબસ્ક્રિપ્શન ખરીદો.');
             return;
           }
         }
      }

      const res = await fetch(`/api/exams/${examId}`);
      if (!res.ok) throw new Error('કસોટી ડેટા લાવવામાં ભૂલ.');
      const examData = await res.json();
      setExamResultView(false);
      setExamToConfirm(examData);
      window.scrollTo(0, 0);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFinishExam = () => {
    setActiveExam(null);
    setExamResultView(false);
    setCurrentSection('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-between font-sans text-gray-800 selection:bg-blue-600 selection:text-white">
      
      {showInstallBanner && (
        <div className="bg-[#C8D7FF] text-slate-900 border-b-2 border-[#0D95FF] shadow-sm relative z-50 transition-all font-sans">
          <div className="w-full max-w-full px-4 sm:px-6 lg:px-12 py-3 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <button
                onClick={handleDismissBanner}
                className="text-slate-700 hover:text-slate-950 p-1.5 hover:bg-slate-950/10 rounded-full transition-colors cursor-pointer shrink-0"
                title="Dismiss"
                id="pwa-dismiss-button"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex flex-col min-w-0">
                <p className="font-extrabold text-xs sm:text-sm md:text-base tracking-tight leading-snug text-slate-950 flex items-center gap-2">
                  App ઇન્સ્ટોલ કરો 📱
                </p>
                <p className="text-[11px] sm:text-xs md:text-sm text-slate-800 font-medium leading-normal mt-0.5">
                  ઝડપી, સુરક્ષિત અને શ્રેષ્ઠ ટેસ્ટ અનુભવ માટે પરીક્ષા પોર્ટલ એપ્લિકેશન ડાઉનલોડ કરો.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center">
              <button
                onClick={handleInstallClick}
                className="bg-[#0D95FF] hover:bg-[#0084ff] text-white font-extrabold text-xs md:text-sm px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-blue-500/20"
                id="pwa-install-button"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* HEADER NAVIGATION BAR */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-150 shadow-sm sticky top-0 z-40 transition-all">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-12 h-20 flex justify-between items-center">
          
          {/* Logo Name */}
          <div 
            onClick={() => navigateToHome()}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <img 
              src="/logo.svg" 
              alt="ગુજરાત પરીક્ષા પોર્ટલ" 
              className="w-11 h-11 object-contain group-hover:scale-105 transition-transform" 
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tight font-sans block group-hover:text-emerald-600 transition-colors">
                ગુજરાત પરીક્ષા પોર્ટલ
              </span>
            </div>
          </div>

          {/* Navigation Links - Desktop */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-5">
            <button
              onClick={() => navigateToHome()}
              className={`font-black text-[15px] xl:text-[16.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] flex items-center gap-1.5 shadow-sm border ${
                currentSection === 'home' 
                  ? 'text-blue-700 bg-blue-50 border-blue-200 shadow-blue-500/5' 
                  : 'text-slate-700 bg-white border-slate-200 hover:text-blue-600 hover:border-blue-300'
              }`}
            >
              🏠 Home
            </button>

            {/* Content Categorized Update Pages */}
            <div className="h-6 w-px bg-slate-200"></div>
            
            <button
              onClick={() => navigateToCategory('job')}
              className={`font-black text-[14px] xl:text-[15.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] border flex items-center gap-1 ${
                currentSection === 'blog' && selectedBlogCategory === 'job' 
                  ? 'text-blue-700 bg-blue-50/90 border-blue-200 shadow-md shadow-blue-500/5' 
                  : 'text-slate-700 bg-white border-slate-200 hover:bg-blue-50/30 hover:border-blue-200 hover:text-blue-600'
              }`}
            >
              💼 નવી ભરતીઓ
            </button>
            <button
              onClick={() => navigateToCategory('answer_key')}
              className={`font-black text-[14px] xl:text-[15.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] border flex items-center gap-1 ${
                currentSection === 'blog' && selectedBlogCategory === 'answer_key' 
                  ? 'text-emerald-700 bg-emerald-50/90 border-emerald-200 shadow-md shadow-emerald-500/5' 
                  : 'text-slate-700 bg-white border-slate-200 hover:bg-emerald-50/30 hover:border-emerald-200 hover:text-emerald-600'
              }`}
            >
              🔑 આન્સર કી
            </button>
            <button
              onClick={() => navigateToCategory('result')}
              className={`font-black text-[14px] xl:text-[15.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] border flex items-center gap-1 ${
                currentSection === 'blog' && selectedBlogCategory === 'result' 
                  ? 'text-amber-700 bg-amber-50/90 border-amber-200 shadow-md shadow-amber-500/5' 
                  : 'text-slate-700 bg-white border-slate-200 hover:bg-amber-50/30 hover:border-amber-200 hover:text-amber-600'
              }`}
            >
              🏆 રિઝલ્ટ
            </button>
            <button
              onClick={() => navigateToCategory('selection_list')}
              className={`font-black text-[14px] xl:text-[15.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] border flex items-center gap-1 ${
                currentSection === 'blog' && selectedBlogCategory === 'selection_list' 
                  ? 'text-purple-700 bg-purple-50/90 border-purple-200 shadow-md shadow-purple-500/5' 
                  : 'text-slate-700 bg-white border-slate-200 hover:bg-purple-50/30 hover:border-purple-200 hover:text-purple-600'
              }`}
            >
              📋 સિલેક્શન લિસ્ટ
            </button>
            <button
              onClick={() => navigateToCategory('news')}
              className={`font-black text-[14px] xl:text-[15.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] border flex items-center gap-1 ${
                currentSection === 'blog' && selectedBlogCategory === 'news' 
                  ? 'text-sky-700 bg-sky-50/90 border-sky-200 shadow-md shadow-sky-500/5' 
                  : 'text-slate-700 bg-white border-slate-200 hover:bg-sky-50/30 hover:border-sky-200 hover:text-sky-600'
              }`}
            >
              📰 સમાચાર
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 p-2.5 rounded-xl text-gray-700 dark:text-slate-200 cursor-pointer transition-all duration-200"
              title={theme === 'dark' ? 'લાઇટ મોડ (Light Mode)' : 'ડાર્ક મોડ (Dark Mode)'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-slate-700" />}
            </button>
            <NotificationBell />
            {user ? (
              <div className="flex items-center gap-3">
                <div 
                  onClick={() => navigateToSection('dashboard')}
                  className="flex items-center gap-2 bg-slate-50 border border-gray-150 px-4 py-2 rounded-xl hover:bg-slate-100 hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="w-6.5 h-6.5 bg-blue-600 text-white font-bold rounded-full text-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                    {user.name ? user.name[0] : 'ર'}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{user.name || 'રમેશભાઈ પટેલ'}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold p-2.5 rounded-xl transition-all cursor-pointer border border-red-100"
                  title="લોગઆઉટ"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  navigateToSection('auth');
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/15 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 text-sm"
              >
                <LogIn className="h-4 w-4" /> લોગિન / નોંધણી
              </button>
            )}
          </div>

          {/* Mobile actions & menu toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 p-2 rounded-xl text-gray-700 dark:text-slate-200 cursor-pointer transition-all duration-200"
              title={theme === 'dark' ? 'લાઇટ મોડ' : 'ડાર્ક મોડ'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>
            <NotificationBell />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="bg-slate-50 hover:bg-slate-100 border border-gray-200 p-2.5 rounded-xl text-gray-700 cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="lg:hidden border-t border-gray-100 bg-white px-4 pt-2 pb-6 shadow-inner max-h-[85vh] overflow-y-auto overflow-x-hidden"
            >
              <div className="space-y-2">
                {/* Conditional Submenu on Mobile */}
                {!user ? (
                  /* Content Categories Submenu on Mobile (when NOT logged in) */
                  <div className="pb-1 divide-y divide-gray-200">
                    <button
                      onClick={() => {
                        navigateToHome();
                        setIsMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold ${
                        currentSection === 'home' ? 'text-blue-600 bg-blue-50 dark:bg-slate-800' : 'text-gray-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      🏠 હોમ (Home)
                    </button>
                    <button
                      onClick={() => {
                        navigateToCategory('job');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold transition-all duration-200 ${
                        currentSection === 'blog' && selectedBlogCategory === 'job' ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      💼 નવી ભરતીઓ
                    </button>
                    <button
                      onClick={() => {
                        navigateToCategory('answer_key');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold transition-all duration-200 ${
                        currentSection === 'blog' && selectedBlogCategory === 'answer_key' ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      🔑 આન્સર કી
                    </button>
                    <button
                      onClick={() => {
                        navigateToCategory('result');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold transition-all duration-200 ${
                        currentSection === 'blog' && selectedBlogCategory === 'result' ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      🏆 રિઝલ્ટ
                    </button>
                    <button
                      onClick={() => {
                        navigateToCategory('selection_list');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold transition-all duration-200 ${
                        currentSection === 'blog' && selectedBlogCategory === 'selection_list' ? 'text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-slate-700' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      📋 સિલેક્શન લિસ્ટ
                    </button>
                    <button
                      onClick={() => {
                        navigateToCategory('news');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold transition-all duration-200 ${
                        currentSection === 'blog' && selectedBlogCategory === 'news' ? 'text-sky-600 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      📰 સમાચાર (News)
                    </button>
                  </div>
                ) : (
                  /* Dashboard Tabs Submenu on Mobile (when logged in) */
                  <div className="pb-1 divide-y divide-gray-200">
                    <button
                      onClick={() => {
                        navigateToHome();
                        setIsMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold ${
                        currentSection === 'home' ? 'text-blue-600 bg-blue-50 dark:bg-slate-800' : 'text-gray-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      🏠 હોમ (Home)
                    </button>
                    <button
                      onClick={() => {
                        navigateToSection('dashboard');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'dashboard' }));
                        }, 100);
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                      📊 ડેશબોર્ડ
                    </button>
                    <button
                      onClick={() => {
                        navigateToSection('dashboard');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'merit_list' }));
                        }, 100);
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                      🏆 મેરીટ લીસ્ટ
                    </button>
                    <button
                      onClick={() => {
                        navigateToSection('dashboard');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'mock_tests' }));
                        }, 100);
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                      📝 મોક ટેસ્ટ આપો
                    </button>
                    <button
                      onClick={() => {
                        navigateToSection('dashboard');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'bookmarks' }));
                        }, 100);
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                      🔖 સેવ કરેલા પ્રશ્નો (Bookmarks)
                    </button>

                    <button
                      onClick={() => {
                        setShowPaywall(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold text-indigo-700 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                      🎗️ સબસ્ક્રિપ્શન પ્લાન
                    </button>
                    <button
                      onClick={() => {
                        navigateToSection('dashboard');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'change_password' }));
                        }, 100);
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                      🔑 પાસવર્ડ બદલો
                    </button>
                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          navigateToSection('dashboard');
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'admin' }));
                          }, 100);
                          setIsMobileMenuOpen(false);
                        }}
                        className="block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200"
                      >
                        🛠️ એડમીન પેનલ
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigateToSection('age_calculator');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-6 py-2.5 rounded-xl text-[17px] font-bold ${
                        currentSection === 'age_calculator' ? 'text-indigo-600 bg-indigo-50 dark:bg-slate-800' : 'text-gray-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      🎂 ઉમર ગણતરી (Age Calculator)
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                  {user ? (
                    <div className="space-y-3">
                      <div 
                        onClick={() => {
                          navigateToSection('dashboard');
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'profile' }));
                          }, 100);
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
                      >
                        <div className="w-9 h-9 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center text-sm shrink-0">
                          {user.name ? user.name[0] : 'ર'}
                        </div>
                        <div>
                          <span className="font-extrabold text-gray-800 dark:text-slate-200 text-[14px] block leading-snug">{user.name || 'રમેશભાઈ પટેલ'}</span>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold block uppercase tracking-wider">પ્રોફાઇલ</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-center bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl text-sm cursor-pointer border border-red-100 flex items-center justify-center gap-2"
                      >
                        <LogOut className="h-4 w-4" /> લોગઆઉટ
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        navigateToSection('auth');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow cursor-pointer text-sm flex items-center justify-center gap-2"
                    >
                      <LogIn className="h-4 w-4" /> લોગિન / નોંધણી
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>



      {/* MAIN APPLICATION CANVAS CONTENT */}
      <main className={`max-w-7xl mx-auto ${(currentSection === 'blog' && activeBlogPost) || currentSection === 'static_page' ? 'px-0 py-4 sm:px-6 lg:px-8 sm:py-10' : 'px-4 sm:px-6 lg:px-8 py-10'} flex-grow w-full`}>
        {activeExam ? (
          <ExamEngine 
            exam={activeExam} 
            userId={user?.id || ''} 
            onFinished={handleFinishExam} 
            onResultStateChange={(hasResult) => setExamResultView(hasResult)}
          />
        ) : (
          <>
            {currentSection === 'home' && (
              <PublicHome 
                user={user}
                onPostClick={(p) => {
                  setActiveBlogPost(p);
                  navigateToPost(p);
                }}
                onTakeExam={handleTakeExamRequest}
                onGoToMockTests={() => {
                  if (user) {
                    navigateToSection('dashboard');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'mock_tests' })), 50);
                  } else {
                    setAuthMode('login');
                    setCurrentSection('auth');
                  }
                }}
                onStartExamRequest={() => {
                  if (user) {
                    navigateToSection('dashboard');
                  } else {
                    setAuthMode('login');
                    navigateToSection('auth');
                  }
                }} 
                onViewCategory={(category) => {
                  navigateToCategory(category);
                }}
              />
            )}

            {currentSection === "age_calculator" && (
              <AgeCalculator onBack={() => navigateToHome()} />
            )}

            {currentSection === 'blog' && (
              loadingPost ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                  <p className="text-gray-500 mt-4">પોસ્ટ લોડ થઈ રહી છે...</p>
                </div>
              ) : activeBlogPost ? (
                <BlogPostDetail 
                  post={activeBlogPost}
                  onBack={() => {
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      navigateToCategory(activeBlogPost.category);
                    }
                  }}
                  onPostClick={(p) => {
                    setActiveBlogPost(p);
                    navigateToPost(p);
                  }}
                />
              ) : (
                <BlogCategoryView 
                  category={selectedBlogCategory}
                  onBack={() => navigateToHome()}
                />
              )
            )}

            {currentSection === 'auth' && (
              <AuthPages 
                mode={authMode}
                onToggleMode={(mode) => setAuthMode(mode)}
                onAuthSuccess={handleAuthSuccess}
                onBack={() => navigateToHome()} 
              />
            )}

            {currentSection === 'dashboard' && (
              user ? (
                <UserDashboard 
                  user={user}
                  onUpdateUser={(updated) => {
                    setUser(updated);
                    localStorage.setItem('exam_user', JSON.stringify(updated));
                  }}
                  onTakeExam={handleTakeExamRequest} 
                  onShowSubscription={() => setShowPaywall(true)}
                />
              ) : (
                <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-red-100 shadow-xl text-center">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                    <ShieldAlert className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">પ્રવેશ પ્રતિબંધિત!</h3>
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    ડેશબોર્ડ જોવા માટે કૃપા કરીને પહેલાં લોગીન કરો.
                  </p>
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      navigateToSection('auth');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all cursor-pointer text-sm font-sans"
                  >
                    લોગિન કરો
                  </button>
                </div>
              )
            )}

            {currentSection === 'leaderboard' && (
              user ? (
                <Leaderboard currentUserName={user.name} />
              ) : (
                <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-red-100 shadow-xl text-center">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                    <ShieldAlert className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">પ્રવેશ પ્રતિબંધિત!</h3>
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    મેરિટ લિસ્ટ જોવા માટે કૃપા કરીને પહેલાં લોગીન કરો.
                  </p>
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      navigateToSection('auth');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all cursor-pointer text-sm"
                  >
                    લોગિન કરો
                  </button>
                </div>
              )
            )}

            {currentSection === 'admin' && (
              user && user.role === 'admin' ? (
                <AdminPanel />
              ) : (
                <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-orange-100 shadow-xl text-center">
                  <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-100">
                    <ShieldAlert className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">અનધિકૃત પ્રવેશ!</h3>
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    એડમિન પેનલ ઍક્સેસ કરવા માટે કૃપા કરીને એડમિન યુઝર સાથે લોગીન કરો.
                  </p>
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      navigateToSection('auth');
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all cursor-pointer text-sm"
                  >
                    લોગિન કરો
                  </button>
                </div>
              )
            )}

            {currentSection === 'static_page' && (
              <StaticPage 
                pageKey={activeStaticPageKey}
                onNavigateHome={() => navigateToHome()}
              />
            )}
          </>
        )}
      </main>

      {/* FOOTER BAR */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-16 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-start border-b border-slate-800 pb-8">
          <div className="space-y-4">
            <h3 className="text-white text-lg font-bold font-sans flex items-center gap-3">
              <img 
                src="/logo.svg" 
                alt="ગુજરાત પરીક્ષા પોર્ટલ" 
                className="w-8 h-8 object-contain" 
                referrerPolicy="no-referrer"
              />
              ગુજરાત પરીક્ષા પોર્ટલ
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              ગુજરાતની તમામ સત્તાવાર સ્પર્ધાત્મક પરીક્ષાઓની ઓનલાઇન સચોટ તૈયારી, મોક ટેસ્ટ અને પ્રશ્નોત્તરી માટેનું સત્તાવાર લોકપ્રિય પોર્ટલ.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold tracking-wide uppercase">ભરતી અને અપડેટ્સ</h4>
            <div className="flex flex-col gap-2 text-sm text-slate-400 text-left">
              <button onClick={() => navigateToCategory('job')} className="text-left hover:text-white transition-colors cursor-pointer">💼 નવી ભરતીઓ</button>
              <button onClick={() => navigateToCategory('answer_key')} className="text-left hover:text-white transition-colors cursor-pointer">🔑 આન્સર કી</button>
              <button onClick={() => navigateToCategory('result')} className="text-left hover:text-white transition-colors cursor-pointer">🏆 રિઝલ્ટ</button>
              <button onClick={() => navigateToCategory('selection_list')} className="text-left hover:text-white transition-colors cursor-pointer">📋 સિલેક્શન લિસ્ટ</button>
              <button onClick={() => navigateToCategory('news')} className="text-left hover:text-white transition-colors cursor-pointer">📰 સમાચાર</button>
              <button onClick={() => navigateToSection("age_calculator")} className="text-left hover:text-white transition-colors cursor-pointer">🎂 ઉંમર ગણતરી (Age Calculator)</button>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold tracking-wide uppercase">મહત્વપૂર્ણ નીતિઓ</h4>
            <div className="flex flex-col gap-2 text-sm text-slate-400 text-left">
              <button onClick={() => handleNavigateToStaticPage('about')} className="text-left hover:text-white transition-colors cursor-pointer">ℹ️ અમારા વિશે (About Us)</button>
              <button onClick={() => handleNavigateToStaticPage('privacy')} className="text-left hover:text-white transition-colors cursor-pointer">🛡️ પ્રાઇવસી પોલિસી</button>
              <button onClick={() => handleNavigateToStaticPage('terms')} className="text-left hover:text-white transition-colors cursor-pointer">📜 નિયમો અને શરતો</button>
              <button onClick={() => handleNavigateToStaticPage('disclaimer')} className="text-left hover:text-white transition-colors cursor-pointer">⚠️ ડિસ્ક્લેમર (Disclaimer)</button>
              <button onClick={() => handleNavigateToStaticPage('refund')} className="text-left hover:text-white transition-colors cursor-pointer">🔄 રીફંડ પોલિસી</button>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold tracking-wide uppercase">મહત્વપૂર્ણ સંપર્ક</h4>
            <div className="text-sm text-slate-400 space-y-2">
              <div className="flex items-center gap-2">
                <Phone size={14} />
                <span>+91 9725722729</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} />
                <span>+91 9925922729</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} />
                <span>info@Sapex.in</span>
              </div>
              <hr className="border-slate-700 my-2" />
              <p>© ૨૦૨૬ ગુજરાત પરીક્ષા પોર્ટલ. All Rights Reserved.</p>
            </div>
          </div>
        </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col my-4 md:my-8 max-h-[92vh] md:max-h-[90vh]">
            <div className="p-5 md:p-8 overflow-y-auto flex-1">
              <div className="flex justify-between items-start mb-6">
                <div>
                  {user?.subscriptionPlan && user.subscriptionPlan !== 'free' ? (
                    <h3 className="text-2xl font-extrabold text-slate-900">Congratulations..!! Now You are our Premium Members</h3>
                  ) : (
                    <h3 className="text-2xl font-extrabold text-slate-900">
                      {user && subStatus && !subStatus.canTakeTest ? 'તમારી મર્યાદા પૂરી થઈ ગઈ છે' : 'પ્રીમિયમ સબસ્ક્રિપ્શન મેળવો'}
                    </h3>
                  )}
                  <p className="text-slate-500 mt-2 text-sm font-medium">
                    {user?.subscriptionPlan && user.subscriptionPlan !== 'free' 
                      ? 'તમે અનલિમિટેડ ટેસ્ટ આપી શકો છો.'
                      : (user && subStatus && !subStatus.canTakeTest)
                        ? `તમે ${subStatus.allowedExams || 3} ફ્રી મોક ટેસ્ટ આપી ચૂક્યા છો. વધુ મોક ટેસ્ટ આપવા માટે સબસ્ક્રાઇબ કરો.`
                        : 'તમારી તૈયારીને નવી ઊંચાઈઓ પર લઈ જાઓ અને વધુ મોક ટેસ્ટ આપવા માટે સબસ્ક્રાઇબ કરો.'}
                  </p>
                </div>
                <button onClick={() => setShowPaywall(false)} className="text-slate-400 hover:bg-slate-100 hover:text-slate-700 p-2 rounded-full transition-colors shrink-0 ml-4">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {user?.subscriptionPlan && user.subscriptionPlan !== 'free' ? (
                <div className="space-y-4 text-center pb-4">
                  <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <Award className="h-10 w-10" />
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left">
                    <div className="mb-4">
                      <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Plan Type</span>
                      <span className="text-lg font-bold text-indigo-700">{user.subscriptionPlan === 'yearly' ? 'Yearly Plan (વાર્ષિક)' : 'Monthly Plan (માસિક)'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Started On</span>
                          <span className="text-sm font-medium text-slate-700">
                             {user.subscriptionExpiry ? new Date(new Date(user.subscriptionExpiry).setMonth(new Date(user.subscriptionExpiry).getMonth() - (user.subscriptionPlan === 'yearly' ? 12 : 1))).toLocaleDateString('gu-IN') : 'N/A'}
                          </span>
                       </div>
                       <div>
                          <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Expires On</span>
                          <span className="text-sm font-bold text-emerald-600">
                             {user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString('gu-IN') : 'N/A'}
                          </span>
                       </div>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="space-y-4">
                <div className="border border-indigo-100 bg-indigo-50/50 p-5 rounded-2xl relative overflow-hidden transition-all hover:border-indigo-300">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-lg text-slate-800">માસિક પ્લાન</h4>
                    <span className="text-xl font-extrabold text-indigo-600">₹49 / મહિનો</span>
                  </div>
                  <ul className="space-y-2 mb-4 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-indigo-600" />
                      <span>૧ મહિના સુધી અનલિમિટેડ મોક ટેસ્ટની સુવિધા</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-indigo-600" />
                      <span>ફ્રી મેરીટ લીસ્ટ</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-indigo-600" />
                      <span>૮ થી વધુ વિષયો</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-indigo-600" />
                      <span>૫૦ હજાર + MCQ એક્સેસ</span>
                    </li>
                  </ul>
                  <button disabled={!!paymentLoading} onClick={() => handleSubscribe('monthly')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-sm disabled:opacity-50 cursor-pointer">
                    {paymentLoading === 'monthly' ? 'પ્રોસેસિંગ...' : 'માસિક સબસ્ક્રિપ્શન લો'}
                  </button>
                </div>
                
                <div className="border border-emerald-100 bg-emerald-50/50 p-5 rounded-2xl relative overflow-hidden transition-all hover:border-emerald-300">
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-lg uppercase tracking-wider">પોપ્યુલર</div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-lg text-slate-800">વાર્ષિક પ્લાન</h4>
                    <span className="text-xl font-extrabold text-emerald-600">₹499 / વર્ષ</span>
                  </div>
                  <ul className="space-y-2 mb-4 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>૧૨ મહિના સુધી અનલિમિટેડ મોક ટેસ્ટની સુવિધા</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>ફ્રી મેરીટ લીસ્ટ</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>૮ થી વધુ વિષયો</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>૧ લાખ + MCQ એક્સેસ</span>
                    </li>
                  </ul>
                  <button disabled={!!paymentLoading} onClick={() => handleSubscribe('yearly')} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm disabled:opacity-50 cursor-pointer">
                    {paymentLoading === 'yearly' ? 'પ્રોસેસિંગ...' : 'વાર્ષિક સબસ્ક્રિપ્શન લો'}
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {examToConfirm && (
        <ExamInstructionsModal
          exam={examToConfirm}
          onConfirm={() => {
            setActiveExam(examToConfirm);
            setExamToConfirm(null);
          }}
          onCancel={() => {
            setExamToConfirm(null);
          }}
        />
      )}

      </footer>
    </div>
  );
}
