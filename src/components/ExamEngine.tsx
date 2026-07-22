import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle, AlertTriangle, AlertCircle, Bookmark, ChevronLeft, ChevronRight, Send, HelpCircle } from 'lucide-react';
import { Exam, Question } from '../types';

interface ExamEngineProps {
  exam: Exam;
  userId: string;
  onFinished: () => void;
  onResultStateChange?: (hasResult: boolean) => void;
}

export default function ExamEngine({ exam, userId, onFinished, onResultStateChange }: ExamEngineProps) {
  const durationInMinutes = Number(exam?.duration) || 60;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({}); // questionId -> option selected (A, B, C, D, E)
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(durationInMinutes * 60); // duration in seconds
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookmarkedQuestionIds, setBookmarkedQuestionIds] = useState<Set<string>>(new Set());

  const selectedAnswersRef = useRef<Record<string, string>>({});
  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  const timeLeftRef = useRef(durationInMinutes * 60);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Propagate result view state to parent layout
  useEffect(() => {
    if (onResultStateChange) {
      onResultStateChange(!!examResult);
    }
    if (examResult) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [examResult, onResultStateChange]);

  // Load user bookmarks on start
  useEffect(() => {
    if (userId) {
      const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
      fetch(`/api/user/${userId}/bookmarks`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
        .then(res => {
          if (res.status === 423) {
            window.dispatchEvent(new CustomEvent('user-blocked'));
            return [];
          }
          if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return res.json();
          }
          return [];
        })
        .then(data => {
          if (Array.isArray(data)) {
            setBookmarkedQuestionIds(new Set(data.map(b => b.questionId)));
          }
        })
        .catch(err => {
          if (err.message && err.message.includes('Status: 423')) return;
          console.error("Error fetching bookmarks:", err);
        });
    }
  }, [userId]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Safely parse questions if they are stored or returned as a JSON string
  const questionsList: Question[] = React.useMemo(() => {
    if (!exam || !exam.questions) return [];
    if (typeof exam.questions === 'string') {
      try {
        return JSON.parse(exam.questions);
      } catch (e) {
        console.error("Error parsing exam.questions in ExamEngine:", e);
        return [];
      }
    }
    return Array.isArray(exam.questions) ? exam.questions : [];
  }, [exam]);

  const totalQuestions = questionsList.length;
  const currentQuestion = questionsList[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">પ્રશ્નો મળ્યા નથી</h2>
        <p className="text-gray-600 mt-2">આ પરીક્ષા માટે કોઈ પ્રશ્નો ઉપલબ્ધ નથી.</p>
        <button onClick={onFinished} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-xl">પાછા જાઓ</button>
      </div>
    );
  }

  const handleToggleBookmark = async () => {
    const qId = currentQuestion.id;
    const isCurrentlyBookmarked = bookmarkedQuestionIds.has(qId);
    const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    try {
      if (isCurrentlyBookmarked) {
        const res = await fetch(`/api/user/${userId}/bookmarks/${qId}`, {
          method: 'DELETE',
          headers: authHeader
        });
        if (res.status === 423) {
          window.dispatchEvent(new CustomEvent('user-blocked'));
          return;
        }
        if (res.ok) {
          const updated = new Set(bookmarkedQuestionIds);
          updated.delete(qId);
          setBookmarkedQuestionIds(updated);
        }
      } else {
        const res = await fetch(`/api/user/${userId}/bookmarks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          },
          body: JSON.stringify({
            examId: exam.id,
            examName: exam.name,
            questionId: qId,
            question: currentQuestion
          })
        });
        if (res.status === 423) {
          window.dispatchEvent(new CustomEvent('user-blocked'));
          return;
        }
        if (res.ok) {
          const updated = new Set(bookmarkedQuestionIds);
          updated.add(qId);
          setBookmarkedQuestionIds(updated);
        }
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
    }
  };

  // Timer Countdown Logic
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto submit
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (option: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion.id]: option
    });
  };

  const handleMarkForReview = () => {
    setMarkedForReview({
      ...markedForReview,
      [currentQuestion.id]: !markedForReview[currentQuestion.id]
    });
  };

  const handleAutoSubmit = () => {
    alert('⏳ સમય સમાપ્ત થઈ ગયો છે! તમારી કસોટી આપમેળે સબમિટ કરવામાં આવી રહી છે.');
    submitExam(0, selectedAnswersRef.current);
  };

  const submitExam = async (overrideTimeLeft?: any, overrideAnswers?: Record<string, string>) => {
    setIsSubmitting(true);
    setShowSubmitConfirm(false);
    
    // Format elapsed time safely
    const durationInMins = Number(exam?.duration) || 60;
    const actualTimeLeft = (typeof overrideTimeLeft === 'number') ? overrideTimeLeft : (typeof timeLeftRef.current === 'number' && !isNaN(timeLeftRef.current) ? timeLeftRef.current : durationInMins * 60);
    const actualAnswers = overrideAnswers !== undefined ? overrideAnswers : selectedAnswersRef.current;
    
    let elapsedSeconds = (durationInMins * 60) - actualTimeLeft;
    if (isNaN(elapsedSeconds) || elapsedSeconds < 0) {
      elapsedSeconds = 0;
    }
    const elapsedMins = Math.floor(elapsedSeconds / 60);
    const elapsedSecs = Math.floor(elapsedSeconds % 60);
    const timeTakenStr = `${elapsedMins.toString().padStart(2, '0')}:${elapsedSecs.toString().padStart(2, '0')}`;

    try {
      const token = JSON.parse(localStorage.getItem('exam_user') || '{}')?.token;
      const res = await fetch(`/api/exams/${exam.id}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          answers: actualAnswers,
          timeTaken: timeTakenStr
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'પરીક્ષા સબમિશન નિષ્ફળ ગયું.');
      
      setExamResult(data.result);
    } catch (err: any) {
      alert('ભૂલ: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(selectedAnswers).length;

  // Statistics of the completed exam
  let clientCorrectCount = 0;
  let clientIncorrectCount = 0;
  let clientLeftCount = 0;
  let clientECount = 0;

  if (examResult) {
    questionsList.forEach((q) => {
      const ans = selectedAnswers[q.id];
      if (ans === undefined) {
        clientLeftCount++;
      } else if (ans === 'E') {
        clientECount++;
      } else if (ans === q.correctAnswer) {
        clientCorrectCount++;
      } else {
        clientIncorrectCount++;
      }
    });
  }

  return (
    <div className="space-y-3 md:space-y-8 py-1 md:py-4">
      {/* EXAM STATUS PANEL (STICKY TOP) */}
      <div className="bg-slate-900 text-white rounded-xl md:rounded-2xl p-3 md:p-5 shadow-md border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="text-center sm:text-left">
          <span className="text-[10px] md:text-xs bg-blue-500/20 text-blue-300 font-bold px-3 py-1 rounded-full uppercase">
            {exam.type === 'mock' ? 'મોક ટેસ્ટ' : 'ભરતી પરીક્ષા'}
          </span>
          <h2 className="text-xl md:text-2xl font-bold font-sans mt-1.5">{exam.name}</h2>
        </div>

        {!examResult && (
          <div className="flex items-center gap-6 shrink-0">
            <div className={`flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border font-mono text-xl md:text-2xl font-extrabold tracking-wider ${
              timeLeft < 60 ? 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse' : 'bg-slate-800 text-emerald-400 border-slate-700'
            }`}>
              <Clock className="h-5 w-5 md:h-6 md:w-6" />
              {formatTime(timeLeft)}
            </div>
          </div>
        )}
      </div>

      {/* RENDER ACTIVE EXAM ENGINE */}
      {!examResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
          {/* Main Question view panel */}
          <div className="lg:col-span-3 bg-transparent md:bg-white rounded-none md:rounded-3xl border-0 md:border border-gray-100 shadow-none md:shadow-xl p-1 md:p-8 space-y-4 flex flex-col justify-between min-h-[450px]">
            <div>
              {/* Question metadata row */}
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <span className="bg-blue-50 text-blue-700 font-extrabold px-3.5 py-1.5 rounded-xl text-sm md:text-base">
                  પ્રશ્ન {currentQuestionIndex + 1} / {totalQuestions}
                </span>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] md:text-xs font-bold text-gray-500 justify-end">
                  <span className="text-emerald-600">સાચો: +૧.૦</span>
                  <span className="text-red-600">ખોટો: -૦.૨૫</span>
                  <span className="text-indigo-600">E વિકલ્પ: ૦.૦૦</span>
                </div>
              </div>

              {/* Passage paragraph (Passage types only) */}
              {currentQuestion.type === 'paragraph' && currentQuestion.passage && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 md:p-5 rounded-r-2xl italic text-gray-700 text-sm md:text-base leading-relaxed mb-4 md:mb-6">
                  <p className="font-semibold text-xs text-blue-800 uppercase tracking-wide mb-1.5">ફકરો (Passage):</p>
                  "{currentQuestion.passage}"
                </div>
              )}

              {/* Question Text */}
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug mt-4">
                {currentQuestion.questionText}
              </h3>

              {/* 5 Options List */}
              <div className="grid grid-cols-1 gap-3 md:gap-4 mt-5 md:mt-8 max-w-3xl">
                {['A', 'B', 'C', 'D', 'E'].map((opt) => {
                  let optText = '';
                  if (opt === 'E') {
                    optText = 'જવાબ આપવા માંગતા નથી';
                  } else {
                    optText = (currentQuestion.options as any)[opt];
                  }

                  const isSelected = selectedAnswers[currentQuestion.id] === opt;

                  return (
                    <button
                      key={opt}
                      onClick={() => handleOptionSelect(opt)}
                      className={`text-left w-full p-3 md:p-4 rounded-xl border font-sans text-base md:text-lg transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/85 font-semibold ring-1 ring-blue-500/20' 
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                      }`}
                    >
                      <span className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black shrink-0 text-sm md:text-base border transition-all ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow' 
                          : 'bg-gray-100 border-gray-300 text-gray-700'
                      }`}>
                        {opt}
                      </span>
                      <span className="font-bold text-gray-800 leading-snug text-base md:text-lg">{optText}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Nav Bar */}
            <div className="border-t border-gray-100 pt-4 md:pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 w-full">
              <div className="grid grid-cols-3 gap-1.5 w-full sm:flex sm:items-center sm:gap-3 sm:w-auto">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                  className="px-2 sm:px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-40 font-bold cursor-pointer flex items-center justify-center gap-1 text-xs sm:text-sm transition-all"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" /> પાછળ
                </button>
                <button
                  onClick={handleMarkForReview}
                  className={`px-2 sm:px-4 py-2.5 rounded-xl font-bold cursor-pointer text-xs sm:text-sm border flex items-center justify-center gap-1 transition-all ${
                    markedForReview[currentQuestion.id]
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Bookmark className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>રિવ્યુ</span>
                </button>
                <button
                  onClick={handleToggleBookmark}
                  className={`px-2 sm:px-4 py-2.5 rounded-xl font-bold cursor-pointer text-xs sm:text-sm border flex items-center justify-center gap-1 transition-all ${
                    bookmarkedQuestionIds.has(currentQuestion.id)
                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 shrink-0 ${bookmarkedQuestionIds.has(currentQuestion.id) ? 'fill-red-500 text-red-500' : 'text-red-500'}`} />
                  <span>બુકમાર્ક</span>
                </button>
              </div>

              <div className="w-full sm:w-auto sm:ml-auto mt-1 sm:mt-0">
                {currentQuestionIndex < totalQuestions - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all text-xs sm:text-sm flex items-center justify-center gap-1"
                  >
                    આગળ <ChevronRight className="h-4 w-4 shrink-0" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all text-xs sm:text-sm flex items-center justify-center gap-1"
                  >
                    પૂર્ણ કરો <CheckCircle className="h-4 w-4 shrink-0" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Question palette */}
          <div className="lg:col-span-1 bg-transparent md:bg-white rounded-none md:rounded-3xl border-0 md:border border-gray-100 shadow-none md:shadow-xl p-1 md:p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2.5 mb-3 font-sans">
                પ્રશ્ન પેલેટ (Palette)
              </h3>
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-2 max-h-[250px] overflow-y-auto pr-1">
                {questionsList.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const isAnswered = selectedAnswers[q.id] !== undefined;
                  const isMarked = markedForReview[q.id] === true;

                  let bgClass = 'bg-gray-100 hover:bg-gray-200 text-gray-700';
                  if (isCurrent) {
                    bgClass = 'bg-blue-600 text-white ring-2 ring-blue-500/20';
                  } else if (isMarked) {
                    bgClass = 'bg-amber-500 text-white';
                  } else if (isAnswered) {
                    bgClass = 'bg-emerald-600 text-white';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-10 h-10 md:w-9 md:h-9 rounded-lg font-bold text-sm md:text-xs flex items-center justify-center transition-all cursor-pointer ${bgClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend guide */}
            <div className="mt-6 border-t border-gray-100 pt-4 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-emerald-600 rounded-md"></span>
                <span className="text-gray-600">ઉત્તર આપેલ ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-amber-500 rounded-md"></span>
                <span className="text-gray-600">રિવ્યુ માટે સેવ કરેલ ({Object.keys(markedForReview).filter(k=>markedForReview[k]).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-gray-100 rounded-md"></span>
                <span className="text-gray-600">ઉત્તર બાકી ({totalQuestions - answeredCount})</span>
              </div>
            </div>

            {/* Action buttons at the bottom of the Question Palette */}
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2.5">
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/15 text-sm"
              >
                <Send className="h-4 w-4" /> પરીક્ષા સબમિટ કરો
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* CONDITIONAL RESULT PAGE DISPLAY */
        <div className="bg-transparent md:bg-white rounded-none md:rounded-3xl border-0 md:border border-gray-100 shadow-none md:shadow-2xl p-1 md:p-8 max-w-2xl mx-auto text-center space-y-5">
          
          {/* BHARTI EXAM CONDITION - NO OFFICIAL ANSWER KEY UPLOADED */}
          {exam.type === 'bharti' && !examResult.answerKeyUploaded ? (
            <div className="space-y-6 py-3 bg-transparent md:bg-white border-0 md:border border-gray-150 rounded-2xl p-2 md:p-6 shadow-none md:shadow-sm">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 font-sans">પરીક્ષા સફળતાપૂર્વક સબમિટ થઈ ગઈ છે!</h3>
                <p className="text-[15px] md:text-base text-amber-700 bg-amber-50 font-bold p-4 rounded-xl border border-amber-200 mt-3 leading-relaxed font-sans max-w-lg mx-auto">
                  ⚠️ બોર્ડ દ્વારા ઓફિશિયલ અંસાર કી બહાર પાડવામાં આવ્યા બાદ માર્ક્સ જોઈ શકશો
                </p>
              </div>
              <p className="text-xs md:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                જ્યારે બોર્ડ આ ભરતી પરીક્ષાની સત્તાવાર આન્સર કી અપલોડ કરશે, ત્યારે તમને ડેશબોર્ડમાં અને મેરિટ લિસ્ટમાં તમારા ગુણ જોવા મળશે.
              </p>
            </div>
          ) : (
            /* RESULTS DISPLAY IF MOCK OR BHARTI WITH ANSWER KEY */
            <div className="space-y-5">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 font-sans">પરીક્ષાનું પરિણામ (Result)</h3>
                <p className="text-xs md:text-sm text-gray-500 mt-1 font-sans font-medium">પરિણામ વિગતો નીચે મુજબ છે</p>
              </div>

              {/* Score grid */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-md mx-auto bg-slate-50 md:bg-white border border-slate-200/70 md:border-gray-150 shadow-none md:shadow-sm p-3 md:p-6 rounded-xl md:rounded-2xl">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">મેળવેલ ગુણ</p>
                  <p className="text-2xl md:text-3xl font-black text-blue-600 mt-1">
                    {examResult.marksObtained ?? examResult.actualScore} / {examResult.totalMarks}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">સમય લીધેલ</p>
                  <p className="text-2xl md:text-3xl font-black text-slate-800 mt-1 font-mono">{examResult.timeTaken}</p>
                </div>
              </div>

              {/* Detailed Summary */}
              <div className="space-y-3.5 max-w-md mx-auto">
                <h4 className="text-base md:text-xl font-black text-slate-900 text-left font-sans tracking-tight px-1">
                  📊 પ્રશ્નવાર સવિસ્તાર વિગતો:
                </h4>
                <div className="grid grid-cols-2 gap-2.5 md:gap-3.5">
                  <div className="bg-emerald-50 border border-emerald-100/80 rounded-xl p-3 md:p-4 flex flex-row items-center justify-between gap-2 text-left">
                    <div>
                      <p className="text-[14px] md:text-base font-black text-emerald-950">સાચા જવાબ</p>
                      <p className="text-[11px] md:text-xs text-emerald-700 mt-0.5 font-bold">+{clientCorrectCount * 1} ગુણ</p>
                    </div>
                    <span className="text-lg md:text-2xl font-black text-emerald-700 font-mono bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0">
                      {clientCorrectCount}
                    </span>
                  </div>
                  
                  <div className="bg-red-50 border border-red-100/80 rounded-xl p-3 md:p-4 flex flex-row items-center justify-between gap-2 text-left">
                    <div>
                      <p className="text-[14px] md:text-base font-black text-red-950">ખોટા જવાબ</p>
                      <p className="text-[11px] md:text-xs text-red-700 mt-0.5 font-bold">-{parseFloat((clientIncorrectCount * 0.25).toFixed(2))} ગુણ</p>
                    </div>
                    <span className="text-lg md:text-2xl font-black text-red-700 font-mono bg-white px-2 py-0.5 rounded-lg border border-red-200 shrink-0">
                      {clientIncorrectCount}
                    </span>
                  </div>

                  <div className="bg-amber-50 border border-amber-100/80 rounded-xl p-3 md:p-4 flex flex-row items-center justify-between gap-2 text-left">
                    <div>
                      <p className="text-[14px] md:text-base font-black text-amber-950">કોરા છોડેલ</p>
                      <p className="text-[11px] md:text-xs text-amber-700 mt-0.5 font-bold">-{parseFloat((clientLeftCount * 0.25).toFixed(2))} ગુણ</p>
                    </div>
                    <span className="text-lg md:text-2xl font-black text-amber-700 font-mono bg-white px-2 py-0.5 rounded-lg border border-amber-200 shrink-0">
                      {clientLeftCount}
                    </span>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-100/80 rounded-xl p-3 md:p-4 flex flex-row items-center justify-between gap-2 text-left">
                    <div>
                      <p className="text-[14px] md:text-base font-black text-indigo-950">E વિકલ્પ પસંદ</p>
                      <p className="text-[11px] md:text-xs text-indigo-700 mt-0.5 font-bold">૦.૦૦ ગુણ</p>
                    </div>
                    <span className="text-lg md:text-2xl font-black text-indigo-700 font-mono bg-white px-2 py-0.5 rounded-lg border border-indigo-200 shrink-0">
                      {clientECount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/40 rounded-xl p-4 md:p-6 text-sm md:text-base text-blue-950 max-w-md mx-auto border border-blue-100/70 text-left space-y-2">
                <p className="text-base md:text-lg font-black text-blue-950 flex items-center gap-1.5">
                  💡 ગુણાંકન પદ્ધતિ (Marking System):
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-blue-900 font-bold leading-relaxed">
                  <li>દરેક સાચા જવાબ માટે <strong className="text-emerald-700">+૧.૦ ગુણ</strong> મળેલ છે.</li>
                  <li>ખોટા અથવા કોરા રાખેલ (ન દર્શાવેલ) જવાબો માટે <strong className="text-red-700">-૦.૨૫ ગુણ</strong> કપાશે.</li>
                  <li><strong className="text-indigo-700">E વિકલ્પ</strong> પસંદ કરેલ પ્રશ્નો માટે કોઈ નકારાત્મક ગુણ કપાશે નહીં (૦.૦૦ ગુણ).</li>
                </ul>
              </div>

              {/* Score sharing panel */}
              <div className="bg-slate-50 rounded-xl p-4 md:p-6 max-w-md mx-auto text-left space-y-3">
                <p className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  🏆 તમારો સ્કોર મિત્રો સાથે શેર કરો! (Share Score)
                </p>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  તમારી સફળતા અને ઉત્સાહ તમારા મિત્રો સાથે સોશિયલ મીડિયા પર શેર કરો જેથી તેઓ પણ તેમની તૈયારી ચકાસી શકે.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {/* WhatsApp Share Button */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `🎯 *મેં OJAS Exam પર મોક ટેસ્ટ પૂર્ણ કરી છે!*\n\n📝 *પરીક્ષા:* ${exam.name}\n📊 *મારો સ્કોર:* ${examResult.marksObtained ?? examResult.actualScore} / ${examResult.totalMarks}\n⏱️ *લીધેલ સમય:* ${examResult.timeTaken}\n✅ *સાચા જવાબો:* ${clientCorrectCount}\n❌ *ખોટા જવાબો:* ${clientIncorrectCount}\n\nનવી સરકારી ભરતીઓની માહિતી અને ઓનલાઇન મોક ટેસ્ટ માટે આજે જ જોડાઓ! 👇\n🔗 ${window.location.origin}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02]"
                    title="WhatsApp પર શેર કરો"
                  >
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 16 16">
                      <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.949h.004c4.368 0 7.927-3.558 7.93-7.93a7.896 7.896 0 0 0-2.327-5.593zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.69-4.98c-.202-.101-1.202-.594-1.392-.661-.18-.067-.312-.1-.443.1-.129.19-.5.594-.614.724-.115.13-.23.144-.43.041-.2-.1-.843-.311-1.607-.994-.594-.53-1.002-1.185-1.118-1.383-.116-.197-.013-.303.088-.403.09-.09.197-.23.296-.346.1-.116.133-.197.2-.329.065-.13.033-.245-.017-.346-.05-.1-.443-1.068-.607-1.464-.159-.387-.32-.334-.44-.34-.11-.006-.239-.006-.368-.006-.129 0-.34.049-.517.243-.177.195-.678.662-.678 1.613 0 .95.69 1.868.788 1.996.098.128 1.355 2.07 3.28 2.906.459.199.818.318 1.098.406.46.147.88.126 1.213.076.371-.056 1.202-.492 1.37-.967.168-.475.168-.88.118-.967-.05-.088-.18-.139-.382-.239z"/>
                    </svg>
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                  {/* Telegram Share Button */}
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(
                      `🎯 મેં OJAS Exam પર મોક ટેસ્ટ પૂર્ણ કરી છે!\n\n📝 પરીક્ષા: ${exam.name}\n📊 મારો સ્કોર: ${examResult.marksObtained ?? examResult.actualScore} / ${examResult.totalMarks}\n⏱️ લીધેલ સમય: ${examResult.timeTaken}\n\nનવી સરકારી ભરતીઓ અને મોક ટેસ્ટ માટે આજે જ જોડાઓ!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02]"
                    title="Telegram પર શેર કરો"
                  >
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 16 16">
                      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.329.213-.033.435-.233.548-.839.266-1.423.785-4.475.9-5.61a.48.48 0 0 0-.01-.223.144.144 0 0 0-.114-.101c-.131-.027-.33-.008-.636.12z"/>
                    </svg>
                    <span className="hidden sm:inline">Telegram</span>
                  </a>
                  {/* Copy score detail button */}
                  <button
                    onClick={() => {
                      const text = `🎯 મેં OJAS Exam પર મોક ટેસ્ટ પૂર્ણ કરી છે!\n\n📝 પરીક્ષા: ${exam.name}\n📊 મારો સ્કોર: ${examResult.marksObtained ?? examResult.actualScore} / ${examResult.totalMarks}\n⏱️ લીધેલ સમય: ${examResult.timeTaken}`;
                      navigator.clipboard.writeText(text + `\n\nજોડાઓ: ${window.location.origin}`);
                      alert('📋 રિઝલ્ટ વિગતો ક્લિપબોર્ડ પર કોપી કરવામાં આવી છે!');
                    }}
                    className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-white text-slate-700 hover:bg-gray-50 text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02] cursor-pointer border-0"
                    title="રિઝલ્ટ કોપી કરો"
                  >
                    <span className="hidden sm:inline">કોપી કરો</span>
                    <span className="inline sm:hidden">📋</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-gray-100 flex justify-center">
            <button
              onClick={onFinished}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3 rounded-xl shadow-md cursor-pointer active:scale-95 transition-all text-sm"
            >
              ડેશબોર્ડ પર પાછા જાઓ
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM CANCEL MODAL */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-sans">
                પરીક્ષા કેન્સલ કરવા માંગો છો?
              </h3>
              <p className="text-sm text-gray-500 mt-2 font-sans">
                કેન્સલ કરવાથી તમારી આ પરીક્ષા રદ થશે અને કોઈ ડેટા કે પ્રગતિ સાચવવામાં આવશે નહીં.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-all"
              >
                પાછા જાઓ
              </button>
              <button
                onClick={onFinished}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/15 cursor-pointer transition-all"
              >
                હા, કેન્સલ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SUBMISSION MODAL */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-sans">
                પરીક્ષા સબમિટ કરવા માંગો છો?
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                એકવાર સબમિટ કર્યા પછી તમે તમારા જવાબો બદલી શકશો નહીં.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center text-sm">
              <div>
                <p className="text-gray-500">કુલ પ્રશ્નો</p>
                <p className="text-lg font-bold text-gray-900">{totalQuestions}</p>
              </div>
              <div>
                <p className="text-gray-500">ઉત્તર આપેલ પ્રશ્નો</p>
                <p className="text-lg font-bold text-emerald-600">{answeredCount}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-all"
              >
                રદ કરો
              </button>
              <button
                onClick={submitExam}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/15 cursor-pointer transition-all"
              >
                {isSubmitting ? 'સબમિટ થઈ રહ્યું છે...' : 'હા, સબમિટ કરો'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
