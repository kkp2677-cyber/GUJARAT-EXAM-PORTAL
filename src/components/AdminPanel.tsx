import React, { useState, useEffect } from 'react';
import { Users, Settings, CreditCard, FileText, PlusCircle, Check, Trash2, Edit, ShieldAlert, Upload, Eye, ToggleLeft, ToggleRight, AlertCircle, Info, Bell, Send, Calendar, Download, Database } from 'lucide-react';
import { User, BlogPost, Exam, Question, PushNotification, ExamCalendarEvent } from '../types';
import ClassicEditor from './ClassicEditor';
import { safeFormatDate } from '../utils/date';

export default function AdminPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'cms' | 'add-exam' | 'notifications' | 'calendar' | 'settings'>('users');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [smsGatewayType, setSmsGatewayType] = useState('disabled');
  const [smsGatewayUrl, setSmsGatewayUrl] = useState('');
  const [smsGatewayHeaders, setSmsGatewayHeaders] = useState('');
  const [smsGatewayBody, setSmsGatewayBody] = useState('');
  const [smsGatewayTemplate, setSmsGatewayTemplate] = useState('તમારો વેરિફિકેશન ઓટીપી કોડ {otp} છે.');
  const [smsTwilioSid, setSmsTwilioSid] = useState('');
  const [smsTwilioAuthToken, setSmsTwilioAuthToken] = useState('');
  const [smsTwilioFrom, setSmsTwilioFrom] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Custom confirmation and toast notification states
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };
  
  // States for Exam Calendar
  const [calendarEvents, setCalendarEvents] = useState<ExamCalendarEvent[]>([]);
  const [calendarSuccess, setCalendarSuccess] = useState('');
  const [calendarError, setCalendarError] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [calendarForm, setCalendarForm] = useState({
    examName: '',
    department: 'GPSSB',
    startDate: '',
    endDate: '',
    examDate: '',
    officialLink: '',
    expectedVacancies: '',
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed' | 'delayed'
  });

  // States for User Management
  const [users, setUsers] = useState<User[]>([]);
  const [userFilter, setUserFilter] = useState<'ALL' | 'FREE' | 'PREMIUM'>('ALL');

  const filteredUsers = users.filter(u => {
    const query = searchQuery.trim().toLowerCase();
    
    // Filter by search query
    let matchesQuery = true;
    if (query) {
      matchesQuery = (
        (u.mobile && u.mobile.toLowerCase().includes(query)) ||
        (u.phone && u.phone.toLowerCase().includes(query))
      );
    }
    
    // Filter by subscription
    let matchesFilter = true;
    if (userFilter === 'FREE') {
      matchesFilter = !u.activePlan || u.activePlan === 'free';
    } else if (userFilter === 'PREMIUM') {
      matchesFilter = !!u.activePlan && u.activePlan !== 'free';
    }
    
    return matchesQuery && matchesFilter;
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);

  // States for CMS
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [postForm, setPostForm] = useState<{
    category: 'job' | 'answer_key' | 'result' | 'selection_list' | 'news';
    title: string;
    content: string;
    thumbnail: string;
    metaTitle: string;
    metaDesc: string;
    slug: string;
    status: 'draft' | 'published';
    isPinned: boolean;
  }>({
    category: 'job',
    title: '',
    content: '',
    thumbnail: '',
    metaTitle: '',
    metaDesc: '',
    slug: '',
    status: 'published',
    isPinned: false
  });
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0a80-\u0aff-]+/g, '')
      .replace(/--+/g, '-');
  };

  // States for Exams Management
  const [exams, setExams] = useState<Exam[]>([]);
  const [examName, setExamName] = useState('');
  const [examDuration, setExamDuration] = useState(60);
  const [examTotalQuestions, setExamTotalQuestions] = useState(5);
  const [examType, setExamType] = useState<'mock' | 'bharti'>('mock');
  const [questionsJson, setQuestionsJson] = useState<Question[]>([]);
  const [jsonError, setJsonError] = useState('');
  const [jsonSuccess, setJsonSuccess] = useState('');
  const [examSuccess, setExamSuccess] = useState('');
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // States for Notifications Tab
  const [notifList, setNotifList] = useState<PushNotification[]>([]);
  const [notifForm, setNotifForm] = useState({
    title: '',
    body: '',
    type: 'info' as 'info' | 'alert' | 'job' | 'exam',
    link: ''
  });
  const [notifSuccess, setNotifSuccess] = useState('');
  const [subCount, setSubCount] = useState(0);

  useEffect(() => {
    fetchUsers();
    fetchPosts();
    fetchExams();
    fetchAdminNotifications();
    fetchSubCount();
    fetchCalendarEvents();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`
        }
      });
      if (res.status === 423) {
        window.dispatchEvent(new CustomEvent('user-blocked'));
        return;
      }
      if (!res.ok) throw new Error('સેટિંગ્સ મેળવવામાં નિષ્ફળતા.');
      const data = await res.json();
      setRazorpayKeyId(data.razorpayKeyId || '');
      setRazorpayKeySecret(data.razorpayKeySecret || '');
      setSmsGatewayType(data.smsGatewayType || 'disabled');
      setSmsGatewayUrl(data.smsGatewayUrl || '');
      setSmsGatewayHeaders(data.smsGatewayHeaders || '');
      setSmsGatewayBody(data.smsGatewayBody || '');
      setSmsGatewayTemplate(data.smsGatewayTemplate || 'તમારો વેરિફિકેશન ઓટીપી કોડ {otp} છે.');
      setSmsTwilioSid(data.smsTwilioSid || '');
      setSmsTwilioAuthToken(data.smsTwilioAuthToken || '');
      setSmsTwilioFrom(data.smsTwilioFrom || '');
    } catch (err: any) {
      console.warn('Silent note: Failed to fetch settings:', err);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const res = await fetch('/api/calendar');
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setCalendarEvents(data);
      }
    } catch (err) {
      console.warn('Silent note: Failed to fetch calendar events:', err);
    }
  };


  const fetchSubCount = async () => {
    try {
      const res = await fetch('/api/notifications/subscribers', { headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}` } });
      if (res.status === 423) {
        window.dispatchEvent(new CustomEvent('user-blocked'));
        return;
      }
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.count !== undefined) setSubCount(data.count);
      }
    } catch (err) {
      console.warn('Silent note: Failed to fetch sub count:', err);
    }
  };

  const fetchAdminNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`, 'Content-Type': 'application/json' } });
      if (res.status === 423) {
        window.dispatchEvent(new CustomEvent('user-blocked'));
        return;
      }
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setNotifList(data);
      }
    } catch (err) {
      console.warn('Silent note: Failed to fetch admin notifications:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}` } });
      if (res.status === 423) {
        window.dispatchEvent(new CustomEvent('user-blocked'));
        return;
      }
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.warn('Silent note: Failed to fetch users:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.warn('Silent note: Failed to fetch posts:', err);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/exams');
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setExams(data);
      }
    } catch (err) {
      console.warn('Silent note: Failed to fetch exams:', err);
    }
  };

  // User Management Handlers
  const handleBlockToggle = async (userId: string, currentBlockedStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !currentBlockedStatus })
      });
      if (!res.ok) throw new Error('બ્લોક સ્ટેટસ બદલવામાં નિષ્ફળતા.');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setConfirmModal({
      title: 'યુઝર ડિલીટ કરો',
      message: 'શું તમે ખરેખર આ યુઝરને ડિલીટ કરવા માંગો છો? આનાથી તેમના તમામ ડેટા અને પરિણામો પણ ડિલીટ થઈ જશે.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}`, { 
            method: 'DELETE', 
            headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}` } 
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'યુઝર ડિલીટ કરવામાં નિષ્ફળતા.');
          }
          showToast('યુઝર સફળતાપૂર્વક ડિલીટ કરવામાં આવ્યો!', 'success');
          fetchUsers();
        } catch (err: any) {
          showToast(err.message, 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };


  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`
        },
        body: JSON.stringify({
          razorpayKeyId,
          razorpayKeySecret,
          smsGatewayType,
          smsGatewayUrl,
          smsGatewayHeaders,
          smsGatewayBody,
          smsGatewayTemplate,
          smsTwilioSid,
          smsTwilioAuthToken,
          smsTwilioFrom
        })
      });
      if (!res.ok) throw new Error('સેટિંગ્સ સેવ કરવામાં નિષ્ફળતા.');
      setSettingsMsg('સેટિંગ્સ સફળતાપૂર્વક અપડેટ થયા.');
      setTimeout(() => setSettingsMsg(''), 3000);
      fetchSettings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin/export-database', {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`
        }
      });
      if (!res.ok) throw new Error('ડેટાબેઝ એક્સપોર્ટ કરવામાં નિષ્ફળતા.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('ડેટાબેઝ સફળતાપૂર્વક એક્સપોર્ટ થયો!');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      });
      if (!res.ok) throw new Error('પ્રોફાઇલ અપડેટ નિષ્ફળ રહી.');
      
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // CMS Handlers
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = currentPostId ? `/api/posts/${currentPostId}` : '/api/posts';
      const method = currentPostId ? 'PUT' : 'POST';

      // Fallback slug if empty
      const finalSlug = postForm.slug.trim() !== '' ? postForm.slug.trim() : slugify(postForm.title);
      const submissionData = {
        ...postForm,
        slug: finalSlug
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`
        },
        body: JSON.stringify(submissionData)
      });

      if (!res.ok) throw new Error('પોસ્ટ સાચવવામાં નિષ્ફળતા.');

      setIsEditingPost(false);
      setCurrentPostId(null);
      setPostForm({
        category: 'job',
        title: '',
        content: '',
        thumbnail: '',
        metaTitle: '',
        metaDesc: '',
        slug: '',
        status: 'published',
        isPinned: false
      });
      fetchPosts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditPost = (post: BlogPost) => {
    setCurrentPostId(post.id);
    setPostForm({
      category: post.category,
      title: post.title,
      content: post.content,
      thumbnail: post.thumbnail,
      metaTitle: post.metaTitle || '',
      metaDesc: post.metaDesc || '',
      slug: post.slug || '',
      status: post.status || 'published',
      isPinned: !!post.isPinned
    });
    setIsEditingPost(true);
  };

  const handleDeletePost = async (id: string) => {
    setConfirmModal({
      title: 'પોસ્ટ ડિલીટ કરો',
      message: 'શું તમે આ પોસ્ટ કાઢી નાખવા માંગો છો?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/posts/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`
            }
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'ડિલીટ નિષ્ફળ થયું.');
          }
          showToast('પોસ્ટ સફળતાપૂર્વક ડિલીટ થઈ ગઈ!', 'success');
          fetchPosts();
        } catch (err: any) {
          showToast(err.message, 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  // Exam Builder Handlers
  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJsonError('');
    setJsonSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('JSON ફાઇલ એક Array હોવી જોઈએ.');
        
        // Validate question structure
        parsed.forEach((q, idx) => {
          if (!q.id || !q.type || !q.questionText || !q.options || !q.correctAnswer) {
            throw new Error(`પ્રશ્ન ${idx + 1} અપૂર્ણ છે. id, type, questionText, options (A,B,C,D), અને correctAnswer જરૂરી છે.`);
          }
        });

        setQuestionsJson(parsed);
        setExamTotalQuestions(parsed.length);
        setJsonSuccess(`પરીક્ષાના સબમિટ કરેલ ${parsed.length} પ્રશ્નો સફળતાપૂર્વક ચકાસાયા!`);
      } catch (err: any) {
        setJsonError(err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setExamSuccess('');

    if (questionsJson.length === 0) {
      alert('કૃપા કરીને પહેલા પ્રશ્નોની JSON ફાઇલ અપલોડ કરો.');
      return;
    }

    try {
      const url = editingExamId ? `/api/admin/exams/${editingExamId}` : '/api/admin/exams';
      const method = editingExamId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`
        },
        body: JSON.stringify({
          name: examName,
          duration: examDuration,
          totalQuestions: examTotalQuestions,
          type: examType,
          questions: questionsJson,
          answerKeyUploaded: examType === 'mock' ? true : false // Mock has answers, Bharti key can be toggled later
        })
      });

      if (!res.ok) throw new Error(editingExamId ? 'પરીક્ષા અપડેટ કરવામાં નિષ્ફળતા.' : 'પરીક્ષા બનાવવામાં નિષ્ફળતા.');
      
      setExamSuccess(editingExamId ? 'કસોટી સફળતાપૂર્વક અપડેટ કરવામાં આવી!' : 'નવી કસોટી સફળતાપૂર્વક ઉમેરવામાં આવી!');
      setExamName('');
      setExamDuration(60);
      setExamType('mock');
      setExamTotalQuestions(5);
      setQuestionsJson([]);
      setJsonSuccess('');
      setEditingExamId(null);
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditExam = async (examId: string) => {
    try {
      const res = await fetch(`/api/exams/${examId}`);
      if (!res.ok) throw new Error('પરીક્ષાની વિગતો મેળવવામાં નિષ્ફળતા.');
      const fullExam = await res.json();
      
      setEditingExamId(fullExam.id);
      setExamName(fullExam.name);
      setExamDuration(fullExam.duration);
      setExamType(fullExam.type);
      setExamTotalQuestions(fullExam.totalQuestions);
      setQuestionsJson(fullExam.questions);
      setJsonSuccess(`પરીક્ષાના સબમિટ કરેલ ${fullExam.questions.length} પ્રશ્નો લોડ થયા!`);
      
      const formElement = document.getElementById('exam-builder-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    setConfirmModal({
      title: 'પરીક્ષા ડિલીટ કરો',
      message: 'શું તમે ખરેખર આ પરીક્ષા ડિલીટ કરવા માંગો છો? આનાથી તમામ વિદ્યાર્થીઓના પરિણામો પણ ડિલીટ થઈ જશે.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/exams/${examId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`
            }
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'પરીક્ષા ડિલીટ કરવામાં નિષ્ફળતા.');
          }
          showToast('પરીક્ષા સફળતાપૂર્વક ડિલીટ કરવામાં આવી!', 'success');
          fetchExams();
          if (editingExamId === examId) {
            setEditingExamId(null);
            setExamName('');
            setExamDuration(60);
            setExamType('mock');
            setExamTotalQuestions(5);
            setQuestionsJson([]);
            setJsonSuccess('');
          }
        } catch (err: any) {
          showToast(err.message, 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleToggleAnswerKey = async (examId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/exams/${examId}/toggle-key`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`
        },
        body: JSON.stringify({ answerKeyUploaded: !currentStatus })
      });
      if (!res.ok) throw new Error('આન્સર કી સ્ટેટસ બદલવામાં ખામી.');
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleNotifSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.body) {
      alert('કૃપા કરીને બધી વિગતો ભરો.');
      return;
    }
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`
        },
        body: JSON.stringify(notifForm)
      });
      if (!res.ok) throw new Error('નોટિફિકેશન મોકલવામાં મુશ્કેલી પડી.');
      
      setNotifSuccess('પુશ નોટિફિકેશન સફળતાપૂર્વક બ્રોડકાસ્ટ કરવામાં આવ્યું!');
      setNotifForm({ title: '', body: '', type: 'info', link: '' });
      fetchAdminNotifications();
      
      setTimeout(() => setNotifSuccess(''), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteNotif = async (id: string) => {
    setConfirmModal({
      title: 'નોટિફિકેશન ડિલીટ કરો',
      message: 'શું તમે આ નોટિફિકેશન ડિલીટ કરવા માંગો છો?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/notifications/${id}`, { 
            method: 'DELETE', 
            headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}` } 
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'નોટિફિકેશન ડિલીટ કરવામાં નિષ્ફળતા.');
          }
          showToast('નોટિફિકેશન સફળતાપૂર્વક ડિલીટ થયું!', 'success');
          fetchAdminNotifications();
        } catch (err: any) {
          showToast(err.message, 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleCalendarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalendarSuccess('');
    setCalendarError('');

    if (!calendarForm.examName || !calendarForm.department || !calendarForm.startDate || !calendarForm.endDate) {
      setCalendarError('કૃપા કરીને બધી વિગતો ભરો.');
      return;
    }

    try {
      const url = editingEventId ? `/api/calendar/${editingEventId}` : '/api/calendar';
      const method = editingEventId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`
        },
        body: JSON.stringify(calendarForm)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'કૅલેન્ડર ઇવેન્ટ સાચવવામાં નિષ્ફળતા.');
      }

      setCalendarSuccess(editingEventId ? 'ઇવેન્ટ સફળતાપૂર્વક અપડેટ થઈ!' : 'નવી ઇવેન્ટ સફળતાપૂર્વક ઉમેરવામાં આવી!');
      setCalendarForm({
        examName: '',
        department: 'GPSSB',
        startDate: '',
        endDate: '',
        examDate: '',
        officialLink: '',
    expectedVacancies: '',
        status: 'upcoming'
      });
      setEditingEventId(null);
      fetchCalendarEvents();

      setTimeout(() => setCalendarSuccess(''), 4000);
    } catch (err: any) {
      setCalendarError(err.message);
    }
  };

  const handleEditCalendarEvent = (event: ExamCalendarEvent) => {
    setEditingEventId(event.id);
    setCalendarForm({
      examName: event.examName,
      department: event.department,
      startDate: event.startDate,
      endDate: event.endDate,
      examDate: event.examDate,
      officialLink: event.officialLink || '',
      expectedVacancies: event.expectedVacancies?.toString() || '',
      status: event.status
    });
    setCalendarSuccess('');
    setCalendarError('');
  };

  const handleDeleteCalendarEvent = async (id: string) => {
    setConfirmModal({
      title: 'કૅલેન્ડર ઇવેન્ટ ડિલીટ કરો',
      message: 'શું તમે ખરેખર આ કૅલેન્ડર ઇવેન્ટ કાઢી નાખવા માંગો છો?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/calendar/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${JSON.parse(localStorage.getItem('exam_user') || '{}')?.token}`
            }
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'ઇવેન્ટ ડિલીટ કરવામાં નિષ્ફળતા.');
          }
          showToast('કૅલેન્ડર ઇવેન્ટ સફળતાપૂર્વક કાઢી નાખવામાં આવી!', 'success');
          fetchCalendarEvents();
          if (editingEventId === id) {
            setEditingEventId(null);
            setCalendarForm({
              examName: '',
              department: 'GPSSB',
              startDate: '',
              endDate: '',
              examDate: '',
              officialLink: '',
              expectedVacancies: '',
              status: 'upcoming'
            });
          }
        } catch (err: any) {
          showToast(err.message, 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };


  // JSON Template sample to show
  const jsonSample = `[
  {
    "id": "q1",
    "type": "regular",
    "questionText": "ગુજરાતનું પાટનગર કયું છે?",
    "options": {
      "A": "ગાંધીનગર",
      "B": "અમદાવાદ",
      "C": "વડોદરા",
      "D": "રાજકોટ"
    },
    "correctAnswer": "A"
  }
]`;

  return (
    <div className="space-y-10">
      {/* Page Title */}
      <div className="border-b border-gray-150 pb-5">
        <h2 className="text-3xl font-bold text-gray-900 font-sans tracking-tight">એડમિન પેનલ</h2>
        <p className="text-gray-500 text-sm mt-1">પ્લેટફોર્મના વપરાશકર્તાઓ, બ્લોગ્સ અને પરીક્ષાઓનું સંચાલન કરો.</p>
      </div>

      {/* Admin Tab Selectors */}
      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'users' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700'
          }`}
        >
          <Users className="h-4 w-4" /> વપરાશકર્તા સંચાલન (Users)
        </button>
        <button
          onClick={() => {
            setActiveTab('cms');
            setIsEditingPost(false);
          }}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'cms' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700'
          }`}
        >
          <FileText className="h-4 w-4" /> CMS વ્યવસ્થાપન (Blogs)
        </button>
        <button
          onClick={() => {
            setActiveTab('add-exam');
            setExamSuccess('');
          }}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'add-exam' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700'
          }`}
        >
          <PlusCircle className="h-4 w-4" /> કસોટી બિલ્ડર (JSON MCQ)
        </button>
        <button
          onClick={() => {
            setActiveTab('notifications');
            setNotifSuccess('');
          }}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'notifications' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700'
          }`}
        >
          <Bell className="h-4 w-4" /> પુશ નોટિફિકેશન (Push Alerts)
        </button>
        <button
          onClick={() => {
            setActiveTab('calendar');
            setCalendarSuccess('');
            setCalendarError('');
          }}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'calendar' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700'
          }`}
        >
          <Calendar className="h-4 w-4" /> પરીક્ષા કૅલેન્ડર (Calendar)
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'settings' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700'
          }`}
        >
          <Settings className="h-4 w-4" /> સેટિંગ
        </button>
      </div>

      {/* RENDER ACTIVE TAB VIEW */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 md:p-8">
        


      {/* TAB 1: USER MANAGEMENT */}
        {activeTab === 'users' && (
          
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-3 gap-4">
              <h3 className="text-xl font-bold text-gray-900 font-sans">નોંધાયેલા ઉમેદવારોની સૂચિ</h3>
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="મોબાઇલ નંબરથી શોધો..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-sm"
                />
              </div>
            </div>

            
            {editingUser ? (
              /* Inline User Editor Modal Overlay */
              <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 font-sans border-b pb-2">યુઝર માહિતી સુધારો</h4>
                  <form onSubmit={handleUpdateUserSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">આખું નામ</label>
                      <input
                        type="text"
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">ઈમેઈલ</label>
                      <input
                        type="email"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">કેટેગરી</label>
                        <select
                          value={editingUser.category}
                          onChange={(e) => setEditingUser({ ...editingUser, category: e.target.value as any })}
                          className="w-full px-3 py-2 border rounded-xl text-sm"
                        >
                          <option value="General">General</option>
                          <option value="OBC">OBC</option>
                          <option value="EWS">EWS</option>
                          <option value="SC">SC</option>
                          <option value="ST">ST</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">જન્મ તારીખ</label>
                        <input
                          type="date"
                          value={editingUser.dob}
                          onChange={(e) => setEditingUser({ ...editingUser, dob: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">સરનામું</label>
                      <textarea
                        value={editingUser.address}
                        onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">આપી શકાય તેવી ફ્રી પરીક્ષાઓની સંખ્યા</label>
                      <input
                        type="number"
                        value={editingUser.allowedExams !== undefined ? editingUser.allowedExams : 3}
                        onChange={(e) => setEditingUser({ ...editingUser, allowedExams: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                        min={0}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">એકાઉન્ટ પ્રકાર</label>
                        <select
                          value={editingUser.subscriptionPlan === 'yearly' || editingUser.subscriptionPlan === 'monthly' ? editingUser.subscriptionPlan : 'free'}
                          onChange={(e) => {
                            const plan = e.target.value;
                            let expiry = undefined;
                            let newAllowedExams = editingUser.allowedExams;
                            if (plan === 'monthly') {
                              const d = new Date();
                              d.setMonth(d.getMonth() + 1);
                              expiry = d.toISOString();
                              newAllowedExams = 30000;
                            } else if (plan === 'yearly') {
                              const d = new Date();
                              d.setFullYear(d.getFullYear() + 1);
                              expiry = d.toISOString();
                              newAllowedExams = 30000;
                            }
                            setEditingUser({ ...editingUser, subscriptionPlan: plan, subscriptionExpiry: expiry, allowedExams: newAllowedExams });
                          }}
                          className="w-full px-3 py-2 border rounded-xl text-sm"
                        >
                          <option value="free">Free</option>
                          <option value="monthly">Premium (Monthly)</option>
                          <option value="yearly">Premium (Yearly)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">પ્રીમિયમ સમાપ્તિ તારીખ</label>
                        <input
                          type="date"
                          value={editingUser.subscriptionExpiry ? new Date(editingUser.subscriptionExpiry).toISOString().split('T')[0] : ''}
                          className="w-full px-3 py-2 border rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                          disabled={true}
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="flex-1 py-2 border rounded-xl text-sm font-semibold hover:bg-gray-50"
                      >
                        રદ કરો
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold"
                      >
                        સુધારો સાચવો
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}

            <div className="flex gap-4 mb-4 p-2 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                <input type="radio" name="userFilter" value="ALL" checked={userFilter === 'ALL'} onChange={() => setUserFilter('ALL')} className="text-indigo-600" />
                ALL
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                <input type="radio" name="userFilter" value="FREE" checked={userFilter === 'FREE'} onChange={() => setUserFilter('FREE')} className="text-indigo-600" />
                FREE
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                <input type="radio" name="userFilter" value="PREMIUM" checked={userFilter === 'PREMIUM'} onChange={() => setUserFilter('PREMIUM')} className="text-indigo-600" />
                PREMIUM
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-gray-200">
                    <th className="p-4">ઉમેદવાર (રજી. તારીખ)</th>
                    <th className="p-4">મોબાઇલ / DOB</th>
                    <th className="p-4 text-center">પ્લાન / ટેસ્ટ આપ્યા</th>
                    <th className="p-4 text-center">સ્થિતિ</th>
                    <th className="p-4 text-right">ક્રિયાઓ</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-gray-900">{u.name || 'નામ સેટ કરેલ નથી'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{u.email || 'ઈમેઈલ નથી'}</p>
                          <p className="text-xs text-slate-500 mt-1">રજી: {u.createdAt ? safeFormatDate(u.createdAt) : '-'}</p>
                        </div>
                      </td>
                      <td className="p-4">
                         <p className="font-mono font-medium text-gray-600">{u.mobile || u.phone}</p>
                         <p className="text-xs text-gray-500 mt-0.5">{u.dob ? safeFormatDate(u.dob) : 'DOB નથી'}</p>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {u.activePlan === 'yearly' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">વાર્ષિક (Premium)</span>
                          ) : u.activePlan === 'monthly' ? (
                            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">માસિક (Premium)</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">ફ્રી (Free)</span>
                          )}
                          <span className="text-xs font-bold text-slate-500">ટેસ્ટ: {u.totalTestsTaken || 0}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {u.isBlocked ? (
                          <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">બ્લોક કરેલ</span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-100">સક્રિય</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                            title="માહિતી સુધારો"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleBlockToggle(u.id, u.isBlocked)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              u.isBlocked ? 'hover:bg-emerald-50 text-emerald-600' : 'hover:bg-amber-50 text-amber-600'
                            }`}
                            title={u.isBlocked ? 'અનબ્લોક કરો' : 'બ્લોક કરો'}
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="ડિલીટ કરો"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CMS POSTS MANAGEMENT */}
        {activeTab === 'cms' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-xl font-bold text-gray-900 font-sans">બ્લોગ્સ અને નોટિફિકેશન વ્યવસ્થાપન</h3>
              {!isEditingPost && (
                <button
                  onClick={() => {
                    setCurrentPostId(null);
                    setPostForm({
                      category: 'job',
                      title: '',
                      content: '',
                      thumbnail: '',
                      metaTitle: '',
                      metaDesc: '',
                      slug: '',
                      status: 'published',
                      isPinned: false
                    });
                    setIsEditingPost(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" /> નવી પોસ્ટ લખો
                </button>
              )}
            </div>

            {isEditingPost ? (
              <form onSubmit={handlePostSubmit} className="space-y-6">
                {/* WordPress Header Top Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-lg">✍</span>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base md:text-lg">
                        {currentPostId ? 'પોસ્ટ સંપાદિત કરો (Edit Post)' : 'નવી પોસ્ટ ઉમેરો (Add New Post)'}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-medium">સંપૂર્ણ કસ્ટમાઇઝેશન માટે વર્ડપ્રેસ જેવા એડિટર અને સેક્શન્સ</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingPost(false)}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      રદ કરો
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/15 cursor-pointer"
                    >
                      {currentPostId ? 'અપડેટ કરો' : 'પ્રકાશિત કરો (Publish)'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Left Column (Content Editor) */}
                  <div className="lg:col-span-3 space-y-6">
                    {/* Title Block & Editor */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">પોસ્ટનું શીર્ષક (Title)</label>
                        <input
                          type="text"
                          required
                          value={postForm.title}
                          onChange={(e) => {
                            const newTitle = e.target.value;
                            const oldSlugFromTitle = slugify(postForm.title);
                            setPostForm(prev => {
                              const updates: any = { title: newTitle };
                              if (!prev.slug || prev.slug === oldSlugFromTitle) {
                                updates.slug = slugify(newTitle);
                              }
                              return { ...prev, ...updates };
                            });
                          }}
                          className="w-full px-0 py-2.5 border-b border-gray-200 focus:border-blue-500 outline-none text-xl md:text-2xl font-black text-slate-800 placeholder-slate-300 font-sans transition-colors"
                          placeholder="અહીં શીર્ષક લખો (Enter title here)"
                        />
                      </div>

                      {/* Content editor */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">વિગતવાર સામગ્રી (Content)</label>
                        <ClassicEditor
                          value={postForm.content}
                          onChange={(htmlContent) => setPostForm({ ...postForm, content: htmlContent })}
                          placeholder="અહીં આકર્ષક અપડેટ અને તેની અંદરની પ્રક્રિયાઓ, લાયકાત કે વિગતો લખવાનું શરૂ કરો..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Sidebar Settings) */}
                  <div className="space-y-6">
                    {/* Category Box */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center gap-1.5">
                        📁 કેટેગરી (Category)
                      </h4>
                      <div className="space-y-2.5">
                        {[
                          { id: 'job', name: 'નવી ભરતીઓ (New Jobs)' },
                          { id: 'answer_key', name: 'આન્સર કી (Answer Key)' },
                          { id: 'result', name: 'રિઝલ્ટ (Result)' },
                          { id: 'selection_list', name: 'સિલેક્શન લિસ્ટ' },
                          { id: 'news', name: 'સમાચાર (News)' }
                        ].map(cat => (
                          <label key={cat.id} className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900">
                            <input
                              type="radio"
                              name="category"
                              checked={postForm.category === cat.id}
                              onChange={() => setPostForm({ ...postForm, category: cat.id as any })}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            {cat.name}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Publish / Status Settings Box */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3.5">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center gap-1.5">
                        ⚡ પ્રકાશન સેટિંગ્સ (Publish Settings)
                      </h4>
                      
                      {/* Status select/radio */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">પોસ્ટ સ્ટેટસ (Post Status)</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900">
                            <input
                              type="radio"
                              name="postStatus"
                              checked={postForm.status === 'published'}
                              onChange={() => setPostForm({ ...postForm, status: 'published' })}
                              className="text-blue-600 focus:ring-blue-500 text-xs"
                            />
                            <span>પ્રકાશિત (Published)</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900">
                            <input
                              type="radio"
                              name="postStatus"
                              checked={postForm.status === 'draft'}
                              onChange={() => setPostForm({ ...postForm, status: 'draft' })}
                              className="text-blue-600 focus:ring-blue-500 text-xs"
                            />
                            <span className="text-orange-600">ખરડો (Draft)</span>
                          </label>
                        </div>
                      </div>

                      {/* Featured/Pinned checkbox */}
                      <div className="pt-1.5 border-t border-gray-100">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={postForm.isPinned}
                            onChange={(e) => setPostForm({ ...postForm, isPinned: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <span>મુખ્ય સ્થાને પિન કરો (Pin to Top) 📌</span>
                        </label>
                        <p className="text-[9px] text-slate-400 mt-1 leading-normal pl-6">
                          આ ઓપ્શન ચાલુ કરવાથી આ પોસ્ટ કેટેગરી અને હોમ પેજ પર સૌથી ઉપર દેખાશે.
                        </p>
                      </div>
                    </div>

                    {/* Slug / Permalink Box */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center gap-1.5">
                        🔗 પરમાલિંક (Permalink Slug)
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        SEO ફ્રેન્ડલી URL સેટ કરવા માટે સ્લગ સેટ કરો (દા.ત. gpsc-key). આ ગુજરાતી અથવા અંગ્રેજી હોઈ શકે છે.
                      </p>
                      <input
                        type="text"
                        value={postForm.slug}
                        onChange={(e) => setPostForm({ ...postForm, slug: slugify(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 outline-none text-slate-700 font-semibold"
                        placeholder="slug-name-here"
                      />
                      {postForm.slug && (
                        <div className="pt-1">
                          <span className="block text-[9px] uppercase font-bold text-slate-400">URL પ્રિવ્યુ:</span>
                          <span className="block text-[9px] text-blue-600 font-mono break-all leading-normal pt-0.5">
                            https://gujaratexam.in/post/{postForm.slug}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Featured Image Thumbnail Box */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center gap-1.5">
                        🖼 થંબનેલ છબી (Featured Image)
                      </h4>
                      <input
                        type="url"
                        value={postForm.thumbnail}
                        onChange={(e) => setPostForm({ ...postForm, thumbnail: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 outline-none text-slate-700 font-semibold"
                        placeholder="https://images.unsplash.com/..."
                      />
                      {postForm.thumbnail && (
                        <div className="border border-gray-150 rounded-xl overflow-hidden bg-slate-50 aspect-video relative group">
                          <img
                            src={postForm.thumbnail}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setPostForm({ ...postForm, thumbnail: '' })}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="છબી દૂર કરો"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* SEO Meta Box */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center gap-1.5">
                        🌐 SEO મેટા ટેગ્સ (Meta Tags)
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">SEO મેટા શીર્ષક (Meta Title)</label>
                          <input
                            type="text"
                            value={postForm.metaTitle}
                            onChange={(e) => setPostForm({ ...postForm, metaTitle: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 outline-none text-slate-700"
                            placeholder="નિયત કીવર્ડ્સ સાથેનું શીર્ષક"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">SEO મેટા વર્ણન (Meta Desc)</label>
                          <textarea
                            rows={2}
                            value={postForm.metaDesc}
                            onChange={(e) => setPostForm({ ...postForm, metaDesc: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 outline-none text-slate-700 resize-none"
                            placeholder="પેજ વિશેનું ટૂંકું આકર્ષક વર્ણન"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map((p) => (
                  <div key={p.id} className="bg-white border border-gray-150 p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="flex justify-between items-start mb-2.5">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            p.category === 'job' ? 'bg-blue-50 text-blue-800 border-blue-100' :
                            p.category === 'answer_key' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                            p.category === 'result' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                            p.category === 'selection_list' ? 'bg-purple-50 text-purple-800 border-purple-100' :
                            'bg-sky-50 text-sky-800 border-sky-100'
                          }`}>
                            {p.category === 'job' ? 'નવી ભરતીઓ' :
                             p.category === 'answer_key' ? 'આન્સર કી' :
                             p.category === 'result' ? 'રિઝલ્ટ' :
                             p.category === 'selection_list' ? 'સિલેક્શન લિસ્ટ' :
                             'સમાચાર'}
                          </span>
                          
                          {/* Status Badge */}
                          {p.status === 'draft' ? (
                            <span className="text-[9px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.2 rounded font-bold">ખરડો (Draft)</span>
                          ) : (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">લાઇવ (Live)</span>
                          )}

                          {/* Pinned Badge */}
                          {p.isPinned && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-bold">📌 મુખ્ય પિન</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditPost(p)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(p.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-extrabold text-gray-800 text-sm leading-snug hover:text-blue-600 transition-colors">{p.title}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-2" dangerouslySetInnerHTML={{ __html: p.content.replace(/<[^>]*>/g, '') }} />
                    </div>
                    
                    {/* Views & Date Footer */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                      <span>તારીખ: {safeFormatDate(p.createdAt || p.date)}</span>
                      <span className="font-black text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">👁 {p.views || 0} વ્યુઝ</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EXAM MODULE BUILDER */}
        {activeTab === 'add-exam' && (
          <div className="space-y-8">
            <h3 className="text-xl font-bold text-gray-900 font-sans border-b border-gray-100 pb-3">
              {editingExamId ? 'પરીક્ષા સંપાદિત કરો (Edit Exam)' : 'નવી પરીક્ષા બિલ્ડ કરો'}
            </h3>
            
            {examSuccess && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl text-sm font-medium text-emerald-800">
                {examSuccess}
              </div>
            )}

            <form id="exam-builder-form" onSubmit={handleCreateExam} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Form Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">કસોટીનું નામ (Exam Name)</label>
                    <input
                      type="text"
                      required
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      className="w-full px-4 py-2.5 border rounded-xl text-sm"
                      placeholder="દા.ત. વન રક્ષક મોક ટેસ્ટ - ૧૨"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">પરીક્ષા કેટેગરી (Exam Type)</label>
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value as any)}
                      className="w-full px-4 py-2.5 border bg-white rounded-xl text-sm"
                    >
                      <option value="mock">મોક ટેસ્ટ (Mock Test)</option>
                      <option value="bharti">ભરતી પરીક્ષા (Bharti Exam)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">સમયગાળો (મિનિટમાં)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={examDuration}
                      onChange={(e) => setExamDuration(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">કુલ પ્રશ્નો (ઓટો-ગણતરી)</label>
                    <input
                      type="number"
                      disabled
                      value={examTotalQuestions}
                      className="w-full px-4 py-2.5 border bg-gray-50 text-gray-500 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* File Uploader */}
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gray-50/50 hover:bg-gray-50 transition-all relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJsonUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-800">
                    {editingExamId ? 'નવા પ્રશ્નો બદલવા માટે MCQs ફાઇલ અપલોડ કરો (JSON)' : 'MCQs ડેટા ફાઇલ (JSON ફોર્મેટ) અહીં ખેંચો અથવા અપલોડ કરો'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">જો પ્રશ્નો બદલવા ન હોય, તો અપલોડ કરવાની જરૂર નથી.</p>
                </div>

                {jsonError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>JSON ભૂલ:</strong> {jsonError}</span>
                  </div>
                )}

                {jsonSuccess && (
                  <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{jsonSuccess}</span>
                  </div>
                )}

                {editingExamId ? (
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingExamId(null);
                        setExamName('');
                        setExamDuration(60);
                        setExamType('mock');
                        setExamTotalQuestions(5);
                        setQuestionsJson([]);
                        setJsonSuccess('');
                      }}
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 cursor-pointer transition-all active:scale-[0.99] text-sm"
                    >
                      રદ કરો (Cancel)
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 cursor-pointer transition-all active:scale-[0.99] text-sm"
                    >
                      ફેરફારો સાચવો (Save Changes)
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    કસોટી પ્રકાશિત કરો (Publish Exam)
                  </button>
                )}
              </div>

              {/* Right Column: JSON Sample and Template Guide */}
              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                    <Info className="h-4 w-4 text-blue-600" /> પ્રશ્ન પત્ર JSON નમૂનો
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    તમારા કમ્પ્યુટરમાં એક નવી ટેક્સ્ટ ફાઇલ બનાવો અને તેને <strong>.json</strong> થી સેવ કરો. પ્રશ્નોનું માળખું નીચે મુજબ રાખો:
                  </p>
                  <pre className="bg-slate-900 text-slate-300 p-3 rounded-lg text-[10px] font-mono overflow-x-auto max-h-[180px] leading-relaxed select-all">
                    {jsonSample}
                  </pre>
                  <div className="text-[10px] text-slate-500 leading-normal">
                    💡 ફકરાવાળા પ્રશ્ન માટે <code>"type": "paragraph"</code> અને <code>"passage": "તમારો ફકરો..."</code> કી સેટ કરો.
                  </div>
                </div>
              </div>

              {/* CURRENT BHARTI ANSWER KEYS STATUS MANAGER FOR SIMULATION */}
              <div className="lg:col-span-3 border border-gray-150 rounded-3xl p-6 bg-slate-50/40 space-y-4">
                <h4 className="font-extrabold text-sm text-slate-800 tracking-wider uppercase">આન્સર કી અપલોડર સિમ્યુલેશન</h4>
                <p className="text-xs text-slate-500 leading-normal">
                  સબમિટ કરેલી સરકારી ભરતી પરીક્ષાઓ માટે નીચેથી ઓફિશિયલ આન્સર કી જાહેર કરો / પાછી ખેંચો જેથી માર્ક્સ અનલોક કરી શકાય:
                </p>
                {exams.filter(e => e.type === 'bharti').length === 0 ? (
                  <p className="text-xs text-slate-400 italic">કોઈ સરકારી ભરતી પરીક્ષાઓ ઉપલબ્ધ નથી.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    {exams.filter(e => e.type === 'bharti').map(e => (
                      <div key={e.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-150 shadow-sm hover:shadow-md transition-all">
                        <span className="font-bold text-slate-700 text-xs md:text-sm truncate mr-2" title={e.name}>{e.name}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAnswerKey(e.id, e.answerKeyUploaded)}
                          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-all text-[11px] shrink-0 ${
                            e.answerKeyUploaded 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {e.answerKeyUploaded ? 'ઉપલબ્ધ (કી જાહેર)' : 'બાકી (અનલોક કરો)'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Published Exams Manager Section */}
            <div className="mt-12 bg-white rounded-3xl border border-gray-150 p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" /> પ્રકાશિત થયેલી પરીક્ષાઓનું સંચાન
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">અહીંથી તમે કોઈપણ ચાલુ અથવા પૂરી થયેલી પરીક્ષાને એડિટ અથવા સંપૂર્ણપણે ડિલીટ કરી શકો છો.</p>
                </div>
                <span className="bg-blue-50 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">
                  કુલ પરીક્ષાઓ: {exams.length}
                </span>
              </div>

              {exams.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm font-sans">
                  કોઈ પરીક્ષાઓ પ્રકાશિત થયેલ નથી.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {exams.map((exam) => (
                    <div key={exam.id} className="border border-gray-150 hover:border-gray-200 rounded-2xl p-5 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border uppercase ${
                            exam.type === 'mock' 
                              ? 'bg-blue-50 text-blue-800 border-blue-100' 
                              : 'bg-purple-50 text-purple-800 border-purple-100'
                          }`}>
                            {exam.type === 'mock' ? 'મોક ટેસ્ટ' : 'સરકારી ભરતી'}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditExam(exam.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all cursor-pointer"
                              title="એડિટ કરો"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExam(exam.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all cursor-pointer"
                              title="ડિલીટ કરો"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <h5 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2 min-h-[40px]">{exam.name}</h5>
                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-gray-500 border-t border-gray-100/70 pt-3">
                          <div>
                            <span className="block text-[10px] uppercase text-gray-400 font-bold">સમયગાળો</span>
                            <span className="font-semibold text-gray-700">{exam.duration} મિનિટ</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase text-gray-400 font-bold">કુલ પ્રશ્નો</span>
                            <span className="font-semibold text-gray-700">{exam.totalQuestions} પ્રશ્નો</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100/70 flex justify-between items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">આન્સર કી:</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAnswerKey(exam.id, exam.answerKeyUploaded)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            exam.answerKeyUploaded 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-800 border border-amber-100'
                          }`}
                        >
                          {exam.answerKeyUploaded ? 'જાહેર' : 'બાકી'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PUSH NOTIFICATIONS BROADCASTER */}
        {activeTab === 'notifications' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-3">રીઅલ-ટાઇમ પુશ નોટિફિકેશન બ્રોડકાસ્ટર</h3>
              <p className="text-xs text-gray-500 mt-1">અહીંથી મોકલેલો સંદેશ દરેક એક્ટિવ ઉમેદવારને બ્રાઉઝર પોપ-અપ દ્વારા રિયલ-ટાઇમમાં ડિલિવર થશે.</p>
            </div>
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <span>કુલ પુશ સબસ્ક્રાઈબર્સ (Total Subscribers):</span>
                </div>
                <span className="text-xl font-extrabold text-blue-900">{subCount}</span>
              </div>


            {notifSuccess && (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 flex items-center gap-2 text-sm font-bold animate-pulse">
                <Check className="h-5 w-5 text-emerald-600" />
                <span>{notifSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Create Notification Form */}
              <form onSubmit={handleNotifSubmit} className="lg:col-span-6 space-y-5 bg-slate-50/50 p-6 rounded-2xl border border-gray-150">
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">નવું નોટિફિકેશન મોકલો</h4>
                
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">શીર્ષક (Notification Title)</label>
                  <input
                    type="text"
                    required
                    value={notifForm.title}
                    onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="દા.ત. GPSC 2026 નવું પરીક્ષા કેલેન્ડર જાહેર"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">સંદેશ વિગત (Message Body)</label>
                  <textarea
                    required
                    rows={3}
                    value={notifForm.body}
                    onChange={(e) => setNotifForm({ ...notifForm, body: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="દા.ત. આયોગ દ્વારા ૨૦૨૬-૨૭ ના વર્ષ માટે તમામ ભરતી પરીક્ષાઓનું સંભવિત સમયપત્રક મુકાઈ ગયું છે..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">પ્રકાર (Category Type)</label>
                    <select
                      value={notifForm.type}
                      onChange={(e) => setNotifForm({ ...notifForm, type: e.target.value as any })}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="info">ℹ️ સામાન્ય માહિતી (Info)</option>
                      <option value="alert">⚠️ અગત્યનું એલર્ટ (Alert)</option>
                      <option value="job">💼 નવી ભરતી (Job Recruitment)</option>
                      <option value="exam">📝 કસોટી/પરિણામ (Exam/Result)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">લિન્ક URL (વૈકલ્પિક)</label>
                    <input
                      type="url"
                      value={notifForm.link}
                      onChange={(e) => setNotifForm({ ...notifForm, link: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="https://exam.com/details"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
                >
                  <Send className="h-4 w-4" /> બ્રોડકાસ્ટ પુશ નોટિફિકેશન (Send Push)
                </button>
              </form>

              {/* Right Column: Sent Notifications list / Broadcast Log */}
              <div className="lg:col-span-6 space-y-4">
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">બ્રોડકાસ્ટ હિસ્ટ્રી (Broadcast Log)</h4>
                
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {notifList.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center text-slate-400">
                      <Bell className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">કોઈ સક્રિય બ્રોડકાસ્ટ નથી</p>
                    </div>
                  ) : (
                    notifList.map((notif) => (
                      <div key={notif.id} className="bg-white border border-gray-150 rounded-2xl p-4 flex gap-3 shadow-sm hover:shadow transition-all relative group">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-gray-100 self-start text-lg">
                          {notif.type === 'job' ? '💼' : notif.type === 'exam' ? '📝' : notif.type === 'alert' ? '⚠️' : 'ℹ️'}
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {notif.type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(notif.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <h5 className="font-bold text-slate-800 text-xs mt-1.5 leading-normal break-words">{notif.title}</h5>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed break-words">{notif.body}</p>
                          {notif.link && (
                            <a href={notif.link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-semibold underline mt-1.5 block truncate">
                              {notif.link}
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotif(notif.id)}
                          className="absolute top-4 right-4 text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          title="નોટિફિકેશન રદ કરો"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: EXAM CALENDAR MANAGEMENT */}
        {activeTab === 'calendar' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" /> પરીક્ષા કૅલેન્ડર અને મહત્વપૂર્ણ તારીખો સંચાલન
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                સરકારી ભરતીઓના ઓનલાઇન ફોર્મ શરૂ થવાની તારીખ, છેલ્લી તારીખ, અને પરીક્ષા યોજાશે તેની તારીખ ઉમેરો કે ડિલીટ કરો. આ ડેટા વિદ્યાર્થીઓના હોમપેજ પર લાઈવ કૅલેન્ડરમાં દેખાશે.
              </p>
            </div>

            {calendarSuccess && (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 flex items-center gap-2 text-sm font-bold animate-pulse">
                <Check className="h-5 w-5 text-emerald-600" />
                <span>{calendarSuccess}</span>
              </div>
            )}

            {calendarError && (
              <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 flex items-center gap-2 text-sm font-bold">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span>{calendarError}</span>
              </div>
            )}

            <div className="space-y-8">
              {/* Create/Edit Event Form */}
              <form onSubmit={handleCalendarSubmit} className="space-y-5 bg-slate-50/50 p-6 rounded-2xl border border-gray-150">
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  {editingEventId ? '✏️ ઇવેન્ટ સુધારો' : '➕ નવી ઇવેન્ટ ઉમેરો'}
                </h4>
                
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">ભરતી/પરીક્ષાનું નામ (Exam Name)</label>
                  <input
                    type="text"
                    required
                    value={calendarForm.examName}
                    onChange={(e) => setCalendarForm({ ...calendarForm, examName: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="દા.ત. તલાટી કમ મંત્રી નવી ભરતી ૨૦૨૬"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">ભરતી બોર્ડ / વિભાગ</label>
                    <select
                      value={calendarForm.department}
                      onChange={(e) => setCalendarForm({ ...calendarForm, department: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="GPSSB">GPSSB (પંચાયત મંડળ)</option>
                      <option value="GSSSB">GSSSB (ગૌણ સેવા)</option>
                      <option value="GPSC">GPSC (જાહેર સેવા આયોગ)</option>
                      <option value="GPRB">GPRB / Police (પોલીસ ભરતી)</option>
                      <option value="HC">HC (હાઇકોર્ટ ભરતી)</option>
                      <option value="Other">Other (અન્ય વિભાગ)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">સ્થિતિ (Status)</label>
                    <select
                      value={calendarForm.status}
                      onChange={(e) => setCalendarForm({ ...calendarForm, status: e.target.value as any })}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="upcoming">⏳ આગામી (Upcoming)</option>
                      <option value="ongoing">🟢 ફોર્મ ભરવાનું ચાલુ (Ongoing)</option>
                      <option value="completed">✔ પૂર્ણ થયેલ (Completed)</option>
                      <option value="delayed">⚠️ વિલંબિત (Delayed)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">ફોર્મ શરૂઆત તારીખ</label>
                    <input
                      type="date"
                      required
                      value={calendarForm.startDate}
                      onChange={(e) => setCalendarForm({ ...calendarForm, startDate: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">ફોર્મ છેલ્લી તારીખ</label>
                    <input
                      type="date"
                      required
                      value={calendarForm.endDate}
                      onChange={(e) => setCalendarForm({ ...calendarForm, endDate: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">અંદાજિત પરીક્ષા તારીખ (વૈકલ્પિક)</label>
                    <input
                      type="date"
                      value={calendarForm.examDate}
                      onChange={(e) => setCalendarForm({ ...calendarForm, examDate: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">સત્તાવાર લિંક (વૈકલ્પિક)</label>
                    <input
                      type="url"
                      value={calendarForm.officialLink}
                      onChange={(e) => setCalendarForm({ ...calendarForm, officialLink: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="https://ojas.gujarat.gov.in"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">જગ્યાઓ (Vacancies)</label>
                    <input
                      type="number"
                      min="0"
                      value={calendarForm.expectedVacancies}
                      onChange={(e) => setCalendarForm({ ...calendarForm, expectedVacancies: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                      placeholder="દા.ત. 1500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventId(null);
                        setCalendarForm({
                          examName: '',
                          department: 'GPSSB',
                          startDate: '',
                          endDate: '',
                          examDate: '',
                          officialLink: '',
    expectedVacancies: '',
                          status: 'upcoming'
                        });
                      }}
                      className="flex-1 border border-gray-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer"
                    >
                      રદ કરો
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
                  >
                    <Check className="h-4 w-4" /> {editingEventId ? 'ફેરફાર સાચવો' : 'ઇવેન્ટ સેવ કરો'}
                  </button>
                </div>
              </form>

              {/* Events List */}
              <div className="space-y-4 border-t border-gray-100 pt-6">
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">સક્રિય પરીક્ષા સમયપત્રક યાદી ({calendarEvents.length})</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[800px] overflow-y-auto pr-1">
                  {calendarEvents.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center text-slate-400">
                      <Calendar className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">કોઈ ઇવેન્ટ ઉપલબ્ધ નથી. નવી ઇવેન્ટ ઉમેરો.</p>
                    </div>
                  ) : (
                    calendarEvents.map((evt) => (
                      <div key={evt.id} className="bg-white border border-gray-150 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm hover:shadow transition-all relative group">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] uppercase font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                {evt.department}
                              </span>
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                evt.status === 'ongoing' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                evt.status === 'upcoming' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                evt.status === 'completed' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                                {evt.status === 'ongoing' ? '🟢 ફોર્મ ચાલુ છે' :
                                 evt.status === 'upcoming' ? '⏳ આગામી ભરતી' :
                                 evt.status === 'completed' ? '✔ પૂર્ણ' :
                                 '⚠️ વિલંબિત/નવી તારીખ'}
                              </span>
                            </div>
                            <h5 className="font-extrabold text-slate-800 text-sm mt-2 leading-normal">{evt.examName}</h5>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditCalendarEvent(evt)}
                              className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                              title="ઇવેન્ટ સુધારો"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCalendarEvent(evt.id)}
                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title="ઇવેન્ટ ડિલીટ કરો"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Calendar Details Panel */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 mt-3 text-[11px] text-slate-600 font-medium">
                          <div>
                            <span className="block text-[9px] text-slate-400 uppercase font-bold mb-0.5">ફોર્મ શરૂઆત</span>
                            <span className="font-mono text-slate-700 font-semibold">{safeFormatDate(evt.startDate)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 uppercase font-bold mb-0.5">ફોર્મ છેલ્લી તારીખ</span>
                            <span className="font-mono text-red-600 font-extrabold">{safeFormatDate(evt.endDate)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 uppercase font-bold mb-0.5">પરીક્ષા તારીખ</span>
                            <span className="font-mono text-indigo-700 font-extrabold">{safeFormatDate(evt.examDate)}</span>
                          </div>
                        </div>

                        {evt.officialLink && (
                          <div className="mt-2.5 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-medium">લિંક:</span>
                            <a href={evt.officialLink} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline truncate max-w-[200px]">
                              {evt.officialLink}
                            </a>
                          </div>
                        )}
                        {evt.expectedVacancies && (
                          <div className="mt-1 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-medium">જગ્યાઓ:</span>
                            <span className="text-slate-700 font-bold">{evt.expectedVacancies.toLocaleString('gu-IN')}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PAYMENT & LOGIN GATEWAY MANAGEMENT (Settings) */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 font-sans border-b border-gray-100 pb-3 flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-600" /> પેમેન્ટ અને કનેક્શન સેટિંગ્સ (Gateways)
            </h3>
            
            {settingsMsg && (
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm border border-emerald-100 animate-pulse">
                {settingsMsg}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-8">
              {/* Razorpay Section */}
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-gray-150 space-y-5">
                <div className="border-b pb-2">
                  <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" /> રેઝરપે પેમેન્ટ ગેટવે (Razorpay Integration)
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">યુઝર પ્રીમિયમ સબ્સ્ક્રિપ્શન ખરીદી શકે તે માટે Razorpay API Keys સેટ કરો.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Razorpay Key ID</label>
                    <input
                      type="text"
                      value={razorpayKeyId}
                      onChange={(e) => setRazorpayKeyId(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="rzp_test_..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Razorpay Key Secret</label>
                    <input
                      type="password"
                      value={razorpayKeySecret}
                      onChange={(e) => setRazorpayKeySecret(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="Enter secret key..."
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">સિક્રેટ કી સર્વર પર સુરક્ષિત રીતે સેવ થશે અને ક્લાયન્ટ બ્રાઉઝર પર મોકલવામાં આવશે નહીં.</p>
              </div>

              {/* Flexible SMS OTP Integration */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="border-b pb-2">
                  <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Send className="h-4 w-4 text-emerald-600" /> મોબાઈલ વેરિફિકેશન ગેટવે (Flexible SMS OTP Integration)
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">યુઝર રજીસ્ટ્રેશન વખતે મોબાઈલ નંબર વેરિફાઈ કરવા માટેનો એસએમએસ ગેટવે સેટ કરો.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">એક્ટિવ એસએમએસ પ્રોવાઈડર (Active SMS Gateway)</label>
                  <select
                    value={smsGatewayType}
                    onChange={(e) => setSmsGatewayType(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="disabled">મોબાઈલ નંબર વેરિફિકેશન બંધ (Disabled)</option>
                    <option value="sandbox">સેન્ડબોક્સ મોડ (Sandbox Test - ડેમો ઓટીપી ઓટો-શો થશે)</option>
                    <option value="twilio">Twilio એસએમએસ ગેટવે (Twilio Gateway)</option>
                    <option value="custom_get">કસ્ટમ GET API ગેટવે (કોઈપણ ગ્લોબલ/સ્થાનિક SMS API)</option>
                    <option value="custom_post">કસ્ટમ POST JSON API ગેટવે (કોઈપણ ગ્લોબલ/સ્થાનિક SMS API)</option>
                  </select>
                </div>

                {smsGatewayType !== 'disabled' && (
                  <div className="space-y-4 pt-2 border-t border-dashed border-gray-200">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">એસએમએસ ટેમ્પલેટ (SMS Message Template)</label>
                      <input
                        type="text"
                        value={smsGatewayTemplate}
                        onChange={(e) => setSmsGatewayTemplate(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder="તમારો ઓટીપી {otp} છે."
                      />
                      <p className="text-[10px] text-gray-400">ઉપલબ્ધ પ્લેસહોલ્ડર્સ: <code className="bg-gray-100 px-1 rounded">{'{otp}'}</code> અને <code className="bg-gray-100 px-1 rounded">{'{phone}'}</code></p>
                    </div>

                    {smsGatewayType === 'twilio' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Twilio Account SID</label>
                          <input
                            type="text"
                            value={smsTwilioSid}
                            onChange={(e) => setSmsTwilioSid(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="AC..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Twilio Auth Token</label>
                          <input
                            type="password"
                            value={smsTwilioAuthToken}
                            onChange={(e) => setSmsTwilioAuthToken(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="Twilio secret auth token"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Twilio From Number</label>
                          <input
                            type="text"
                            value={smsTwilioFrom}
                            onChange={(e) => setSmsTwilioFrom(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="+1234567890"
                          />
                        </div>
                      </div>
                    )}

                    {(smsGatewayType === 'custom_get' || smsGatewayType === 'custom_post') && (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">API URL ગેટવે (Gateway URL)</label>
                          <input
                            type="text"
                            value={smsGatewayUrl}
                            onChange={(e) => setSmsGatewayUrl(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="https://api.sms-provider.com/send"
                          />
                          <p className="text-[10px] text-gray-400">URL માં પ્લેસહોલ્ડર્સ વાપરી શકો છો: <code className="bg-gray-100 px-1 rounded">{'{phone}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{otp}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{message}'}</code></p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">કસ્ટમ હેડર્સ (JSON headers - વૈકલ્પિક)</label>
                            <textarea
                              value={smsGatewayHeaders}
                              onChange={(e) => setSmsGatewayHeaders(e.target.value)}
                              rows={3}
                              className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                              placeholder='{"Authorization": "Bearer KEY"}'
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">બોડી પેરામીટર્સ (Body Template / Params - વૈકલ્પિક)</label>
                            <textarea
                              value={smsGatewayBody}
                              onChange={(e) => setSmsGatewayBody(e.target.value)}
                              rows={3}
                              className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                              placeholder={smsGatewayType === 'custom_post' ? '{"to": "{phone}", "text": "{message}"}' : 'apikey=YOURKEY&sender=SENDER'}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition-colors cursor-pointer text-sm flex items-center gap-2"
                >
                  <Check className="h-4 w-4" /> બધી ગેટવે સેટિંગ્સ સાચવો (Save All Settings)
                </button>
              </div>
            </form>

            {/* Database Export Section */}
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-gray-150 space-y-5 mt-6 animate-fade-in">
              <div className="border-b pb-2">
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-600" /> ડેટાબેઝ બેકઅપ અને એક્સપોર્ટ (Database Backup & Export)
                </h4>
                <p className="text-xs text-gray-500 mt-1">આ એપ્લિકેશનના તમામ ટેબલ્સ (યુઝર્સ, પરીક્ષાઓ, પરિણામો, પોસ્ટ્સ, કેલેન્ડર વગેરે) નો ડેટા JSON ફોર્મેટમાં ડાઉનલોડ કરો.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-slate-700">સંપૂર્ણ એપ્લિકેશન ડેટા સેવ કરો</span>
                  <p className="text-xs text-slate-400">બેકઅપ ફાઇલમાં તમામ યૂઝર્સ, બ્લોગ પોસ્ટ્સ અને એક્ઝામ ડેટા સમાવિષ્ટ છે.</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportDatabase}
                  disabled={isExporting}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4" /> {isExporting ? 'એક્સપોર્ટ થઈ રહ્યું છે...' : 'ડેટાબેઝ ડાઉનલોડ કરો (.JSON)'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-150 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 border border-rose-100">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">{confirmModal.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                રદ કરો (Cancel)
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                ડિલીટ કરો (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border bg-white text-slate-800 animate-in slide-in-from-bottom duration-200 border-gray-150">
          {toast.type === 'success' ? (
            <Check className="h-5 w-5 text-emerald-600 bg-emerald-50 rounded-full p-0.5 border border-emerald-200" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 bg-red-50 rounded-full p-0.5 border border-red-200" />
          )}
          <span className="font-bold text-sm text-gray-800">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
