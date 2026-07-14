
import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Phone, Lock, Eye, EyeOff, UserPlus, LogIn as LogInIcon, Mail, Calendar, Smartphone, Check, Shield } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

let firebaseApp: any = null;
let firebaseAuth: any = null;

const getFirebaseAuth = (config: any) => {
  if (!firebaseApp) {
    const firebaseConfigObj = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    };
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfigObj);
    } else {
      firebaseApp = getApp();
    }
    firebaseAuth = getAuth(firebaseApp);
  }
  return firebaseAuth;
};

interface AuthPagesProps {
  mode: 'login' | 'register';
  onToggleMode: (mode: 'login' | 'register') => void;
  onAuthSuccess: (user: any) => void;
  onBack: () => void;
}

const convertGujaratiToEnglish = (val: string): string => {
  const map: { [key: string]: string } = {
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
  };
  return val.replace(/[૦-૯]/g, d => map[d] || d);
};

const validatePhoneNumber = (rawPhone: string): { isValid: boolean; error?: string } => {
  const cleaned = convertGujaratiToEnglish(rawPhone).replace(/\D/g, '');
  if (cleaned.length !== 10) {
    return { isValid: false, error: 'કૃપા કરીને સાચો ૧૦ આંકડાનો મોબાઈલ નંબર દાખલ કરો.' };
  }

  // Must start with 6, 7, 8, or 9
  const firstDigit = cleaned[0];
  if (!['6', '7', '8', '9'].includes(firstDigit)) {
    return { isValid: false, error: 'અમાન્ય મોબાઈલ નંબર! ભારતીય મોબાઈલ નંબર ૬, ૭, ૮ કે ૯ થી શરૂ થવો જોઈએ.' };
  }

  // Check if all digits are the same (e.g. 9999999999, 0000000000, 1111111111)
  const allSame = cleaned.split('').every(char => char === cleaned[0]);
  if (allSame) {
    return { isValid: false, error: 'અમાન્ય મોબાઈલ નંબર! કૃપા કરીને તમારો સાચો અને ચાલુ નંબર દાખલ કરો.' };
  }

  // Check sequential ascending or descending (e.g., 1234567890, 9876543210, 0123456789)
  const sequentialAsc = '01234567890';
  const sequentialDesc = '98765432109';
  if (sequentialAsc.includes(cleaned) || sequentialDesc.includes(cleaned)) {
    return { isValid: false, error: 'ક્રમિક આંકડા વાળો નકલી કે અમાન્ય નંબર સ્વીકાર્ય નથી.' };
  }

  return { isValid: true };
};

export default function AuthPages({ mode, onToggleMode, onAuthSuccess, onBack }: AuthPagesProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Firebase Configuration and Auth State
  const [fbConfig, setFbConfig] = useState<any>(null);
  const [fbEnabled, setFbEnabled] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbStep, setFbStep] = useState<'phone' | 'otp'>('phone');
  const [fbPhone, setFbPhone] = useState('');
  const [fbOtp, setFbOtp] = useState('');
  const [showFbModal, setShowFbModal] = useState(false);
  const [fbMode, setFbMode] = useState<'sandbox' | 'live'>('sandbox');

  // Custom Pluggable SMS OTP Verification State
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsGateway, setSmsGateway] = useState('disabled');
  const [smsStep, setSmsStep] = useState<'form' | 'otp'>('form');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpVerified, setRegOtpVerified] = useState(false);
  const [otpVal, setOtpVal] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [loginOtpStep, setLoginOtpStep] = useState<'form' | 'otp'>('form');

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotDob, setForgotDob] = useState('');
  const [resetUid, setResetUid] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotDemoCode, setForgotDemoCode] = useState('');

  // Load Firebase Config on Mount
  useEffect(() => {
    const fetchFbConfig = async () => {
      try {
        const res = await fetch('/api/settings/firebase-config');
        const data = await res.json();
        setFbConfig(data);
        setFbEnabled(data.enabled);
        if (data.enabled) {
          setFbMode('live');
        } else {
          setFbMode('sandbox');
        }
      } catch (err) {
        console.warn('Silent note: Failed to fetch firebase config:', err);
      }
    };

    const fetchSmsStatus = async () => {
      try {
        const res = await fetch('/api/settings/sms-status');
        if (res.ok) {
          const data = await res.json();
          setSmsEnabled(data.enabled);
          setSmsGateway(data.gatewayType);
        }
      } catch (err) {
        console.warn('Silent note: Failed to fetch SMS status:', err);
      }
    };

    fetchFbConfig();
    fetchSmsStatus();
  }, []);

  const handleFirebaseOtpClick = () => {
    setShowFbModal(true);
    setFbStep('phone');
    setError('');
    setSuccessMsg('');
    setFbPhone('');
    setFbOtp('');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fbPhone.length !== 10) {
      setError('સાચો ૧૦ આંકડાનો મોબાઈલ નંબર દાખલ કરો.');
      return;
    }

    setFbLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      if (fbMode === 'sandbox') {
        // Sandbox mode: simulate sending OTP
        setSuccessMsg('ડેમો ઓટીપી સફળતાપૂર્વક મોકલવામાં આવ્યો છે! ડેમો કોડ: 123456');
        setFbStep('otp');
      } else {
        // Live mode with Firebase!
        if (!fbConfig || !fbConfig.apiKey) {
          throw new Error('ફાયરબેઝ ઓટીપી કીઝ એડમિન પેનલમાં સેવ કરેલ નથી.');
        }

        const auth = getFirebaseAuth(fbConfig);
        
        // Setup recaptcha verifier
        const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });

        const formattedPhone = `+91${fbPhone}`;
        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
        (window as any).confirmationResult = confirmationResult;
        
        setSuccessMsg('સફળતાપૂર્વક ઓટીપી તમારા મોબાઈલ નંબર પર મોકલી દેવામાં આવ્યો છે.');
        setFbStep('otp');
      }
    } catch (err: any) {
      console.error('[Firebase Send OTP Error]', err);
      setError('ઓટીપી મોકલવામાં ભૂલ: ' + (err.message || 'અજ્ઞાત ભૂલ'));
    } finally {
      setFbLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fbOtp.length !== 6) {
      setError('કૃપા કરીને ૬ આંકડાનો ઓટીપી દાખલ કરો.');
      return;
    }

    setFbLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      if (fbMode === 'sandbox') {
        if (fbOtp !== '123456') {
          throw new Error('ખોટો ડેમો ઓટીપી! કૃપા કરીને 123456 દાખલ કરો.');
        }

        // Simulating backend call
        const res = await fetch('/api/auth/firebase/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: fbPhone,
            uid: 'firebase_sandbox_' + fbPhone,
            name: 'Firebase Demo User',
            isDemo: true
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'વેરિફિકેશન નિષ્ફળ થયું.');

        setSuccessMsg('ઓટીપી વેરિફિકેશન સફળ!');
        setShowFbModal(false);
        onAuthSuccess(data);
      } else {
        // Live confirmation
        const confirmationResult = (window as any).confirmationResult;
        if (!confirmationResult) {
          throw new Error('વેરિફિકેશન સેશન ખોવાઈ ગયું છે. ફરી ઓટીપી મોકલો.');
        }

        const credential = await confirmationResult.confirm(fbOtp);
        const fbUser = credential.user;

        // Sync with our backend
        const res = await fetch('/api/auth/firebase/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: fbPhone,
            uid: fbUser.uid,
            name: fbUser.displayName || 'Firebase Candidate',
            email: fbUser.email || '',
            isDemo: false
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'વેરિફિકેશન સિંક્રોનાઇઝ કરવામાં નિષ્ફળતા.');

        setSuccessMsg('અભિનંદન! ઓટીપી વેરિફિકેશન સફળતાપૂર્વક થઈ ગયું.');
        setShowFbModal(false);
        onAuthSuccess(data);
      }
    } catch (err: any) {
      console.error('[Firebase OTP Verify Error]', err);
      setError('ઓટીપી વેરિફાય કરવામાં ભૂલ: ' + (err.message || 'અજ્ઞાત ભૂલ'));
    } finally {
      setFbLoading(false);
    }
  };

  // Clear state when mode changes
  useEffect(() => {
    setError('');
    setSuccessMsg('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setIsForgotPassword(false);
    setForgotStep(1);
    setSmsStep('form');
    setRegOtpSent(false);
    setRegOtpVerified(false);
    setOtpVal('');
    setDemoCode('');
    setLoginMethod('password');
    setLoginOtpStep('form');
  }, [mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError('કૃપા કરીને સાચો ૧૦ આંકડાનો મોબાઈલ નંબર દાખલ કરો.');
      return;
    }

    if (!password) {
      setError('કૃપા કરીને પાસવર્ડ દાખલ કરો.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const textData = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(textData);
      } catch(e) {}

      if (!res.ok) {
        throw new Error(data.error || `HTTP error! Status: ${res.status}. Body: ${textData.substring(0, 100)}`);
      }

      onAuthSuccess(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRegOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const phoneVal = validatePhoneNumber(phone);
    if (!phoneVal.isValid) {
      setError(phoneVal.error || 'અમાન્ય મોબાઈલ નંબર.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (smsEnabled) {
        const res = await fetch('/api/auth/sms/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, purpose: 'register' })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'ઓટીપી મોકલવામાં ભૂલ આવી.');
        }

        if (data.isSandbox && data.demoCode) {
          setDemoCode(data.demoCode);
          setSuccessMsg(`સેન્ડબોક્સ મોડ: ડેમો ઓટીપી સફળતાપૂર્વક જનરેટ થયો છે. ડેમો કોડ: ${data.demoCode}`);
        } else {
          setSuccessMsg('ઓટીપી તમારા મોબાઈલ નંબર પર સફળતાપૂર્વક મોકલવામાં આવ્યો છે.');
        }
      } else {
        // SMS disabled: simulate sending OTP
        setDemoCode('123456');
        setSuccessMsg('સેન્ડબોક્સ મોડ: ડેમો ઓટીપી સફળતાપૂર્વક જનરેટ થયો છે. ડેમો કોડ: 123456');
      }
      setRegOtpSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otpVal.length !== 6) {
      setError('કૃપા કરીને ૬ આંકડાનો ઓટીપી દાખલ કરો.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (smsEnabled) {
        const res = await fetch('/api/auth/sms/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, otp: otpVal })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'ઓટીપી વેરિફિકેશન નિષ્ફળ રહ્યું.');
        }
        setSuccessMsg('અભિનંદન! ઓટીપી વેરિફિકેશન સફળ રહ્યું છે. હવે તમારો નવો પાસવર્ડ સેટ કરો.');
      } else {
        // SMS disabled: check simulated OTP
        if (otpVal !== '123456' && otpVal !== demoCode) {
          throw new Error('ખોટો ડેમો ઓટીપી! કૃપા કરીને 123456 દાખલ કરો.');
        }
        setSuccessMsg('અભિનંદન! ઓટીપી વેરિફિકેશન સફળ રહ્યું છે. હવે તમારો નવો પાસવર્ડ સેટ કરો.');
      }
      setRegOtpVerified(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneVal = validatePhoneNumber(phone);
    if (!phoneVal.isValid) {
      setError(phoneVal.error || 'અમાન્ય મોબાઈલ નંબર.');
      return;
    }
    if (password.length < 6) {
      setError('પાસવર્ડ ઓછામાં ઓછા ૬ અક્ષરનો હોવો જોઈએ.');
      return;
    }
    if (password !== confirmPassword) {
      setError('પાસવર્ડ અને કન્ફર્મ પાસવર્ડ મેચ થતા નથી.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, otp: otpVal })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'રજીસ્ટ્રેશન નિષ્ફળ રહ્યું.');
      }

      localStorage.setItem('just_registered', 'true');
      onAuthSuccess(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const phoneVal = validatePhoneNumber(phone);
    if (!phoneVal.isValid) {
      setError(phoneVal.error || 'અમાન્ય મોબાઈલ નંબર.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setForgotDemoCode('');

    try {
      const res = await fetch('/api/auth/sms/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'forgot' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ઓટીપી મોકલવામાં ભૂલ આવી.');
      }
      setForgotOtpSent(true);
      setSuccessMsg(data.message || 'ઓટીપી મોકલવામાં આવ્યો છે.');
      if (data.isSandbox && data.demoCode) {
        setForgotDemoCode(data.demoCode);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp) return setError('કૃપા કરીને ઓટીપી દાખલ કરો.');
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: forgotOtp })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ઓટીપી વેરિફિકેશન નિષ્ફળ રહ્યું.');
      }
      setResetUid(data.uid);
      setForgotStep(2);
      setSuccessMsg('ઓટીપી સફળતાપૂર્વક વેરિફાય થયો છે. હવે નવો પાસવર્ડ બનાવો.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError('નવો પાસવર્ડ ઓછામાં ઓછા ૬ અક્ષરનો હોવો જોઈએ.');
    if (password !== confirmPassword) return setError('પાસવર્ડ મેચ થતા નથી.');
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: resetUid, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'પાસવર્ડ બદલવામાં ભૂલ આવી.');
      }
      setSuccessMsg('તમારો પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો છે. હવે તમે લોગિન કરી શકો છો.');
      setIsForgotPassword(false);
      setForgotStep(1);
      setForgotOtpSent(false);
      setForgotOtp('');
      setForgotDemoCode('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotStep === 1) {
      if (!forgotOtpSent) {
        handleSendForgotOtp();
      } else {
        handleVerifyForgotOtp(e);
      }
    } else if (forgotStep === 2) {
      handleResetPassword(e);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-gray-50/50">
      <div className="max-w-[400px] w-full space-y-6 bg-white p-8 rounded-[2rem] shadow-xl shadow-orange-900/5 border border-gray-100 relative">
        <button
          onClick={() => {
            if (isForgotPassword) {
              if (forgotStep === 2) {
                setForgotStep(1);
              } else if (forgotOtpSent) {
                setForgotOtpSent(false);
                setForgotOtp('');
                setForgotDemoCode('');
              } else {
                setIsForgotPassword(false);
              }
              setError('');
              setSuccessMsg('');
            } else {
              onBack();
            }
          }}
          className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-50"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="text-center pt-4">
          <div className="mx-auto h-16 w-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-6 border border-orange-100">
            {isForgotPassword ? (
              <Lock className="h-7 w-7" />
            ) : mode === 'login' ? (
              <LogInIcon className="h-7 w-7 ml-1" />
            ) : (
              <UserPlus className="h-7 w-7" />
            )}
          </div>
          <h2 className="mt-2 text-[28px] font-bold tracking-tight text-gray-900 font-sans">
            {isForgotPassword ? 'પાસવર્ડ ભૂલી ગયા છો?' : mode === 'login' ? 'એકાઉન્ટમાં લોગિન કરો' : 'નવું એકાઉન્ટ બનાવો'}
          </h2>
          <p className="mt-3 text-gray-600 text-[15px]">
            {isForgotPassword
              ? (forgotStep === 1 
                  ? (!forgotOtpSent ? 'તમારો રજીસ્ટર કરેલ મોબાઈલ નંબર દાખલ કરો' : 'મોબાઈલ પર આવેલ ઓટીપી દાખલ કરો') 
                  : 'તમારો નવો પાસવર્ડ સેટ કરો')
              : mode === 'login' 
              ? 'ગુજરાત પરીક્ષા પોર્ટલ પર આપનું હાર્દિક સ્વાગત છે' 
              : 'તૈયારી શરૂ કરવા માટે નીચેની વિગતો ભરો'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium leading-relaxed">{error}</p>
          </div>
        )}
        
        {successMsg && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 font-medium leading-relaxed">{successMsg}</p>
          </div>
        )}

        {isForgotPassword ? (
          <form className="mt-8 space-y-5" onSubmit={handleForgotPasswordSubmit}>
            {forgotStep === 1 && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[15px] font-medium text-gray-700">મોબાઈલ નંબર</label>
                  <div className="flex flex-col gap-2">
                    <div className="relative flex-1 w-full">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        disabled={forgotOtpSent}
                        onChange={(e) => {
                          const eng = convertGujaratiToEnglish(e.target.value);
                          setPhone(eng.replace(/\D/g, '').slice(0, 10));
                        }}
                        className="block w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[15px]"
                        placeholder="૧૦ આંકડાનો મોબાઈલ નંબર"
                      />
                    </div>
                    
                    {!forgotOtpSent && (
                      <button
                        type="button"
                        onClick={() => handleSendForgotOtp()}
                        disabled={loading || phone.length !== 10}
                        className="w-full px-4 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-2xl text-sm transition-all shadow-md shadow-orange-500/10 disabled:opacity-50 cursor-pointer text-center flex justify-center items-center"
                      >
                        {loading ? 'મોકલી રહ્યું છે...' : 'Send OTP'}
                      </button>
                    )}
                  </div>
                </div>

                {forgotOtpSent && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-[15px] font-medium text-gray-700">ઓટીપી (OTP)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Smartphone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={forgotOtp}
                          onChange={(e) => {
                            const eng = convertGujaratiToEnglish(e.target.value);
                            setForgotOtp(eng.replace(/\D/g, '').slice(0, 6));
                          }}
                          className="block w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[15px]"
                          placeholder="૬ આંકડાનો ઓટીપી"
                        />
                      </div>
                      {forgotDemoCode && (
                        <p className="text-xs text-orange-600 font-medium mt-1">
                          સેન્ડબોક્સ ડેમો ઓટીપી: <span className="font-bold font-mono tracking-wider bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">{forgotDemoCode}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="submit"
                        disabled={loading || forgotOtp.length !== 6}
                        className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl text-[16px] font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                      >
                        {loading ? 'વેરીફાય થઈ રહ્યું છે...' : 'ઓટીપી વેરીફાય કરો'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendForgotOtp()}
                        disabled={loading}
                        className="w-full py-2 text-sm text-orange-600 hover:text-orange-700 font-semibold text-center"
                      >
                        ઓટીપી ફરી મોકલો
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {forgotStep === 2 && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[15px] font-medium text-gray-700">નવો પાસવર્ડ</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-12 py-3.5 border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[15px]"
                      placeholder="નવો પાસવર્ડ (૬ અક્ષર)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[15px] font-medium text-gray-700">
                    પાસવર્ડ ફરીથી લખો (કન્ફર્મ પાસવર્ડ)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[15px]"
                      placeholder="પાસવર્ડ ફરીથી ટાઇપ કરો"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl text-[16px] font-bold text-white bg-[#ea580c] hover:bg-[#d94e09] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    {loading ? 'પ્રોસેસ થઈ રહી છે...' : 'પાસવર્ડ બદલો (રીસેટ)'}
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          <>
            <form
              className="mt-4 space-y-5"
              onSubmit={
                mode === 'login'
                  ? handleLogin
                  : handleCompleteRegister
              }
            >
              {mode === 'login' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-[15px] font-medium text-gray-700">
                      મોબાઈલ નંબર
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const eng = convertGujaratiToEnglish(e.target.value);
                          setPhone(eng.replace(/\D/g, '').slice(0, 10));
                        }}
                        className="block w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[15px] transition-all"
                        placeholder="૧૦ આંકડાનો મોબાઈલ નંબર લખો"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[15px] font-medium text-gray-700">
                        પાસવર્ડ
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-sm font-semibold text-orange-600 hover:text-orange-500"
                      >
                        પાસવર્ડ ભૂલી ગયા છો?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-11 pr-12 py-3.5 border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[15px] transition-all"
                        placeholder="તમારો પાસવર્ડ લખો"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl text-[16px] font-bold text-white bg-[#ea580c] hover:bg-[#d94e09] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                    >
                      {loading ? 'પ્રવેશ થઈ રહ્યો છે...' : 'પ્રવેશ કરો (લોગિન)'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  {/* ૧. મોબાઈલ નંબર */}
                  <div className="space-y-1.5">
                    <label className="block text-[15px] font-medium text-gray-700">
                      મોબાઈલ નંબર
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          disabled={regOtpSent && regOtpVerified}
                          value={phone}
                          onChange={(e) => {
                            const eng = convertGujaratiToEnglish(e.target.value);
                            setPhone(eng.replace(/\D/g, '').slice(0, 10));
                          }}
                          className="block w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[15px] transition-all disabled:bg-gray-100 disabled:text-gray-500"
                          placeholder="૧૦ આંકડાનો મોબાઈલ નંબર લખો"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendRegOtp()}
                        disabled={loading || phone.length !== 10 || regOtpVerified}
                        className="w-full sm:w-auto px-4 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-2xl text-sm transition-all shadow-md shadow-orange-500/10 disabled:opacity-50 cursor-pointer flex-shrink-0 text-center flex justify-center items-center"
                      >
                        {regOtpSent ? 'ઓટીપી ફરી મોકલો' : 'Send OTP'}
                      </button>
                    </div>
                  </div>

                  {/* ૨. ઓટીપી દાખલ કરો - Only show after OTP is sent */}
                  {regOtpSent && (
                    <div className="space-y-4 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-[15px] font-medium text-gray-700">
                            Enter OTP (ઓટીપી દાખલ કરો)
                          </label>
                          {regOtpVerified && (
                            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                              <Check className="h-4 w-4" /> વેરિફાય થયેલ છે
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Smartphone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            disabled={regOtpVerified}
                            value={otpVal}
                            onChange={(e) => {
                              const eng = convertGujaratiToEnglish(e.target.value);
                              setOtpVal(eng.replace(/\D/g, '').slice(0, 6));
                            }}
                            className="block w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[15px] tracking-widest text-center font-bold disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="______"
                            maxLength={6}
                          />
                        </div>
                      </div>

                      {!regOtpVerified && (
                        <button
                          type="button"
                          onClick={() => handleVerifyRegOtp()}
                          disabled={loading || otpVal.length !== 6}
                          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-2xl text-[15px] font-bold text-white bg-[#ea580c] hover:bg-[#d94e09] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-all shadow-md shadow-orange-500/10 cursor-pointer"
                        >
                          {loading ? 'વેરિફાય થઈ રહ્યું છે...' : 'OTP Verify (ઓટીપી વેરિફાય કરો)'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ૩. પાસવર્ડ અને કન્ફર્મ પાસવર્ડ - disabled unless OTP is verified */}
                  <div className={`space-y-4 transition-all ${!regOtpVerified ? 'opacity-60' : 'opacity-100'}`}>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-[15px] font-medium text-gray-700">
                          પાસવર્ડ
                        </label>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          disabled={!regOtpVerified}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-11 pr-12 py-3.5 border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[15px] transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="ઓછામાં ઓછા ૬ અક્ષર"
                        />
                        <button
                          type="button"
                          disabled={!regOtpVerified}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[15px] font-medium text-gray-700">
                        કન્ફર્મ પાસવર્ડ (પાસવર્ડ ફરીથી લખો)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          disabled={!regOtpVerified}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[15px] transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="પાસવર્ડ ફરીથી ટાઇપ કરો"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ૪. રજીસ્ટ્રેશન કરો બટન */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || !regOtpVerified}
                      className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl text-[16px] font-bold text-white bg-[#ea580c] hover:bg-[#d94e09] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                    >
                      {loading ? 'એકાઉન્ટ બની રહ્યું છે...' : 'રજીસ્ટ્રેશન કરો'}
                    </button>
                  </div>
                </div>
              )}
            </form>
<div className="mt-8 text-center">
              <p className="text-[15px] text-gray-600">
                {mode === 'login' ? 'નવા ઉમેદવાર છો? ' : 'પહેલેથી એકાઉન્ટ બનાવેલું છે? '}
                <button
                  onClick={() => onToggleMode(mode === 'login' ? 'register' : 'login')}
                  className="font-bold text-[#ea580c] hover:text-[#c2410c] transition-colors"
                >
                  {mode === 'login' ? 'નવું રજીસ્ટ્રેશન કરો' : 'અહીં લોગિન કરો'}
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
