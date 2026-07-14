import React, { useState } from 'react';
import { Calculator, Cake, Calendar, ArrowLeft } from 'lucide-react';

export default function AgeCalculator({ onBack }: { onBack: () => void }) {
  const [birthDay, setBirthDay] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');

  const [targetDay, setTargetDay] = useState<string>(new Date().getDate().toString().padStart(2, '0'));
  const [targetMonth, setTargetMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [targetYear, setTargetYear] = useState<string>(new Date().getFullYear().toString());

  const [calcErrors, setCalcErrors] = useState<{ day?: string; month?: string; year?: string; general?: string }>({});
  
  const [calcResult, setCalcResult] = useState<{
    years: number;
    months: number;
    days: number;
    totalMonths: number;
    totalWeeks: number;
    totalDays: number;
    totalHours: number;
    totalMinutes: number;
    nextBirthday: { months: number; days: number; totalDays: number; weekday: string };
    birthWeekday: string;
    zodiac: { name: string; symbol: string };
  } | null>(null);

  const performAgeCalculation = (bD: string, bM: string, bY: string, tD: string, tM: string, tY: string) => {
    const errors: typeof calcErrors = {};
    setCalcErrors({});

    const d = parseInt(bD, 10);
    const m = parseInt(bM, 10);
    const y = parseInt(bY, 10);

    const td = parseInt(tD, 10);
    const tm = parseInt(tM, 10);
    const ty = parseInt(tY, 10);

    if (!bD) errors.day = 'રિક્વાયર્ડ';
    else if (isNaN(d) || d < 1 || d > 31) errors.day = '૧-૩૧ લખો';

    if (!bM) errors.month = 'રિક્વાયર્ડ';
    else if (isNaN(m) || m < 1 || m > 12) errors.month = '૧-૧૨ લખો';

    if (!bY) errors.year = 'રિક્વાયર્ડ';
    else if (isNaN(y) || y < 1900 || y > 2100) errors.year = '૧૯૦૦-૨૧૦૦';

    // Check valid date for birth date
    if (bD && bM && bY && d && m && y && !errors.day && !errors.month && !errors.year) {
      const maxDays = new Date(y, m, 0).getDate();
      if (d > maxDays) {
        errors.day = `દિવસ અમાન્ય (મહત્તમ ${maxDays})`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setCalcErrors(errors);
      setCalcResult(null);
      return;
    }

    const dob = new Date(y, m - 1, d);
    const target = new Date(ty, tm - 1, td);

    if (dob > target) {
      setCalcErrors({ general: 'જન્મ તારીખ ગણતરીની તારીખ કરતા ભવિષ્યમાં ન હોઈ શકે!' });
      setCalcResult(null);
      return;
    }

    // Calculate age
    let diffYears = target.getFullYear() - dob.getFullYear();
    let diffMonths = target.getMonth() - dob.getMonth();
    let diffDays = target.getDate() - dob.getDate();

    if (diffDays < 0) {
      const prevMonthDate = new Date(target.getFullYear(), target.getMonth(), 0);
      diffDays += prevMonthDate.getDate();
      diffMonths--;
    }
    if (diffMonths < 0) {
      diffMonths += 12;
      diffYears--;
    }

    // Total conversions
    const totalMs = target.getTime() - dob.getTime();
    const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = diffYears * 12 + diffMonths;
    const totalHours = totalDays * 24;
    const totalMinutes = totalHours * 60;

    // Birth weekday
    const weekdaysGujarati = ["રવિવાર (Sunday)", "સોમવાર (Monday)", "મંગળવાર (Tuesday)", "બુધવાર (Wednesday)", "ગુરુવાર (Thursday)", "શુક્રવાર (Friday)", "શનિવાર (Saturday)"];
    const birthWeekday = weekdaysGujarati[dob.getDay()];

    // Zodiac Sign
    const getZodiac = (day: number, month: number) => {
      const signs = [
        { name: 'મકર (Capricorn)', symbol: '♑', d: 20, m: 1 },
        { name: 'કુંભ (Aquarius)', symbol: '♒', d: 19, m: 2 },
        { name: 'મીન (Pisces)', symbol: '♓', d: 20, m: 3 },
        { name: 'મેષ (Aries)', symbol: '♈', d: 20, m: 4 },
        { name: 'વૃષભ (Taurus)', symbol: '♉', d: 21, m: 5 },
        { name: 'મિથુન (Gemini)', symbol: '♊', d: 21, m: 6 },
        { name: 'કર્ક (Cancer)', symbol: '♋', d: 22, m: 7 },
        { name: 'સિંહ (Leo)', symbol: '♌', d: 23, m: 8 },
        { name: 'કન્યા (Virgo)', symbol: '♍', d: 23, m: 9 },
        { name: 'તુલા (Libra)', symbol: '♎', d: 23, m: 10 },
        { name: 'વૃશ્ચિક (Scorpio)', symbol: '♏', d: 22, m: 11 },
        { name: 'ધન (Sagittarius)', symbol: '♐', d: 22, m: 12 }
      ];
      for (let i = 0; i < signs.length; i++) {
        const current = signs[i];
        if (month === current.m) {
          return day >= current.d ? signs[(i + 1) % 12] : current;
        }
      }
      return { name: 'મેષ (Aries)', symbol: '♈' };
    };
    const zodiac = getZodiac(d, m);

    // Next birthday calculation
    let nextBdayYear = ty;
    let nextBday = new Date(nextBdayYear, m - 1, d);
    
    if (nextBday < target) {
      nextBdayYear++;
      nextBday = new Date(nextBdayYear, m - 1, d);
    }
    
    let nextBdayMonths = nextBday.getMonth() - target.getMonth();
    let nextBdayDays = nextBday.getDate() - target.getDate();
    if (nextBdayDays < 0) {
      const prevMonth = new Date(nextBday.getFullYear(), nextBday.getMonth(), 0);
      nextBdayDays += prevMonth.getDate();
      nextBdayMonths--;
    }
    if (nextBdayMonths < 0) {
      nextBdayMonths += 12;
    }
    const nextBdayTotalDays = Math.ceil((nextBday.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
    const nextBdayWeekday = weekdaysGujarati[nextBday.getDay()];

    setCalcResult({
      years: diffYears,
      months: diffMonths,
      days: diffDays,
      totalMonths,
      totalWeeks,
      totalDays,
      totalHours,
      totalMinutes,
      nextBirthday: {
        months: nextBdayMonths,
        days: nextBdayDays,
        totalDays: nextBdayTotalDays,
        weekday: nextBdayWeekday
      },
      birthWeekday,
      zodiac
    });
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12 w-full animate-in fade-in zoom-in duration-300">
      <div className="bg-indigo-600 pb-24 w-full pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-indigo-100 hover:text-white transition-colors mb-6 text-sm font-medium cursor-pointer">
            <ArrowLeft className="h-4 w-4" /> હોમ પેજ પર પાછા જાઓ
          </button>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">વય ગણતરી કેલ્ક્યુલેટર</h1>
          <p className="mt-2 text-indigo-100 text-sm max-w-2xl">
            સરકારી ભરતીના નિયમો મુજબ તમારી લાયકાત ચકાસવા માટે સચોટ ઉંમરની ગણતરી કરો.
          </p>
        </div>
      </div>

      <main className="-mt-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 md:p-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start w-full">
            <div className="lg:col-span-5 space-y-6 w-full">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Cake className="h-4 w-4 text-slate-400" />
                  જન્મ તારીખ (Date of Birth)
                </label>
                <div className="flex gap-2">
                  <input type="text" maxLength={2} value={birthDay} onChange={(e) => setBirthDay(e.target.value)} placeholder="DD" className="w-16 p-3 text-center border border-slate-200 rounded-lg text-lg font-bold" />
                  <input type="text" maxLength={2} value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} placeholder="MM" className="w-16 p-3 text-center border border-slate-200 rounded-lg text-lg font-bold" />
                  <input type="text" maxLength={4} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="YYYY" className="w-24 p-3 text-center border border-slate-200 rounded-lg text-lg font-bold" />
                </div>
                {calcErrors.day || calcErrors.month || calcErrors.year ? (
                  <p className="text-xs text-red-500 font-medium">કૃપા કરીને સાચી જન્મ તારીખ નાખો.</p>
                ) : null}
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  કઈ તારીખે ઉંમર ગણવી છે? (Target Date)
                </label>
                <div className="flex gap-2">
                  <input type="text" maxLength={2} value={targetDay} onChange={(e) => setTargetDay(e.target.value)} placeholder="DD" className="w-16 p-3 text-center border border-slate-200 rounded-lg text-lg font-bold" />
                  <input type="text" maxLength={2} value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} placeholder="MM" className="w-16 p-3 text-center border border-slate-200 rounded-lg text-lg font-bold" />
                  <input type="text" maxLength={4} value={targetYear} onChange={(e) => setTargetYear(e.target.value)} placeholder="YYYY" className="w-24 p-3 text-center border border-slate-200 rounded-lg text-lg font-bold" />
                </div>
              </div>
              
              {calcErrors.general && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 font-medium w-full">
                  {calcErrors.general}
                </div>
              )}

              <button onClick={() => performAgeCalculation(birthDay, birthMonth, birthYear, targetDay, targetMonth, targetYear)} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2 text-base cursor-pointer">
                <Calculator className="h-5 w-5" /> ગણતરી કરો
              </button>
            </div>

            <div className="lg:col-span-7 h-full w-full">
              {calcResult ? (
                <div className="h-full bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6 w-full animate-in slide-in-from-bottom-2 duration-300">
                  <div className="text-center pb-6 border-b border-slate-200">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">તમારી કુલ ઉંમર</p>
                    <div className="flex justify-center items-baseline flex-wrap gap-x-2 md:gap-x-2 gap-y-1">
                      <span className="text-4xl md:text-5xl font-black text-indigo-700">{calcResult.years}</span>
                      <span className="text-base md:text-lg font-bold text-slate-600 mr-1 md:mr-2">વર્ષ</span>
                      <span className="text-4xl md:text-5xl font-black text-indigo-700">{calcResult.months}</span>
                      <span className="text-base md:text-lg font-bold text-slate-600 mr-1 md:mr-2">મહિના</span>
                      <span className="text-4xl md:text-5xl font-black text-indigo-700">{calcResult.days}</span>
                      <span className="text-base md:text-lg font-bold text-slate-600">દિવસ</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-150 text-center shadow-sm flex flex-col justify-center">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">કુલ મહિના</span>
                      <span className="font-mono text-base md:text-xl font-bold text-slate-800 tracking-tight">{calcResult.totalMonths.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-150 text-center shadow-sm flex flex-col justify-center">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">કુલ અઠવાડિયા</span>
                      <span className="font-mono text-base md:text-xl font-bold text-slate-800 tracking-tight">{calcResult.totalWeeks.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-150 text-center shadow-sm flex flex-col justify-center">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">કુલ દિવસો</span>
                      <span className="font-mono text-base md:text-xl font-bold text-slate-800 tracking-tight">{calcResult.totalDays.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-150 text-center shadow-sm flex flex-col justify-center min-w-0">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">કુલ કલાકો</span>
                      <span className="font-mono text-[15px] md:text-xl font-bold text-slate-800 tracking-tight truncate">{calcResult.totalHours.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Cake className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-sm font-bold text-indigo-900">આગામી જન્મદિવસ</h4>
                    </div>
                    <p className="text-indigo-800 text-sm font-medium">
                      <span className="font-bold">{calcResult.nextBirthday.months}</span> મહિના અને <span className="font-bold">{calcResult.nextBirthday.days}</span> દિવસ બાકી છે (કુલ {calcResult.nextBirthday.totalDays} દિવસ). તમારો આગામી જન્મદિવસ <span className="font-bold">{calcResult.nextBirthday.weekday}</span> ના રોજ આવશે.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] bg-slate-50 border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 w-full">
                  <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-5 text-slate-300">
                    <Calculator className="h-8 w-8" />
                  </div>
                  <h3 className="text-slate-700 font-bold text-lg mb-2">ઉંમર ગણવા માટે માહિતી નાખો</h3>
                  <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                    બાજુના ફોર્મમાં તમારી જન્મ તારીખ દાખલ કરો. જો કોઈ ચોક્કસ જાહેરાત મુજબ ઉંમર જોવી હોય તો તે તારીખ પસંદ કરીને 'ગણતરી કરો' પર ક્લિક કરો.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
