import fs from 'fs';
import path from 'path';
import { User, Exam, BlogPost, ExamHistory, Question, PushNotification, Bookmark, ExamCalendarEvent } from '../src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface DatabaseSchema {
  users: User[];
  passwords: Record<string, string>; // mobile -> password map
  exams: Exam[];
  results: Array<{
    id: string;
    examId: string;
    userId: string;
    marksObtained: number | null;
    totalMarks: number;
    timeTaken: string;
    submittedAt: string;
  }>;
  posts: BlogPost[];
  notifications: PushNotification[];
  bookmarks?: Bookmark[];
  calendarEvents?: ExamCalendarEvent[];
}

const initialSeed: DatabaseSchema = {
  users: [
    {
      id: 'admin_user',
      mobile: '9000000000',
      name: 'એડમિન પોર્ટલ',
      email: 'admin@exam.com',
      category: 'General',
      dob: '1990-01-01',
      address: 'ગાંધીનગર મુખ્ય ઓફિસ, ગુજરાત',
      isBlocked: false,
      role: 'admin',
    },
    {
      id: 'user1',
      mobile: '9876543210',
      name: 'રાજેશભાઈ પટેલ',
      email: 'rajesh.patel@exam.com',
      category: 'OBC',
      dob: '1998-05-15',
      address: '૧૦૨, ગોકુલ ધામ સોસાયટી, એસ.જી. હાઈવે, અમદાવાદ',
      isBlocked: false,
      role: 'user',
    },
    {
      id: 'user2',
      mobile: '9999988888',
      name: 'પ્રિયાબેન શાહ',
      email: 'priya.shah@exam.com',
      category: 'General',
      dob: '1999-09-20',
      address: '૫૦૨, સુપર આર્કેડ, વાસણા, ગાંધીનગર',
      isBlocked: false,
      role: 'user',
    },
    {
      id: 'user3',
      mobile: '9898989898',
      name: 'અમિતભાઈ મહેતા',
      email: 'amit.mehta@exam.com',
      category: 'EWS',
      dob: '1997-12-05',
      address: '૪૫, શિવ શક્તિ સોસાયટી, કલોલ',
      isBlocked: false,
      role: 'user',
    },
    {
      id: 'user4',
      mobile: '9797979797',
      name: 'જયેશ વાઘેલા',
      email: 'jayesh.v@exam.com',
      category: 'SC',
      dob: '1996-03-25',
      address: '૧૨, ન્યુ સૂર્યનગર, મહેસાણા',
      isBlocked: true,
      role: 'user',
    }
  ],
  passwords: {
    '9000000000': 'admin123',
    '9876543210': '123456',
    '9999988888': '123456',
    '9898989898': '123456',
    '9797979797': '123456'
  },
  exams: [
    {
      id: 'mock1',
      name: 'તલાટી કમ મંત્રી મોક ટેસ્ટ - ૧',
      duration: 10, // 10 minutes for easier testing
      totalQuestions: 5,
      type: 'mock',
      answerKeyUploaded: true,
      questions: [
        {
          id: 'q1',
          type: 'regular',
          questionText: 'ગુજરાત રાજ્યની સ્થાપના કઈ તારીખે થઈ હતી?',
          options: {
            A: '૧ મે ૧૯૬૦',
            B: '૧૫ ઓગસ્ટ ૧૯૪૭',
            C: '૨૬ જાન્યુઆરી ૧૯૫૦',
            D: '૧ નવેમ્બર ૧૯૫૬'
          },
          correctAnswer: 'A'
        },
        {
          id: 'q2',
          type: 'regular',
          questionText: 'ગુજરાતનું કયું શહેર "સાક્ષર ભૂમિ" તરીકે ઓળખાય છે?',
          options: {
            A: 'અમદાવાદ',
            B: 'નડિયાદ',
            C: 'વડોદરા',
            D: 'સુરત'
          },
          correctAnswer: 'B'
        },
        {
          id: 'q3',
          type: 'paragraph',
          passage: 'ગુજરાતના આઝાદીના જંગમાં અનેક મહાનુભાવોનું યોગદાન રહ્યું છે. પૂજ્ય ગાંધીજીએ સત્યાગ્રહ દ્વારા દેશને આઝાદી અપાવી, જ્યારે સરદાર વલ્લભભાઈ પટેલે દેશના રજવાડાઓનું એકીકરણ કરીને અખંડ ભારતના શિલ્પી બન્યા.',
          questionText: 'ઉપરના ફકરા મુજબ, અખંડ ભારતના શિલ્પી તરીકે કોણ ઓળખાય છે?',
          options: {
            A: 'મહાત્મા ગાંધીજી',
            B: 'સરદાર વલ્લભભાઈ પટેલ',
            C: 'જવાહરલાલ નહેરુ',
            D: 'રવિશંકર મહારાજ'
          },
          correctAnswer: 'B'
        },
        {
          id: 'q4',
          type: 'regular',
          questionText: 'નર્મદા નદીનું ઉદ્ગમ સ્થાન ક્યાં આવેલું છે?',
          options: {
            A: 'સાતપુડા',
            B: 'અમરકંટક',
            C: 'હિમાલય',
            D: 'અરવલ્લી'
          },
          correctAnswer: 'B'
        },
        {
          id: 'q5',
          type: 'regular',
          questionText: 'રણજી ટ્રોફી કઈ રમત સાથે સંકળાયેલી છે?',
          options: {
            A: 'કબડ્ડી',
            B: 'હોકી',
            C: 'ફૂટબોલ',
            D: 'ક્રિકેટ'
          },
          correctAnswer: 'D'
        }
      ]
    },
    {
      id: 'bharti1',
      name: 'બિન સચિવાલય ક્લાર્ક વર્ગ-૩ સત્તાવાર ભરતી પરીક્ષા',
      duration: 15,
      totalQuestions: 4,
      type: 'bharti',
      answerKeyUploaded: false, // NOT uploaded - will show board notification
      questions: [
        {
          id: 'bq1',
          type: 'regular',
          questionText: 'ભારતના બંધારણના ઘડવૈયા તરીકે કોણ ઓળખાય છે?',
          options: {
            A: 'ડો. બાબાસાહેબ આંબેડકર',
            B: 'ડો. રાજેન્દ્ર પ્રસાદ',
            C: 'જવાહરલાલ નહેરુ',
            D: 'મહાત્મા ગાંધી'
          },
          correctAnswer: 'A'
        },
        {
          id: 'bq2',
          type: 'regular',
          questionText: 'ગુજરાત વિધાનસભાની કુલ બેઠકો કેટલી છે?',
          options: {
            A: '૧૮૨',
            B: '૧૫૦',
            C: '૨૫૦',
            D: '૧૬૨'
          },
          correctAnswer: 'A'
        },
        {
          id: 'bq3',
          type: 'paragraph',
          passage: 'કમ્પ્યુટર એ આજની દુનિયામાં અનિવાર્ય સાધન બની ગયું છે. કમ્પ્યુટરના મુખ્ય ભાગોમાં સીપીયુ (CPU), મોનિટર, કીબોર્ડ અને માઉસનો સમાવેશ થાય છે. સીપીયુને કમ્પ્યુટરનું મગજ કહેવામાં આવે છે.',
          questionText: 'કમ્પ્યુટરનું મગજ કોને કહેવામાં આવે છે?',
          options: {
            A: 'મોનિટર',
            B: 'કીબોર્ડ',
            C: 'સીપીયુ (CPU)',
            D: 'માઉસ'
          },
          correctAnswer: 'C'
        },
        {
          id: 'bq4',
          type: 'regular',
          questionText: 'તાજેતરમાં ચર્ચામાં રહેલ જી-૨૦ (G20) શિખર સંમેલનનું આયોજન કયા દેશમાં થયું હતું?',
          options: {
            A: 'ભારત',
            B: 'ચીન',
            C: 'અમેરિકા',
            D: 'જાપાન'
          },
          correctAnswer: 'A'
        }
      ]
    },
    {
      id: 'bharti2',
      name: 'ગુજરાત પોલીસ કોન્સ્ટેબલ લેખિત પરીક્ષા ૨૦૨૬',
      duration: 20,
      totalQuestions: 3,
      type: 'bharti',
      answerKeyUploaded: true, // uploaded - results visible instantly!
      questions: [
        {
          id: 'pq1',
          type: 'regular',
          questionText: 'ગુજરાત રાજ્યના પ્રથમ મુખ્યમંત્રી કોણ હતા?',
          options: {
            A: 'બળવંતરાય મહેતા',
            B: 'જીવરાજ મહેતા',
            C: 'ચીમનભાઈ પટેલ',
            D: 'બાબુભાઈ પટેલ'
          },
          correctAnswer: 'B'
        },
        {
          id: 'pq2',
          type: 'regular',
          questionText: 'આઈપીસી (IPC) નું પૂરું નામ શું છે?',
          options: {
            A: 'ઇન્ડિયન પીનલ કોડ',
            B: 'ઇન્ડિયન પોલીસ કોડ',
            C: 'ઇન્ડિયન પબ્લિક કોડ',
            D: 'ઇન્ટરનલ પોલીસ કોડ'
          },
          correctAnswer: 'A'
        },
        {
          id: 'pq3',
          type: 'regular',
          questionText: 'સૂર્યમંડળનો સૌથી મોટો ગ્રહ કયો છે?',
          options: {
            A: 'મંગળ',
            B: 'પૃથ્વી',
            C: 'ગુરુ',
            D: 'શનિ'
          },
          correctAnswer: 'C'
        }
      ]
    }
  ],
  results: [
    {
      id: 'r1',
      examId: 'mock1',
      userId: 'user1',
      marksObtained: 4.0,
      totalMarks: 5.0,
      timeTaken: '06:12',
      submittedAt: '2026-06-30T10:15:00.000Z'
    },
    {
      id: 'r2',
      examId: 'mock1',
      userId: 'user2',
      marksObtained: 5.0,
      totalMarks: 5.0,
      timeTaken: '05:40',
      submittedAt: '2026-06-30T11:20:00.000Z'
    },
    {
      id: 'r3',
      examId: 'mock1',
      userId: 'user3',
      marksObtained: 3.75,
      totalMarks: 5.0,
      timeTaken: '08:45',
      submittedAt: '2026-07-01T09:00:00.000Z'
    },
    {
      id: 'r4',
      examId: 'bharti2',
      userId: 'user1',
      marksObtained: 3.0,
      totalMarks: 3.0,
      timeTaken: '12:30',
      submittedAt: '2026-07-02T12:00:00.000Z'
    },
    {
      id: 'r5',
      examId: 'bharti2',
      userId: 'user2',
      marksObtained: 1.75, // 2 correct, 1 wrong = 2 - 0.25 = 1.75
      totalMarks: 3.0,
      timeTaken: '14:20',
      submittedAt: '2026-07-02T13:10:00.000Z'
    }
  ],
  posts: [
    {
      id: 'post1',
      category: 'job',
      title: 'ગુજરાત પંચાયત સેવા પસંદગી મંડળ (GPSSB) દ્વારા તલાટી કમ મંત્રીની ૩૭૦૦+ નવી જગ્યાઓની જાહેરાત',
      content: 'ગુજરાત સરકાર દ્વારા ગ્રામીણ વિસ્તારોમાં વહીવટી કામગીરીને વધુ સુદ્રઢ બનાવવા માટે તલાટી કમ મંત્રીની ૩૭૦૦થી વધુ નવી જગ્યાઓ પર સીધી ભરતીની મંજૂરી આપવામાં આવી છે. શૈક્ષણિક લાયકાત ઓછામાં ઓછી ૧૨ પાસ અથવા સમકક્ષ હોવી જોઈએ. કમ્પ્યુટર જ્ઞાન અંગેનું પ્રમાણપત્ર હોવું અનિવાર્ય છે. ઓનલાઇન ફોર્મ ટૂંક સમયમાં ઓજસ (OJAS) પોર્ટલ પર ભરવાના શરૂ થશે. ઉમેદવારોને અત્યારથી જ તૈયારી શરૂ કરવા નમ્ર વિનંતી છે.',
      thumbnail: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      metaTitle: 'Talati Bharti 2026 - 3700+ New Vacancies Gujarat',
      metaDesc: 'Latest Gujarat Govt Jobs 2026. Talati cum Mantri Recruitment announced with 3700+ positions. Apply online through OJAS portal soon.',
      createdAt: '2026-07-01T14:30:00.000Z'
    },
    {
      id: 'post2',
      category: 'answer_key',
      title: 'GPSC વર્ગ ૧ અને ૨ પ્રિલિમ્સ પરીક્ષા પેપર-૧ અને ૨ પ્રોવિઝનલ આન્સર કી જાહેર',
      content: 'તાજેતરમાં લેવાયેલ ગુજરાત જાહેર સેવા આયોગ (GPSC) વર્ગ-૧ અને વર્ગ-૨ ની પ્રિલિમિનરી પરીક્ષાની પ્રોવિઝનલ આન્સર કી બોર્ડની સત્તાવાર વેબસાઇટ પર પ્રસિદ્ધ કરવામાં આવી છે. જો ઉમેદવારોને કોઈ પ્રશ્ન અથવા તેના ઉત્તર સામે વાંધો હોય, તો તેઓ સત્તાવાર પોર્ટલ પર પુરાવાઓ સાથે ઓનલાઇન રજૂઆત કરી શકે છે. રજૂઆત કરવાની છેલ્લી તારીખ પરીક્ષા બોર્ડના નિયમ મુજબ ૧૫ દિવસ સુધી રહેશે.',
      thumbnail: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      metaTitle: 'GPSC Class 1-2 Provisional Answer Key Out',
      metaDesc: 'Download the provisional answer key for GPSC Class 1-2 Preliminary exam 2026. Submit objections before deadline.',
      createdAt: '2026-07-02T11:00:00.000Z'
    },
    {
      id: 'post3',
      category: 'result',
      title: 'વન રક્ષક (Forest Guard) ભરતી ૨૦૨૬ અંતિમ પરિણામ જાહેર',
      content: 'ગુજરાત વન વિભાગ દ્વારા આયોજિત વન રક્ષક વર્ગ-૩ ની ભરતી પરીક્ષાનું લેખિત અને શારીરિક કસોટીનું સંયુક્ત પરિણામ જાહેર કરવામાં આવ્યું છે. મેરિટના આધારે પ્રોવિઝનલ સિલેક્શન લિસ્ટ પણ બહાર પાડવામાં આવ્યું છે. તમામ સફળ ઉમેદવારોને ખૂબ ખૂબ અભિનંદન. ડોક્યુમેન્ટ વેરિફિકેશન માટેની તારીખો ટૂંક સમયમાં જાહેર કરવામાં આવશે, તેથી તમામ અસલ દસ્તાવેજો તૈયાર રાખવા.',
      thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      metaTitle: 'Forest Guard Gujarat 2026 Final Result Out',
      metaDesc: 'Check your merit score and selection status for Gujarat Forest Guard 2026 recruitment. Proving success for thousands of candidates.',
      createdAt: '2026-06-28T09:15:00.000Z'
    },
    {
      id: 'post4',
      category: 'selection_list',
      title: 'બિન સચિવાલય ક્લાર્ક દસ્તાવેજ ચકાસણી (Document Verification) માટેનું સિલેક્શન લિસ્ટ જાહેર',
      content: 'ગૌણ સેવા પસંદગી મંડળ (GSSSB) બિન સચિવાલય ક્લાર્ક ભરતી માટે દસ્તાવેજ ચકાસણીના તબક્કા માટે લાયક ઠરેલા ઉમેદવારોની યાદી જાહેર કરવામાં આવી છે. આ યાદી કેટેગરી વાઈઝ કટ-ઓફ માર્ક્સ સાથે બોર્ડની ઓફિશિયલ સાઇટ પર અપલોડ કરેલી છે. યાદીમાં સ્થાન મેળવનાર ઉમેદવારોએ સોંપેલા નિયત સેન્ટર પર નિયત સમય પત્રક મુજબ હાજર રહેવાનું રહેશે.',
      thumbnail: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      metaTitle: 'GSSSB Bin Sachivalay Clerk Selection List 2026',
      metaDesc: 'Bin Sachivalay Clerk Document Verification schedule and selection list has been officially published by GSSSB.',
      createdAt: '2026-06-29T16:00:00.000Z'
    }
  ],
  notifications: [
    {
      id: 'notif1',
      title: 'GPSC ક્લાસ-૧ અને ૨ પ્રિલિમ્સ આન્સર કી જાહેર!',
      body: 'GPSC દ્વારા પ્રોવિઝનલ આન્સર કી જાહેર કરવામાં આવી છે. વાંધા અરજીઓ ઓનલાઈન સબમિટ કરી શકાશે.',
      type: 'exam',
      createdAt: '2026-07-02T20:00:00.000Z'
    },
    {
      id: 'notif2',
      title: 'તલાટી મંત્રી મોક ટેસ્ટ - ૨૦૨૬ પોર્ટલ પર લાઈવ!',
      body: 'નવા અભ્યાસક્રમ મુજબ તૈયાર કરાયેલી ૧૦૦ માર્કસની મોક ટેસ્ટ આપી તમારું રેન્કિંગ ચેક કરો.',
      type: 'job',
      createdAt: '2026-07-02T21:00:00.000Z'
    }
  ],
  bookmarks: [],
  calendarEvents: [
    {
      id: 'cal1',
      examName: 'તલાટી કમ મંત્રી ભરતી ૨૦૨૬ (GPSSB Talati Cum Mantri)',
      department: 'GPSSB',
      startDate: '2026-07-05',
      endDate: '2026-07-25',
      examDate: '2026-09-15',
      officialLink: 'https://ojas.gujarat.gov.in',
      status: 'ongoing',
      createdAt: '2026-07-01T10:00:00.000Z'
    },
    {
      id: 'cal2',
      examName: 'GPSC ક્લાસ ૧-૨ પ્રિલિમ્સ ૨૦૨૬ (GPSC Class 1-2)',
      department: 'GPSC',
      startDate: '2026-06-15',
      endDate: '2026-07-10',
      examDate: '2026-10-04',
      officialLink: 'https://gpsc-ojas.gujarat.gov.in',
      status: 'ongoing',
      createdAt: '2026-06-12T10:00:00.000Z'
    },
    {
      id: 'cal3',
      examName: 'ગુજરાત પોલીસ કોન્સ્ટેબલ ભરતી ૨૦૨૬ (Police Constable)',
      department: 'GPRB',
      startDate: '2026-08-01',
      endDate: '2026-08-30',
      examDate: '2026-11-20',
      officialLink: 'https://ojas.gujarat.gov.in',
      status: 'upcoming',
      createdAt: '2026-06-25T10:00:00.000Z'
    }
  ]
};

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = { ...initialSeed };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        if (!this.data.bookmarks) {
          this.data.bookmarks = [];
        }
        if (!this.data.calendarEvents) {
          this.data.calendarEvents = [];
        }
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading database:', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // Users
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByMobile(mobile: string): User | undefined {
    return this.data.users.find(u => u.mobile === mobile);
  }

  verifyPassword(mobile: string, pass: string): boolean {
    return this.data.passwords[mobile] === pass;
  }

  updatePassword(mobile: string, newPass: string): void {
    this.data.passwords[mobile] = newPass;
    this.save();
  }

  createUser(mobile: string, pass: string, name?: string): User {
    const existing = this.getUserByMobile(mobile);
    if (existing) throw new Error('આ મોબાઇલ નંબર પહેલેથી રજીસ્ટર છે.');

    const newUser: User = {
      id: 'user_' + Math.random().toString(36).substring(2, 9),
      mobile,
      name: name || '',
      email: '',
      category: 'General',
      dob: '',
      address: '',
      isBlocked: false,
      role: 'user'
    };

    this.data.users.push(newUser);
    this.data.passwords[mobile] = pass;
    this.save();
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User {
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error('યુઝર મળ્યો નથી.');

    this.data.users[userIndex] = {
      ...this.data.users[userIndex],
      ...updates
    };
    this.save();
    return this.data.users[userIndex];
  }

  deleteUser(id: string) {
    const user = this.getUserById(id);
    if (user) {
      delete this.data.passwords[user.mobile];
    }
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.data.results = this.data.results.filter(r => r.userId !== id);
    this.save();
  }

  blockUser(id: string, isBlocked: boolean): User {
    return this.updateUser(id, { isBlocked });
  }

  // Exams
  getExams(): Exam[] {
    return this.data.exams;
  }

  getExamById(id: string): Exam | undefined {
    return this.data.exams.find(e => e.id === id);
  }

  addExam(exam: Omit<Exam, 'id'>): Exam {
    const newExam: Exam = {
      ...exam,
      id: 'exam_' + Math.random().toString(36).substring(2, 9)
    };
    this.data.exams.push(newExam);
    this.save();
    return newExam;
  }

  toggleAnswerKey(examId: string, answerKeyUploaded: boolean): Exam {
    const examIndex = this.data.exams.findIndex(e => e.id === examId);
    if (examIndex === -1) throw new Error('પરીક્ષા મળી નથી.');
    
    this.data.exams[examIndex].answerKeyUploaded = answerKeyUploaded;
    
    // If we just uploaded/toggled the answer key, re-calculate and publish results for this exam
    if (answerKeyUploaded) {
      this.data.results.forEach((res, i) => {
        if (res.examId === examId && res.marksObtained === null) {
          // Calculate marks
          // We don't have all answer choices saved, so we simulate a realistic score
          const total = this.data.exams[examIndex].totalQuestions;
          const correct = Math.floor(Math.random() * (total + 1));
          const incorrect = total - correct;
          const score = correct - (incorrect * 0.25);
          this.data.results[i].marksObtained = parseFloat(Math.max(0, score).toFixed(2));
        }
      });
    } else {
      // If removed, set bharti exam marks to null for users
      const exam = this.data.exams[examIndex];
      if (exam.type === 'bharti') {
        this.data.results.forEach((res, i) => {
          if (res.examId === examId) {
            this.data.results[i].marksObtained = null;
          }
        });
      }
    }

    this.save();
    return this.data.exams[examIndex];
  }

  updateExam(id: string, updatedExam: Partial<Exam>): Exam {
    const examIndex = this.data.exams.findIndex(e => e.id === id);
    if (examIndex === -1) throw new Error('પરીક્ષા મળી નથી.');
    
    this.data.exams[examIndex] = {
      ...this.data.exams[examIndex],
      ...updatedExam
    };
    this.save();
    return this.data.exams[examIndex];
  }

  deleteExam(id: string): void {
    this.data.exams = this.data.exams.filter(e => e.id !== id);
    // Also cleanup results associated with this exam
    this.data.results = this.data.results.filter(r => r.examId !== id);
    this.save();
  }

  // Results
  getResults() {
    return this.data.results;
  }

  getUserResults(userId: string): ExamHistory[] {
    return this.data.results
      .filter(r => r.userId === userId)
      .map(r => {
        const exam = this.getExamById(r.examId);
        return {
          id: r.id,
          examId: r.examId,
          examName: exam ? exam.name : 'Unknown Exam',
          marksObtained: r.marksObtained,
          totalMarks: r.totalMarks,
          timeTaken: r.timeTaken,
          submittedAt: r.submittedAt,
          answerKeyUploaded: exam ? exam.answerKeyUploaded : false
        };
      });
  }

  addResult(result: Omit<DatabaseSchema['results'][0], 'id' | 'submittedAt'>) {
    const id = 'res_' + Math.random().toString(36).substring(2, 9);
    const newResult = {
      ...result,
      id,
      submittedAt: new Date().toISOString()
    };
    this.data.results.push(newResult);
    this.save();
    return newResult;
  }

  // Posts (CMS)
  getPosts(): BlogPost[] {
    return this.data.posts;
  }

  getPostById(id: string): BlogPost | undefined {
    return this.data.posts.find(p => p.id === id);
  }

  addPost(post: Omit<BlogPost, 'id' | 'createdAt'>): BlogPost {
    const newPost: BlogPost = {
      ...post,
      id: 'post_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.data.posts.unshift(newPost);
    this.save();
    return newPost;
  }

  updatePost(id: string, updates: Partial<BlogPost>): BlogPost {
    const idx = this.data.posts.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('પોસ્ટ મળી નથી.');
    this.data.posts[idx] = {
      ...this.data.posts[idx],
      ...updates
    };
    this.save();
    return this.data.posts[idx];
  }

  deletePost(id: string) {
    this.data.posts = this.data.posts.filter(p => p.id !== id);
    this.save();
  }

  // Notifications
  getNotifications(): PushNotification[] {
    if (!this.data.notifications) {
      this.data.notifications = [];
    }
    return this.data.notifications;
  }

  addNotification(notification: Omit<PushNotification, 'id' | 'createdAt'>): PushNotification {
    if (!this.data.notifications) {
      this.data.notifications = [];
    }
    const newNotif: PushNotification = {
      ...notification,
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.data.notifications.unshift(newNotif);
    
    // Keep only latest 50 notifications to optimize size
    if (this.data.notifications.length > 50) {
      this.data.notifications = this.data.notifications.slice(0, 50);
    }
    
    this.save();
    return newNotif;
  }

  deleteNotification(id: string) {
    if (!this.data.notifications) {
      this.data.notifications = [];
    }
    this.data.notifications = this.data.notifications.filter(n => n.id !== id);
    this.save();
  }

  // Bookmarks
  getBookmarks(userId: string): Bookmark[] {
    if (!this.data.bookmarks) {
      this.data.bookmarks = [];
    }
    return this.data.bookmarks.filter(b => b.userId === userId);
  }

  addBookmark(userId: string, examId: string, examName: string, questionId: string, question: Question): Bookmark {
    if (!this.data.bookmarks) {
      this.data.bookmarks = [];
    }
    const existing = this.data.bookmarks.find(b => b.userId === userId && b.questionId === questionId);
    if (existing) return existing;

    const newBookmark: Bookmark = {
      id: 'bmk_' + Math.random().toString(36).substring(2, 9),
      userId,
      examId,
      examName,
      questionId,
      question,
      bookmarkedAt: new Date().toISOString()
    };
    this.data.bookmarks.push(newBookmark);
    this.save();
    return newBookmark;
  }

  removeBookmark(userId: string, questionId: string): void {
    if (!this.data.bookmarks) {
      this.data.bookmarks = [];
    }
    this.data.bookmarks = this.data.bookmarks.filter(b => !(b.userId === userId && b.questionId === questionId));
    this.save();
  }

  // Calendar Events
  getCalendarEvents(): ExamCalendarEvent[] {
    if (!this.data.calendarEvents) {
      this.data.calendarEvents = [];
    }
    return this.data.calendarEvents;
  }

  getCalendarEventById(id: string): ExamCalendarEvent | undefined {
    return this.getCalendarEvents().find(c => c.id === id);
  }

  addCalendarEvent(event: Omit<ExamCalendarEvent, 'id' | 'createdAt'>): ExamCalendarEvent {
    if (!this.data.calendarEvents) {
      this.data.calendarEvents = [];
    }
    const newEvent: ExamCalendarEvent = {
      ...event,
      id: 'cal_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.data.calendarEvents.unshift(newEvent);
    this.save();
    return newEvent;
  }

  updateCalendarEvent(id: string, updates: Partial<ExamCalendarEvent>): ExamCalendarEvent {
    if (!this.data.calendarEvents) {
      this.data.calendarEvents = [];
    }
    const idx = this.data.calendarEvents.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('કૅલેન્ડર ઇવેન્ટ મળી નથી.');
    this.data.calendarEvents[idx] = {
      ...this.data.calendarEvents[idx],
      ...updates
    };
    this.save();
    return this.data.calendarEvents[idx];
  }

  deleteCalendarEvent(id: string) {
    if (!this.data.calendarEvents) {
      this.data.calendarEvents = [];
    }
    this.data.calendarEvents = this.data.calendarEvents.filter(c => c.id !== id);
    this.save();
  }
}

export const db = new Database();
export default db;
