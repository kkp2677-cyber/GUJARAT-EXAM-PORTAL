import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  Heading1, Heading2, Heading3, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Link as LinkIcon, 
  Image as ImageIcon, Eraser, Code, Eye, 
  Palette, Minus, Table
} from 'lucide-react';

interface ClassicEditorProps {
  value: string;
  onChange: (htmlContent: string) => void;
  placeholder?: string;
}

const COLORS = [
  { name: 'Default', value: '#1e293b' }, // slate-800
  { name: 'Vibrant Orange', value: '#ea580c' }, // orange-600
  { name: 'Royal Blue', value: '#2563eb' }, // blue-600
  { name: 'Forest Green', value: '#16a34a' }, // green-600
  { name: 'Crimson Red', value: '#dc2626' }, // red-600
  { name: 'Amethyst Purple', value: '#9333ea' }, // purple-600
  { name: 'Golden Amber', value: '#d97706' }, // amber-600
];

const BG_COLORS = [
  { name: 'No Highlight', value: 'transparent' },
  { name: 'Orange Tint', value: '#ffedd5' }, // orange-100
  { name: 'Blue Tint', value: '#dbeafe' }, // blue-100
  { name: 'Green Tint', value: '#dcfce7' }, // green-100
  { name: 'Yellow Tint', value: '#fef9c3' }, // yellow-100
  { name: 'Red Tint', value: '#fee2e2' }, // red-100
];

export default function ClassicEditor({ value, onChange, placeholder = 'અહીં પોસ્ટ લખવાનું શરૂ કરો...' }: ClassicEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isCodeView, setIsCodeView] = useState(false);
  const [rawHtml, setRawHtml] = useState(value);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showBgColorMenu, setShowBgColorMenu] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Keep track of internal content to prevent cursor resetting on props updates
  const lastHtmlRef = useRef(value);

  // Sync prop value to editor when it changes from outside
  useEffect(() => {
    if (value !== lastHtmlRef.current) {
      lastHtmlRef.current = value;
      setRawHtml(value);
      if (editorRef.current && !isCodeView) {
        editorRef.current.innerHTML = value;
      }
    }
    calculateStats(value);
  }, [value, isCodeView]);

  const calculateStats = (text: string) => {
    // Strip HTML to calculate plain text statistics
    const plainText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    setCharCount(plainText.length);
    setWordCount(plainText === '' ? 0 : plainText.split(' ').length);
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    lastHtmlRef.current = currentHtml;
    setRawHtml(currentHtml);
    onChange(currentHtml);
    calculateStats(currentHtml);
  };

  const handleRawHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setRawHtml(newVal);
    lastHtmlRef.current = newVal;
    onChange(newVal);
    calculateStats(newVal);
  };

  const execCmd = (command: string, arg: string = '') => {
    if (isCodeView) return;
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleEditorInput();
  };

  const insertLink = () => {
    if (isCodeView) return;
    const url = prompt('લિન્ક URL દાખલ કરો (દા.ત. https://gseb.org):');
    if (url) {
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      
      const selection = window.getSelection();
      const selectionText = selection ? selection.toString().trim() : '';
      if (!selectionText) {
        const text = prompt('લિન્કનું નામ (Display text) દાખલ કરો (વૈકલ્પિક):') || finalUrl;
        const linkHtml = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" class="text-orange-600 hover:text-orange-700 font-extrabold underline inline-flex items-center gap-1">${text}</a>`;
        execCmd('insertHTML', linkHtml);
      } else {
        const linkHtml = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" class="text-orange-600 hover:text-orange-700 font-extrabold underline inline-flex items-center gap-1">${selectionText}</a>`;
        execCmd('insertHTML', linkHtml);
      }
    }
  };

  const insertTable = () => {
    if (isCodeView) return;
    const rowsStr = prompt('આડી હરોળ (Rows) ની સંખ્યા દાખલ કરો (દા.ત. ૩):', '3');
    const colsStr = prompt('ઊભી હરોળ (Columns) ની સંખ્યા દાખલ કરો (દા.ત. ૩):', '3');
    const rows = parseInt(rowsStr || '3', 10);
    const cols = parseInt(colsStr || '3', 10);
    if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
      alert('કૃપા કરીને યોગ્ય હરોળ અને કોલમની સંખ્યા દાખલ કરો.');
      return;
    }

    let tableHtml = '<div class="overflow-x-auto my-5"><table class="min-w-full border border-gray-200 text-sm">';
    
    // Table Header
    tableHtml += '<thead><tr class="bg-slate-100 border-b-2 border-gray-200">';
    for (let c = 0; c < cols; c++) {
      tableHtml += `<th class="border border-gray-200 px-4 py-2 font-bold text-slate-800 text-left">મથાળું ${c + 1}</th>`;
    }
    tableHtml += '</tr></thead>';

    // Table Body
    tableHtml += '<tbody class="divide-y divide-gray-200 bg-white">';
    for (let r = 0; r < rows - 1; r++) {
      tableHtml += '<tr class="hover:bg-slate-50/55">';
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td class="border border-gray-200 px-4 py-2 text-slate-700">માહિતી ${r + 1}-${c + 1}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table></div><p><br></p>';

    execCmd('insertHTML', tableHtml);
  };

  const insertImage = () => {
    if (isCodeView) return;
    const url = prompt('ઈમેજ URL દાખલ કરો:');
    if (url) {
      execCmd('insertImage', url);
    }
  };

  const toggleViewMode = () => {
    if (isCodeView) {
      // Switching back to visual mode - load raw HTML into editor
      setIsCodeView(false);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = rawHtml;
          editorRef.current.focus();
        }
      }, 50);
    } else {
      // Switching to raw HTML view
      setIsCodeView(true);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
      
      {/* Editor Toolbar */}
      <div className="bg-slate-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center justify-between select-none">
        
        <div className="flex flex-wrap gap-1 items-center">
          {/* View Mode Toggle */}
          <button
            type="button"
            onClick={toggleViewMode}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border ${
              isCodeView 
                ? 'bg-orange-100 text-orange-700 border-orange-200' 
                : 'bg-white hover:bg-gray-100 text-slate-700 border-gray-200'
            }`}
            title={isCodeView ? 'વિઝ્યુઅલ મોડમાં બદલો' : 'HTML કોડ જુઓ'}
          >
            {isCodeView ? <Eye className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
            <span>{isCodeView ? 'Visual View' : 'HTML Source'}</span>
          </button>

          <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>

          {/* Standard formatting */}
          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('bold')}
            className={`p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors`}
            title="Bold (ઘાટા અક્ષર)"
          >
            <Bold className="h-4 w-4" />
          </button>
          
          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('italic')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="Italic (ત્રાંસા અક્ષર)"
          >
            <Italic className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('underline')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="Underline (નીચે લીટી)"
          >
            <Underline className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('strikeThrough')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="Strikethrough (ચેકો મારો)"
          >
            <Strikethrough className="h-4 w-4" />
          </button>

          <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>

          {/* Headings */}
          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('formatBlock', '<h1>')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="મોટું હેડિંગ H1"
          >
            <Heading1 className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('formatBlock', '<h2>')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="મધ્યમ હેડિંગ H2"
          >
            <Heading2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('formatBlock', '<h3>')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="નાનું હેડિંગ H3"
          >
            <Heading3 className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('formatBlock', '<p>')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors text-xs font-bold"
            title="સામાન્ય ફકરો (Paragraph)"
          >
            P
          </button>

          <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>

          {/* Alignments */}
          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('justifyLeft')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="ડાબે ગોઠવો"
          >
            <AlignLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('justifyCenter')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="મધ્યમાં ગોઠવો"
          >
            <AlignCenter className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('justifyRight')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="જમણે ગોઠવો"
          >
            <AlignRight className="h-4 w-4" />
          </button>

          <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>

          {/* Lists */}
          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('insertUnorderedList')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="બુલેટ યાદી (Unordered List)"
          >
            <List className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('insertOrderedList')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="ક્રમિક યાદી (Ordered List)"
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('formatBlock', '<blockquote>')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="વિચાર કણિકા (Quote block)"
          >
            <Quote className="h-4 w-4" />
          </button>

          <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>

          {/* Insert Tools */}
          <button
            type="button"
            disabled={isCodeView}
            onClick={insertLink}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="વેબસાઇટ લિન્ક ઉમેરો"
          >
            <LinkIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={insertImage}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="ઈમેજ ઉમેરો"
          >
            <ImageIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={insertTable}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="કોષ્ટક (Table) ઉમેરો"
          >
            <Table className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('insertHorizontalRule')}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            title="આડી રેખા (Divider) ઉમેરો"
          >
            <Minus className="h-4 w-4" />
          </button>

          <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>

          {/* Color pickers */}
          <div className="relative">
            <button
              type="button"
              disabled={isCodeView}
              onClick={() => {
                setShowColorMenu(!showColorMenu);
                setShowBgColorMenu(false);
              }}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors flex items-center gap-1"
              title="અક્ષરનો રંગ બદલો"
            >
              <Palette className="h-4 w-4" />
              <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: '#ea580c' }}></span>
            </button>
            {showColorMenu && !isCodeView && (
              <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-30 grid grid-cols-4 gap-2 w-48">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      execCmd('foreColor', c.value);
                      setShowColorMenu(false);
                    }}
                    className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    <span className="sr-only">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              disabled={isCodeView}
              onClick={() => {
                setShowBgColorMenu(!showBgColorMenu);
                setShowColorMenu(false);
              }}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-gray-200 disabled:opacity-40 transition-colors flex items-center gap-1"
              title="બેકગ્રાઉન્ડ હાઇલાઇટ કલર"
            >
              <span className="font-bold text-xs bg-yellow-200 px-1 rounded">Text Highlight</span>
            </button>
            {showBgColorMenu && !isCodeView && (
              <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-30 space-y-2 w-48">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Highlight Text</p>
                <div className="grid grid-cols-3 gap-2">
                  {BG_COLORS.map((bg) => (
                    <button
                      key={bg.value}
                      type="button"
                      onClick={() => {
                        execCmd('backColor', bg.value);
                        setShowBgColorMenu(false);
                      }}
                      className="h-8 rounded border border-gray-200 transition-transform hover:scale-105"
                      style={{ backgroundColor: bg.value }}
                      title={bg.name}
                    >
                      <span className="text-[10px] text-slate-800">Aa</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>

          {/* Clean format */}
          <button
            type="button"
            disabled={isCodeView}
            onClick={() => execCmd('removeFormat')}
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
            title="બધી ફોર્મેટિંગ દૂર કરો"
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* Editor Space */}
      <div className="relative flex-1 min-h-[300px] flex flex-col">
        {isCodeView ? (
          <textarea
            value={rawHtml}
            onChange={handleRawHtmlChange}
            className="w-full flex-1 p-4 font-mono text-sm text-slate-800 bg-slate-900 text-teal-300 outline-none min-h-[320px] resize-y"
            placeholder="<html>..."
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            className="w-full flex-1 p-6 text-slate-800 outline-none prose max-w-none min-h-[320px] bg-white overflow-y-auto"
            style={{ minHeight: '320px' }}
            placeholder={placeholder}
          />
        )}
        
        {/* Placeholder overlay for contenteditable */}
        {!isCodeView && rawHtml.replace(/<[^>]*>/g, '').trim() === '' && (
          <div className="absolute top-6 left-6 text-gray-400 pointer-events-none text-sm select-none">
            {placeholder}
          </div>
        )}
      </div>

      {/* Editor Status Bar */}
      <div className="bg-slate-50 border-t border-gray-200 px-4 py-2 flex justify-between items-center text-xs text-slate-500 font-mono">
        <div className="flex gap-4">
          <span>અક્ષરો: <strong>{charCount}</strong></span>
          <span>શબ્દો: <strong>{wordCount}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-orange-600 font-semibold uppercase tracking-wider text-[10px]">
          <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
          <span>{isCodeView ? 'Source Mode' : 'Classic Rich Visual Editor'}</span>
        </div>
      </div>

      {/* Styling Help Popover */}
      {!isCodeView && (
        <div className="p-3 bg-orange-50/50 border-t border-gray-100 text-xs text-orange-800 flex gap-1.5 items-start">
          <span className="text-sm">💡</span>
          <p className="leading-relaxed">
            <strong>ક્લાસિક એડિટર ગાઇડ:</strong> લખાણ પસંદ (select) કરી ઉપરના બોલ્ડ (<Bold className="inline h-3 w-3" />), ઇટાલિક અથવા હેડિંગ્સ બટનો દ્વારા તેને અતિ આકર્ષક રીતે સજાવી શકો છો. લિન્ક ઉમેરવા માટે લખાણ સિલેક્ટ કરી લિન્ક (<LinkIcon className="inline h-3 w-3" />) બટન દબાવો.
          </p>
        </div>
      )}

    </div>
  );
}
