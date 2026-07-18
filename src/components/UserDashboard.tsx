import React, { useState, useEffect } from 'react';
import { User, Exam, ExamHistory } from '../types';
import { User as UserIcon, BookOpen, Clock, Calendar, MapPin, CheckCircle, FileText, Lock, RefreshCw, HelpCircle, Award, Download, LayoutDashboard, Trophy, ShieldCheck, Bookmark, Heart } from 'lucide-react';
import { subscribeToPushNotifications } from '../utils/push';
import { Bell, BellOff, Search, Filter, ChevronDown, ChevronUp, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart2 } from 'lucide-react';
import Leaderboard from './Leaderboard';
import AdminPanel from './AdminPanel';
import { safeFormatDate } from '../utils/date';

let cachedFontBase64: string | null = null;

async function getGujaratiFontBase64(): Promise<string | null> {
  if (cachedFontBase64) return cachedFontBase64;
  
  const urls = [
    // New official modular repository (under notofonts organization) - highly reliable
    'https://cdn.jsdelivr.net/gh/notofonts/gujarati@main/fonts/NotoSansGujarati/hinted/ttf/NotoSansGujarati-Regular.ttf',
    'https://raw.githubusercontent.com/notofonts/gujarati/main/fonts/NotoSansGujarati/hinted/ttf/NotoSansGujarati-Regular.ttf',
    'https://cdn.jsdelivr.net/gh/notofonts/gujarati@main/fonts/NotoSansGujarati/unhinted/ttf/NotoSansGujarati-Regular.ttf',
    
    // Legacy repository (master branch, NOT main!)
    'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/hinted/ttf/NotoSansGujarati/NotoSansGujarati-Regular.ttf',
    'https://raw.githubusercontent.com/googlefonts/noto-fonts/master/hinted/ttf/NotoSansGujarati/NotoSansGujarati-Regular.ttf',
    'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/unhinted/ttf/NotoSansGujarati/NotoSansGujarati-Regular.ttf',
    'https://raw.githubusercontent.com/googlefonts/noto-fonts/master/unhinted/ttf/NotoSansGujarati/NotoSansGujarati-Regular.ttf'
  ];
  
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = window.btoa(binary);
        cachedFontBase64 = base64;
        return base64;
      }
    } catch (e) {
      console.warn(`Failed to fetch font from ${url}:`, e);
    }
  }
  return null;
}

const drawMixedFontText = (doc: any, x: number, y: number, text: string, size = 9, color = [15, 23, 42], hasFont = false, bold = false) => {
  doc.setTextColor(color[0], color[1], color[2]);
  
  if (!text) return 0;
  
  if (!hasFont) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(text, x, y);
    return doc.getTextWidth(text);
  }

  // Split the string into tokens of Latin letters ([a-zA-Z]+) and non-Latin segments
  const tokens = text.split(/([a-zA-Z]+)/);
  
  let currentX = x;
  tokens.forEach(token => {
    if (!token) return;
    
    // We check if it contains any Latin characters
    const isLatin = /[a-zA-Z]/.test(token);
    if (isLatin) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
    } else {
      doc.setFont('ArialUnicode', 'normal');
    }
    doc.setFontSize(size);
    doc.text(token, currentX, y);
    currentX += doc.getTextWidth(token);
  });
  
  return currentX - x;
};

const calculateMixedWidth = (doc: any, text: string, size = 9, hasFont = false, bold = false) => {
  if (!text) return 0;
  if (!hasFont) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    return doc.getTextWidth(text);
  }
  
  const tokens = text.split(/([a-zA-Z]+)/);
  let totalWidth = 0;
  
  tokens.forEach(token => {
    if (!token) return;
    const isLatin = /[a-zA-Z]/.test(token);
    if (isLatin) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
    } else {
      doc.setFont('ArialUnicode', 'normal');
    }
    doc.setFontSize(size);
    totalWidth += doc.getTextWidth(token);
  });
  
  return totalWidth;
};

const drawMixedText = (doc: any, textEn: string, textGu: string, x: number, y: number, bold = false, size = 9, color = [15, 23, 42], hasFont = false, rightAlign = false) => {
  doc.setTextColor(color[0], color[1], color[2]);

  if (hasFont && textGu) {
    if (rightAlign) {
      const totalWidth = calculateMixedWidth(doc, textGu, size, hasFont, bold);
      drawMixedFontText(doc, x - totalWidth, y, textGu, size, color, hasFont, bold);
    } else {
      drawMixedFontText(doc, x, y, textGu, size, color, hasFont, bold);
    }
  } else {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    if (rightAlign) {
      const totalWidth = doc.getTextWidth(textEn);
      const startX = x - totalWidth;
      doc.text(textEn, startX, y);
    } else {
      doc.text(textEn, x, y);
    }
  }
};

const drawMixedLine = (doc: any, x: number, y: number, labelEn: string, labelGu: string, value: string, hasFont = false, bold = false, size = 9) => {
  const label = labelGu ? `${labelGu} / ${labelEn}` : labelEn;
  const labelWidth = drawMixedFontText(doc, x, y, label, size, [15, 23, 42], hasFont, bold);
  if (value) {
    drawMixedFontText(doc, x + labelWidth + 2, y, `: ${value}`, size, [15, 23, 42], hasFont, false);
  }
};

interface UserDashboardProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onTakeExam: (examId: string) => void;
  onShowSubscription?: () => void;
}

export default function UserDashboard({ user, onUpdateUser, onTakeExam, onShowSubscription }: UserDashboardProps) {
  // Navigation active tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'merit_list' | 'mock_tests' | 'admin' | 'bookmarks' | 'change_password'>(() => {
    if (typeof window !== 'undefined') {
      const regFlag = localStorage.getItem('just_registered');
      if (regFlag === 'true') {
        localStorage.removeItem('just_registered');
        return 'profile';
      }
    }
    return 'dashboard';
  });
  
  // PDF download loading state
  const [pdfDownloading, setPdfDownloading] = useState<string | null>(null);
  
  // Mock Tests Tab State
  const [mockTestSearch, setMockTestSearch] = useState('');
  const [mockTestPage, setMockTestPage] = useState(1);
  const [examSubTab, setExamSubTab] = useState<'mock' | 'bharti'>('mock');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const MOCK_TESTS_PER_PAGE = 5;


  // Profile State
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [category, setCategory] = useState(user.category || 'General');
  const [dob, setDob] = useState(user.dob || '');
  const [address, setAddress] = useState(user.address || '');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Exams & History State
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [history, setHistory] = useState<ExamHistory[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  // Wish List State
  const [dashboardSubTab, setDashboardSubTab] = useState<'history' | 'wishlist'>('history');
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [pushStatus, setPushStatus] = useState<string>('default');
  const [pushLoading, setPushLoading] = useState(false);
  
  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
    // Background pre-fetch Gujarati font so it is cached and ready for PDFs
    getGujaratiFontBase64().then((font) => {
      if (font) {
        console.log('Gujarati font pre-fetched successfully.');
      } else {
        console.warn('Could not pre-fetch Gujarati font.');
      }
    }).catch(err => {
      console.warn('Error during font pre-fetching:', err);
    });
  }, []);

  const handleEnablePush = async () => {
    setPushLoading(true);
    const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
    if (token) {
      await subscribeToPushNotifications(token);
      setPushStatus(Notification.permission);
    }
    setPushLoading(false);
  };

  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passMsg, setPassMsg] = useState({ text: '', type: '' });

  const [showProfileAlertModal, setShowProfileAlertModal] = useState(false);

  useEffect(() => {
    const handleTabChange = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('change-dashboard-tab', handleTabChange);
    return () => window.removeEventListener('change-dashboard-tab', handleTabChange);
  }, []);

  const fetchBookmarks = async () => {
    setBookmarksLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
      const res = await fetch(`/api/user/${user.id}/bookmarks`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('user-blocked', { detail: 'તમારી લોગીન વિગતો અમાન્ય છે અથવા સેકશન સમાપ્ત થઈ ગઈ છે. કૃપા કરીને ફરી લોગીન કરો.' }));
        return;
      }
      if (res.status === 423) {
        window.dispatchEvent(new CustomEvent('user-blocked'));
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBookmarks(data);
        }
      }
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    } finally {
      setBookmarksLoading(false);
    }
  };

  const fetchWishlist = async () => {
    setWishlistLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
      const res = await fetch(`/api/user/${user.id}/wishlist`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('user-blocked', { detail: 'તમારી લોગીન વિગતો અમાન્ય છે અથવા સેકશન સમાપ્ત થઈ ગઈ છે. કૃપા કરીને ફરી લોગીન કરો.' }));
        return;
      }
      if (res.status === 423) {
        window.dispatchEvent(new CustomEvent('user-blocked'));
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setWishlist(data);
        }
      }
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleToggleWishlist = async (examId: number) => {
    const isSaved = wishlist.some(item => Number(item.examId) === examId);
    const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
    if (!token) return;

    try {
      if (isSaved) {
        const res = await fetch(`/api/user/${user.id}/wishlist/${examId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setWishlist(prev => prev.filter(item => Number(item.examId) !== examId));
        }
      } else {
        const res = await fetch(`/api/user/${user.id}/wishlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ examId })
        });
        if (res.ok) {
          fetchWishlist();
        }
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
    }
  };

  useEffect(() => {
    fetchExamsAndHistory();
    fetchBookmarks();
    fetchWishlist();
  }, [user.id]);

  useEffect(() => {
    if (activeTab === 'bookmarks') {
      fetchBookmarks();
    }
  }, [activeTab]);

  const handleRemoveBookmark = async (questionId: string) => {
    try {
      const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
      const res = await fetch(`/api/user/${user.id}/bookmarks/${questionId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('user-blocked', { detail: 'તમારી લોગીન વિગતો અમાન્ય છે અથવા સેકશન સમાપ્ત થઈ ગઈ છે. કૃપા કરીને ફરી લોગીન કરો.' }));
        return;
      }
      if (res.status === 423) {
        window.dispatchEvent(new CustomEvent('user-blocked'));
        return;
      }
      if (res.ok) {
        setBookmarks(prev => prev.filter(b => b.questionId !== questionId));
      }
    } catch (err) {
      console.error('Error removing bookmark:', err);
    }
  };

  const fetchExamsAndHistory = async () => {
    setExamsLoading(true);
    try {
      // Fetch available exams
      const examsRes = await fetch('/api/exams');
      if (!examsRes.ok) {
        throw new Error(`HTTP error! Status: ${examsRes.status}`);
      }
      const examsData = await examsRes.json();
      setAllExams(examsData);

      // Fetch user exam history
      const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
      const historyRes = await fetch(`/api/user/exams/${user.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (historyRes.status === 401) {
        window.dispatchEvent(new CustomEvent('user-blocked', { detail: 'તમારી લોગીન વિગતો અમાન્ય છે અથવા સેકશન સમાપ્ત થઈ ગઈ છે. કૃપા કરીને ફરી લોગીન કરો.' }));
        return;
      }
      if (historyRes.status === 423) {
        window.dispatchEvent(new CustomEvent('user-blocked'));
        return;
      }
      if (!historyRes.ok) {
        throw new Error(`HTTP error! Status: ${historyRes.status}`);
      }
      const historyData = await historyRes.json();
      setHistory(historyData);
    } catch (err) {
      console.error('Error fetching exams or history:', err);
    } finally {
      setExamsLoading(false);
    }
  };

  const translateExamName = (name: string) => {
    if (name.includes('તલાટી') || name.includes('Talati')) return 'Talati Mantri Mock Test';
    if (name.includes('GPSC') || name.includes('જીપીએસસી')) return 'GPSC Class 1 & 2 Prelims';
    if (name.includes('સચિવાલય') || name.includes('Sachivalay') || name.includes('ક્લાર્ક')) return 'Bin Sachivalay Clerk Mock Test';
    if (name.includes('પોલીસ') || name.includes('Police') || name.includes('Constable') || name.includes('કોન્સ્ટેબલ')) return 'Constable Mock Exam';
    const asciiOnly = name.replace(/[^\x00-\x7F]/g, "").trim();
    return asciiOnly || 'Gujarat Government Mock Test';
  };

  const safeText = (str: string, fallback: string) => {
    if (!str) return fallback;
    const cleaned = str.replace(/[^\x00-\x7F]/g, "").trim();
    return cleaned || fallback;
  };

  const downloadAllHistoryPDF = async () => {
    setPdfDownloading('all');
    try {
      const tokenObj = JSON.parse(localStorage.getItem('exam_user') || '{}');
      const token = tokenObj?.token;
      if (!token) {
        alert('તમારી લોગીન વિગતો અમાન્ય છે. કૃપા કરીને ફરી લોગીન કરો.');
        return;
      }

      const downloadUrl = `/api/generate-pdf?type=all&token=${encodeURIComponent(token)}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating summary PDF:', error);
      alert('પીડીએફ રીપોર્ટ કાર્ડ ડાઉનલોડ કરવામાં કંઈક ભૂલ થઈ. કૃપા કરીને ફરી પ્રયાસ કરો.');
    } finally {
      setTimeout(() => {
        setPdfDownloading(null);
      }, 3000);
    }
  };

  const downloadSingleTestPDF = async (h: ExamHistory) => {
    setPdfDownloading(String(h.id));
    try {
      const tokenObj = JSON.parse(localStorage.getItem('exam_user') || '{}');
      const token = tokenObj?.token;
      if (!token) {
        alert('તમારી લોગીન વિગતો અમાન્ય છે. કૃપા કરીને ફરી લોગીન કરો.');
        return;
      }

      const downloadUrl = `/api/generate-pdf?type=single&id=${h.id}&token=${encodeURIComponent(token)}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating single exam PDF:', error);
      alert('પીડીએફ ડાઉનલોડ કરવામાં કંઈક ભૂલ થઈ. કૃપા કરીને ફરી પ્રયાસ કરો.');
    } finally {
      setTimeout(() => {
        setPdfDownloading(null);
      }, 3000);
    }
  };



  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPass.length < 6) return setPassMsg({ text: 'નવો પાસવર્ડ ઓછામાં ઓછા ૬ અક્ષરનો હોવો જોઈએ.', type: 'error' });
    if (passForm.newPass !== passForm.confirm) return setPassMsg({ text: 'પાસવર્ડ મેચ થતા નથી.', type: 'error' });
    setUpdateLoading(true);
    setPassMsg({ text: '', type: '' });
    try {
      const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passForm.current, newPassword: passForm.newPass })
      });
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('user-blocked', { detail: 'તમારી લોગીન વિગતો અમાન્ય છે અથવા સેકશન સમાપ્ત થઈ ગઈ છે. કૃપા કરીને ફરી લોગીન કરો.' }));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPassMsg({ text: 'તમારો પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો છે.', type: 'success' });
      setPassForm({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      setPassMsg({ text: err.message, type: 'error' });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId as any);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
      const res = await fetch(`/api/user/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name, email, category, dob, address })
      });
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('user-blocked', { detail: 'તમારી લોગીન વિગતો અમાન્ય છે અથવા સેકશન સમાપ્ત થઈ ગઈ છે. કૃપા કરીને ફરી લોગીન કરો.' }));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'પ્રોફાઇલ અપડેટ નિષ્ફળ રહી.');

      onUpdateUser({ ...user, ...data });
      setMessage({ text: 'પ્રોફાઈલ ની માહિતી સફળતાપૂર્વક અપડેટ કરવામાં આવી છે', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setUpdateLoading(false);
    }
  };

  // Combined exams list
  const combinedExams = allExams;

  return (
    <div className="space-y-12">

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left column: Sidebar navigation with menu options */}
        <div className="hidden lg:block lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-4 lg:sticky lg:top-24">
            <h3 className="px-4 py-3 text-sm font-bold text-slate-800 uppercase tracking-widest bg-slate-100 rounded-lg mb-3">
              મેનુ નેવિગેશન
            </h3>
            
            <nav className="flex flex-col gap-2 pb-2 lg:pb-0">
              <button
                type="button"
                onClick={() => handleTabClick('dashboard')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all shrink-0 cursor-pointer w-full ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <LayoutDashboard className="h-4.5 w-4.5" />
                <span>ડેસ્કબોર્ડ</span>
              </button>


              <button
                type="button"
                onClick={() => handleTabClick('merit_list')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all shrink-0 cursor-pointer w-full ${
                  activeTab === 'merit_list'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <Trophy className="h-4.5 w-4.5" />
                <span>મેરીટ લીસ્ટ</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('mock_tests')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all shrink-0 cursor-pointer w-full ${
                  activeTab === 'mock_tests'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <BookOpen className="h-4.5 w-4.5" />
                <span>ભરતી પરીક્ષા મોક ટેસ્ટ</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('bookmarks')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all shrink-0 cursor-pointer w-full ${
                  activeTab === 'bookmarks'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <Bookmark className="h-4.5 w-4.5" />
                <span>બુકમાર્ક પ્રશ્નો (Saved)</span>
              </button>





              <button
                type="button"
                onClick={() => {
                  if (onShowSubscription) onShowSubscription();
                }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all shrink-0 cursor-pointer w-full text-indigo-700 hover:bg-indigo-50 border border-transparent hover:border-indigo-100`}
              >
                <Award className="h-4.5 w-4.5" />
                <span>સબસ્ક્રિપ્શન પ્લાન</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('change_password')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all shrink-0 cursor-pointer w-full ${
                  activeTab === 'change_password'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <Lock className="h-4.5 w-4.5" />
                <span>પાસવર્ડ બદલો</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => handleTabClick('admin')}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all shrink-0 cursor-pointer w-full ${
                    activeTab === 'admin'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                  }`}
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span>🛠 એડમિન પેનલ</span>
                </button>
              )}
            </nav>

            {/* Custom Bottom Profile Item showing Candidate Name and Profile */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleTabClick('profile')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer w-full text-left ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  activeTab === 'profile' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                }`}>
                  {user.name ? user.name.charAt(0) : 'ર'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate leading-none ${
                    activeTab === 'profile' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    પ્રોફાઇલ
                  </p>
                  <p className={`text-[13px] font-extrabold truncate mt-1 ${
                    activeTab === 'profile' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {user.name || 'રમેશભાઈ પટેલ'}
                  </p>
                </div>
              </button>
            </div>

          </div>
        </div>

        {/* Right column: Active tab content */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* PROFILE TAB PANEL */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Welcome Banner with phone number */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6 animate-fade-in">
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold font-sans">
                    નમસ્તે, {user.name || 'રમેશભાઈ પટેલ'}! 👋
                  </h2>
                  <p className="text-blue-100 text-sm md:text-base">
                    તમારું ડેશબોર્ડ તૈયાર છે. તમારી પરીક્ષાની રણનીતિ નક્કી કરો અને તૈયારી મજબૂત કરો.
                  </p>
                </div>
                <div className="bg-white/10 rounded-2xl px-6 py-4 border border-white/10 shrink-0 text-center">
                  <p className="text-xs text-blue-200 font-bold uppercase tracking-wide">મોબાઇલ નંબર</p>
                  <p className="text-lg font-extrabold font-mono mt-1">{user.phone || '5953595959'}</p>
                </div>
              </div>

              <div className="bg-transparent md:bg-white rounded-none md:rounded-2xl border-0 md:border border-gray-150 shadow-none md:shadow-sm p-1.5 md:p-8 animate-fade-in">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6 border-b border-gray-100 pb-3 font-sans px-1">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                  પ્રોફાઇલ સેક્શન
                </h3>

              {message.text && (
                <div className={`p-4 rounded-xl text-sm font-medium mb-6 ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">આખું નામ <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="તમારું આખું નામ લખો"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">મોબાઈલ નંબર (બદલાશે નહીં)</label>
                  <input
                    type="tel"
                    disabled
                    value={user.phone}
                    className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 text-gray-500 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">ઈમેઈલ એડ્રેસ <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="email"
                    value={email} required
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">કેટેગરી (Category) <span className="text-red-500 font-bold">*</span></label>
                  <select
                    value={category} required
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-gray-300 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  >
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="EWS">EWS</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">જન્મ તારીખ (DOB) <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="date"
                    value={dob} required
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">સરનામું (Address) <span className="text-red-500 font-bold">*</span></label>
                  <textarea
                    value={address} required
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ગામ, તાલુકો, જિલ્લો અને પિનકોડ"
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">એકાઉન્ટ પ્રકાર</label>
                  <div className={`w-full px-4 py-2.5 border rounded-xl text-sm font-medium ${
                    user.subscriptionPlan && user.subscriptionPlan !== 'free' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    {user.subscriptionPlan && user.subscriptionPlan !== 'free' ? 'Premium (પ્રીમિયમ)' : 'Free (ફ્રી)'}
                    {user.subscriptionPlan && user.subscriptionPlan !== 'free' && user.subscriptionExpiry && (
                      <span className="block mt-1 text-xs opacity-80">
                        Expiry Date: {safeFormatDate(user.subscriptionExpiry)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updateLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {updateLoading ? 'અપડેટ થઈ રહ્યું છે...' : 'પ્રોફાઇલ અપડેટ કરો'}
                </button>
              </form>
            </div>
          </div>
          )}


          {/* DASHBOARD TAB PANEL */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">

              {/* Push Notification Banner */}
              {pushStatus !== 'granted' && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-4 md:p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                      <Bell className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-indigo-900 text-lg">પરીક્ષા અને ભરતીની માહિતી મેળવો</h4>
                      <p className="text-sm text-indigo-700 mt-1">
                        નવી પરીક્ષા, પરિણામ અને સરકારી નોકરીની અપડેટ્સ માટે પુશ નોટિફિકેશન ચાલુ કરો.
                      </p>
                      <p className="text-xs text-indigo-500/80 mt-2 font-sans max-w-xl leading-relaxed">
                        💡 <strong>મોબાઈલ માટે ખાસ નોંધ:</strong> જો નોટિફિકેશન સક્રિય ન થાય, તો એન્ડ્રોઇડ ક્રોમમાં બ્રાઉઝર સેટિંગ્સમાંથી પરમિશન ચેક કરો. આઇફોન (iOS) વપરાશકર્તાઓ આ પોર્ટલને શેર બટન પર ક્લિક કરી <strong>"Add to Home Screen" (હોમ સ્ક્રીન પર ઉમેરો)</strong> કર્યા બાદ હોમ સ્ક્રીન પરથી ઓપન કરીને જ નોટિફિકેશન સક્રિય કરી શકશે.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleEnablePush}
                    disabled={pushLoading}
                    className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    {pushLoading ? 'ચાલુ કરી રહ્યા છીએ...' : 'નોટિફિકેશન ચાલુ કરો'}
                  </button>
                </div>
              )}

              {/* EXAM ATTEMPT HISTORY & WISHLIST TAB CONTAINER */}
              <div className="bg-transparent md:bg-white rounded-none md:rounded-2xl border-0 md:border border-gray-150 shadow-none md:shadow-sm p-1.5 md:p-8 mt-6">
                
                {/* Modern Sub-Tab Switcher */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-100 pb-3">
                  <button
                    onClick={() => setDashboardSubTab('history')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
                      dashboardSubTab === 'history'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                        : 'text-gray-600 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    મારી પરીક્ષાઓનો ઇતિહાસ (Attempt History)
                  </button>
                  <button
                    onClick={() => setDashboardSubTab('wishlist')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
                      dashboardSubTab === 'wishlist'
                        ? 'bg-red-500 text-white shadow-md shadow-red-500/10'
                        : 'text-gray-600 hover:bg-slate-100'
                    }`}
                  >
                    <Heart className="h-4 w-4" />
                    સેવ કરેલી પરીક્ષાઓ (Wish List)
                  </button>
                </div>

                {dashboardSubTab === 'history' ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 px-1">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 font-sans">
                        <Clock className="h-5 w-5 text-blue-600" />
                        મારી પરીક્ષાઓનો ઇતિહાસ (Attempt History)
                      </h3>
                      {history.length > 0 && (
                        <button
                          onClick={downloadAllHistoryPDF}
                          disabled={pdfDownloading !== null}
                          className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
                            pdfDownloading === 'all'
                              ? 'bg-amber-50 text-amber-755 border-amber-200 animate-pulse'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                          }`}
                          title="બધા મોક ટેસ્ટનું પરિણામ ડાઉનલોડ કરો"
                        >
                          {pdfDownloading === 'all' ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          {pdfDownloading === 'all' ? 'પીડીએફ રિપોર્ટ તૈયાર થઈ રહ્યો છે...' : 'રિપોર્ટ કાર્ડ ડાઉનલોડ (PDF Summary)'}
                        </button>
                      )}
                    </div>
                    {examsLoading ? (
                      <p className="text-gray-500 text-base px-1">ઇતિહાસ લોડ થઈ રહ્યો છે...</p>
                    ) : history.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500 text-base">તમે હજુ સુધી કોઈ પરીક્ષા આપી નથી.</p>
                      </div>
                    ) : (
                      <>
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-y border-gray-200">
                                <th className="py-3 px-4 font-bold text-slate-700 text-sm">પરીક્ષાનું નામ</th>
                                <th className="py-3 px-4 font-bold text-slate-700 text-sm">તારીખ</th>
                                <th className="py-3 px-4 font-bold text-slate-700 text-sm text-center">લીધેલ સમય</th>
                                <th className="py-3 px-4 font-bold text-slate-700 text-sm text-center">માર્ક્સ / પરિણામ</th>
                                <th className="py-3 px-4 font-bold text-slate-700 text-sm text-center">રિપોર્ટ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {history.map((h) => (
                                <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3.5 px-4 font-bold text-gray-800 text-sm">{h.examName}</td>
                                  <td className="py-3.5 px-4 text-gray-600 text-sm">{safeFormatDate(h.submittedAt)}</td>
                                  <td className="py-3.5 px-4 font-mono font-bold text-gray-600 text-sm text-center">{h.timeTaken}</td>
                                  <td className="py-3.5 px-4 text-center">
                                    {h.marksObtained !== null ? (
                                      <span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 text-sm">
                                        {h.marksObtained} / {h.totalMarks}
                                      </span>
                                    ) : (
                                      <span className="inline-block text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                        ⏳ પરિણામ બાકી
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {h.marksObtained !== null ? (
                                      <button
                                        onClick={() => downloadSingleTestPDF(h)}
                                        disabled={pdfDownloading !== null}
                                        className={`inline-flex items-center gap-1.5 text-xs font-black py-2 px-3 rounded-xl border transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
                                          pdfDownloading === String(h.id)
                                            ? 'bg-amber-50 text-amber-755 border-amber-200 animate-pulse'
                                            : 'bg-blue-50 hover:bg-blue-100 text-blue-755 border-blue-200'
                                        }`}
                                      >
                                        {pdfDownloading === String(h.id) ? (
                                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-600" />
                                        ) : (
                                          <Download className="h-3.5 w-3.5" />
                                        )}
                                        {pdfDownloading === String(h.id) ? 'તૈયાર થાય છે...' : 'PDF'}
                                      </button>
                                    ) : (
                                      <span className="text-xs text-gray-400 font-medium">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Mobile View Card List */}
                        <div className="block md:hidden space-y-3">
                          {history.map((h) => (
                            <div key={h.id} className="bg-white border border-gray-150 rounded-xl p-4 space-y-3 shadow-sm">
                              <div className="flex justify-between items-start">
                                <h4 className="font-extrabold text-[16px] text-gray-850 leading-snug">{h.examName}</h4>
                                <div className="shrink-0">
                                  {h.marksObtained !== null ? (
                                    <span className="font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-sm">
                                      {h.marksObtained} / {h.totalMarks}
                                    </span>
                                  ) : (
                                    <span className="inline-block text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                                      ⏳ પરિણામ બાકી
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 border-t border-b border-gray-100 py-2">
                                <div>
                                  <span className="text-gray-400 font-bold block text-[10px] uppercase">તારીખ:</span>
                                  <span className="font-semibold text-gray-700 text-xs md:text-sm">{safeFormatDate(h.submittedAt)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-bold block text-[10px] uppercase">લીધેલ સમય:</span>
                                  <span className="font-mono font-bold text-gray-700 text-xs md:text-sm">{h.timeTaken}</span>
                                </div>
                              </div>
                              <div className="flex justify-end pt-1">
                                {h.marksObtained !== null ? (
                                  <button
                                    onClick={() => downloadSingleTestPDF(h)}
                                    disabled={pdfDownloading !== null}
                                    className={`w-full inline-flex items-center justify-center gap-1.5 text-sm font-black py-2.5 px-4 rounded-xl border transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
                                      pdfDownloading === String(h.id)
                                        ? 'bg-amber-50 text-amber-750 border-amber-200 animate-pulse'
                                        : 'bg-blue-50 hover:bg-blue-100 text-blue-755 border-blue-200'
                                    }`}
                                  >
                                    {pdfDownloading === String(h.id) ? (
                                      <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                    {pdfDownloading === String(h.id) ? 'પીડીએફ જનરેટ થઈ રહી છે...' : 'ડાઉનલોડ રીઝલ્ટ (PDF)'}
                                  </button>
                                ) : (
                                  <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-center w-full leading-relaxed font-bold">
                                    ⚠️ ઓફિશિયલ અંસાર કી બહાર પાડ્યા બાદ માર્ક્સ દેખાશે
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6 px-1 font-sans">
                      <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                      સેવ કરેલી પરીક્ષાઓ (Wish List)
                    </h3>
                    
                    {wishlistLoading ? (
                      <p className="text-gray-500 text-base px-1">સેવ કરેલી પરીક્ષાઓ લોડ થઈ રહી છે...</p>
                    ) : wishlist.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Heart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-base">તમે હજુ સુધી કોઈ પરીક્ષા સેવ કરી નથી.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1 animate-fade-in">
                        {wishlist.map((item) => {
                          const exam = item.exam;
                          if (!exam) return null;
                          const isAttempted = history.some(h => String(h.examId) === String(exam.id));
                          return (
                            <div key={exam.id} className={`border rounded-xl p-3 sm:p-3.5 md:p-4 hover:shadow-lg transition-all flex flex-col justify-between bg-white md:bg-slate-50/50 ${
                              exam.type === 'bharti' ? 'border-indigo-100 hover:border-indigo-500' : 'border-blue-100 hover:border-blue-500'
                            }`}>
                              <div>
                                <div className="mb-2.5 pb-1.5 border-b border-slate-100/60 flex items-center justify-between gap-2">
                                  {exam.type === 'bharti' ? (
                                    <div className="flex flex-wrap items-center gap-2 flex-1">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                        💼 સત્તાવાર ભરતી
                                      </span>
                                      {exam.totalVacancies && (
                                        <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] sm:text-[10px] font-bold">
                                          <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-100 flex items-center gap-1 font-sans">
                                            💼 જગ્યાઓ: <strong className="font-extrabold">{exam.totalVacancies}</strong>
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5 items-center flex-1">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100">
                                        📝 મોક ટેસ્ટ
                                      </span>
                                      {exam.subject && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-100">
                                          🏷️ {exam.subject}
                                        </span>
                                      )}
                                      {exam.difficulty && (
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${
                                          exam.difficulty === 'difficult'
                                            ? 'bg-red-50 text-red-700 border-red-100'
                                            : 'bg-green-50 text-green-700 border-green-100'
                                        }`}>
                                          {exam.difficulty === 'difficult' ? '🔴 Difficult' : '🟢 Easy'}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleWishlist(Number(exam.id));
                                    }}
                                    className="p-1.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none shrink-0"
                                    title="Wish List માંથી દૂર કરો"
                                  >
                                    <Heart className="h-4.5 w-4.5 fill-red-500 text-red-500 transition-transform active:scale-125" />
                                  </button>
                                </div>
                                
                                <h4 className="font-extrabold text-gray-800 text-lg leading-snug">{exam.name}</h4>
                                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                                  {exam.type === 'bharti' && exam.examDate && (
                                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-slate-400" /> પરીક્ષા તારીખ: {exam.examDate}</span>
                                  )}
                                  <span className="flex items-center gap-1"><FileText className="h-4 w-4 text-slate-400" /> {exam.totalQuestions} પ્રશ્નો</span>
                                  <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-slate-400" /> {exam.duration} મિનિટ</span>
                                </div>
                              </div>
                              <button
                                onClick={() => !isAttempted && onTakeExam(exam.id)}
                                disabled={isAttempted}
                                className={`mt-6 text-white font-bold py-2.5 rounded-xl transition-all ${
                                  isAttempted 
                                    ? 'bg-gray-400 cursor-not-allowed shadow-none'
                                    : exam.type === 'bharti' 
                                       ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/15 cursor-pointer active:scale-[0.98]' 
                                       : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/15 cursor-pointer active:scale-[0.98]'
                                }`}
                              >
                                {isAttempted ? 'પરીક્ષા આપેલી છે' : 'પરીક્ષા આપો'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* MOCK TESTS TAB PANEL (ભરતી પરીક્ષા મોક ટેસ્ટ) */}
          {activeTab === 'mock_tests' && (
            <div className="bg-transparent md:bg-white rounded-none md:rounded-2xl border-0 md:border border-gray-150 shadow-none md:shadow-sm p-1.5 md:p-8 animate-fade-in">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6 border-b border-gray-100 pb-3 font-sans px-1">
                <BookOpen className="h-5.5 w-5.5 text-blue-600" />
                ભરતી પરીક્ષા મોક ટેસ્ટ
              </h3>
              
              <div className="px-1">
                <div className="mb-6 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={mockTestSearch}
                    onChange={(e) => {
                      setMockTestSearch(e.target.value);
                      setMockTestPage(1); // Reset to first page on search
                    }}
                    placeholder="પરીક્ષાનું નામ શોધો..."
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-sans"
                  />
                </div>

                {/* TAB SELECTION: મોક ટેસ્ટ (Mock Test) & ભરતી પરીક્ષા (Recruitment Exam) */}
                <div className="flex border border-gray-200 mb-6 bg-slate-50/50 p-1.5 rounded-2xl gap-2">
                  <button
                    onClick={() => {
                      setExamSubTab('mock');
                      setMockTestPage(1);
                      setSelectedSubject('');
                      setSelectedDifficulty('');
                    }}
                    className={`flex-1 py-3 text-center text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      examSubTab === 'mock'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span>📝 મોક ટેસ્ટ</span>
                  </button>
                  <button
                    onClick={() => {
                      setExamSubTab('bharti');
                      setMockTestPage(1);
                      setSelectedSubject('');
                      setSelectedDifficulty('');
                    }}
                    className={`flex-1 py-3 text-center text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      examSubTab === 'bharti'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/15'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span>💼 ભરતી પરીક્ષા</span>
                  </button>
                </div>

                {examSubTab === 'bharti' && (
                  <div className="mb-6 p-4 md:p-5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex gap-3 text-amber-900 shadow-sm animate-fade-in">
                    <div className="bg-amber-100/75 p-2 h-9 w-9 rounded-xl text-amber-700 flex-shrink-0 flex items-center justify-center shadow-sm">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-extrabold text-sm md:text-base text-amber-950 mb-1.5 tracking-wide">
                        અગત્યની સૂચના:
                      </h4>
                      <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm text-amber-900/95 font-medium leading-relaxed">
                        <li>અહીં તમે આપેલી પરીક્ષાના જવાબો સબમિટ કરો.</li>
                        <li>ઑફિશિયલ આન્સર કી આવ્યા બાદ તમે તમારા સાચા માર્ક્સ જાણી શકશો.</li>
                        <li>આ સાથે તમે તમારું અંદાજિત મેરિટ લિસ્ટ પણ જોઈ શકશો.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Expandable filter for Subject & Difficulty (Only for Mock Tests) */}
                {examSubTab === 'mock' && (
                  <div className="mb-6">
                    <button
                      onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100 hover:border-blue-300 rounded-2xl cursor-pointer transition-all duration-300 shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <SlidersHorizontal className="h-4 w-4 text-blue-600 animate-pulse" />
                        <span className="text-xs md:text-sm font-extrabold text-blue-900 tracking-wide">
                          મોક ટેસ્ટ ફિલ્ટર અને કઠિનતા સ્તર (Advanced Filters)
                        </span>
                        {(selectedSubject || selectedDifficulty) && (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-[10px] font-bold text-white">
                            {(selectedSubject ? 1 : 0) + (selectedDifficulty ? 1 : 0)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isFilterExpanded ? (
                          <ChevronUp className="h-4 w-4 text-blue-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </button>

                    {/* Filter Panel content */}
                    {isFilterExpanded && (
                      <div className="mt-3 bg-white border border-slate-100 p-5 rounded-2xl shadow-md space-y-5">
                        {/* 1. Subject filter */}
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1 flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                            વિષય મુજબ ફિલ્ટર કરો (Filter by Subject):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setSelectedSubject('');
                                setMockTestPage(1);
                              }}
                              className={`px-3.5 py-2 text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer border ${
                                selectedSubject === ''
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/10'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              બધા વિષય
                            </button>
                            {[
                              'સામાન્ય જ્ઞાન',
                              'ભાષા અને વ્યાકરણ',
                              'અંગ્રેજી વ્યાકરણ',
                              'ગણિત અને તાર્કિક કસોટી',
                              'વિજ્ઞાન અને ટેકનોલોજી',
                              'કરંટ અફેર્સ',
                              'કોમ્પ્યુટર જ્ઞાન',
                              'જાહેર વહીવટ અને મનોવિજ્ઞાન'
                            ].map((sub) => (
                              <button
                                key={sub}
                                onClick={() => {
                                  setSelectedSubject(sub);
                                  setMockTestPage(1);
                                }}
                                className={`px-3.5 py-2 text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer border ${
                                  selectedSubject === sub
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/10'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                                }`}
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. Difficulty filter */}
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1 flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
                            કઠિનતા સ્તર ફિલ્ટર કરો (Difficulty Type):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setSelectedDifficulty('');
                                setMockTestPage(1);
                              }}
                              className={`px-4 py-2 text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer border ${
                                selectedDifficulty === ''
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/10'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              બધા સ્તર (All Levels)
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDifficulty('easy');
                                setMockTestPage(1);
                              }}
                              className={`px-4 py-2 text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 ${
                                selectedDifficulty === 'easy'
                                  ? 'bg-green-600 text-white border-green-600 shadow-sm shadow-green-500/10'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              🟢 Easy (સરળ)
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDifficulty('difficult');
                                setMockTestPage(1);
                              }}
                              className={`px-4 py-2 text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 ${
                                selectedDifficulty === 'difficult'
                                  ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-500/10'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              🔴 Difficult (અઘરું)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {examsLoading ? (
                  <p className="text-gray-500 text-base px-1">ટેસ્ટ લોડ થઈ રહી છે...</p>
                ) : allExams.length === 0 ? (
                  <p className="text-gray-500 text-base px-1">હાલમાં કોઈ પરીક્ષાઓ ઉપલબ્ધ નથી.</p>
                ) : (
                  (() => {
                    const filteredExams = allExams.filter(exam => {
                      const matchesSearch = exam.name.toLowerCase().includes(mockTestSearch.toLowerCase());
                      const matchesTab = examSubTab === 'bharti' ? exam.type === 'bharti' : exam.type !== 'bharti';
                      const matchesSubject = examSubTab === 'mock'
                        ? (selectedSubject === '' || exam.subject === selectedSubject)
                        : true;
                      const matchesDifficulty = examSubTab === 'mock'
                        ? (selectedDifficulty === '' || exam.difficulty === selectedDifficulty)
                        : true;
                      return matchesSearch && matchesTab && matchesSubject && matchesDifficulty;
                    });
                    const totalPages = Math.ceil(filteredExams.length / MOCK_TESTS_PER_PAGE);
                    const paginatedExams = filteredExams.slice(
                      (mockTestPage - 1) * MOCK_TESTS_PER_PAGE,
                      mockTestPage * MOCK_TESTS_PER_PAGE
                    );

                    if (filteredExams.length === 0) {
                      return <p className="text-gray-500 text-base text-center py-8">કોઈ પરીક્ષા મળી નથી.</p>;
                    }

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {paginatedExams.map((exam) => {
                            const isAttempted = history.some(h => String(h.examId) === String(exam.id));
                            return (
                            <div key={exam.id} className={`border rounded-xl p-3 sm:p-3.5 md:p-4 hover:shadow-lg transition-all flex flex-col justify-between bg-white md:bg-slate-50/50 ${
                              exam.type === 'bharti' ? 'border-indigo-100 hover:border-indigo-500' : 'border-blue-100 hover:border-blue-500'
                            }`}>
                              <div>
                                <div className="mb-2.5 pb-1.5 border-b border-slate-100/60 flex items-center justify-between gap-2">
                                  {exam.type === 'bharti' ? (
                                    <div className="flex flex-wrap items-center gap-2 flex-1">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                        💼 સત્તાવાર ભરતી
                                      </span>
                                      {exam.totalVacancies && (
                                        <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] sm:text-[10px] font-bold">
                                          <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-100 flex items-center gap-1 font-sans">
                                            💼 જગ્યાઓ: <strong className="font-extrabold">{exam.totalVacancies}</strong>
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5 items-center flex-1">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100">
                                        📝 મોક ટેસ્ટ
                                      </span>
                                      {exam.subject && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-100">
                                          🏷️ {exam.subject}
                                        </span>
                                      )}
                                      {exam.difficulty && (
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${
                                          exam.difficulty === 'difficult'
                                            ? 'bg-red-50 text-red-700 border-red-100'
                                            : 'bg-green-50 text-green-700 border-green-100'
                                        }`}>
                                          {exam.difficulty === 'difficult' ? '🔴 Difficult' : '🟢 Easy'}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleWishlist(Number(exam.id));
                                    }}
                                    className="p-1.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none shrink-0"
                                    title={wishlist.some(item => Number(item.examId) === Number(exam.id)) ? "Wish List માંથી દૂર કરો" : "Wish List માં ઉમેરો"}
                                  >
                                    <Heart className={`h-4.5 w-4.5 transition-transform active:scale-125 ${
                                      wishlist.some(item => Number(item.examId) === Number(exam.id))
                                        ? "fill-red-500 text-red-500"
                                        : "text-gray-400 hover:text-red-500"
                                    }`} />
                                  </button>
                                </div>
                                
                                <h4 className="font-extrabold text-gray-800 text-lg leading-snug">{exam.name}</h4>
                                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                                  {exam.type === 'bharti' && exam.examDate && (
                                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-slate-400" /> પરીક્ષા તારીખ: {exam.examDate}</span>
                                  )}
                                  <span className="flex items-center gap-1"><FileText className="h-4 w-4 text-slate-400" /> {exam.totalQuestions} પ્રશ્નો</span>
                                  <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-slate-400" /> {exam.duration} મિનિટ</span>
                                </div>
                                
                                {exam.type === 'bharti' && (
                                  <div className="mt-3">
                                    <div>
                                      {exam.answerKeyUploaded ? (
                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 font-bold px-2.5 py-1 rounded-full border border-emerald-100">✔ ઓફિશિયલ આન્સર કી ઉપલબ્ધ</span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 font-bold px-2.5 py-1 rounded-full border border-amber-100">⏳ પરિણામ બાકી (આન્સર કી અપલોડ બાકી)</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => !isAttempted && onTakeExam(exam.id)}
                                disabled={isAttempted}
                                className={`mt-6 text-white font-bold py-2.5 rounded-xl transition-all ${
                                  isAttempted 
                                    ? 'bg-gray-400 cursor-not-allowed shadow-none'
                                    : exam.type === 'bharti' 
                                       ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/15 cursor-pointer active:scale-[0.98]' 
                                       : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/15 cursor-pointer active:scale-[0.98]'
                                }`}
                              >
                                {isAttempted ? 'પરીક્ષા આપેલી છે' : 'પરીક્ષા આપો'}
                              </button>
                            </div>
                          )})}
                        </div>
                        
                        {totalPages > 1 && (
                          <div className="mt-8 flex justify-center items-center gap-2">
                            <button
                              onClick={() => setMockTestPage(p => Math.max(1, p - 1))}
                              disabled={mockTestPage === 1}
                              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-50 cursor-pointer hover:bg-gray-50"
                            >
                              પાછળ
                            </button>
                            
                            {Array.from({ length: totalPages }).map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setMockTestPage(i + 1)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                  mockTestPage === i + 1
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                            
                            <button
                              onClick={() => setMockTestPage(p => Math.min(totalPages, p + 1))}
                              disabled={mockTestPage === totalPages}
                              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-50 cursor-pointer hover:bg-gray-50"
                            >
                              આગળ
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {activeTab === 'merit_list' && (
            <div className="bg-transparent md:bg-white rounded-none md:rounded-2xl border-0 md:border border-gray-150 shadow-none md:shadow-sm p-1.5 md:p-8 animate-fade-in">
              <Leaderboard currentUserName={user.name} />
            </div>
          )}

{/* ADMIN PANEL TAB */}
          {activeTab === 'admin' && user?.role === 'admin' && (
            <div className="animate-fade-in bg-white rounded-2xl border border-gray-150 shadow-sm p-2 md:p-4">
              <AdminPanel />
            </div>
          )}

          {/* BOOKMARKS TAB PANEL */}
          
          {activeTab === 'change_password' && (
            <div className="bg-transparent md:bg-white rounded-none md:rounded-[2rem] border-0 md:border border-slate-100 shadow-none md:shadow-xl p-2 md:p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Lock className="h-6 w-6 text-orange-600" /> પાસવર્ડ બદલો
              </h2>
              {passMsg.text && (
                <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${passMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium leading-relaxed">{passMsg.text}</p>
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">હાલનો પાસવર્ડ</label>
                  <input type="password" value={passForm.current} onChange={e => setPassForm({...passForm, current: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">નવો પાસવર્ડ</label>
                  <input type="password" value={passForm.newPass} onChange={e => setPassForm({...passForm, newPass: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">નવો પાસવર્ડ (ફરીથી)</label>
                  <input type="password" value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500" required />
                </div>
                <button type="submit" disabled={updateLoading} className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition-all">
                  {updateLoading ? 'પ્રોસેસ થઈ રહી છે...' : 'પાસવર્ડ બદલો'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div className="bg-transparent md:bg-white rounded-none md:rounded-2xl border-0 md:border border-gray-150 shadow-none md:shadow-sm p-1.5 md:p-8 animate-fade-in space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 px-1">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 font-sans">
                  <Bookmark className="h-5 w-5 text-blue-600 fill-blue-500/10" />
                  બુકમાર્ક કરેલા પ્રશ્નો (Bookmarked Questions)
                </h3>
                <span className="text-xs bg-blue-50 text-blue-700 font-extrabold px-3 py-1 rounded-full">
                  કુલ: {bookmarks.length} પ્રશ્ન
                </span>
              </div>

              {bookmarksLoading ? (
                <p className="text-gray-500">બુકમાર્ક્સ લોડ થઈ રહ્યા છે...</p>
              ) : bookmarks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <Bookmark className="h-10 w-10 text-gray-300 mx-auto mb-3 animate-bounce" />
                  <p className="text-gray-700 font-bold mb-1">તમે હજુ સુધી કોઈ પ્રશ્ન બુકમાર્ક કર્યો નથી.</p>
                  <p className="text-gray-500 text-xs max-w-sm mx-auto leading-relaxed">
                    મોક ટેસ્ટ દરમિયાન મુશ્કેલ અથવા અઘરા પ્રશ્નોને બુકમાર્ક કરો જેથી તમે ગમે ત્યારે અહીં તેમનો રિવ્યુ અને અભ્યાસ કરી શકો.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {bookmarks.map((bmk) => {
                    const q = bmk.question;
                    return (
                      <div key={bmk.id} className="border border-gray-150 rounded-xl p-4 bg-white md:bg-slate-50/50 hover:shadow-md transition-all space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-lg">
                              {bmk.examName || 'Mock Test'}
                            </span>
                            {q.type === 'paragraph' && (
                              <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded-lg">
                                ફકરો (Passage)
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 font-medium">
                            સેવ કરેલ: {safeFormatDate(bmk.bookmarkedAt)}
                          </span>
                        </div>

                        {q.type === 'paragraph' && q.passage && (
                          <div className="bg-blue-50/70 border-l-4 border-blue-500 p-4 rounded-r-xl italic text-gray-700 text-sm leading-relaxed">
                            "{q.passage}"
                          </div>
                        )}

                        <h4 className="font-extrabold text-gray-800 text-base leading-snug">
                          {q.questionText}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
                          {['A', 'B', 'C', 'D'].map((opt) => {
                            const optText = q.options[opt];
                            const isCorrect = opt === q.correctAnswer;
                            return (
                              <div
                                key={opt}
                                className={`p-3 rounded-xl border text-sm flex items-center gap-3 ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                                    : 'bg-white border-gray-150 text-gray-700'
                                }`}
                              >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {opt}
                                </span>
                                <span>{optText}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-100/50">
                          <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                            સાચો જવાબ: વિકલ્પ ({q.correctAnswer})
                          </div>
                          <button
                            onClick={() => handleRemoveBookmark(q.id)}
                            className="text-xs text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            બુકમાર્ક દૂર કરો
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}



        </div>
      </div>


    </div>
  );
}
