import React, { useState, useEffect } from 'react';
import { Award, Trophy, Users, ShieldAlert, Sparkles, TrendingUp, Info, Crown } from 'lucide-react';
import { LeaderboardEntry } from '../types';
import { fetchWithCache } from '../utils/cache';

interface LeaderboardProps {
  currentUserName?: string;
}

export default function Leaderboard({ currentUserName }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'mock' | 'bharti'>('mock');
  const [combinedMerit, setCombinedMerit] = useState<any[]>([]);
  const [mockMerit, setMockMerit] = useState<any[]>([]);
  const [bhartiMerit, setBhartiMerit] = useState<any[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [combinedPage, setCombinedPage] = useState(1);
  const [mockPage, setMockPage] = useState(1);
  const [bhartiPage, setBhartiPage] = useState(1);

  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const data = await fetchWithCache<any>('/api/leaderboard');
      setCombinedMerit(data.combinedMerit || []);
      setMockMerit(data.mockMerit || []);
      setBhartiMerit(data.bhartiMerit || []);
      setUpdatedAt(data.updatedAt || null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatLastUpdated = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '-';
    }
  };

  const renderPagination = (currentPage: number, totalItems: number, onPageChange: (p: number) => void) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between border-t border-gray-150 bg-slate-50/50 px-4 py-4 mt-6 rounded-xl">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => {
              onPageChange(Math.max(currentPage - 1, 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            &larr; પાછળ
          </button>
          <span className="text-xs font-bold self-center text-gray-600">
            પેજ {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => {
              onPageChange(Math.min(currentPage + 1, totalPages));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            આગળ &rarr;
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 font-sans">
              કુલ <span className="font-extrabold text-blue-600 font-mono">{totalItems}</span> એન્ટ્રીઓમાંથી{' '}
              <span className="font-extrabold text-gray-900 font-mono">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> થી{' '}
              <span className="font-extrabold text-gray-900 font-mono">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> દર્શાવે છે
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => {
                  onPageChange(Math.max(currentPage - 1, 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-3 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-40 cursor-pointer text-xs font-bold bg-white"
              >
                પાછળ
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const showDotsBefore = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showDotsBefore && (
                        <span className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-500 ring-1 ring-inset ring-gray-300 bg-white">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => {
                          onPageChange(p);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        aria-current={p === currentPage ? 'page' : undefined}
                        className={`relative inline-flex items-center px-4 py-2 text-xs font-bold focus:z-20 cursor-pointer ${
                          p === currentPage
                            ? 'z-10 bg-blue-600 text-white'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 bg-white'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => {
                  onPageChange(Math.min(currentPage + 1, totalPages));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-3 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-40 cursor-pointer text-xs font-bold bg-white"
              >
                આગળ
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  const getUserRank = (list: any[]) => {
    if (!currentUserName) return '-';
    const entry = list.find(item => item.name.toLowerCase() === currentUserName.toLowerCase());
    return entry ? `#${entry.rank}` : 'લિસ્ટમાં નથી';
  };

  const getProbabilityBadge = (prob: number) => {
    if (prob >= 85) {
      return <span className="bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1 rounded-full text-xs border border-emerald-100">{prob}% (ખૂબ ઊંચી)</span>;
    } else if (prob >= 60) {
      return <span className="bg-blue-50 text-blue-700 font-extrabold px-3 py-1 rounded-full text-xs border border-blue-100">{prob}% (મધ્યમ)</span>;
    } else {
      return <span className="bg-amber-50 text-amber-700 font-extrabold px-3 py-1 rounded-full text-xs border border-amber-100">{prob}% (ઓછી)</span>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-gray-500 mt-4">મેરિટ લિસ્ટ લોડ થઈ રહ્યું છે...</p>
      </div>
    );
  }

  const paginatedCombined = combinedMerit.slice((combinedPage - 1) * ITEMS_PER_PAGE, combinedPage * ITEMS_PER_PAGE);
  const paginatedMock = mockMerit.slice((mockPage - 1) * ITEMS_PER_PAGE, mockPage * ITEMS_PER_PAGE);
  const paginatedBharti = bhartiMerit.slice((bhartiPage - 1) * ITEMS_PER_PAGE, bhartiPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-12">
      {/* 12-Hour Update Notice */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 rounded-2xl flex items-start gap-3.5 shadow-sm">
        <Info className="h-5.5 w-5.5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-[14px] md:text-base leading-snug">
            નોંધ: મેરિટ લિસ્ટ દર ૧૨ કલાકે (12 Hours) બેકગ્રાઉન્ડમાં ઓટોમેટિક અપડેટ થાય છે.
          </p>
          {updatedAt && (
            <p className="text-xs md:text-sm text-amber-800 font-medium">
              છેલ્લું અપડેટ સમય: <span className="font-mono bg-amber-100 px-2 py-0.5 rounded font-bold text-amber-950">{formatLastUpdated(updatedAt)}</span>
            </p>
          )}
        </div>
      </div>

      {/* TOP COMBINED MERIT SUMMARY SECTION */}
      <section className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 to-transparent"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-semibold text-xs uppercase tracking-wide">
              🎖️ સંયુક્ત મેરિટ લિસ્ટ (Mock + Bharti Combined)
            </span>
            <h2 className="text-3xl font-extrabold font-sans">
              તમારો સંયુક્ત રેન્ક અને સ્કોર વિગતો
            </h2>
            <p className="text-indigo-100 font-sans max-w-xl">
              બધા મોક ટેસ્ટ અને સત્તાવાર ભરતી પરીક્ષાઓમાં ઉમેદવારોના એકંદર દેખાવના આધારે સંયુક્ત મેરિટ લિસ્ટ નક્કી કરવામાં આવે છે.
            </p>
          </div>

          <div className="bg-white/10 border border-white/15 rounded-2xl p-6 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">તમારો રેન્ક</p>
              <p className="text-2xl font-black text-white mt-1 font-mono">
                {getUserRank(combinedMerit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">કુલ ઉમેદવારો</p>
              <p className="text-2xl font-black text-white mt-1 font-mono">
                {combinedMerit.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* COMBINED MERIT BOARD QUICK TABLE */}
      <div className="bg-transparent md:bg-white rounded-none md:rounded-2xl border-0 md:border border-gray-100 shadow-none md:shadow-xl p-2 md:p-8">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6 border-b border-gray-100 pb-3 font-sans">
          <Trophy className="h-5.5 w-5.5 text-amber-500" />
          સંયુક્ત મેરિટ લિસ્ટ
        </h3>

        {combinedMerit.length === 0 ? (
          <p className="text-gray-500">હજુ સુધી કોઈ રેન્કિંગ ડેટા ઉપલબ્ધ નથી.</p>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-gray-200">
                    <th className="p-4 w-24">રેન્ક</th>
                    <th className="p-4">ઉમેદવારનું નામ</th>
                    <th className="p-4 text-center">કેટેગરી</th>
                    <th className="p-4 text-center">આપેલ કસોટીઓ</th>
                    <th className="p-4 text-right">કુલ સંચિત ગુણ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedCombined.map((item) => {
                    const isCurrentUser = currentUserName && item.name.toLowerCase() === currentUserName.toLowerCase();
                    let rowBg = 'hover:bg-slate-50/50 transition-colors';
                    if (isCurrentUser) {
                      rowBg = 'bg-blue-50/40 font-semibold border-y border-blue-200 hover:bg-blue-50/60';
                    } else if (item.rank === 1) {
                      rowBg = 'bg-amber-50/35 font-semibold border-y border-amber-200/60 hover:bg-amber-100/30';
                    } else if (item.rank === 2) {
                      rowBg = 'bg-slate-50/50 font-semibold border-y border-slate-200/50 hover:bg-slate-100/30';
                    } else if (item.rank === 3) {
                      rowBg = 'bg-orange-50/20 font-semibold border-y border-orange-100/40 hover:bg-orange-100/20';
                    }

                    let rankDisplay = null;
                    if (item.rank === 1) {
                      rankDisplay = (
                        <div className="flex items-center gap-1.5 justify-start">
                          <Crown className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                          <span className="font-mono font-black text-amber-600 text-[14px]">#1</span>
                        </div>
                      );
                    } else if (item.rank === 2) {
                      rankDisplay = (
                        <div className="flex items-center gap-1.5 justify-start">
                          <Trophy className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="font-mono font-bold text-slate-500 text-[14px]">#2</span>
                        </div>
                      );
                    } else if (item.rank === 3) {
                      rankDisplay = (
                        <div className="flex items-center gap-1.5 justify-start">
                          <Trophy className="h-4 w-4 text-amber-700 shrink-0" />
                          <span className="font-mono font-bold text-amber-700 text-[14px]">#3</span>
                        </div>
                      );
                    } else {
                      rankDisplay = <span className="font-mono font-semibold text-gray-500 pl-1">#{item.rank}</span>;
                    }

                    return (
                      <tr key={item.name} className={rowBg}>
                        <td className="p-4">{rankDisplay}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {item.rank === 1 && <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />}
                            <span className={item.rank <= 3 ? "font-bold text-gray-900" : "text-gray-900"}>
                              {item.name} {isCurrentUser && <span className="text-blue-600 font-bold">(તમે)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg font-medium text-xs">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-4 text-center text-gray-500 font-medium">{item.examsTaken}</td>
                        <td className="p-4 text-right font-extrabold text-slate-800">{item.score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View Card List */}
            <div className="block md:hidden space-y-3">
              {paginatedCombined.map((item) => {
                const isCurrentUser = currentUserName && item.name.toLowerCase() === currentUserName.toLowerCase();
                let cardBgClass = "border-gray-150 bg-white";
                if (isCurrentUser) {
                  cardBgClass = "border-2 border-blue-500 bg-blue-50/30";
                } else if (item.rank === 1) {
                  cardBgClass = "border-2 border-amber-300 bg-amber-50/30 shadow-amber-50 shadow-md";
                } else if (item.rank === 2) {
                  cardBgClass = "border border-slate-300 bg-slate-50/30";
                } else if (item.rank === 3) {
                  cardBgClass = "border border-orange-200 bg-orange-50/10";
                }

                let rankBadge = null;
                if (item.rank === 1) {
                  rankBadge = (
                    <span className="flex items-center gap-1 font-mono font-black text-amber-600 text-[14px] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                      <Crown className="h-3.5 w-3.5 text-amber-500" /> #1
                    </span>
                  );
                } else if (item.rank === 2) {
                  rankBadge = (
                    <span className="flex items-center gap-1 font-mono font-black text-slate-600 text-[14px] bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                      <Trophy className="h-3 w-3 text-slate-400" /> #2
                    </span>
                  );
                } else if (item.rank === 3) {
                  rankBadge = (
                    <span className="flex items-center gap-1 font-mono font-black text-orange-700 text-[14px] bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
                      <Trophy className="h-3 w-3 text-orange-600" /> #3
                    </span>
                  );
                } else {
                  rankBadge = (
                    <span className="font-mono font-black text-blue-600 text-[14px] bg-blue-50 px-2.5 py-0.5 rounded-lg">
                      #{item.rank}
                    </span>
                  );
                }

                return (
                  <div key={item.name} className={`border rounded-xl p-4 space-y-3 shadow-sm ${cardBgClass}`}>
                    <div className="flex justify-between items-center">
                      {rankBadge}
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg font-bold text-xs uppercase">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-[17px] text-gray-900">
                        {item.name} {isCurrentUser && <span className="text-blue-600 font-black">(તમે)</span>}
                      </h4>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-2 text-gray-600">
                      <div>
                        <span className="text-gray-400 font-bold block text-xs">આપેલ કસોટીઓ:</span>
                        <span className="font-bold text-gray-800">{item.examsTaken} કસોટી</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 font-bold block text-xs">કુલ સંચિત ગુણ:</span>
                        <span className="font-extrabold text-slate-900 text-base">{item.score}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {renderPagination(combinedPage, combinedMerit.length, setCombinedPage)}
          </>
        )}
      </div>

      {/* DETAILED LEADERBOARD SECTIONS WITH 2 TABS */}
      <div className="bg-transparent md:bg-white rounded-none md:rounded-3xl border-0 md:border border-gray-100 shadow-none md:shadow-xl overflow-hidden">
        {/* Tab selection header */}
        <div className="flex border-b border-gray-200 bg-slate-50">
          <button
            onClick={() => setActiveTab('mock')}
            className={`flex-1 py-4 md:py-5 text-center font-bold font-sans text-sm md:text-base transition-all border-b-2 cursor-pointer ${
              activeTab === 'mock' 
                ? 'border-blue-600 text-blue-600 bg-white' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            📊 મોક ટેસ્ટ મેરિટ
          </button>
          <button
            onClick={() => setActiveTab('bharti')}
            className={`flex-1 py-4 md:py-5 text-center font-bold font-sans text-sm md:text-base transition-all border-b-2 cursor-pointer ${
              activeTab === 'bharti' 
                ? 'border-blue-600 text-blue-600 bg-white' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            💼 ભરતી પરીક્ષા મેરિટ
          </button>
        </div>

        {/* Tab panel content */}
        <div className="p-2 md:p-8">
          {activeTab === 'mock' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 px-1 py-1">
                <Info className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                <span className="text-[13px] md:text-sm font-semibold">તમામ મોક ટેસ્ટ્સના રેકોર્ડ્સ અને તેના સ્કોર્સની ક્રમાનુસાર ગોઠવણી:</span>
              </div>
              {mockMerit.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-base">હજુ સુધી કોઈ મોક ટેસ્ટ મેરિટ ઉપલબ્ધ નથી.</p>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-bold border-b border-gray-200">
                          <th className="p-4 w-24">રેન્ક</th>
                          <th className="p-4">ઉમેદવાર</th>
                          <th className="p-4">મોક ટેસ્ટ</th>
                          <th className="p-4 text-center">કેટેગરી</th>
                          <th className="p-4 text-right">મેળવેલ માર્ક્સ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedMock.map((item) => {
                          const isCurrentUser = currentUserName && item.name.toLowerCase() === currentUserName.toLowerCase();
                          let rowBg = 'hover:bg-slate-50/50 transition-colors';
                          if (isCurrentUser) {
                            rowBg = 'bg-blue-50/40 font-semibold border-y border-blue-200 hover:bg-blue-50/60';
                          } else if (item.rank === 1) {
                            rowBg = 'bg-amber-50/35 font-semibold border-y border-amber-200/60 hover:bg-amber-100/30';
                          } else if (item.rank === 2) {
                            rowBg = 'bg-slate-50/50 font-semibold border-y border-slate-200/50 hover:bg-slate-100/30';
                          } else if (item.rank === 3) {
                            rowBg = 'bg-orange-50/20 font-semibold border-y border-orange-100/40 hover:bg-orange-100/20';
                          }

                          let rankDisplay = null;
                          if (item.rank === 1) {
                            rankDisplay = (
                              <div className="flex items-center gap-1.5 justify-start">
                                <Crown className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                                <span className="font-mono font-black text-amber-600 text-[14px]">#1</span>
                              </div>
                            );
                          } else if (item.rank === 2) {
                            rankDisplay = (
                              <div className="flex items-center gap-1.5 justify-start">
                                <Trophy className="h-4 w-4 text-slate-400 shrink-0" />
                                <span className="font-mono font-bold text-slate-500 text-[14px]">#2</span>
                              </div>
                            );
                          } else if (item.rank === 3) {
                            rankDisplay = (
                              <div className="flex items-center gap-1.5 justify-start">
                                <Trophy className="h-4 w-4 text-amber-700 shrink-0" />
                                <span className="font-mono font-bold text-amber-700 text-[14px]">#3</span>
                              </div>
                            );
                          } else {
                            rankDisplay = <span className="font-mono font-semibold text-gray-500 pl-1">#{item.rank}</span>;
                          }

                          return (
                            <tr key={item.rank + item.name} className={rowBg}>
                              <td className="p-4">{rankDisplay}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  {item.rank === 1 && <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />}
                                  <span className={item.rank <= 3 ? "font-bold text-gray-900" : "text-gray-900"}>
                                    {item.name} {isCurrentUser && <span className="text-blue-600 font-bold">(તમે)</span>}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 text-gray-600 font-medium">{item.examName}</td>
                              <td className="p-4 text-center">
                                <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs">
                                  {item.category}
                                </span>
                              </td>
                              <td className="p-4 text-right font-extrabold text-slate-800">{item.score}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List */}
                  <div className="block md:hidden space-y-3">
                    {paginatedMock.map((item) => {
                      const isCurrentUser = currentUserName && item.name.toLowerCase() === currentUserName.toLowerCase();
                      let cardBgClass = "border-gray-150 bg-white";
                      if (isCurrentUser) {
                        cardBgClass = "border-2 border-blue-500 bg-blue-50/30";
                      } else if (item.rank === 1) {
                        cardBgClass = "border-2 border-amber-300 bg-amber-50/30 shadow-amber-50 shadow-md";
                      } else if (item.rank === 2) {
                        cardBgClass = "border border-slate-300 bg-slate-50/30";
                      } else if (item.rank === 3) {
                        cardBgClass = "border border-orange-200 bg-orange-50/10";
                      }

                      let rankBadge = null;
                      if (item.rank === 1) {
                        rankBadge = (
                          <span className="flex items-center gap-1 font-mono font-black text-amber-600 text-[14px] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                            <Crown className="h-3.5 w-3.5 text-amber-500" /> #1
                          </span>
                        );
                      } else if (item.rank === 2) {
                        rankBadge = (
                          <span className="flex items-center gap-1 font-mono font-black text-slate-600 text-[14px] bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                            <Trophy className="h-3 w-3 text-slate-400" /> #2
                          </span>
                        );
                      } else if (item.rank === 3) {
                        rankBadge = (
                          <span className="flex items-center gap-1 font-mono font-black text-orange-700 text-[14px] bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
                            <Trophy className="h-3 w-3 text-orange-600" /> #3
                          </span>
                        );
                      } else {
                        rankBadge = (
                          <span className="font-mono font-black text-blue-600 text-[14px] bg-blue-50 px-2.5 py-0.5 rounded-lg">
                            #{item.rank}
                          </span>
                        );
                      }

                      return (
                        <div key={item.rank + item.name} className={`border rounded-xl p-4 space-y-3 shadow-sm ${cardBgClass}`}>
                          <div className="flex justify-between items-center">
                            {rankBadge}
                            <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg font-bold text-xs">
                              {item.category}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-[17px] text-gray-900">
                              {item.name} {isCurrentUser && <span className="text-blue-600 font-black">(તમે)</span>}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1 font-medium">{item.examName}</p>
                          </div>
                          <div className="border-t border-gray-100 pt-2 flex justify-between items-center text-sm">
                            <span className="text-gray-400 font-bold text-xs">મેળવેલ માર્ક્સ:</span>
                            <span className="font-extrabold text-emerald-600 text-base bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                              {item.score} ગુણ
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {renderPagination(mockPage, mockMerit.length, setMockPage)}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 text-indigo-900 text-[13px] md:text-sm">
                <TrendingUp className="h-5 w-5 text-indigo-600 shrink-0" />
                <p className="leading-relaxed">
                  <strong>સિલેક્શન પ્રોબેબિલિટી (Selection Probability %):</strong> આ ગણતરી તમારી રેન્ક અને ઉપલબ્ધ કાલ્પનિક જગ્યાઓ (Simulated Vacancies) ના આધારે ગણવામાં આવી છે. પ્રથમ ૨ રેન્ક ધરાવતા ઉમેદવારો અત્યારે સીધા સિલેક્શન ઝોનમાં છે.
                </p>
              </div>

              {bhartiMerit.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-base">હજુ સુધી કોઈ ભરતી પરીક્ષા મેરિટ ઉપલબ્ધ નથી.</p>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-bold border-b border-gray-200">
                          <th className="p-4 w-24">રેન્ક</th>
                          <th className="p-4">ઉમેદવાર</th>
                          <th className="p-4">ભરતી પરીક્ષા</th>
                          <th className="p-4 text-center">માર્ક્સ</th>
                          <th className="p-4 text-center">કેટેગરી</th>
                          <th className="p-4 text-right">સિલેક્શનની શક્યતા (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedBharti.map((item) => {
                          const isCurrentUser = currentUserName && item.name.toLowerCase() === currentUserName.toLowerCase();
                          let rowBg = 'hover:bg-slate-50/50 transition-colors';
                          if (isCurrentUser) {
                            rowBg = 'bg-blue-50/40 font-semibold border-y border-blue-200 hover:bg-blue-50/60';
                          } else if (item.rank === 1) {
                            rowBg = 'bg-amber-50/35 font-semibold border-y border-amber-200/60 hover:bg-amber-100/30';
                          } else if (item.rank === 2) {
                            rowBg = 'bg-slate-50/50 font-semibold border-y border-slate-200/50 hover:bg-slate-100/30';
                          } else if (item.rank === 3) {
                            rowBg = 'bg-orange-50/20 font-semibold border-y border-orange-100/40 hover:bg-orange-100/20';
                          }

                          let rankDisplay = null;
                          if (item.rank === 1) {
                            rankDisplay = (
                              <div className="flex items-center gap-1.5 justify-start">
                                <Crown className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                                <span className="font-mono font-black text-amber-600 text-[14px]">#1</span>
                              </div>
                            );
                          } else if (item.rank === 2) {
                            rankDisplay = (
                              <div className="flex items-center gap-1.5 justify-start">
                                <Trophy className="h-4 w-4 text-slate-400 shrink-0" />
                                <span className="font-mono font-bold text-slate-500 text-[14px]">#2</span>
                              </div>
                            );
                          } else if (item.rank === 3) {
                            rankDisplay = (
                              <div className="flex items-center gap-1.5 justify-start">
                                <Trophy className="h-4 w-4 text-amber-700 shrink-0" />
                                <span className="font-mono font-bold text-amber-700 text-[14px]">#3</span>
                              </div>
                            );
                          } else {
                            rankDisplay = <span className="font-mono font-semibold text-gray-500 pl-1">#{item.rank}</span>;
                          }

                          return (
                            <tr key={item.rank + item.name} className={rowBg}>
                              <td className="p-4">{rankDisplay}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  {item.rank === 1 && <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />}
                                  <span className={item.rank <= 3 ? "font-bold text-gray-900" : "text-gray-900"}>
                                    {item.name} {isCurrentUser && <span className="text-blue-600 font-bold">(તમે)</span>}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 text-gray-600 font-medium">{item.examName}</td>
                              <td className="p-4 text-center">
                                {item.score !== null ? (
                                  <span className="font-extrabold text-slate-800">{item.score}</span>
                                ) : (
                                  <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">આન્સર કી બાકી</span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs">
                                  {item.category}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                {getProbabilityBadge(item.selectionProbability)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List */}
                  <div className="block md:hidden space-y-3">
                    {paginatedBharti.map((item) => {
                      const isCurrentUser = currentUserName && item.name.toLowerCase() === currentUserName.toLowerCase();
                      let cardBgClass = "border-gray-150 bg-white";
                      if (isCurrentUser) {
                        cardBgClass = "border-2 border-indigo-500 bg-indigo-50/30";
                      } else if (item.rank === 1) {
                        cardBgClass = "border-2 border-amber-300 bg-amber-50/30 shadow-amber-50 shadow-md";
                      } else if (item.rank === 2) {
                        cardBgClass = "border border-slate-300 bg-slate-50/30";
                      } else if (item.rank === 3) {
                        cardBgClass = "border border-orange-200 bg-orange-50/10";
                      }

                      let rankBadge = null;
                      if (item.rank === 1) {
                        rankBadge = (
                          <span className="flex items-center gap-1 font-mono font-black text-amber-600 text-[14px] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                            <Crown className="h-3.5 w-3.5 text-amber-500" /> #1
                          </span>
                        );
                      } else if (item.rank === 2) {
                        rankBadge = (
                          <span className="flex items-center gap-1 font-mono font-black text-slate-600 text-[14px] bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                            <Trophy className="h-3 w-3 text-slate-400" /> #2
                          </span>
                        );
                      } else if (item.rank === 3) {
                        rankBadge = (
                          <span className="flex items-center gap-1 font-mono font-black text-orange-700 text-[14px] bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
                            <Trophy className="h-3 w-3 text-orange-600" /> #3
                          </span>
                        );
                      } else {
                        rankBadge = (
                          <span className="font-mono font-black text-indigo-600 text-[14px] bg-indigo-50 px-2.5 py-0.5 rounded-lg">
                            #{item.rank}
                          </span>
                        );
                      }

                      return (
                        <div key={item.rank + item.name} className={`border rounded-xl p-4 space-y-3 shadow-sm ${cardBgClass}`}>
                          <div className="flex justify-between items-center">
                            {rankBadge}
                            <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg font-bold text-xs">
                              {item.category}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-[17px] text-gray-900">
                              {item.name} {isCurrentUser && <span className="text-indigo-600 font-black">(તમે)</span>}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1 font-medium">{item.examName}</p>
                          </div>
                          
                          <div className="border-t border-gray-100 pt-2 flex flex-wrap justify-between items-center text-sm gap-2">
                            <div>
                              <span className="text-gray-400 font-bold text-xs block">મેળવેલ માર્ક્સ:</span>
                              {item.score !== null ? (
                                <span className="font-extrabold text-slate-800">{item.score} ગુણ</span>
                              ) : (
                                <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">આન્સર કી બાકી</span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-gray-400 font-bold text-xs block mb-0.5">સિલેક્શન શક્યતા:</span>
                              {getProbabilityBadge(item.selectionProbability)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {renderPagination(bhartiPage, bhartiMerit.length, setBhartiPage)}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
