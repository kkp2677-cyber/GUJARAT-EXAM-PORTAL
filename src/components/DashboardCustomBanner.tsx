import React from 'react';

interface DashboardCustomBannerProps {
  onStartTest: (e: React.MouseEvent) => void;
}

export default function DashboardCustomBanner({ onStartTest }: DashboardCustomBannerProps) {
  // Static elegant theme based on saffron/orange (#FF9933)
  const current = {
    bannerBg: "bg-[#fff6ee] dark:bg-[#201004]",
    borderColor: "border-[#ffdcb8] dark:border-[#4d2003]",
    svgColor: "text-[#ff9933]",
    backdropBg: "bg-[#ff9933]",
    buttonBg: "bg-[#ff9933] hover:bg-[#e68019]",
    textColor: "text-[#361500] dark:text-[#ffe6d1]",
    subtextColor: "text-[#5e2905] dark:text-[#ffcca3]/90",
    shadowColor: "shadow-[#ff9933]/15"
  };

  return (
    <div className={`relative w-full rounded-2xl md:rounded-3xl ${current.bannerBg} border ${current.borderColor} shadow-md overflow-hidden p-3 sm:p-4 md:pt-4 md:pb-3.5 md:px-5 font-sans transition-all duration-300`}>
      {/* Background SVG Doodle Pattern */}
      <div className="absolute inset-0 opacity-15 dark:opacity-25 pointer-events-none overflow-hidden">
        <svg className={`w-full h-full ${current.svgColor}`} width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
          <pattern id="eduDoodles" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            {/* Open Book */}
            <path d="M15 25 C22 21, 30 21, 38 25 C46 21, 54 21, 61 25 V45 C54 41, 46 41, 38 45 C30 41, 22 41, 15 45 Z M38 25 V45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Graduation Cap */}
            <path d="M80 20 L105 32 L80 44 L55 32 Z M105 32 V45 M65 37 V48 C65 53, 95 53, 95 48 V37" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Pencil */}
            <path d="M20 75 L45 100 L55 90 L30 65 Z M20 75 L15 85 L25 80 Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Another Book */}
            <path d="M70 70 H100 V95 H70 Z M75 70 V95 M80 78 H95 M80 85 H95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#eduDoodles)" />
        </svg>
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 md:gap-5">
        
        {/* Left Side: Trophy + Gujarati Headings */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-2.5 sm:gap-4 md:gap-5 flex-1">
          
          {/* Left Side: Dynamic Backdrop + Pure Code 3D Trophy */}
          <div className="relative shrink-0 flex items-center justify-center">
            {/* Curved Dynamic Backing (replaces hardcoded green) */}
            <div className={`w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 ${current.backdropBg} rounded-r-full absolute -left-3 sm:-left-4 md:-left-5 top-1/2 -translate-y-1/2 shadow-inner transition-all duration-300`} />

            {/* Pure Vector SVG Trophy Cup */}
            <svg viewBox="0 0 240 280" className="relative z-10 w-24 h-28 sm:w-32 sm:h-38 md:w-36 md:h-42 drop-shadow-xl overflow-visible">
              <defs>
                {/* Gold Gradients */}
                <linearGradient id="goldLight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF2B2" />
                  <stop offset="30%" stopColor="#F5D061" />
                  <stop offset="70%" stopColor="#D49B28" />
                  <stop offset="100%" stopColor="#8A5A00" />
                </linearGradient>
                <linearGradient id="goldBody" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFE07A" />
                  <stop offset="50%" stopColor="#E5AC24" />
                  <stop offset="100%" stopColor="#B37C10" />
                </linearGradient>
                <linearGradient id="goldDark" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9E6C0A" />
                  <stop offset="50%" stopColor="#F5D061" />
                  <stop offset="100%" stopColor="#734B00" />
                </linearGradient>
                {/* Green Ceramic Gradients */}
                <linearGradient id="trophyGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#228B58" />
                  <stop offset="40%" stopColor="#14663E" />
                  <stop offset="100%" stopColor="#0B3C23" />
                </linearGradient>
                <linearGradient id="trophyGreenDark" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0B3821" />
                  <stop offset="50%" stopColor="#1B784B" />
                  <stop offset="100%" stopColor="#072415" />
                </linearGradient>
                <filter id="trophyShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#082918" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Shadow beneath base */}
              <ellipse cx="120" cy="262" rx="75" ry="12" fill="#000" opacity="0.22" />

              <g filter="url(#trophyShadow)">
                {/* Base Octagon / Pedestal */}
                <path d="M 60 230 L 180 230 L 185 255 L 55 255 Z" fill="url(#trophyGreenDark)" />
                <rect x="55" y="250" width="130" height="10" rx="3" fill="url(#trophyGreen)" />

                {/* Golden Base Plate / Plaque */}
                <rect x="82" y="235" width="76" height="15" rx="3" fill="url(#goldLight)" stroke="#8A5A00" strokeWidth="0.8" />
                <rect x="85" y="238" width="70" height="9" rx="1.5" fill="url(#goldBody)" opacity="0.9" />

                {/* Pedestal Stem */}
                <path d="M 90 205 L 150 205 L 155 230 L 85 230 Z" fill="url(#trophyGreen)" />
                
                {/* Gold Base Rings */}
                <ellipse cx="120" cy="205" rx="35" ry="7" fill="url(#goldLight)" />
                <rect x="95" y="195" width="50" height="10" rx="2" fill="url(#goldBody)" />
                <ellipse cx="120" cy="195" rx="27" ry="5" fill="url(#goldLight)" />

                {/* Gold Middle Spacer */}
                <path d="M 108 178 L 132 178 L 128 195 L 112 195 Z" fill="url(#goldDark)" />
                <circle cx="120" cy="182" r="10" fill="url(#goldLight)" />

                {/* Trophy Green Main Body Bowl */}
                <path d="M 52 65 C 50 145, 88 175, 120 178 C 152 175, 190 145, 188 65 Z" fill="url(#trophyGreen)" />
                
                {/* Top Gold Rim */}
                <ellipse cx="120" cy="65" rx="68" ry="12" fill="url(#goldLight)" />
                <ellipse cx="120" cy="65" rx="60" ry="9" fill="url(#trophyGreenDark)" />

                {/* Left Golden Cup Handle */}
                <path d="M 56 75 C 10 75, 5 140, 68 152 C 60 140, 30 135, 30 110 C 30 90, 52 82, 58 80 Z" fill="url(#goldLight)" />
                <path d="M 58 78 C 18 80, 16 132, 65 144 C 58 135, 36 128, 36 108 C 36 92, 54 84, 58 80 Z" fill="url(#goldDark)" />

                {/* Right Golden Cup Handle */}
                <path d="M 184 75 C 230 75, 235 140, 172 152 C 180 140, 210 135, 210 110 C 210 90, 188 82, 182 80 Z" fill="url(#goldLight)" />
                <path d="M 182 78 C 222 80, 224 132, 175 144 C 182 135, 204 128, 204 108 C 204 92, 186 84, 182 80 Z" fill="url(#goldDark)" />

                {/* Laurel Wreath Ornament on Cup Front */}
                <circle cx="120" cy="115" r="22" fill="url(#goldLight)" stroke="#8A5A00" strokeWidth="1" />
                <circle cx="120" cy="115" r="18" fill="url(#trophyGreenDark)" />
                
                {/* Mini Inner Trophy */}
                <path d="M 112 107 L 128 107 L 125 119 C 125 123, 122 125, 120 125 C 118 125, 115 123, 115 119 Z" fill="url(#goldLight)" />
                <rect x="117" y="125" width="6" height="4" fill="url(#goldBody)" />
                <rect x="114" y="129" width="12" height="3" rx="1" fill="url(#goldLight)" />

                {/* Laurel Leaves (Left & Right Wreath) */}
                <g fill="url(#goldLight)">
                  <path d="M 94 115 C 90 108, 86 112, 92 118 Z" />
                  <path d="M 92 105 C 86 100, 84 106, 90 110 Z" />
                  <path d="M 95 96 C 88 92, 88 98, 93 101 Z" />
                  <path d="M 95 126 C 90 132, 86 128, 92 122 Z" />

                  <path d="M 146 115 C 150 108, 154 112, 148 118 Z" />
                  <path d="M 148 105 C 154 100, 156 106, 150 110 Z" />
                  <path d="M 145 96 C 152 92, 152 98, 147 101 Z" />
                  <path d="M 145 126 C 150 132, 154 128, 148 122 Z" />
                </g>
              </g>
            </svg>
          </div>

          {/* Gujarati Motivational Headings */}
          <div className="flex-1 text-center sm:text-left pr-4">
            <h3 className={`text-xl sm:text-2xl md:text-xl lg:text-2xl font-extrabold ${current.textColor} leading-[1.25] tracking-tight font-sans transition-all duration-300`}>
              તમારી સફળતાની <br className="hidden sm:inline md:hidden" /> સફર શરૂ કરો!
            </h3>
            
            <p className={`${current.subtextColor} font-bold text-xs sm:text-sm md:text-sm lg:text-base mt-1 sm:mt-1.5 leading-snug font-sans max-w-md transition-all duration-300`}>
              સખત મહેનત અને યોગ્ય દિશા જ સફળતાની ચાવી છે.
            </p>
          </div>

        </div>

        {/* Right Side on Desktop / Bottom on Mobile: Pill Shape CTA Button */}
        <div className="shrink-0 flex justify-center md:justify-end z-10">
          <button
            onClick={onStartTest}
            className={`w-full sm:w-auto ${current.buttonBg} text-white font-extrabold text-xs sm:text-sm md:text-base px-4 sm:px-6 md:px-7 py-2 sm:py-2.5 rounded-full border-2 border-white/90 shadow-md ${current.shadowColor} hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer font-sans tracking-wide text-center whitespace-nowrap`}
          >
            હજી વધારે મોક ટેસ્ટ આપો!
          </button>
        </div>

      </div>
    </div>
  );
}
