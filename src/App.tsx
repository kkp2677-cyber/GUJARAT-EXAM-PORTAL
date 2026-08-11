import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BookOpen, Trophy, Award, LogIn, LogOut, ShieldAlert, User as UserIcon, Menu, X, ArrowLeft, Sun, Moon, Phone, Mail, Check, Loader2, BadgeCheck, Calendar, ChevronRight, Home, Briefcase, Key, Newspaper, Clock, Sparkles, Bookmark, Settings, Lock } from 'lucide-react';
import { User, Exam, BlogPost } from './types';
import PublicHome from './components/PublicHome';
const AgeCalculator = lazy(() => import('./components/AgeCalculator'));
const AuthPages = lazy(() => import('./components/AuthPages'));
const UserDashboard = lazy(() => import('./components/UserDashboard'));
const ExamEngine = lazy(() => import('./components/ExamEngine'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
import NotificationBell from './components/NotificationBell';
import NewsTicker from './components/NewsTicker';
const BlogCategoryView = lazy(() => import('./components/BlogCategoryView'));
const BlogPostDetail = lazy(() => import('./components/BlogPostDetail'));
const ExamInstructionsModal = lazy(() => import('./components/ExamInstructionsModal'));
const StaticPage = lazy(() => import('./components/StaticPage'));
import { navigateToHome, navigateToCategory, navigateToSection, navigateToPost } from './utils/navigation';

const getInitialRouteState = () => {
  if (typeof window === 'undefined') {
    return {
      section: 'home' as const,
      category: 'job' as const,
      post: null,
      staticKey: 'about' as const
    };
  }

  const initialPost = (window as any).__INITIAL_POST__ || null;
  const path = window.location.pathname;
  const segments = path.split('/').filter(Boolean);
  const validCategories = ['job', 'answer_key', 'result', 'selection_list', 'news'];
  const staticPages = ['about', 'privacy', 'terms', 'disclaimer', 'refund'];

  if (initialPost) {
    const postCat = validCategories.includes(initialPost.category) ? initialPost.category : 'job';
    return {
      section: 'blog' as const,
      category: postCat as any,
      post: initialPost as BlogPost,
      staticKey: 'about' as const
    };
  }

  if (segments.length === 2 && validCategories.includes(segments[0])) {
    return {
      section: 'blog' as const,
      category: segments[0] as any,
      post: null,
      staticKey: 'about' as const
    };
  }

  if (path.startsWith('/post/')) {
    return {
      section: 'blog' as const,
      category: 'job' as const,
      post: null,
      staticKey: 'about' as const
    };
  }

  if (path.startsWith('/blog/')) {
    const cat = path.substring(6).replace(/\/$/, '');
    if (validCategories.includes(cat)) {
      return {
        section: 'blog' as const,
        category: cat as any,
        post: null,
        staticKey: 'about' as const
      };
    }
  }

  if (segments.length === 1) {
    if (validCategories.includes(segments[0])) {
      return {
        section: 'blog' as const,
        category: segments[0] as any,
        post: null,
        staticKey: 'about' as const
      };
    }
    if (staticPages.includes(segments[0])) {
      return {
        section: 'static_page' as const,
        category: 'job' as const,
        post: null,
        staticKey: segments[0] as any
      };
    }
    if (segments[0] === 'age-calculator' || segments[0] === 'age_calculator') {
      return {
        section: 'age_calculator' as const,
        category: 'job' as const,
        post: null,
        staticKey: 'about' as const
      };
    }
    if (segments[0] === 'auth' || segments[0] === 'login') {
      return {
        section: 'auth' as const,
        category: 'job' as const,
        post: null,
        staticKey: 'about' as const
      };
    }
    if (segments[0] === 'leaderboard') {
      return {
        section: 'leaderboard' as const,
        category: 'job' as const,
        post: null,
        staticKey: 'about' as const
      };
    }
  }

  return {
    section: 'home' as const,
    category: 'job' as const,
    post: null,
    staticKey: 'about' as const
  };
};

export default function App() {
  const initialRoute = getInitialRouteState();

  const [user, setUser] = useState<User | null>(null);
  const [currentSection, setCurrentSection] = useState<'home' | 'leaderboard' | 'dashboard' | 'admin' | 'auth' | 'blog' | 'age_calculator' | 'static_page'>(initialRoute.section);
  const [activeStaticPageKey, setActiveStaticPageKey] = useState<'about' | 'privacy' | 'terms' | 'disclaimer' | 'refund'>(initialRoute.staticKey);
  const [selectedBlogCategory, setSelectedBlogCategory] = useState<'job' | 'answer_key' | 'result' | 'selection_list' | 'news'>(initialRoute.category);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examToConfirm, setExamToConfirm] = useState<Exam | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [examResultView, setExamResultView] = useState(false);
  const [activeBlogPost, setActiveBlogPost] = useState<BlogPost | null>(initialRoute.post);
  const [loadingPost, setLoadingPost] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [subStatus, setSubStatus] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (activeBlogPost) {
      const rawTitle = activeBlogPost.metaTitle || activeBlogPost.title;
      document.title = rawTitle.includes('OJAS EXAM') ? rawTitle : `${rawTitle} - OJAS Exam`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', activeBlogPost.metaDesc || '');
    } else if (window.location.pathname === '/' && currentSection === 'home') {
      document.title = 'OJAS EXAM | Online Exam Mock Test, OJAS Job Alerts & Results';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', 'ગુજરાતની તમામ સ્પર્ધાત્મક પરીક્ષાઓ (GPSC, Class 3, TET/TAT, Police Bharti) માટે ફ્રી Online Mock Test આપો, ન્યૂઝ Job Notifications મેળવો, Answer Key અને Result જુઓ ફક્ત OJAS EXAM પર.');
    }
  }, [activeBlogPost, currentSection]);

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
    return saved === 'dark' ? 'dark' : 'light';
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

  // Prevent background scrolling when mobile menu (drawer) is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, [isMobileMenuOpen]);

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

  const handleGoToMockTests = () => {
    if (user) {
      navigateToSection('dashboard');
      setTimeout(() => window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'mock_tests' })), 50);
    } else {
      setAuthMode('login');
      navigateToSection('auth');
    }
  };

  // URL router state-synchronizer
  const handleUrlRouting = async () => {
    const path = window.location.pathname;
    const pathLower = path.toLowerCase().replace(/\/$/, '');
    if (
      pathLower.endsWith('.xml') ||
      pathLower.endsWith('.txt') ||
      ['/sitemap', '/sitemap_index', '/news-sitemap', '/rss', '/feed', '/robots.txt'].includes(pathLower)
    ) {
      return;
    }
    const segments = path.split('/').filter(Boolean);
    const validCategories = ['job', 'answer_key', 'result', 'selection_list', 'news'];
    
    if (segments.length === 2 && validCategories.includes(segments[0])) {
      const category = segments[0];
      const slug = decodeURIComponent(segments[1]);
      if (slug) {
        if (activeBlogPost && (activeBlogPost.slug === slug || String(activeBlogPost.id) === slug)) {
          setSelectedBlogCategory(category as any);
          setCurrentSection('blog');
          return;
        }
        setLoadingPost(true);
        setCurrentSection('blog');
        try {
          const res = await fetch(`/api/posts/slug/${encodeURIComponent(slug)}`);
          if (res.ok) {
            const postData = await res.json();
            setActiveBlogPost(postData);
            setSelectedBlogCategory(category as any);
            setCurrentSection('blog');
            (window as any).__INITIAL_POST__ = postData;
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
      const category = path.substring(6).replace(/\/$/, '');
      if (['job', 'answer_key', 'result', 'selection_list', 'news'].includes(category)) {
        setSelectedBlogCategory(category as any);
        setActiveBlogPost(null);
        setCurrentSection('blog');
      } else {
        setCurrentSection('home');
      }
    } else if (segments.length === 1 && validCategories.includes(segments[0])) {
      setSelectedBlogCategory(segments[0] as any);
      setActiveBlogPost(null);
      setCurrentSection('blog');
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
      if (localStorage.getItem('exam_user')) {
        setCurrentSection('dashboard');
        window.history.replaceState({}, '', '/dashboard');
      } else {
        setCurrentSection('auth');
      }
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
        name: "OJAS Exam",
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
                  ઝડપી, સુરક્ષિત અને શ્રેષ્ઠ ટેસ્ટ અનુભવ માટે OJAS Exam એપ્લિકેશન ડાઉનલોડ કરો.
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
      <header className="bg-white/95 dark:bg-[#121824]/95 backdrop-blur-md border-b border-slate-150 dark:border-slate-800 shadow-sm sticky top-0 z-40 transition-all">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-12 h-20 flex justify-between items-center">
          
          {/* Logo Name */}
          <div 
            onClick={() => navigateToHome()}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <img 
              src="/logo.svg" 
              alt="OJAS Exam" 
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 object-contain group-hover:scale-105 transition-transform" 
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col justify-center leading-none">
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black tracking-wide font-sans uppercase flex items-center group-hover:opacity-90 transition-opacity">
                <span className="text-[#0f3862] dark:text-white">OJAS</span>
                <span className="ml-1 sm:ml-1.5 text-[#0f3862] dark:text-white">E</span>
                <span className="text-[#f26522]">X</span>
                <span className="text-[#0f3862] dark:text-white">AM</span>
              </div>
              <div className="text-[8.5px] sm:text-[9.5px] md:text-[11px] font-extrabold tracking-wider text-right -mt-0.5 font-sans">
                <span className="text-[#0f3862] dark:text-slate-300">ઓજસ</span> <span className="text-[#f26522]">એક્ઝામ</span>
              </div>
            </div>
          </div>

          {/* Navigation Links - Desktop */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-5">
            <button
              onClick={() => navigateToHome()}
              className={`font-black text-[15px] xl:text-[16.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] flex items-center gap-1.5 shadow-sm border ${
                currentSection === 'home' 
                  ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-blue-700 shadow-blue-500/5' 
                  : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              🏠 Home
            </button>

            {/* Content Categorized Update Pages */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
            
            <button
              onClick={() => navigateToCategory('job')}
              className={`font-black text-[14px] xl:text-[15.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] border flex items-center gap-1 ${
                currentSection === 'blog' && selectedBlogCategory === 'job' 
                  ? 'text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-slate-800 border-blue-200 dark:border-blue-700 shadow-md shadow-blue-500/5' 
                  : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-blue-50/30 dark:hover:bg-slate-700 hover:border-blue-200 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              💼 નવી ભરતીઓ
            </button>
            <button
              onClick={() => navigateToCategory('answer_key')}
              className={`font-black text-[14px] xl:text-[15.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] border flex items-center gap-1 ${
                currentSection === 'blog' && selectedBlogCategory === 'answer_key' 
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-slate-800 border-emerald-200 dark:border-emerald-700 shadow-md shadow-emerald-500/5' 
                  : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-emerald-50/30 dark:hover:bg-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              🔑 આન્સર કી
            </button>
            <button
              onClick={() => navigateToCategory('result')}
              className={`font-black text-[14px] xl:text-[15.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] border flex items-center gap-1 ${
                currentSection === 'blog' && selectedBlogCategory === 'result' 
                  ? 'text-amber-700 dark:text-amber-300 bg-amber-50/90 dark:bg-slate-800 border-amber-200 dark:border-amber-700 shadow-md shadow-amber-500/5' 
                  : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-amber-50/30 dark:hover:bg-slate-700 hover:border-amber-200 dark:hover:border-amber-700 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              🏆 રિઝલ્ટ
            </button>
            <button
              onClick={() => navigateToCategory('news')}
              className={`font-black text-[14px] xl:text-[15.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] border flex items-center gap-1 ${
                currentSection === 'blog' && selectedBlogCategory === 'news' 
                  ? 'text-sky-700 dark:text-sky-300 bg-sky-50/90 dark:bg-slate-800 border-sky-200 dark:border-sky-700 shadow-md shadow-sky-500/5' 
                  : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-sky-50/30 dark:hover:bg-slate-700 hover:border-sky-200 dark:hover:border-sky-700 hover:text-sky-600 dark:hover:text-sky-400'
              }`}
            >
              📰 સમાચાર
            </button>
            <button
              onClick={handleGoToMockTests}
              className={`font-black text-[14px] xl:text-[15.5px] py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] border flex items-center gap-1 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-indigo-50/30 dark:hover:bg-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400`}
            >
              📝 મોક ટેસ્ટ
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
                  onClick={() => {
                    navigateToSection('dashboard');
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'profile' }));
                    }, 100);
                  }}
                  className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="w-6.5 h-6.5 bg-blue-600 text-white font-bold rounded-full text-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                    {user.name ? user.name[0] : 'ર'}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.name || 'રમેશભાઈ પટેલ'}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-bold p-2.5 rounded-xl transition-all cursor-pointer border border-red-100 dark:border-red-900"
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
              className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 p-2.5 rounded-xl text-gray-700 dark:text-slate-200 cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer (Right Side Drawer with Overlay Backdrop) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop Overlay */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-50 lg:hidden touch-none"
              />

              {/* Drawer Container (Slides from right) */}
              <motion.div
                key="drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="fixed right-0 top-0 bottom-0 w-[280px] sm:w-[310px] bg-slate-50 dark:bg-[#0d121d] shadow-2xl z-50 flex flex-col h-screen h-[100dvh] border-l border-slate-150 dark:border-slate-850 lg:hidden overflow-hidden"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-150 dark:border-slate-800/80 bg-white dark:bg-[#111726] shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7.5 h-7.5 rounded-lg bg-blue-600/10 dark:bg-blue-500/10 flex items-center justify-center p-1.5 border border-blue-200/50 dark:border-blue-800/40">
                      <img src="/logo.svg" alt="OJAS EXAM" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-wide">OJAS EXAM</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Drawer Menu Body */}
                <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-4">
                  {!user ? (
                    /* Content Categories for Guest Users */
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pb-1.5">મુખ્ય વિભાગો</div>
                        <div className="space-y-1">
                          <button
                            onClick={() => {
                              navigateToHome();
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all duration-150 group cursor-pointer ${
                              currentSection === 'home' 
                                ? 'text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 dark:text-blue-400' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg transition-colors duration-150 ${
                              currentSection === 'home'
                                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                            }`}>
                              <Home className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">મુખ્ય પૃષ્ઠ (Home)</span>
                            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5 ${
                              currentSection === 'home' ? 'text-blue-500 dark:text-blue-400' : ''
                            }`} />
                          </button>
                        </div>
                      </div>

                      <div>
                         <div className="space-y-1">
                          <button
                            onClick={() => {
                              navigateToCategory('job');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all duration-150 group cursor-pointer ${
                              currentSection === 'blog' && selectedBlogCategory === 'job' 
                                ? 'text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 dark:text-blue-400' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg transition-colors duration-150 ${
                              currentSection === 'blog' && selectedBlogCategory === 'job'
                                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                            }`}>
                              <Briefcase className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">નવી ભરતીઓ</span>
                            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5 ${
                              currentSection === 'blog' && selectedBlogCategory === 'job' ? 'text-blue-500 dark:text-blue-400' : ''
                            }`} />
                          </button>

                          <button
                            onClick={() => {
                              navigateToCategory('answer_key');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all duration-150 group cursor-pointer ${
                              currentSection === 'blog' && selectedBlogCategory === 'answer_key' 
                                ? 'text-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg transition-colors duration-150 ${
                              currentSection === 'blog' && selectedBlogCategory === 'answer_key'
                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                            }`}>
                              <Key className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">આન્સર કી</span>
                            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5 ${
                              currentSection === 'blog' && selectedBlogCategory === 'answer_key' ? 'text-emerald-500 dark:text-emerald-400' : ''
                            }`} />
                          </button>

                          <button
                            onClick={() => {
                              navigateToCategory('result');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all duration-150 group cursor-pointer ${
                              currentSection === 'blog' && selectedBlogCategory === 'result' 
                                ? 'text-amber-600 bg-amber-50/80 dark:bg-amber-950/20 dark:text-amber-400' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg transition-colors duration-150 ${
                              currentSection === 'blog' && selectedBlogCategory === 'result'
                                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                            }`}>
                              <Trophy className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">રિઝલ્ટ</span>
                            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5 ${
                              currentSection === 'blog' && selectedBlogCategory === 'result' ? 'text-amber-500 dark:text-amber-400' : ''
                            }`} />
                          </button>

                          <button
                            onClick={() => {
                              navigateToCategory('news');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all duration-150 group cursor-pointer ${
                              currentSection === 'blog' && selectedBlogCategory === 'news' 
                                ? 'text-sky-600 bg-sky-50/80 dark:bg-sky-950/20 dark:text-sky-400' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg transition-colors duration-150 ${
                              currentSection === 'blog' && selectedBlogCategory === 'news'
                                ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                            }`}>
                              <Newspaper className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">શૈક્ષણિક સમાચાર</span>
                            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5 ${
                              currentSection === 'blog' && selectedBlogCategory === 'news' ? 'text-sky-500 dark:text-sky-400' : ''
                            }`} />
                          </button>

                          <button
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              handleGoToMockTests();
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40 transition-all duration-150 group cursor-pointer"
                          >
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors duration-150">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">ઓનલાઇન મોક ટેસ્ટ</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-3 mt-1.5 border-t border-slate-150 dark:border-slate-800/85">
                        <button
                          onClick={() => {
                            setAuthMode('login');
                            navigateToSection('auth');
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-center text-sm font-bold transition-all duration-150 shadow-md shadow-emerald-600/10 dark:shadow-none cursor-pointer"
                        >
                          <LogIn className="h-4 w-4" />
                          <span>લોગિન / નોંધણી કરો</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Dashboard & User Section for Logged-In Users */
                    <div className="space-y-3">
                      <div>
                        <div className="space-y-1">
                          <button
                            onClick={() => {
                              navigateToHome();
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all duration-150 group cursor-pointer ${
                              currentSection === 'home' 
                                ? 'text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 dark:text-blue-400' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg transition-colors duration-150 ${
                              currentSection === 'home'
                                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                            }`}>
                              <Home className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">Home</span>
                            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5 ${
                              currentSection === 'home' ? 'text-blue-500 dark:text-blue-400' : ''
                            }`} />
                          </button>

                          <button
                            onClick={() => {
                              navigateToSection('dashboard');
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'dashboard' }));
                              }, 100);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all duration-150 group cursor-pointer ${
                              currentSection === 'dashboard' 
                                ? 'text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 dark:text-blue-400' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg transition-colors duration-150 ${
                              currentSection === 'dashboard'
                                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                            }`}>
                              <Trophy className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">ડેશબોર્ડ</span>
                            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5 ${
                              currentSection === 'dashboard' ? 'text-blue-500 dark:text-blue-400' : ''
                            }`} />
                          </button>

                          <button
                            onClick={() => {
                              navigateToSection('dashboard');
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'mock_tests' }));
                              }, 100);
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40 transition-all duration-150 group cursor-pointer"
                          >
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors duration-150">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">મોક ટેસ્ટ આપો</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5" />
                          </button>

                          <button
                            onClick={() => {
                              navigateToSection('dashboard');
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'bookmarks' }));
                              }, 100);
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40 transition-all duration-150 group cursor-pointer"
                          >
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors duration-150">
                              <Bookmark className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">સેવ કરેલા પ્રશ્નો</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5" />
                          </button>

                          <button
                            onClick={() => {
                              navigateToSection('dashboard');
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'merit_list' }));
                              }, 100);
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40 transition-all duration-150 group cursor-pointer"
                          >
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors duration-150">
                              <Trophy className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">મેરીટ લીસ્ટ</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5" />
                          </button>

                          <button
                            onClick={() => {
                              navigateToSection('age_calculator');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all duration-150 group cursor-pointer ${
                              currentSection === 'age_calculator' 
                                ? 'text-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/30 dark:text-indigo-400' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg transition-colors duration-150 ${
                              currentSection === 'age_calculator'
                                ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                            }`}>
                              <Clock className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">ઉંમર ગણતરી</span>
                            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5 ${
                              currentSection === 'age_calculator' ? 'text-indigo-500 dark:text-indigo-400' : ''
                            }`} />
                          </button>

                          <button
                            onClick={() => {
                              setShowPaywall(true);
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-slate-800/60 transition-all duration-150 group cursor-pointer"
                          >
                            <div className="p-1.5 rounded-lg bg-indigo-100/60 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 transition-colors duration-150">
                              <Sparkles className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">સબસ્ક્રિપ્શન પ્લાન</span>
                            <ChevronRight className="h-3.5 w-3.5 text-indigo-400 transition-transform duration-150 group-hover:translate-x-0.5" />
                          </button>

                          <button
                            onClick={() => {
                              navigateToSection('dashboard');
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'change_password' }));
                              }, 100);
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111726]/60 shadow-xs border border-transparent hover:border-slate-150/40 dark:hover:border-slate-800/40 transition-all duration-150 group cursor-pointer"
                          >
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors duration-150">
                              <Lock className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate">પાસવર્ડ બદલો</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5" />
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
                              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-sm font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50/70 dark:hover:bg-orange-950/20 transition-all duration-150 group cursor-pointer"
                            >
                              <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 transition-colors duration-150">
                                <Settings className="h-4 w-4" />
                              </div>
                              <span className="flex-1 truncate">એડમીન પેનલ</span>
                              <ChevronRight className="h-3.5 w-3.5 text-orange-400 transition-transform duration-150 group-hover:translate-x-0.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 mt-1.5 border-t border-slate-150 dark:border-slate-800/80 space-y-2">
                        <div 
                          onClick={() => {
                            navigateToSection('dashboard');
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('change-dashboard-tab', { detail: 'profile' }));
                            }, 100);
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-white dark:hover:bg-[#111726]/60 rounded-xl transition-all duration-150 border border-transparent hover:border-slate-150/40 dark:hover:border-slate-850 shadow-xs"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black rounded-lg flex items-center justify-center text-xs shadow-md shadow-blue-500/10">
                            {user.name ? user.name[0] : 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs block truncate leading-tight">{user.name || 'વપરાશકર્તા'}</span>
                            <span className="text-[9.5px] text-blue-600 dark:text-blue-400 font-extrabold block uppercase tracking-wider mt-0.5">પ્રોફાઇલ જુઓ</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center justify-center gap-2 w-full py-2 bg-rose-50 hover:bg-rose-100/80 active:scale-98 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-center text-sm font-bold transition-all duration-150 border border-rose-100 dark:border-rose-950/20 cursor-pointer"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>લોગઆઉટ</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* NEWS TICKER BAR BELOW HEADER */}
      <NewsTicker />

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
                <AuthPages 
                  mode={authMode}
                  onToggleMode={(mode) => setAuthMode(mode)}
                  onAuthSuccess={handleAuthSuccess}
                  onBack={() => navigateToHome()} 
                />
              )
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
            <div 
              onClick={() => navigateToHome()}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <img 
                src="/logo.svg" 
                alt="OJAS Exam" 
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-105 transition-transform grayscale brightness-125 contrast-125" 
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col justify-center leading-none">
                <div className="text-lg sm:text-xl font-black tracking-wide font-sans uppercase flex items-center group-hover:opacity-90 transition-opacity">
                  <span className="text-white">OJAS</span>
                  <span className="ml-1 sm:ml-1.5 text-white">E</span>
                  <span className="text-slate-400">X</span>
                  <span className="text-white">AM</span>
                </div>
                <div className="text-[8.5px] sm:text-[9.5px] font-extrabold tracking-wider text-right -mt-0.5 font-sans">
                  <span className="text-slate-300">ઓજસ</span> <span className="text-slate-400">એક્ઝામ</span>
                </div>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              ગુજરાતની તમામ સત્તાવાર સ્પર્ધાત્મક પરીક્ષાઓની ઓનલાઇન સચોટ તૈયારી, મોક ટેસ્ટ અને પ્રશ્નોત્તરી માટેનું સત્તાવાર લોકપ્રિય પોર્ટલ.
            </p>
            <p className="text-slate-400 text-xs leading-relaxed pt-2 border-t border-slate-800/80 font-sans opacity-90">
              <strong className="text-slate-300">Disclaimer:</strong> This website is not associated, affiliated, or connected with any government organization or department. All information provided here is for general informational purposes only.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold tracking-wide uppercase">ભરતી અને અપડેટ્સ</h4>
            <div className="flex flex-col gap-2 text-sm text-slate-400 text-left">
              <button onClick={() => navigateToCategory('job')} className="text-left hover:text-white transition-colors cursor-pointer">💼 નવી ભરતીઓ</button>
              <button onClick={() => navigateToCategory('answer_key')} className="text-left hover:text-white transition-colors cursor-pointer">🔑 આન્સર કી</button>
              <button onClick={() => navigateToCategory('result')} className="text-left hover:text-white transition-colors cursor-pointer">🏆 રિઝલ્ટ</button>
              <button onClick={() => navigateToCategory('news')} className="text-left hover:text-white transition-colors cursor-pointer">📰 સમાચાર</button>
              <button onClick={handleGoToMockTests} className="text-left hover:text-white transition-colors cursor-pointer">📝 મોક ટેસ્ટ</button>
              <button onClick={() => navigateToSection("age_calculator")} className="text-left hover:text-white transition-colors cursor-pointer">🎂 ઉંમર ગણતરી (Age Calculator)</button>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold tracking-wide uppercase">મહત્વપૂર્ણ લિંક્સ</h4>
            <div className="flex flex-col gap-2 text-sm text-slate-400 text-left">
              <button onClick={() => handleNavigateToStaticPage('about')} className="text-left hover:text-white transition-colors cursor-pointer">ℹ️ અમારા વિશે </button>
              <button onClick={() => handleNavigateToStaticPage('privacy')} className="text-left hover:text-white transition-colors cursor-pointer">🛡️ પ્રાઇવસી પોલિસી</button>
              <button onClick={() => handleNavigateToStaticPage('terms')} className="text-left hover:text-white transition-colors cursor-pointer">📜 નિયમો અને શરતો</button>
              <button onClick={() => handleNavigateToStaticPage('disclaimer')} className="text-left hover:text-white transition-colors cursor-pointer">⚠️ ડિસ્ક્લેમર </button>
              <button onClick={() => handleNavigateToStaticPage('refund')} className="text-left hover:text-white transition-colors cursor-pointer">🔄 રીફંડ પોલિસી</button>
              <a href="/rss.xml" target="_blank" rel="noopener noreferrer" className="text-left hover:text-white transition-colors cursor-pointer">📡 RSS</a>
              <a href="/news-sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-left hover:text-white transition-colors cursor-pointer">📰 Google News</a>
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-left hover:text-white transition-colors cursor-pointer">🗺️ Sitemap</a>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold tracking-wide uppercase">મહત્વપૂર્ણ સંપર્ક</h4>
            <div className="text-sm text-slate-400 space-y-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Mail size={14} />
                  <span>Support@ojasexam.in</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} />
                  <span>+91 9925922729</span>
                </div>
              </div>
              <hr className="border-slate-700 my-2" />
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6 pt-4 border-t border-slate-800/60">
          © 2026 OJAS Exam. All Rights Reserved. | Developed By : <a href="https://www.instagram.com/itz_kk_chaudhari" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">KKCHAUDHARI</a>
        </p>
      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-[#121824] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col my-4 md:my-8 max-h-[92vh] md:max-h-[90vh]">
            <div className="p-5 md:p-8 overflow-y-auto flex-1">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {user?.subscriptionPlan && user.subscriptionPlan !== 'free'
                      ? 'પ્રીમિયમ સબસ્ક્રિપ્શન'
                      : (user && subStatus && !subStatus.canTakeTest ? 'તમારી મર્યાદા પૂરી થઈ ગઈ છે' : 'પ્રીમિયમ સબસ્ક્રિપ્શન મેળવો')}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm font-medium">
                    {user?.subscriptionPlan && user.subscriptionPlan !== 'free' 
                      ? 'તમારું સબસ્ક્રિપ્શન એક્ટિવ છે.'
                      : (user && subStatus && !subStatus.canTakeTest)
                        ? `તમે ${subStatus.allowedExams || 3} ફ્રી મોક ટેસ્ટ આપી ચૂક્યા છો. વધુ મોક ટેસ્ટ આપવા માટે સબસ્ક્રાઇબ કરો.`
                        : 'તમારી તૈયારીને નવી ઊંચાઈઓ પર લઈ જાઓ અને વધુ મોક ટેસ્ટ આપવા માટે સબસ્ક્રાઇબ કરો.'}
                  </p>
                </div>
                <button onClick={() => setShowPaywall(false)} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-full transition-colors shrink-0 ml-4">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {user?.subscriptionPlan && user.subscriptionPlan !== 'free' ? (
                <div className="pb-2">
                  {(() => {
                    const expiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
                    const start = new Date(expiry);
                    if (user.subscriptionPlan === 'yearly') {
                      start.setFullYear(start.getFullYear() - 1);
                    } else {
                      start.setMonth(start.getMonth() - 1);
                    }
                    const now = new Date();
                    const diffMs = expiry.getTime() - now.getTime();
                    const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                    const formatDateStr = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

                    return (
                      <div className="bg-[#071c35] rounded-2xl md:rounded-3xl p-4 sm:p-5 text-white shadow-xl relative overflow-hidden font-sans border border-slate-800">
                        {/* Top Row: Icon, Title, Days Left */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center sm:items-start gap-2.5 sm:gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#14365d] flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                              <BadgeCheck className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white/10" />
                            </div>
                            <div>
                              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight tracking-tight">
                                Active Subscription
                              </h3>
                              <p className="text-slate-300/90 text-xs sm:text-sm font-medium mt-0.5 leading-snug">
                                તમે અનલિમિટેડ ટેસ્ટ આપી શકો છો.
                              </p>
                            </div>
                          </div>

                          <div className="bg-[#0b4832] text-emerald-300 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 border border-emerald-600/40 shadow-xs shrink-0 whitespace-nowrap">
                            <span>{daysLeft} days left</span>
                          </div>
                        </div>

                        {/* Bottom Row: Start Date & End Date Box */}
                        <div className="bg-[#0c2a4d]/90 rounded-xl p-3 sm:p-3.5 mt-4 border border-white/10 grid grid-cols-2 divide-x divide-white/10">
                          <div className="pr-2.5 sm:pr-3">
                            <span className="block text-slate-400 text-[10px] sm:text-xs font-medium mb-1">Start Date</span>
                            <div className="flex items-center gap-1.5 text-white font-bold text-xs sm:text-sm">
                              <Calendar className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                              <span>{formatDateStr(start)}</span>
                            </div>
                          </div>

                          <div className="pl-2.5 sm:pl-3">
                            <span className="block text-slate-400 text-[10px] sm:text-xs font-medium mb-1">End Date</span>
                            <div className="flex items-center gap-1.5 text-white font-bold text-xs sm:text-sm">
                              <Calendar className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                              <span>{formatDateStr(expiry)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
              <div className="space-y-4">
                <div className="border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-5 rounded-2xl relative overflow-hidden transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">માસિક પ્લાન</h4>
                    <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">₹49 / મહિનો</span>
                  </div>
                  <ul className="space-y-2 mb-4 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>૧ મહિના સુધી અનલિમિટેડ મોક ટેસ્ટની સુવિધા</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>ફ્રી મેરીટ લીસ્ટ</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>૮ થી વધુ વિષયો</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>૫૦ હજાર + MCQ એક્સેસ</span>
                    </li>
                  </ul>
                  <button disabled={!!paymentLoading} onClick={() => handleSubscribe('monthly')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-sm disabled:opacity-50 cursor-pointer">
                    {paymentLoading === 'monthly' ? 'પ્રોસેસિંગ...' : 'માસિક સબસ્ક્રિપ્શન લો'}
                  </button>
                </div>
                
                <div className="border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 p-5 rounded-2xl relative overflow-hidden transition-all hover:border-emerald-300 dark:hover:border-emerald-700">
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-lg uppercase tracking-wider">પોપ્યુલર</div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">વાર્ષિક પ્લાન</h4>
                    <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">₹499 / વર્ષ</span>
                  </div>
                  <ul className="space-y-2 mb-4 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>૧૨ મહિના સુધી અનલિમિટેડ મોક ટેસ્ટની સુવિધા</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>ફ્રી મેરીટ લીસ્ટ</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>૮ થી વધુ વિષયો</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
