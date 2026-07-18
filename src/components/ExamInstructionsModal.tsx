import React from 'react';
import { X, Clock, FileText, CheckCircle2, AlertTriangle, ShieldAlert, Award, Play } from 'lucide-react';
import { Exam } from '../types';

interface ExamInstructionsModalProps {
  exam: Exam;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExamInstructionsModal({ exam, onConfirm, onCancel }: ExamInstructionsModalProps) {
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      id="exam-instructions-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col transform transition-all scale-100"
        id="exam-instructions-container"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-5 md:p-6 text-white flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <h3 className="font-extrabold text-lg md:text-xl font-sans tracking-tight leading-tight">
                પરીક્ષા માટેની મહત્વપૂર્ણ સૂચનાઓ
              </h3>
              <p className="text-xs text-blue-100 font-medium mt-0.5 font-sans">
                Exam Instructions & Rules
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/90 hover:text-white"
            id="close-instructions-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 dark:text-slate-300 font-sans text-sm md:text-base leading-relaxed">
          
          {/* Exam Overview Banner */}
          <div className="p-4.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
            <h4 className="font-extrabold text-blue-900 dark:text-blue-300 text-base md:text-lg mb-1 leading-snug">
              {exam.name}
            </h4>
            <div className="flex flex-wrap gap-4 mt-2.5 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-slate-100 dark:border-slate-700/50">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                {exam.totalQuestions} પ્રશ્નો ({exam.totalQuestions} Marks)
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-slate-100 dark:border-slate-700/50">
                <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                {exam.duration} મિનિટ સમય
              </span>
            </div>
          </div>

          <p className="font-semibold text-slate-800 dark:text-slate-200">
            પરીક્ષા શરૂ કરતા પહેલાં કૃપા કરીને નીચેની સૂચનાઓ ધ્યાનપૂર્વક વાંચો:
          </p>

          {/* Instructions Sections */}
          <div className="space-y-5">
            {/* ⏱️ Section 1 */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                ⏱️ સમય અને પ્રશ્નોની માહિતી
              </h5>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">કુલ ગુણ:</strong> આ પરીક્ષાના કુલ ગુણ અને પ્રશ્નોની સંખ્યા સ્ક્રીન પર દર્શાવ્યા મુજબ રહેશે.
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">સમય મર્યાદા:</strong> પરીક્ષા માટેનો નિર્ધારિત સમય સ્ક્રીન પર જોઈ શકાશે. સમય પૂરો થતાં જ પેપર આપોઆપ સબમિટ થઈ જશે.
                </li>
              </ul>
            </div>

            {/* ⚖️ Section 2 */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                ⚖️ ગુણ પદ્ધતિ (Marking Scheme)
              </h5>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2.5 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">સાચો જવાબ:</strong> દરેક સાચા જવાબ દીઠ <span className="text-emerald-600 dark:text-emerald-400 font-bold">+1 ગુણ</span> મળવાપાત્ર છે.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">ખોટો કે કોરો જવાબ:</strong> દરેક ખોટો જવાબ અથવા કોઈ પણ વિકલ્પ પસંદ કર્યા વગર (કોરા) છોડી દીધેલ પ્રશ્ન દીઠ <span className="text-red-500 font-bold">-0.25 ગુણની કપાત</span> (Negative Marking) થશે.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-extrabold text-[10px] rounded shrink-0">E</span>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">'E' ઓપ્શન:</strong> 'E' ઓપ્શન પસંદ કરવાના કિસ્સામાં કોઈ ગુણ કપાશે નહીં.
                  </div>
                </div>
              </div>
            </div>

            {/* 🚨 Section 3 */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                🛡️ પરીક્ષા દરમિયાન રાખવાની સાવચેતીઓ
              </h5>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100/50 dark:border-amber-900/30 text-sm space-y-2 text-amber-900 dark:text-amber-400">
                <div className="flex gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
                  <p className="font-medium">
                    એકવાર પરીક્ષા ચાલુ થયા પછી તેને વચ્ચેથી બંધ (Close) કે પોઝ (Pause) કરી શકાશે નહીં.
                  </p>
                </div>
                <div className="flex gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
                  <p className="font-medium">
                    પરીક્ષા દરમિયાન બ્રાઉઝરની ટેબ બદલવી, પેજ રીફ્રેશ કરવું અથવા બીજી કોઈ એપ ખોલવી સખત મનાઈ છે. આવું કરવાથી તમારી પરીક્ષા આપોઆપ રદ/સબમિટ થઈ શકે છે.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-slate-150 dark:border-slate-800 pt-5 text-center space-y-2">
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
              <strong className="text-slate-700 dark:text-slate-300">નોંધ:</strong> જો તમે બધી સૂચનાઓ સમજી ગયા હોવ, તો નીચે આપેલા <span className="font-bold text-indigo-600 dark:text-indigo-400">"Start Exam"</span> બટન પર ક્લિક કરો.
            </p>
            <p className="text-indigo-600 dark:text-indigo-400 font-extrabold text-base flex items-center justify-center gap-1.5 animate-pulse">
              તમારી પરીક્ષા માટે ઓલ ધ બેસ્ટ! 👍
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-800/70 p-4 md:p-5 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row gap-3 justify-end z-10">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-sm"
            id="cancel-exam-button"
          >
            Cancel Exam
          </button>
          <button
            onClick={onConfirm}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl transition-all shadow-md shadow-indigo-600/10 active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-sm"
            id="start-exam-button"
          >
            <Play className="h-4 w-4 fill-current" />
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
}
