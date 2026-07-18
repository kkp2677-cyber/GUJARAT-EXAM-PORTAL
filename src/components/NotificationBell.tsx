import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Info, AlertTriangle, Briefcase, FileText, X, CheckCheck, Trash2 } from 'lucide-react';
import { PushNotification } from '../types';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [lastReadId, setLastReadId] = useState<string>('');
  const [isInIframe, setIsInIframe] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<PushNotification[]>([]);
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<PushNotification[]>([]);

  // Keep ref in sync with latest notifications state to avoid stale closure references
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Synthesize a high-quality dual-tone chime (ding-dong style) using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      // Note 1 (C5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2 (E5) shortly after
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio chime was blocked by browser autoplay policy until interaction', e);
    }
  };

  const showNativeNotification = async (title: string, body: string, icon = 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=100&auto=format&fit=crop&q=60') => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const options = {
      body,
      icon,
      badge: icon,
    };

    // Try service worker registration first to avoid illegal constructor on mobile chrome
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, options);
          return;
        }
      } catch (err) {
        console.warn('Service worker not ready or failed to show notification:', err);
      }
    }

    // Fallback to legacy Notification constructor for compatibility
    try {
      new Notification(title, options);
    } catch (err) {
      console.error('Traditional Notification constructor failed:', err);
    }
  };

  const addToast = (notif: PushNotification) => {
    setToasts(prev => {
      if (prev.some(t => t.id === notif.id)) return prev;
      return [...prev, notif];
    });
    // Auto-remove the sliding notification after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== notif.id));
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Load notifications from server on mount
  const fetchNotifications = async (isSilent = false) => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('નોટિફિકેશન લાવવામાં નિષ્ફળતા');
      const data: any[] = await res.json();
      
      const normalizedData: PushNotification[] = data.map((item: any) => ({
        id: String(item.id),
        title: item.title,
        body: item.body,
        type: item.type || 'info',
        link: item.link || undefined,
        createdAt: item.createdAt || item.date || new Date().toISOString(),
        subscriptionPlan: item.subscriptionPlan,
        subscriptionExpiry: item.subscriptionExpiry
      }));

      const currentNotifs = notificationsRef.current;
      
      // If we already have notifications, check if there's any brand new one to trigger a native notification
      if (!isSilent && currentNotifs.length > 0 && normalizedData.length > 0) {
        const existingIds = new Set(currentNotifs.map(n => n.id));
        const newNotifs = normalizedData.filter(n => !existingIds.has(n.id));
        
        if (newNotifs.length > 0) {
          // Play beautiful alert sound and trigger high-visibility in-app toasts
          playNotificationSound();
          newNotifs.forEach(notif => {
            addToast(notif);
          });

          // Fallback to Native browser pushes if permission allows
          if ('Notification' in window && Notification.permission === 'granted') {
            newNotifs.forEach(notif => {
              showNativeNotification(notif.title, notif.body);
            });
          }
        }
      }

      // Filter out notifications older than cleared timestamp
      const clearedAtStr = localStorage.getItem('notifications_cleared_at');
      let filteredData = normalizedData;
      if (clearedAtStr) {
        const clearedAt = new Date(clearedAtStr).getTime();
        filteredData = normalizedData.filter(n => {
          const t = new Date(n.createdAt).getTime();
          return !isNaN(t) && t > clearedAt;
        });
      }

      setNotifications(filteredData);
    } catch (err) {
      console.warn('Error fetching notifications (silent check):', err);
    }
  };

  useEffect(() => {
    // Detect iframe environment
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }

    // Check permission state on client side
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Load last read id
    const storedLastRead = localStorage.getItem('last_read_notification_id');
    if (storedLastRead) {
      setLastReadId(storedLastRead);
    }

    // Load initial list silently on mount
    fetchNotifications(true);

    // Poll every 30 seconds to check for new broadcasts and trigger native pushes
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle outside click to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const requestNotificationPermission = async () => {
    setPermissionError(null);
    if (!('Notification' in window)) {
      alert('તમારા બ્રાઉઝરમાં પુશ નોટિફિકેશન સપોર્ટ કરતું નથી.');
      return;
    }

    try {
      if (window.self !== window.top) {
        setPermissionError('iframe_blocked');
        return;
      }

      const resp = await Notification.requestPermission();
      setPermission(resp);
      if (resp === 'granted') {
        showNativeNotification(
          'પુશ નોટિફિકેશન સક્રિય થયું!',
          'હવે તમને પરીક્ષા લક્ષી નવી જાહેરાતો અને કસોટીઓની માહિતી ત્વરિત મળશે.'
        );
      } else if (resp === 'denied') {
        setPermissionError('denied');
      }
    } catch (err) {
      console.error('Permission request failed', err);
      setPermissionError('blocked');
    }
  };

  const handleMarkAsRead = () => {
    if (notifications.length > 0) {
      const newestId = notifications[0].id;
      setLastReadId(newestId);
      localStorage.setItem('last_read_notification_id', newestId);
    }
  };

  const handleClearNotifications = () => {
    localStorage.setItem('notifications_cleared_at', new Date().toISOString());
    setNotifications([]);
  };

  const togglePopover = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      handleMarkAsRead();
    }
  };

  // Determine unread count
  const getUnreadCount = () => {
    if (notifications.length === 0) return 0;
    if (!lastReadId) return notifications.length;
    
    const lastReadIndex = notifications.findIndex(n => n.id === lastReadId);
    if (lastReadIndex === -1) return notifications.length;
    return lastReadIndex;
  };

  const unreadCount = getUnreadCount();

  const getIcon = (type: string) => {
    switch (type) {
      case 'job':
        return <Briefcase className="h-4 w-4 text-emerald-600" />;
      case 'exam':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Info className="h-4 w-4 text-slate-500" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'job':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'exam':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'alert':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getLabelGujarati = (type: string) => {
    switch (type) {
      case 'job': return 'ભરતી જાહેરાત';
      case 'exam': return 'પરીક્ષા/ટેસ્ટ';
      case 'alert': return 'અગત્યની સૂચના';
      default: return 'સામાન્ય વિગત';
    }
  };

  // Format date elegantly
  const formatTimeAgo = (dateStr?: string) => {
    try {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'હમણાં જ';
      if (diffMins < 60) return `${diffMins} મિનિટ પહેલા`;
      if (diffHours < 24) return `${diffHours} કલાક પહેલા`;
      return `${diffDays} દિવસ પહેલા`;
    } catch {
      return '';
    }
  };

  const triggerTestNotification = () => {
    const testNotif: PushNotification = {
      id: 'test_' + Date.now(),
      title: '🎯 જોડાણ પૂરું થયું! (લાઇવ ટેસ્ટ એલર્ટ)',
      body: 'આ સરકારી ભરતી માર્ગદર્શક પોર્ટલનું લાઇવ ટેસ્ટ નોટિફિકેશન છે. હવે તમામ પરીક્ષા અને જોબ અપડેટ્સ સમયસર સીધા અહીં રિયલ-ટાઇમમાં ડિલિવર થશે.',
      type: 'info',
      createdAt: new Date().toISOString()
    };
    
    // Play beautiful notification chime
    playNotificationSound();
    
    // Add in-app toast for absolute 100% visibility on all devices
    addToast(testNotif);

    // Trigger standard native browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      showNativeNotification(testNotif.title, testNotif.body);
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      
      {/* Bell Button */}
      <button
        onClick={togglePopover}
        className="relative p-2.5 rounded-xl border border-gray-150 text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer bg-white"
        title="નોટિફિકેશન પેનલ"
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'animate-bounce text-orange-500' : ''}`} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-orange-600 border-2 border-white text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="fixed sm:absolute left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 sm:right-0 top-[84px] sm:top-auto sm:mt-3 w-[calc(100vw-32px)] sm:w-[420px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>🔔 નોટિફિકેશન સેન્ટર</span>
                {unreadCount > 0 && (
                  <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} નવી પોસ્ટ
                  </span>
                )}
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">તાજી જાહેરાતો અને મોક ટેસ્ટ એલર્ટ્સ</p>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:bg-gray-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Browser Permission Opt-in helper */}
          {permission !== 'granted' && (
            <div className="p-3 bg-blue-50 border-b border-blue-100 flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-white text-blue-600 rounded-lg shadow-sm">
                  <BellOff className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-blue-900 leading-tight">બ્રાઉઝર પુશ નોટિફિકેશન મેળવો</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">નવી ભરતીઓ અને સરકારી ટેસ્ટ પબ્લિશ થતાં જ સીધી સ્ક્રીન પર વિગતવાર નોટિફિકેશન મેળવો.</p>
                </div>
              </div>

              {isInIframe || permissionError === 'iframe_blocked' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-slate-800 text-[10px] leading-relaxed">
                  <span className="font-extrabold text-amber-800 text-[11px] block">⚠️ સુરક્ષા એલર્ટ (iFrame Constraint):</span>
                  <p className="mt-1">તમે હાલમાં પ્રિવ્યુ ફ્રેમમાં છો, તેથી બ્રાઉઝર સિક્યુરિટી પોલિસી મુજબ અહીં નોટિફિકેશન પરમિશન માંગી શકાશે નહીં.</p>
                  <p className="mt-1.5 font-bold text-amber-900">એક્ટિવેટ કરવાની સરળ રીત:</p>
                  <ol className="list-decimal pl-4 mt-0.5 space-y-0.5">
                    <li>સ્ક્રીન પર ઉપર જમણી બાજુએ આપેલ <strong className="text-blue-600">"નવી ટેબમાં ખોલો" (Open in New Tab)</strong> બટન પર ક્લિક કરો.</li>
                    <li>ત્યાં આ જ બેલ આઇકન 🔔 પર ક્લિક કરી <strong className="bg-amber-100 px-1 py-0.5 rounded text-slate-900">"એક્ટિવેટ કરો"</strong> દબાવો.</li>
                  </ol>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={requestNotificationPermission}
                    className="w-full text-center text-[10px] font-black bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
                  >
                    એક્ટિવેટ કરો
                  </button>
                  {permissionError === 'denied' && (
                    <div className="text-[10px] text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 leading-relaxed">
                      ❌ <strong>અસ્વીકાર કર્યો (Denied):</strong> તમે અગાઉ નોટિફિકેશન પરમિશન બ્લોક કરેલ છે. 
                      <p className="mt-1 font-semibold text-slate-700">એક્ટિવેટ કરવા માટે: બ્રાઉઝર એડ્રેસ બારમાં ડાબી બાજુએ આપેલા લૉક આઇકોન (🔒 અથવા ⚙️) પર ક્લિક કરી નોટિફિકેશન "Allow/રીસેટ" કરો.</p>
                    </div>
                  )}
                  {permissionError === 'blocked' && (
                    <p className="text-[10px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                      ❌ બ્રાઉઝર સિક્યુરિટી બ્લોક અથવા પરમિશન મેળવવામાં મુશ્કેલી પડી.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notification List Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="h-10 w-10 mx-auto text-slate-200 mb-2" />
                <p className="text-sm font-semibold">હજુ સુધી કોઈ નોટિફિકેશન નથી</p>
                <p className="text-xs text-slate-400 mt-0.5">અહીં નવી ભરતી અને પરીક્ષાઓની વિગત જોવા મળશે.</p>
              </div>
            ) : (
              notifications.map((notif, index) => {
                const isUnread = index < unreadCount;
                const hasLink = !!notif.link;
                const CardElement = hasLink ? 'a' : 'div';
                
                return (
                  <CardElement 
                    key={notif.id}
                    href={hasLink ? notif.link : undefined}
                    target={hasLink ? "_blank" : undefined}
                    rel={hasLink ? "noopener noreferrer" : undefined}
                    className={`p-4 transition-all duration-200 flex gap-3 ${
                      hasLink ? 'cursor-pointer hover:bg-slate-100/70 group' : ''
                    } ${
                      isUnread ? 'bg-orange-50/20 border-l-2 border-orange-500' : 'bg-white'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl border self-start ${getBadgeColor(notif.type)}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${getBadgeColor(notif.type)}`}>
                          {getLabelGujarati(notif.type)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <h5 className={`font-bold text-slate-800 text-xs mt-1.5 leading-snug break-words ${hasLink ? 'text-blue-600 group-hover:underline flex items-center gap-1' : ''}`}>
                        {notif.title}
                        {hasLink && <span className="text-[10px] text-blue-500">🔗</span>}
                      </h5>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed break-words">
                        {notif.body}
                      </p>
                    </div>
                  </CardElement>
                );
              })
            )}
          </div>

          {/* Footer View all / Quick Clear indicator & Clear Options */}
          <div className="p-3 bg-slate-50 border-t border-gray-100 flex flex-col gap-2.5 px-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400">
                કુલ: <strong>{notifications.length}</strong> સંદેશાઓ
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAsRead}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-black flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>બધા જોયેલા તરીકે માર્ક કરો</span>
                </button>
              )}
            </div>

            <button
              onClick={handleClearNotifications}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-extrabold py-2 px-3 rounded-xl border border-rose-100 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>🧹 બધા નોટિફિકેશન સાફ કરો (Clear All)</span>
            </button>
          </div>

        </div>
      )}

      {/* Sliding In-App Toast Overlay Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full px-4 md:px-0 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className="bg-white border border-slate-150 rounded-2xl shadow-2xl p-4 flex gap-3 animate-slide-in border-l-4 border-l-blue-600 overflow-hidden transform transition-all duration-300 pointer-events-auto"
          >
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl self-start border border-blue-100">
              {getIcon(toast.type)}
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-1.5 justify-between">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                  {getLabelGujarati(toast.type)}
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-bold">હમણાં જ</span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-xs mt-1.5 break-words leading-snug">{toast.title}</h5>
              <p className="text-[11px] text-slate-600 mt-1 break-words leading-relaxed">{toast.body}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(24px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

    </div>
  );
}
