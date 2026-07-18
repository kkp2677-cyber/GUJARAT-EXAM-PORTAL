import React, { useEffect } from 'react';
import { ArrowLeft, Shield, FileText, Info, HelpCircle, RefreshCw } from 'lucide-react';

interface StaticPageProps {
  pageKey: 'about' | 'privacy' | 'terms' | 'disclaimer' | 'refund';
  onNavigateHome: () => void;
}

export default function StaticPage({ pageKey, onNavigateHome }: StaticPageProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pageKey]);

  const getPageConfig = () => {
    const customHtml = localStorage.getItem(`static_page_${pageKey}`);
    if (customHtml) {
      let icon = <Info className="h-6 w-6 text-blue-600" />;
      let title = 'અમારા વિશે (About Us)';
      if (pageKey === 'privacy') {
        icon = <Shield className="h-6 w-6 text-emerald-600" />;
        title = 'પ્રાઇવસી પોલિસી (Privacy Policy)';
      } else if (pageKey === 'terms') {
        icon = <FileText className="h-6 w-6 text-amber-600" />;
        title = 'નિયમો અને શરતો (Terms & Conditions)';
      } else if (pageKey === 'disclaimer') {
        icon = <HelpCircle className="h-6 w-6 text-purple-600" />;
        title = 'ડિસ્ક્લેમર (Disclaimer)';
      } else if (pageKey === 'refund') {
        icon = <RefreshCw className="h-6 w-6 text-sky-600" />;
        title = 'રીફંડ પોલિસી (Refund Policy)';
      }

      return {
        title,
        icon,
        content: (
          <div 
            className="prose max-w-none text-slate-700 leading-relaxed font-sans space-y-4"
            dangerouslySetInnerHTML={{ __html: customHtml }} 
          />
        )
      };
    }

    switch (pageKey) {
      case 'about':
        return {
          title: 'અમારા વિશે (About Us)',
          icon: <Info className="h-6 w-6 text-blue-600" />,
          content: (
            <div className="space-y-6 text-slate-700 leading-relaxed font-sans">
              <p className="text-base font-semibold text-slate-900">
                અમારી આ ઓફિશિયલ શૈક્ષણિક અને જોબ અપડેટ પોર્ટલ પર આપનું હાર્દિક સ્વાગત છે.
              </p>
              <p>
                અમારો મુખ્ય ઉદ્દેશ્ય ગુજરાતના તમામ વિદ્યાર્થીઓ અને નોકરીની તૈયારી કરતા ઉમેદવારો સુધી સાચી, સચોટ અને સમયસર માહિતી પહોંચાડવાનો છે. અમે ગુજરાત ગૌણ સેવા પસંદગી મંડળ (GSSSB), ગુજરાત જાહેર સેવા આયોગ (GPSC), ગુજરાત માધ્યમિક અને ઉચ્ચતર માધ્યમિક શિક્ષણ બોર્ડ (GSEB), અને અન્ય વિવિધ સરકારી ભરતી બોર્ડની માહિતી પ્રદાન કરીએ છીએ.
              </p>
              
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg my-4">
                <h4 className="font-bold text-blue-900 mb-1">અમારું લક્ષ્ય (Our Mission)</h4>
                <p className="text-sm text-blue-800">
                  ગુજરાતના ગ્રામીણ અને શહેરી વિસ્તારના તમામ ઉમેદવારોને સ્પર્ધાત્મક પરીક્ષાઓની પૂર્વ-તૈયારી માટે શ્રેષ્ઠ પ્લેટફોર્મ પૂરું પાડવું, જ્યાં તેઓ ઓનલાઇન મોક ટેસ્ટ આપી શકે, લેટેસ્ટ રિઝલ્ટ અને આન્સર કી જોઈ શકે અને મફત અભ્યાસ સામગ્રી મેળવી શકે.
                </p>
              </div>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">અમે શું પ્રદાન કરીએ છીએ?</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>સરકારી ભરતીની વિગતો:</strong> તમામ નવીનતમ નોકરીઓ (Latest Jobs), ઓનલાઈન અરજી કરવાની લિંક્સ અને સત્તાવાર જાહેરાતો.</li>
                <li><strong>ઓનલાઈન પરીક્ષા એન્જિન (Mock Tests):</strong> વિવિધ વિષયો અને પરીક્ષાઓ માટે લાઈવ મોક ટેસ્ટ અને લીડરબોર્ડ રેન્કિંગ.</li>
                <li><strong>પરિણામો અને આન્સર કી:</strong> બોર્ડ અને યુનિવર્સિટી પરીક્ષાઓની ફાઈનલ આન્સર કી અને સત્તાવાર રીઝલ્ટની ત્વરિત લિંક્સ.</li>
                <li><strong>અભ્યાસ સામગ્રી:</strong> પાઠ્યપુસ્તકો, મહત્વના પ્રશ્નો અને વર્તમાન પ્રવાહો (Current Affairs) ના લેટેસ્ટ અપડેટ્સ.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">અમારો સંપર્ક કરો</h3>
              <p>
                જો તમારી પાસે કોઈ પ્રશ્નો, સૂચનો અથવા સહયોગ માટેના પ્રસ્તાવ હોય, તો તમે અમારા સત્તાવાર ઈમેઈલ આઈડી પર સંપર્ક કરી શકો છો. અમે તમને મદદ કરવા માટે હંમેશાં તત્પર રહીશું.
              </p>
            </div>
          )
        };
      case 'privacy':
        return {
          title: 'પ્રાઇવસી પોલિસી (Privacy Policy)',
          icon: <Shield className="h-6 w-6 text-emerald-600" />,
          content: (
            <div className="space-y-6 text-slate-700 leading-relaxed font-sans">
              <p className="text-xs text-slate-500">છેલ્લે અપડેટ કરેલ: જુલાઈ ૧૫, ૨૦૨૬</p>
              <p>
                અમે તમારા અંગત ડેટાની સુરક્ષા અને તમારી ગોપનીયતાનું સન્માન કરીએ છીએ. આ પ્રાઇવસી પોલિસી દસ્તાવેજમાં વિગતવાર દર્શાવવામાં આવ્યું છે કે જ્યારે તમે અમારી એપ્લિકેશનનો ઉપયોગ કરો છો ત્યારે કઈ માહિતી એકત્રિત કરવામાં આવે છે અને તેનો ઉપયોગ કેવી રીતે થાય છે.
              </p>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૧. માહિતી એકત્રીકરણ</h3>
              <p>
                જ્યારે તમે અમારી એપ્લિકેશનમાં લોગઈન કરો છો અથવા ટેસ્ટ આપો છો, ત્યારે અમે નીચે મુજબની ન્યૂનતમ માહિતી એકત્રિત કરીએ છીએ:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>પ્રોફાઇલ માહિતી:</strong> તમારું નામ, ઇમેઇલ એડ્રેસ અને પ્રોફાઇલ પિક્ચર (જ્યારે તમે Google વગેરે સોશિયલ લોગઈનનો ઉપયોગ કરો છો).</li>
                <li><strong>મોબાઈલ નંબર:</strong> વેરિફિકેશન અને એકાઉન્ટ રીકવરી હેતુ માટે (જો લાગુ હોય તો).</li>
                <li><strong>પરીક્ષાનો સ્કોર અને પ્રગતિ:</strong> મોક ટેસ્ટમાં તમારા મેળવેલા ગુણ અને રેન્ક જેથી અમે લીડરબોર્ડ દર્શાવી શકીએ.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૨. માહિતીનો ઉપયોગ</h3>
              <p>
                અમે એકત્રિત કરેલી માહિતીનો ઉપયોગ નીચેના હેતુઓ માટે કરીએ છીએ:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>તમારી પ્રોફાઇલ અને લીડરબોર્ડ રેન્કિંગ મેનેજ કરવા માટે.</li>
                <li>તમને મહત્વપૂર્ણ ભરતી સૂચનાઓ (Notifications) મોકલવા માટે.</li>
                <li>એપ્લિકેશનની કામગીરી અને યુઝર અનુભવને બહેતર બનાવવા માટે.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૩. જાહેરાતો અને કૂકીઝ (Cookies & AdSense)</h3>
              <p>
                અમે આ સાઇટને મફત રાખવા માટે થર્ડ પાર્ટી જાહેરાતો (દા.ત. Google AdSense) નો ઉપયોગ કરીએ છીએ. આ જાહેરાત કંપનીઓ તમારા રુચિ આધારિત જાહેરાતો દર્શાવવા માટે કૂકીઝનો ઉપયોગ કરી શકે છે. તમે તમારા બ્રાઉઝર સેટિંગ્સમાંથી કૂકીઝને અક્ષમ કરી શકો છો.
              </p>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૪. ડેટા સુરક્ષા</h3>
              <p>
                અમે તમારા અંગત ડેટાને અનધિકૃત ઍક્સેસથી બચાવવા માટે માનક સુરક્ષા પગલાંનો ઉપયોગ કરીએ છીએ. અમે ક્યારેય તમારો ડેટા કોઈ ત્રીજી કંપનીને વેચતા કે શેર કરતા નથી.
              </p>
            </div>
          )
        };
      case 'terms':
        return {
          title: 'નિયમો અને શરતો (Terms & Conditions)',
          icon: <FileText className="h-6 w-6 text-amber-600" />,
          content: (
            <div className="space-y-6 text-slate-700 leading-relaxed font-sans">
              <p className="text-xs text-slate-500">છેલ્લે અપડેટ કરેલ: જુલાઈ ૧૫, ૨૦૨૬</p>
              <p>
                આ એપ્લિકેશનનો ઉપયોગ કરીને, તમે આ નિયમો અને શરતોથી બંધાયેલા રહેવા માટે સંમત થાઓ છો. જો તમે આ શરતો સાથે સંમત ન હોવ, તો કૃપા કરીને આ સેવાનો ઉપયોગ કરશો નહીં.
              </p>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૧. સેવાનો ઉપયોગ</h3>
              <p>
                તમે આ એપ્લિકેશનનો ઉપયોગ ફક્ત તમારા વ્યક્તિગત અને બિન-વ્યાવસાયિક શૈક્ષણિક હેતુઓ માટે જ કરી શકો છો. પ્લેટફોર્મના કન્ટેન્ટને અનધિકૃત રીતે કોપી કરવી કે અન્ય કોઈ રીતે દુરુપયોગ કરવો કાયદાકીય ગુનો બને છે.
              </p>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૨. યુઝર એકાઉન્ટ અને આચારસંહિતા</h3>
              <p>
                મોક ટેસ્ટ આપવા અને લીડરબોર્ડમાં ભાગ લેવા માટે સચોટ માહિતી આપવી જરૂરી છે. કોઈપણ પ્રકારની અનૈતિક પદ્ધતિઓનો ઉપયોગ કરી મોક ટેસ્ટમાં વધુ માર્ક્સ મેળવવાનો પ્રયાસ કરનાર યુઝરનું એકાઉન્ટ કોઈપણ પૂર્વ ચેતવણી વિના સસ્પેન્ડ કરવામાં આવશે.
              </p>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૩. બૌદ્ધિક સંપદા અધિકારો (Intellectual Property)</h3>
              <p>
                આ એપ્લિકેશન પર ઉપલબ્ધ તમામ મટીરીયલ, લોગો, ક્વિઝ અને સોફ્ટવેર કોડ અમારી પ્રોપર્ટી છે અને કોપીરાઈટ કાયદા હેઠળ સુરક્ષિત છે.
              </p>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૪. શરતોમાં ફેરફાર</h3>
              <p>
                અમારી પાસે કોઈપણ સમયે આ નિયમો અને શરતો બદલવાનો સંપૂર્ણ અધિકાર અનામત છે. કોઈપણ ફેરફાર અહીં તરત જ પ્રકાશિત કરવામાં આવશે.
              </p>
            </div>
          )
        };
      case 'disclaimer':
        return {
          title: 'ડિસ્ક્લેમર (Disclaimer)',
          icon: <HelpCircle className="h-6 w-6 text-purple-600" />,
          content: (
            <div className="space-y-6 text-slate-700 leading-relaxed font-sans">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg my-4">
                <h4 className="font-bold text-amber-900 mb-1">⚠️ સરકારી સંગઠન સાથે અસંબંધિતતાની જાહેરાત</h4>
                <p className="text-sm text-amber-800">
                  આ એપ્લિકેશન ખાનગી શૈક્ષણિક પ્લેટફોર્મ છે. આ એપ્લિકેશન કોઈ પણ સરકારી વિભાગ, સંગઠન, બોર્ડ કે સત્તાવાર સરકારી સંસ્થા સાથે સીધી કે આડકતરી રીતે સંકળાયેલી નથી.
                </p>
              </div>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૧. માહિતીની સચોટતા</h3>
              <p>
                અમારી એપ્લિકેશન પર મૂકવામાં આવતી ભરતી, પરિણામ, જીએસઈબી પરીક્ષા કે આન્સર કીની તમામ વિગતો સત્તાવાર સરકારી વેબસાઇટ્સ (જેમ કે ojas.gujarat.gov.in, gseb.org, વગેરે) અને સમાચાર માધ્યમોમાંથી એકત્રિત કરવામાં આવે છે. અમે બને એટલી સચોટ માહિતી આપવાનો પ્રયત્ન કરીએ છીએ, તેમ છતાં ઉમેદવારોને વિનંતી કે કોઈ પણ મોટી અરજી કરતાં પહેલાં સંબંધિત વિભાગની અધિકૃત વેબસાઇટની ચકાસણી જરૂર કરી લેવી. માહિતીની કોઈ પણ અસચોટતા માટે અમે જવાબદાર રહીશું નહીં.
              </p>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૨. પરીક્ષાઓ અને પરિણામો</h3>
              <p>
                આ એપ્લિકેશનમાં પૂરી પાડવામાં આવતી મોક ટેસ્ટ માત્ર પ્રેક્ટિસ અને સ્વ-મૂલ્યાંકન માટે છે. તેમાં મેળવેલા પરિણામોને સત્તાવાર બોર્ડ કે ભરતી પરિણામો સાથે કોઈ લેવાદેવા નથી.
              </p>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૩. એક્સટર્નલ લિંક્સ (External Links)</h3>
              <p>
                યુઝર્સની સુવિધા માટે અમે સત્તાવાર સરકારી પરિપત્રો કે જાહેરાતની PDF ફાઇલોની લિંક્સ આપીએ છીએ. આ થર્ડ-પાર્ટી વેબસાઇટ્સના કન્ટેન્ટ કે તેમની નીતિઓ માટે અમે જવાબદાર નથી.
              </p>
            </div>
          )
        };
      case 'refund':
        return {
          title: 'રીફંડ પોલિસી (Refund Policy)',
          icon: <RefreshCw className="h-6 w-6 text-sky-600" />,
          content: (
            <div className="space-y-6 text-slate-700 leading-relaxed font-sans">
              <p className="text-xs text-slate-500">છેલ્લે અપડેટ કરેલ: જુલાઈ ૧存, ૨૦૨૬</p>
              <p>
                અમારી એપ્લિકેશન મુખ્યત્વે તમામ મોક ટેસ્ટ અને ભરતીની માહિતી મફતમાં પ્રદાન કરવા માટે કટિબદ્ધ છે.
              </p>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૧. પ્રીમિયમ ટેસ્ટ સિરીઝ અને ચૂકવણી</h3>
              <p>
                ભવિષ્યમાં જો કોઈ વિશિષ્ટ પ્રીમિયમ ટેસ્ટ સિરીઝ, ઓનલાઇન કોર્સ અથવા વિશિષ્ટ ઈ-પુસ્તક (e-books) માટે યુઝર પેઇડ સબ્સ્ક્રિપ્શન ખરીદે છે, તો નીચે મુજબના નિયમો લાગુ પડશે:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>ડિજિટલ કન્ટેન્ટ:</strong> અમારા તમામ ઉત્પાદનો ડિજિટલ સ્વરૂપે હોવાથી ખરીદી સફળ થયા પછી તેને રદ (Cancel) કરી શકાતી નથી.</li>
                <li><strong>નો-રીફંડ પોલિસી:</strong> એકવાર ખરીદી લીધેલા કોર્સ અથવા સબ્સ્ક્રિપ્શનનું પેમેન્ટ કોઈપણ સંજોગોમાં પરત (Refund) કરવામાં આવશે નહીં.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">૨. ટેકનિકલ સમસ્યાઓના કિસ્સામાં</h3>
              <p>
                જો તમારા બેંક ખાતામાંથી રકમ કપાઈ ગઈ હોય પરંતુ સબ્સ્ક્રિપ્શન એક્ટિવેટ ન થયું હોય, તો ચિંતા કરશો નહીં. તમે પેમેન્ટ પ્રૂફ (ટ્રાન્ઝેક્શન આઈડી અને સ્ક્રીનશોટ) સાથે અમારા સપોર્ટ ઈમેઈલ પર સંપર્ક કરી શકો છો. અમે ૨૪ થી ૪૮ કલાકમાં તમારી સમસ્યાનું નિરાકરણ લાવીશું અને કાં તો સબ્સ્ક્રિપ્શન એક્ટિવ કરીશું અથવા રકમ પરત કરવા જરૂરી સહાય કરીશું.
              </p>
            </div>
          )
        };
    }
  };

  const config = getPageConfig();

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in py-0 sm:py-4 px-0 sm:px-6" id="static-page-container">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-bold px-4 sm:px-0 pt-4 sm:pt-0">
        <button
          onClick={onNavigateHome}
          className="hover:text-blue-600 transition-colors cursor-pointer text-slate-500 uppercase tracking-wide font-extrabold"
        >
          હોમપેજ
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700">{config.title}</span>
      </nav>

      {/* Main Container */}
      <article className="bg-white p-6 md:p-8 space-y-6 border-x-0 sm:border border-gray-150 rounded-none sm:rounded-2xl shadow-none sm:shadow-xs">
        {/* Title Block */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          {config.icon}
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
            {config.title}
          </h1>
        </div>

        {/* Dynamic Content */}
        <div className="prose max-w-none">
          {config.content}
        </div>

        {/* Back Button */}
        <div className="pt-6 border-t border-slate-100">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>પાછા હોમ પેજ પર જાઓ</span>
          </button>
        </div>
      </article>
    </div>
  );
}
