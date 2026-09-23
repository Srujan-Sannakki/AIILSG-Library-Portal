import { useState, useEffect, useRef, useCallback } from 'react';
import SecureReader from './components/SecureReader';
import { createPortal } from 'react-dom';
import * as API from './api'; 
import { 
  Shield, User, Lock, BookOpen, LogOut, 
  AlertTriangle, CheckCircle, Search, Eye, 
  ChevronLeft, ChevronRight, X, PlusCircle, Save,
  Settings, Key, EyeOff, RefreshCw, Upload, FileText, 
  Trash2, Bell, Activity, Users, Library, Moon, Sun, Flag, HelpCircle, Info,
  MessageSquare, CheckSquare, Download, Power, AlertOctagon, Database,
  ZoomIn, ZoomOut, Loader, Calendar, FileSpreadsheet, Book, Filter,
  UserPlus, UserMinus, ShieldAlert, MapPin, Phone, Mail, ArrowRight
} from 'lucide-react';



// --- DATE VALIDITY CHECKER ---
const isAccessValid = (user) => {
  if (!user.validFrom || !user.validUntil) return false;
  const today = new Date().toISOString().slice(0,10);
  return today >= user.validFrom && today <= user.validUntil;
};

// --- LOGO COMPONENT ---
const Logo = ({ className, fallbackIcon: FallbackIcon = Shield }) => {
  const [error, setError] = useState(false);
  const logoSrc = "https://www.worldmayorsforum.com/wp-content/uploads/2022/01/revised-logo.webp"; 

  if (error) {
    return <FallbackIcon className={className} />;
  }

  return (
    <img 
      src={logoSrc} 
      alt="AIILSG Logo" 
      className={`object-contain ${className}`}
      onError={() => setError(true)}
    />
  );
};

// --- SPLASH SCREEN COMPONENT ---
const SplashScreen = ({ exiting }) => {
  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900 overflow-hidden font-sans select-none transition-transform duration-[1000ms] ease-[cubic-bezier(0.7,0,0.3,1)] ${exiting ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-950 z-0"></div>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-transparent to-transparent"></div>
        
        <div className={`relative z-10 flex flex-col items-center transition-opacity duration-500 ${exiting ? 'opacity-0' : 'opacity-100'}`}>
            <div className="mb-6 relative animate-[fadeInUp_0.8s_ease-out_forwards]">
                <div className="relative bg-white/10 p-6 rounded-full border border-white/10 shadow-2xl backdrop-blur-sm">
                   <Logo className="w-24 h-24 object-contain" fallbackIcon={Shield} />
                </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white tracking-wide mb-3 animate-[fadeInUp_1s_ease-out_forwards] opacity-0" style={{animationDelay: '0.2s'}}>
                AIILSG
            </h1>
            <div className="h-1 w-16 bg-blue-500 rounded-full mb-6 animate-[expandWidth_1.2s_ease-out_forwards]"></div>
            <p className="text-slate-400 text-sm font-medium tracking-[0.2em] uppercase animate-[fadeIn_1.5s_ease-out_forwards] opacity-0" style={{animationDelay: '0.4s'}}>
                Official Learning Portal
            </p>
        </div>
    </div>
  );
};

// --- FOOTER COMPONENT ---
const Footer = ({ className = "text-slate-500" }) => (
  <footer className={`py-6 px-8 text-xs w-full ${className}`}>
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-end gap-4">
      <div className="text-center md:text-left">
        <p className="font-bold text-slate-600">© {new Date().getFullYear()} ALL INDIA INSTITUTE OF LOCAL SELF-GOVERNMENT</p>
        <p className="mt-1 opacity-70">Empowering Local Governance Excellence</p>
      </div>
      <div className="text-center md:text-right flex flex-col gap-1 opacity-70 hover:opacity-100 transition-opacity">
        <p>Created by <span className="font-semibold text-blue-600">S Srujan</span></p>
        <p>Guided by <span className="font-semibold text-blue-600">Mr. Thosar</span> (Librarian)</p>
      </div>
    </div>
  </footer>
);

// ==========================================
// 1. MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [view, setView] = useState('login'); 
  const [currentUser, setCurrentUser] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null); 
  const [splashState, setSplashState] = useState('visible'); 
    
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [reports, setReports] = useState([]); 
  const [visitors, setVisitors] = useState([]); 
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pages, setPages] = useState({});
  const generation = useRef(0);
    
  const [settings, setSettings] = useState({
    announcement: 'Welcome to the new academic session.',
    watermarkText: 'CONFIDENTIAL - DO NOT SHARE',
    adminNote: '',
    maintenanceMode: false
  });

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setSplashState('exiting'), 3000);
    const removeTimer = setTimeout(() => setSplashState('hidden'), 4000);
    return () => { clearTimeout(exitTimer); clearTimeout(removeTimer); };
  }, []);

  const clearSession = useCallback(() => {
    generation.current += 1;
    setSettings({announcement:'Welcome to the library.',watermarkText:'AIILSG',maintenanceMode:false,adminNote:''});
    API.setToken(null);
    setCurrentUser(null); setCurrentAdmin(null); setView('login');
    setUsers([]); setBooks([]); setAdmins([]); setInventory([]);
    setTransactions([]); setVisitors([]); setReports([]); setLogs([]); setPages({});
    setLoading(false);
  }, []);
  const acceptAccount = useCallback(account => {
    if (account.role === 'student') { setCurrentUser(account); setCurrentAdmin(null); setView('student'); }
    else { setCurrentAdmin(account); setCurrentUser(null); setView('admin'); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    const expired = () => { clearSession(); setLoadError('Your session expired. Please log in again.'); };
    window.addEventListener('auth-expired', expired);
    if (API.getToken()) API.me().then(({data}) => { if (!cancelled) acceptAccount(data); }).catch(e => { if (!cancelled) setLoadError(API.errorMessage(e)); });
    return () => { cancelled = true; window.removeEventListener('auth-expired', expired); };
  }, [acceptAccount, clearSession]);

  const accountId = currentUser?._id || currentAdmin?._id;
  const accountRole = currentUser?.role || currentAdmin?.role;
  const loadData = useCallback(async () => {
    if (!accountId) return;
    const run = ++generation.current;
    setLoading(true); setLoadError('');
    const lists = { books: [API.fetchBooks, setBooks] };
    if (accountRole !== 'student') Object.assign(lists, { users: [API.fetchUsers, setUsers], inventory: [API.fetchInventory, setInventory], transactions: [API.fetchTransactions, setTransactions], visitors: [API.fetchVisitors, setVisitors], reports: [API.fetchReports, setReports] });
    if (accountRole === 'super_admin') Object.assign(lists, { admins: [API.fetchAdmins, setAdmins], logs: [API.fetchLogs, setLogs] });
    try {
      const [settingsResponse, meResponse] = await Promise.all([API.fetchSettings(), API.me()]);
      const responses = await Promise.all(Object.entries(lists).map(async ([key, [fetcher, setter]]) => ({ key, setter, data: (await fetcher({limit:50,offset:0})).data })));
      if (run !== generation.current) return;
      setSettings(settingsResponse.data);
      if (accountRole === 'student') setCurrentUser(meResponse.data);
      const nextPages = {};
      for (const {key,setter,data} of responses) { setter(data.items); nextPages[key] = {offset:data.items.length,total:data.total}; }
      setPages(nextPages);
    } catch (e) { if (run === generation.current) setLoadError(API.errorMessage(e)); }
    finally { if (run === generation.current) setLoading(false); }
  }, [accountId, accountRole]);
  useEffect(() => { loadData(); return () => { generation.current += 1; }; }, [loadData]);
  const loadMore = async () => {
    const run = generation.current;
    const lists = { books:[API.fetchBooks,setBooks], users:[API.fetchUsers,setUsers], inventory:[API.fetchInventory,setInventory], transactions:[API.fetchTransactions,setTransactions], visitors:[API.fetchVisitors,setVisitors], reports:[API.fetchReports,setReports], admins:[API.fetchAdmins,setAdmins], logs:[API.fetchLogs,setLogs] };
    setLoading(true);
    try {
      for (const [key, state] of Object.entries(pages)) {
        if (state.offset >= state.total) continue;
        const [fetcher,setter] = lists[key];
        const {data} = await fetcher({offset:state.offset,limit:50});
        if (run !== generation.current) return;
        setter(previous => [...new Map([...previous,...data.items].map(item=>[item._id,item])).values()]);
        setPages(previous => ({...previous,[key]:{offset:state.offset+data.items.length,total:data.total}}));
      }
    } catch(e) { setLoadError(API.errorMessage(e)); }
    finally { if (run === generation.current) setLoading(false); }
  };
  // Mutations are audited by the backend. Refresh the read-only audit view after success.
  const addLog = async () => {
    if (accountRole === 'super_admin') {
      try { const {data}=await API.fetchLogs({limit:50}); setLogs(data.items); } catch { /* Main action already succeeded. */ }
    }
  };
  const handleReportIssue = async (_userId, context, issue) => {
    try { const {data}=await API.createReport({context,issue}); setReports(prev=>[data,...prev]); alert('Report submitted.'); }
    catch(e) { alert(API.errorMessage(e)); }
  };
  const updateReport = async (id, field, value) => {
    try { const {data}=await API.updateReport(id,{[field]:value}); setReports(prev=>prev.map(r=>r.id===id?data:r)); }
    catch(e) { alert(API.errorMessage(e)); }
  };
  const toggleReportStatus = id => {
    const report=reports.find(r=>r.id===id);
    if(report) return updateReport(id,'status',report.status==='Pending'?'Resolved':'Pending');
  };
  const handleLogin = async (id, password) => {
    if (!id || !password) return setLoadError('Enter your ID and password.');
    setLoading(true); setLoadError('');
    try { const {data}=await API.login({id,password}); API.setToken(data.token); acceptAccount(data.user); }
    catch(e) { setLoadError(API.errorMessage(e)); }
    finally { setLoading(false); }
  };
  const logout = async () => {
    try { await API.logout(); clearSession(); }
    catch(e) { alert(API.errorMessage(e)); }
  };
  const changePassword = async (id, newPassword, currentPassword) => {
    try { await API.changePassword(id,{newPassword,currentPassword}); clearSession(); alert('Password changed. Please log in again.'); return true; }
    catch(e) { alert(API.errorMessage(e)); return false; }
  };

  return (
    <div className={`min-h-screen font-sans select-none transition-colors duration-500 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* SPLASH SCREEN */}
      {splashState !== 'hidden' && <SplashScreen exiting={splashState === 'exiting'} />}

      {/* LOADING OVERLAY */}
      {loading && splashState === 'hidden' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="flex flex-col items-center">
                  <Loader className="w-10 h-10 text-blue-600 animate-spin mb-4"/>
                  <p className="text-slate-600 font-bold animate-pulse">Connecting to Database...</p>
              </div>
          </div>
      )}

      {loadError && <div role="alert" className="relative z-40 p-4 bg-red-50 text-red-800 border-b">{loadError} {accountId && <button className="underline ml-3" onClick={loadData}>Retry</button>}</div>}
      {accountId && <div className="p-3 bg-blue-50 text-blue-900 text-sm flex flex-wrap justify-center gap-4">
        <button onClick={loadData} disabled={loading} className="underline">Refresh records</button>
        {Object.values(pages).some(p=>p.offset<p.total) && <><span>More records are available. Exports include loaded records only.</span><button onClick={loadMore} disabled={loading} className="font-bold underline">Load more records</button></>}
      </div>}
      {/* MAIN APP CONTAINER */}
      <div 
        className={`h-full w-full transition-all duration-[1000ms] ease-[cubic-bezier(0.7,0,0.3,1)] ${splashState === 'visible' ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        {view === 'login' && 
          <div className="animate-[fadeIn_0.5s_ease-out_forwards]">
              <LoginScreen 
              onLogin={handleLogin} 

              maintenanceMode={settings.maintenanceMode} 
              onEnquiry={API.createEnquiry}
              />
          </div>
        }
        
        {view === 'admin' && 
          <div className="animate-[slideUpFade_0.5s_ease-out_forwards]">
              <AdminPanel 
              currentAdmin={currentAdmin}
              admins={admins} setAdmins={setAdmins} 
              users={users} setUsers={setUsers} 
              books={books} setBooks={setBooks} 
              inventory={inventory} setInventory={setInventory}
              transactions={transactions} setTransactions={setTransactions}
              logs={logs} addLog={addLog} setLogs={setLogs}
              reports={reports} toggleReportStatus={toggleReportStatus}
              updateReport={updateReport}
              visitors={visitors} setVisitors={setVisitors} 
              settings={settings} setSettings={setSettings}
              onLogout={logout} 
              />
          </div>
        }
        
        {view === 'student' && 
          <div className="animate-[slideUpFade_0.5s_ease-out_forwards]">
              <StudentPortal 
              user={currentUser} 
              allBooks={books} 
              settings={settings}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              onLogout={logout} 
              onChangePassword={changePassword}
              onReportIssue={handleReportIssue}
              />
          </div>
        }
      </div>

      {/* Global CSS for custom animations */}
      <style>{`
          @keyframes slideUpFade {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes expandWidth {
            from { width: 0; opacity: 0; }
            to { width: 4rem; opacity: 1; }
          }
          
          /* Custom Scrollbar */
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(100, 116, 139, 0.3); border-radius: 20px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(100, 116, 139, 0.5); }
      `}</style>
    </div>
  );
}

// ==========================================
// 2. LOGIN SCREEN
// ==========================================
function LoginScreen({ onLogin, maintenanceMode, onEnquiry }) {
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);

  
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryData, setEnquiryData] = useState({ 
    date: new Date().toISOString().split('T')[0],
    name: '', 
    phone: '', 
    purpose: '', 
    message: '' 
  });

  const handleEnquirySubmit = async () => {
    if(!enquiryData.name || !enquiryData.phone || !enquiryData.message || !enquiryData.purpose) return alert("Please fill all fields");
    try { await onEnquiry(enquiryData); } catch(e) { alert(API.errorMessage(e)); return; }
    alert("Enquiry sent successfully! Admin will contact you.");
    setShowEnquiry(false);
    setEnquiryData({ 
      date: new Date().toISOString().split('T')[0],
      name: '', 
      phone: '', 
      purpose: '', 
      message: '' 
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-40">
         <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"></div>
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white via-transparent to-slate-100"></div>
      </div>

      <div className="bg-white p-10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] w-full max-w-md relative z-10 border border-slate-100 animate-[scaleIn_0.4s_ease-out_forwards]">
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 flex items-center justify-center mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Logo className="w-full h-full object-contain" fallbackIcon={isResetMode ? RefreshCw : Shield} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isResetMode ? "Reset Password" : "AIILSG Portal"}
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            {isResetMode ? "Contact your librarian to verify your identity and reset your password." : "Authorized Access Only"}
          </p>
        </div>

        {maintenanceMode && (
          <div className="bg-red-50 border border-red-100 p-4 mb-8 rounded-lg animate-pulse">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-bold">System Maintenance Enabled</p>
                <p className="text-xs text-red-600 mt-1">Student login is disabled. Admins can still login.</p>
              </div>
            </div>
          </div>
        )}
        
        {isResetMode ? (
          <div className="space-y-5"><p className="text-sm text-slate-600">A Student ID alone cannot verify your identity. Your librarian can help recover access.</p><button onClick={() => setIsResetMode(false)} className="w-full text-blue-700 py-3">Back to Login</button></div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">ID / Admin User</label>
              <input type="text" value={id} onChange={e => setId(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-300 font-medium text-slate-700" placeholder="e.g. 122010620230039" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Password</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-300 font-medium text-slate-700" placeholder="••••••" />
            </div>
            <div className="flex justify-end -mt-1">
              <button onClick={() => setIsResetMode(true)} className="text-xs text-blue-600 font-bold hover:text-blue-800 transition-colors">Forgot Password?</button>
            </div>
            <button onClick={() => onLogin(id, pass)} className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-bold text-sm shadow-md transition-all duration-200">
              Authenticate & Login
            </button>
            

          </div>
        )}
      </div>

      {!isResetMode && (
        <button 
          onClick={() => setShowEnquiry(true)} 
          className="fixed bottom-8 right-8 bg-blue-700 text-white p-4 rounded-full shadow-lg hover:bg-blue-800 hover:scale-105 transition-all z-50 flex items-center space-x-3 group animate-[slideUpFade_0.7s_ease-out_forwards] border border-blue-600"
        >
           <MessageSquare className="w-5 h-5"/> 
           <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap font-bold pl-0 group-hover:pl-1 text-sm">New Enquiry</span>
        </button>
      )}

      <div className="absolute bottom-0 left-0 w-full pointer-events-none">
        <Footer className="text-slate-400 bg-transparent border-none" />
      </div>

      {showEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative transform transition-all animate-[scaleIn_0.3s_ease-out_forwards] border border-slate-100">
             <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
                <h3 className="font-bold flex items-center text-lg"><MessageSquare className="w-5 h-5 mr-3 text-blue-400"/> New Enquiry</h3>
                <button onClick={() => setShowEnquiry(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5"/></button>
             </div>
             <div className="p-8 space-y-5">
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Date</label>
                   <input type="date" value={enquiryData.date} onChange={e => setEnquiryData({...enquiryData, date: e.target.value})} className="w-full border border-slate-200 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700" />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Your Name</label>
                   <input type="text" value={enquiryData.name} onChange={e => setEnquiryData({...enquiryData, name: e.target.value})} className="w-full border border-slate-200 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700" placeholder="Full Name"/>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Mobile Number</label>
                   <input type="tel" value={enquiryData.phone} onChange={e => setEnquiryData({...enquiryData, phone: e.target.value})} className="w-full border border-slate-200 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700" placeholder="10 Digit Mobile"/>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Purpose</label>
                   <input type="text" value={enquiryData.purpose} onChange={e => setEnquiryData({...enquiryData, purpose: e.target.value})} className="w-full border border-slate-200 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700" placeholder="e.g. Admission, General Enquiry"/>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Query / Message</label>
                   <textarea rows="4" value={enquiryData.message} onChange={e => setEnquiryData({...enquiryData, message: e.target.value})} className="w-full border border-slate-200 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700" placeholder="Enter your enquiry details..."/>
                </div>
                <button onClick={handleEnquirySubmit} className="w-full bg-blue-700 text-white font-bold py-3 rounded-lg hover:bg-blue-800 flex items-center justify-center transition-all shadow-md mt-2">
                   <Save className="w-4 h-4 mr-2"/> Submit Enquiry
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. ADMIN PANEL
// ==========================================
function AdminPanel({ 
  currentAdmin, admins, setAdmins, users, setUsers, 
  books, setBooks, inventory, setInventory, transactions, setTransactions,
  logs, addLog, reports, toggleReportStatus, updateReport,
  visitors, setVisitors, settings, setSettings, onLogout 
}) {
  const isSuperAdmin = currentAdmin?.role === 'super_admin';
  const defaultTab = isSuperAdmin ? 'users' : 'visitors';
  const [activeTab, setActiveTab] = useState(defaultTab); 
  const [reportSubTab, setReportSubTab] = useState('users');
  
  const [viewYear, setViewYear] = useState(new Date().getFullYear().toString());
  const [visitorRepType, setVisitorRepType] = useState('daily');
  const [visitorRepDate, setVisitorRepDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitorRepMonth, setVisitorRepMonth] = useState(new Date().toISOString().slice(0, 7));
  const [visitorRepYear, setVisitorRepYear] = useState(new Date().getFullYear().toString());
  const [newAdmin, setNewAdmin] = useState({ id: '', password: '', name: '', role: 'limited_admin' });
  const [newVisitor, setNewVisitor] = useState({
    date: new Date().toISOString().split('T')[0],
    sid: '', name: '', course: '', purpose: '', timeIn: '', timeOut: '', phone: '', feedback: '',
    officerName: currentAdmin.name, designation: currentAdmin.role === 'super_admin' ? 'Administrator' : 'Librarian'
  });
  const [accessModalBook, setAccessModalBook] = useState(null);
  const [newUser, setNewUser] = useState({ 
    id: '', name: '', password: '', totalFee: 10000,
    admissionCycle: 'June', admissionYear: new Date().getFullYear().toString(),
    phone: '', course: '', center: '', dob: '', medium: 'English'
  });
  
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookPages, setNewBookPages] = useState('');
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // NEW STATES FOR STOCK MODULE
  const [newStock, setNewStock] = useState({itemId:'',name:'',type:'Book',price:0,openingStock:0,minStock:10});
  const [savingStock,setSavingStock] = useState(false);
  const addStock = async event => {
    event.preventDefault(); if(savingStock) return; setSavingStock(true);
    try { const {data}=await API.createInventory(newStock); setInventory(prev=>[data,...prev]); setNewStock({itemId:'',name:'',type:'Book',price:0,openingStock:0,minStock:10}); addLog(); }
    catch(e) { alert(API.errorMessage(e)); } finally { setSavingStock(false); }
  };
  const [stockSearch, setStockSearch] = useState('');
  const [showTransModal, setShowTransModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(null); // stores item ID
  const [transSearch, setTransSearch] = useState(''); // NEW STATE FOR TRANSACTION SEARCH INPUT

  const [transForm, setTransForm] = useState({
    date: new Date().toISOString().split('T')[0],
    itemId: '',
    type: 'ISSUE', // or RECEIPT
    quantity: 1,
    particular: ''
  });

  // HELPER: Calculate current stock dynamically
  const getStockStats = (itemId) => {
    const item = inventory.find(i => i.itemId === itemId || i.id === itemId); 
    if (!item) return { current: 0, value: 0, totalIn: 0, totalOut: 0 };
    
    const itemTrans = transactions.filter(t => t.itemId === itemId);
    const totalIn = itemTrans.filter(t => t.type === 'RECEIPT').reduce((acc, t) => acc + Number(t.quantity), 0);
    const totalOut = itemTrans.filter(t => t.type === 'ISSUE').reduce((acc, t) => acc + Number(t.quantity), 0);
    
    const current = item.currentStock ?? 0;
    return { 
      current, 
      value: current * (item.price || 0),
      totalIn: item.totalIn ?? totalIn,
      totalOut: item.totalOut ?? totalOut
    };
  };

  // ACTION: Handle New Transaction
  const handleTransaction = async () => {
    if(!transForm.itemId || !transForm.quantity || !transForm.particular) return alert("Fill all fields");
    
    const stats = getStockStats(transForm.itemId);
    if(transForm.type === 'ISSUE' && stats.current < transForm.quantity) {
      return alert('Insufficient stock. Refresh records if stock was recently received.');
    }

    try {
        const { data } = await API.createTransaction({
            ...transForm,
            quantity: Number(transForm.quantity)
        });
        
        setTransactions(prev => [data, ...prev]);
        setInventory(prev=>prev.map(item=>item.itemId===data.inventory.itemId?data.inventory:item));
        addLog('Stock Transaction', `${transForm.type} - ${transForm.quantity} items`);
        setShowTransModal(false);
        setTransForm({ ...transForm, quantity: 1, particular: '', itemId: '' }); 
        setTransSearch('');
    } catch (error) {
        alert("Failed to save transaction: " + error.message);
    }
  };

  // --- NEW DOWNLOAD FUNCTIONS ---
  const downloadMasterStock = () => {
    const headers = ["Item ID", "Item Name", "Type", "Price", "Opening Stock", "Total Receipts", "Total Issued", "Closing Stock", "Stock Value"];
    const rows = inventory.map(item => {
      const stats = getStockStats(item.itemId);
      return [
        item.itemId,
        `"${item.name}"`, 
        item.type,
        item.price,
        item.openingStock,
        stats.totalIn,
        stats.totalOut,
        stats.current,
        stats.value
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8,%EF%BB%BF" 
      + encodeURIComponent(headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n"));
      
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `Master_Stock_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog('Export', 'Downloaded Master Stock Register');
  };

  const downloadItemLedger = (itemId) => {
    const item = inventory.find(i => i.itemId === itemId);
    if(!item) return;
    
    const headers = ["Date", "Particulars", "Receipt", "Issued", "Balance", "User"];
    const itemTrans = transactions.filter(t => t.itemId === itemId).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    let runningBalance = item.openingStock || 0;
    const rows = [];
    
    rows.push(["-", "Opening Balance", "-", "-", runningBalance, "-"]);
    
    itemTrans.forEach(t => {
      if(t.type === 'RECEIPT') runningBalance += t.quantity;
      else runningBalance -= t.quantity;
      
      rows.push([
        t.date,
        `"${t.particular}"`,
        t.type === 'RECEIPT' ? t.quantity : 0,
        t.type === 'ISSUE' ? t.quantity : 0,
        runningBalance,
        t.user
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8,%EF%BB%BF" 
      + encodeURIComponent(headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n"));
      
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `Ledger_${item.name.replace(/[^a-z0-9]/gi, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog('Export', `Downloaded Ledger for ${item.name}`);
  };

  const handleAddAdmin = async () => {
    if(!newAdmin.id || !newAdmin.password || !newAdmin.name) return alert("Fill all fields");
    if(admins.some(a => a.id === newAdmin.id)) return alert("Admin ID exists");
    
    try {
      const { data } = await API.createAdmin(newAdmin);
      setAdmins(prev => [...prev, data]);
      addLog('System', `New admin added: ${newAdmin.id}`);
      setNewAdmin({ id: '', password: '', name: '', role: 'limited_admin' });
      alert("Admin added successfully!");
    } catch (error) {
      alert("Failed to add admin: " + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if(adminId === currentAdmin.id || adminId === currentAdmin.sid) return alert("Cannot delete yourself.");
    if(!confirm(`Delete admin ${adminId}?`)) return;
    
    try {
      await API.deleteAdmin(adminId);
      setAdmins(prev => prev.filter(a => a.id !== adminId));
      addLog('System', `Admin deleted: ${adminId}`);
    } catch (error) {
      alert("Failed to delete admin: " + (error.response?.data?.error || error.message));
    }
  };

  const pendingAccess = useRef(new Set());
  const replaceUser = data => setUsers(previous => previous.map(u => u._id === data._id ? data : u));
  const updateUserFee = async (userId, value) => {
    try { const {data}=await API.updateFees(userId,{paidAmount:Number(value)}); replaceUser(data); addLog(); return true; }
    catch(e) { alert(API.errorMessage(e)); return false; }
  };
  const toggleAccess = async (userId, bookId) => {
    const user = users.find(u => u.sid === userId || u._id === userId);
    if(!user || pendingAccess.current.has(userId)) return;
    pendingAccess.current.add(userId);
    const access=user.access.includes(bookId)?user.access.filter(id=>id!==bookId):[...user.access,bookId];
    try { const {data}=await API.updatePermissions(userId,{access}); replaceUser(data); addLog(); }
    catch(e) { alert(API.errorMessage(e)); }
    finally { pendingAccess.current.delete(userId); }
  };

  const addUser = async () => {
    if (!newUser.id || !newUser.name || !newUser.phone) return alert("Please enter SID, Name and Phone.");
    if (newUser.id.length !== 15) return alert("SID must be exactly 15 digits.");
    
    let vFrom, vUntil, batchStr;
    const year = parseInt(newUser.admissionYear);
    
    if (newUser.admissionCycle === 'January') {
        vFrom = `${year}-01-01`;
        vUntil = `${year}-12-31`;
        batchStr = `Jan ${year} - Dec ${year}`;
    } else {
        vFrom = `${year}-06-01`;
        vUntil = `${year + 1}-05-31`;
        batchStr = `June ${year} - May ${year + 1}`;
    }

    const userToAdd = {
      sid:newUser.id,name:newUser.name,password:newUser.password,phone:newUser.phone,
      totalFee:Number(newUser.totalFee),paidAmount:0,access:[],validFrom:vFrom,validUntil:vUntil,academicYear:batchStr,
      ...(newUser.course?{course:newUser.course}:{}),...(newUser.center?{center:newUser.center}:{}),
      ...(newUser.medium?{medium:newUser.medium}:{}),...(newUser.dob?{dob:newUser.dob}:{})
    };

    try {
        const { data } = await API.createUser(userToAdd);
        setUsers(prev => [...prev, data]);
        addLog('Create User', `Created ${newUser.name} (${newUser.id})`);
        
        setNewUser({ 
            id: '', name: '', password: '', totalFee: 10000,
            admissionCycle: 'June',
            admissionYear: new Date().getFullYear().toString(),
            phone: '', course: '', center: '', dob: '', medium: 'English'
        });
        alert("User registered successfully!");
    } catch (error) {
        alert("Failed to register user: " + error.message);
    }
  };

  const exportUsers = () => {
    const headers = ["SID", "Name", "Phone", "DOB", "Course", "Medium", "Center", "Batch (Academic Year)", "Total Fee", "Paid Amount"];
    const rows = users.map(u => [
      u.sid || u.id, u.name, u.phone, u.dob, u.course, u.medium, u.center, u.academicYear, u.totalFee, u.paidAmount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Student_Database_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    addLog('Export', 'Downloaded User Database');
  };

  const deleteUser = async userId => {
    if (!window.confirm(`Delete user ${userId}?`)) return;
    try { await API.deleteUser(userId); setUsers(prev=>prev.filter(u=>u.sid!==userId && u._id!==userId)); addLog(); }
    catch(e) { alert(API.errorMessage(e)); }
  };
  const adminResetPass = async userId => {
    const newPassword=prompt('Enter a new password (12–72 characters):');
    if (!newPassword) return;
    try { await API.resetPassword(userId,newPassword); alert('Password reset and all existing sessions revoked.'); addLog(); }
    catch(e) { alert(API.errorMessage(e)); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setNewBookTitle(file.name.replace('.pdf', ''));
  };

  const addBook = async () => {
    if (!newBookTitle || !fileInputRef.current?.files[0]) return alert("Please enter details.");
    
    const file = fileInputRef.current?.files[0];
    const formData = new FormData();
    formData.append('title', newBookTitle);
    formData.append('totalPages', newBookPages);
    formData.append('customId', `b${Date.now()}`);

    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert("File too large. Max 20MB allowed.");
        return;
      }
      formData.append('pdf', file);
    }

    setIsUploading(true);
    try {
        const { data } = await API.addBook(formData);
        setBooks(prev => [...prev, data]);
        addLog('Add Book', `Uploaded "${newBookTitle}"`);
        
        setNewBookTitle('');
        setNewBookPages('');
        if (fileInputRef.current) fileInputRef.current.value = "";
        alert("Book added successfully!");
    } catch (err) {
        alert("Error saving file: " + err.message);
    } finally {
        setIsUploading(false);
    }
  };

  const deleteBook = async (bookId, title) => {
    if (window.confirm(`Delete book "${title}"?`)) {
      try { await API.deleteBook(bookId); setBooks(prev => prev.filter(b => b.customId !== bookId)); } catch(e) { alert(API.errorMessage(e)); return; }
      addLog('Delete Book', `Deleted book "${title}"`);
    }
  };

  const addVisitor = async () => {
    if (!newVisitor.name || !newVisitor.purpose) return alert("Please enter Name and Purpose.");
    
    try {
        const { data } = await API.createVisitor(newVisitor);
        setVisitors(prev => [data, ...prev]);
        setNewVisitor({
            date: new Date().toISOString().split('T')[0],
            sid: '',
            name: '',
            course: '',
            purpose: '',
            timeIn: '',
            timeOut: '',
            phone: '',
            feedback: '',
            officerName: currentAdmin.name,
            designation: currentAdmin.role === 'super_admin' ? 'Administrator' : 'Librarian'
        });
        addLog('Visitor Log', `Added visitor ${newVisitor.name}`);
    } catch (error) {
        alert("Failed to log visitor: " + error.message);
    }
  };

  const downloadVisitorLog = () => {
    const headers = ["Date", "SID", "Name", "Course", "Purpose", "Time In", "Time Out", "Phone", "Feedback", "Officer Name", "Designation"];
    const rows = [];
    visitors.forEach(v => {
      const vDate = new Date(v.date);
      let match = false;
      if (visitorRepType === 'daily') {
         match = v.date === visitorRepDate;
      } else if (visitorRepType === 'monthly') {
         const m = new Date(visitorRepMonth);
         match = vDate.getMonth() === m.getMonth() && vDate.getFullYear() === m.getFullYear();
      } else {
         match = vDate.getFullYear() === parseInt(visitorRepYear);
      }
      if (match) {
        rows.push([v.date, v.sid, v.name, v.course, v.purpose, v.timeIn, v.timeOut, v.phone, v.feedback, v.officerName, v.designation]);
      }
    });
    if (rows.length === 0) return alert("No records found.");
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Visitor_Log_${visitorRepType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const updateSetting = async (key, value) => {
    try {
      await API.updateSettings({ [key]: value });
      setSettings(prev => ({ ...prev, [key]: value }));
      addLog('System Setting', `Updated ${key}`);
    } catch (error) {
      alert("Failed to update setting: " + (error.response?.data?.error || error.message));
    }
  };

  const updateAnnouncement = async () => {
    const msg = prompt("Enter new announcement:", settings.announcement);
    if (msg !== null) {
      await updateSetting('announcement', msg);
    }
  };

  const filteredUsers = users.filter(u => u.academicYear && u.academicYear.includes(viewYear));
  const userReports = reports.filter(r => r.context !== 'Public Enquiry');
  const publicReports = reports.filter(r => r.context === 'Public Enquiry');
  const displayedReports = reportSubTab === 'users' ? userReports : publicReports;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <nav className="bg-white text-slate-800 shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h2 className="font-bold text-lg flex items-center">
              <Shield className={`mr-2 ${isSuperAdmin ? 'text-blue-600' : 'text-green-600'}`}/> 
              <div className="flex flex-col leading-none">
                 <span>{isSuperAdmin ? 'Admin Console' : 'Librarian Console'}</span>
                 {!isSuperAdmin && <span className="text-[10px] uppercase font-bold text-slate-400">Restricted Access</span>}
              </div>
            </h2>
            <div className="flex space-x-1 overflow-x-auto no-scrollbar">
              {isSuperAdmin && (
                <>
                  <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'users' ? 'bg-slate-100 text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Users & Fees</button>
                  <button onClick={() => setActiveTab('library')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'library' ? 'bg-slate-100 text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Digital Library</button>
                </>
              )}

              <button onClick={() => setActiveTab('visitors')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'visitors' ? 'bg-slate-100 text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Library Visitors</button>
              <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'reports' ? 'bg-slate-100 text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Reports</button>
              
              {isSuperAdmin && (
                <>
                  <button onClick={() => setActiveTab('physical_library')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'physical_library' ? 'bg-slate-100 text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Book Stocks</button>
                  <button onClick={() => setActiveTab('system')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'system' ? 'bg-slate-100 text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>System & Admins</button>
                </>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full hidden md:block text-slate-600 border border-slate-200 font-medium">
                 {currentAdmin.name} 
                 <span className="ml-1 opacity-50">({isSuperAdmin ? 'Full' : 'Limited'})</span>
              </span>
              <button aria-label="Log out" onClick={onLogout} className="text-xs bg-white text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded font-bold transition-all">LOGOUT</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8 w-full flex-grow animate-[fadeIn_0.5s_ease-out]">
        
        {/* --- 1. USERS & FEES TAB --- */}
        {activeTab === 'users' && isSuperAdmin && (
          <div className="space-y-6 animate-[slideUpFade_0.4s_ease-out]">
            {/* CREATE USER BOX */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center border-b pb-2">
                <PlusCircle className="w-5 h-5 mr-2 text-green-600" /> Register New Student
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">SID (15 Digits)</label>
                  <input type="text" value={newUser.id} onChange={e => setNewUser({...newUser, id: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="1220106202300XX" maxLength={15} />
                </div>
                <div className="md:col-span-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Full Name</label>
                  <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Surname Firstname Middle" />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Mobile Number</label>
                  <input type="tel" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="10 Digits" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Date of Birth</label>
                  <input type="date" value={newUser.dob} onChange={e => setNewUser({...newUser, dob: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Course</label>
                  <input type="text" value={newUser.course} onChange={e => setNewUser({...newUser, course: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Enter Course Name" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Medium</label>
                  <select value={newUser.medium} onChange={e => setNewUser({...newUser, medium: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                    <option value="English">English</option>
                    <option value="Marathi">Marathi</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Admission Cycle</label>
                  <select value={newUser.admissionCycle} onChange={e => setNewUser({...newUser, admissionCycle: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                    <option value="January">January Cycle</option>
                    <option value="June">June Cycle</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Adm. Year</label>
                  <input type="number" value={newUser.admissionYear} onChange={e => setNewUser({...newUser, admissionYear: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="2025" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Center</label>
                  <input type="text" value={newUser.center} onChange={e => setNewUser({...newUser, center: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Pune" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Total Fee</label>
                  <input type="number" value={newUser.totalFee} onChange={e => setNewUser({...newUser, totalFee: Number(e.target.value)})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                
                <div className="md:col-span-4"><label className="block text-xs font-bold">Initial password (12–72 characters)<input aria-label="Initial student password" type="password" minLength={12} maxLength={72} value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} className="block w-full border p-2 rounded" /></label></div>
                <div className="md:col-span-12 mt-2">
                  <button onClick={addUser} className="w-full bg-slate-800 text-white p-2.5 rounded font-bold hover:bg-slate-700 flex items-center justify-center text-sm shadow-sm transition-all hover:scale-[1.01]">
                    <Save className="w-4 h-4 mr-2" /> Save User (Auto-Generates Valid Dates)
                  </button>
                </div>
              </div>
            </div>

            {/* FILTER & LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center space-x-4">
                    <h3 className="font-bold text-slate-800">Student Database</h3>
                    <button onClick={exportUsers} className="text-xs flex items-center bg-white border border-slate-300 px-3 py-1 rounded hover:bg-slate-50 text-slate-600 font-bold transition-all hover:shadow-sm">
                      <Download className="w-3 h-3 mr-1" /> Export CSV
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-500 uppercase">Filter Year</span>
                      <select value={viewYear} onChange={e => setViewYear(e.target.value)} className="text-sm border rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer">
                          <option value="2024">2024</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                      </select>
                  </div>
               </div>
              <table className="w-full text-left">
                <thead className="bg-white text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100 tracking-wider">
                  <tr>
                    <th className="p-4 w-1/4">Details</th>
                    <th className="p-4 w-1/4">Fee Status</th>
                    <th className="p-4 w-1/3">Book Access</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredUsers.length > 0 ? filteredUsers.map((user, index) => {
                    const percent = Math.round(user.totalFee === 0 ? 100 : Math.max(0, Math.min(100, (user.paidAmount / user.totalFee) * 100)));
                    return (
                      <tr key={user._id || user.id} className="hover:bg-slate-50 transition-colors group animate-[slideUpFade_0.3s_ease-out_forwards]" style={{animationDelay: `${index * 50}ms`, opacity: 0}}>
                        <td className="p-4 align-top">
                          <div className="font-bold text-slate-800 text-sm">{user.name}</div>
                          <div className="font-mono text-slate-500 text-xs bg-slate-100 inline-block px-1.5 rounded mt-1">{user.sid || user.id}</div>
                          <div className="text-[10px] text-slate-500 mt-2 space-x-1">
                             <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{user.academicYear}</span>
                             <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">{user.course} ({user.medium})</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center">
                            <span className="mr-2">📞 {user.phone}</span>
                            <span>📍 {user.center}</span>
                          </div>
                        </td>
                        <td className="p-4 align-top">
                          <div className="flex items-center space-x-2 mb-1">
                             <span className="font-bold text-slate-400">₹</span>
                             <input type="number" key={user.paidAmount} defaultValue={user.paidAmount} aria-label={`Paid amount for ${user.name}`} onBlur={async (e) => { const input=e.currentTarget; if (Number(input.value) !== user.paidAmount && !await updateUserFee(user.sid, input.value)) input.value=user.paidAmount; }} className="w-20 border border-slate-200 p-1 rounded font-bold text-slate-800 focus:border-blue-500 outline-none text-right bg-white text-xs" />
                             <span className="text-xs text-slate-400">/ {user.totalFee}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1">
                             <div className={`h-full ${percent === 100 ? 'bg-green-500' : 'bg-orange-500'}`} style={{width: `${percent}%`}}></div>
                          </div>
                          <div className="text-[10px] font-bold text-right text-slate-400">{percent}% Paid</div>
                        </td>
                        <td className="p-4 align-top">
                          <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                             {books.map(book => (
                               <label key={book.id || book.customId} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-100 rounded transition-colors group/book">
                                 <input type="checkbox" checked={user.access.includes(book.id || book.customId)} onChange={() => toggleAccess(user.id || user.sid, book.id || book.customId)} className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300" />
                                 <span className="text-xs text-slate-600 group-hover/book:text-slate-900 truncate max-w-[200px]" title={book.title}>{book.title}</span>
                               </label>
                             ))}
                          </div>
                        </td>
                        <td className="p-4 align-top text-right space-y-2">
                          <button onClick={() => adminResetPass(user.id || user.sid)} className="block w-full text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-2 py-1 rounded font-medium shadow-sm transition-all">Reset Pass</button>
                          <button onClick={() => deleteUser(user.id || user.sid)} className="block w-full text-xs bg-white border border-red-200 text-red-600 hover:bg-red-50 px-2 py-1 rounded font-medium shadow-sm transition-all">Delete</button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-400 italic">No students found for Academic Year {viewYear}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 2. DIGITAL LIBRARY TAB --- */}
        {activeTab === 'library' && isSuperAdmin && (
          <div className="space-y-6 animate-[slideUpFade_0.4s_ease-out]">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center border-b pb-2">
                <Upload className="w-5 h-5 mr-2 text-blue-600" /> Upload New Book (PDF)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="md:col-span-5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Select PDF (Max 20MB)</label>
                  <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileSelect} className="w-full text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white file:text-blue-700 hover:file:bg-blue-50 cursor-pointer text-slate-500" />
                </div>
                 <div className="md:col-span-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Title</label>
                  <input type="text" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Book Title" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pages</label>
                  <input type="number" value={newBookPages} onChange={e => setNewBookPages(e.target.value)} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="100" />
                </div>
                <div className="md:col-span-1">
                  <button onClick={addBook} disabled={isUploading} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex justify-center disabled:opacity-50 shadow-sm transition-all hover:scale-105">
                    {isUploading ? <RefreshCw className="w-5 h-5 animate-spin"/> : <PlusCircle className="w-5 h-5"/>}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {books.map((book, index) => {
                        const issuers = users.filter(u => u.access.includes(book.id || book.customId));
                        return (
                        <div key={book.id || book.customId} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-colors group animate-[slideUpFade_0.3s_ease-out_forwards]" style={{animationDelay: `${index * 50}ms`, opacity: 0}}>
                            <div className="flex items-center space-x-4 mb-4 md:mb-0">
                                <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600"><FileText className="w-5 h-5"/></div>
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{book.title}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex items-center font-medium">
                                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 mr-2 border border-slate-200">{book.totalPages} Pages</span>
                                      {book.hasFile ? <span className="text-green-600 font-bold flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> PDF Ready</span> : 'Digital Text'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="text-right">
                                    <div className="text-[9px] font-bold uppercase text-slate-400 mb-0.5 tracking-wider">Digital Access</div>
                                    <button 
                                      onClick={() => setAccessModalBook(book)}
                                      className="font-bold text-slate-700 flex items-center justify-end hover:text-blue-600 transition bg-white px-3 py-1 rounded border border-slate-200 hover:border-blue-300 text-xs"
                                    >
                                        <Users className="w-3 h-3 mr-1.5 text-blue-500"/> {issuers.length} Students
                                    </button>
                                </div>
                                <button onClick={() => deleteBook(book.id || book.customId, book.title)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                                <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>
            
            {/* ACCESS LIST MODAL */}
            {accessModalBook && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-transform animate-[scaleIn_0.3s_ease-out_forwards]">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center text-sm"><Users className="w-4 h-4 mr-2 text-blue-600"/> Access List</h3>
                    <button onClick={() => setAccessModalBook(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-4 h-4 text-slate-500"/></button>
                  </div>
                    <div className="p-4">
                    <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">Book Title</div>
                      <div className="font-bold text-blue-900 text-sm">{accessModalBook.title}</div>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-slate-100 p-2 text-xs font-bold text-slate-500 flex justify-between border-b">
                        <span>Student ID</span>
                        <span>Name</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {users.filter(u => u.access.includes(accessModalBook.id || accessModalBook.customId)).length > 0 ? (
                          users.filter(u => u.access.includes(accessModalBook.id || accessModalBook.customId)).map(u => (
                            <div key={u.id} className="p-2 flex justify-between text-sm hover:bg-slate-50 transition-colors">
                              <span className="font-mono text-slate-500 text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{u.id || u.sid}</span>
                              <span className="font-medium text-slate-800">{u.name}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400 italic text-sm">
                            No students have access to this book.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t bg-slate-50 text-center">
                    <p className="text-xs text-slate-400">To add/remove access, go to "Users & Fees" tab.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 3. VISITORS TAB --- */}
        {activeTab === 'visitors' && (
          <div className="space-y-6 animate-[slideUpFade_0.4s_ease-out]">
            {/* ADD VISITOR FORM */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center border-b pb-2">
                <PlusCircle className="w-5 h-5 mr-2 text-green-600" /> Log New Visitor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Date</label>
                  <input type="date" value={newVisitor.date} onChange={e => setNewVisitor({...newVisitor, date: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Student Name</label>
                  <input type="text" value={newVisitor.name} onChange={e => setNewVisitor({...newVisitor, name: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" placeholder="Full Name" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">SID</label>
                  <input type="text" value={newVisitor.sid} onChange={e => setNewVisitor({...newVisitor, sid: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" placeholder="15 Digit SID" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Course</label>
                  <input type="text" value={newVisitor.course} onChange={e => setNewVisitor({...newVisitor, course: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" placeholder="Course" />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Purpose</label>
                  <input type="text" value={newVisitor.purpose} onChange={e => setNewVisitor({...newVisitor, purpose: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" placeholder="e.g. Reading, Internet" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Phone</label>
                  <input type="tel" value={newVisitor.phone} onChange={e => setNewVisitor({...newVisitor, phone: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" placeholder="10 Digits" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Time In</label>
                  <input type="time" value={newVisitor.timeIn} onChange={e => setNewVisitor({...newVisitor, timeIn: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Time Out</label>
                  <input type="time" value={newVisitor.timeOut} onChange={e => setNewVisitor({...newVisitor, timeOut: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Officer Name</label>
                  <input type="text" value={newVisitor.officerName} onChange={e => setNewVisitor({...newVisitor, officerName: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" placeholder="Attended By" />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Designation</label>
                  <input type="text" value={newVisitor.designation} onChange={e => setNewVisitor({...newVisitor, designation: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" placeholder="e.g. Librarian" />
                </div>
                <div className="md:col-span-12">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Feedback / Remarks</label>
                  <input type="text" value={newVisitor.feedback} onChange={e => setNewVisitor({...newVisitor, feedback: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none" placeholder="Enter comments or feedback..." />
                </div>
                <div className="md:col-span-12 mt-2">
                  <button onClick={addVisitor} className="w-full bg-slate-800 text-white p-2.5 rounded font-bold hover:bg-green-600 flex items-center justify-center text-sm shadow-sm transition-all hover:scale-[1.01]">
                    <Save className="w-4 h-4 mr-2" /> Log Entry
                  </button>
                </div>
              </div>
            </div>

            {/* VISITOR LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-800">Visitor Logbook</h3>
                  <div className="flex items-center space-x-2 bg-white p-1 rounded border border-slate-200 shadow-sm">
                    <select value={visitorRepType} onChange={e => setVisitorRepType(e.target.value)} className="text-xs border-0 bg-transparent font-bold text-slate-600 focus:ring-0 cursor-pointer">
                      <option value="daily">Daily</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    {visitorRepType === 'daily' && <input type="date" value={visitorRepDate} onChange={e => setVisitorRepDate(e.target.value)} className="text-xs border-0 bg-transparent text-slate-600 font-medium"/>}
                    {visitorRepType === 'monthly' && <input type="month" value={visitorRepMonth} onChange={e => setVisitorRepMonth(e.target.value)} className="text-xs border-0 bg-transparent text-slate-600 font-medium"/>}
                    {visitorRepType === 'yearly' && <input type="number" value={visitorRepYear} onChange={e => setVisitorRepYear(e.target.value)} className="text-xs border-0 bg-transparent text-slate-600 font-medium w-16" placeholder="YYYY"/>}
                    <div className="h-4 w-px bg-slate-200 mx-2"></div>
                    <button onClick={downloadVisitorLog} className="text-xs text-blue-600 px-2 py-1 font-bold hover:text-blue-800 flex items-center transition-colors">
                      <Download className="w-3 h-3 mr-1" /> Export
                    </button>
                  </div>
               </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100 tracking-wider">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">SID</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Course</th>
                      <th className="p-4">Purpose</th>
                      <th className="p-4">Time</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Officer</th>
                      <th className="p-4">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {visitors.length > 0 ? visitors.map((v, i) => (
                      <tr key={v._id || v.id} className="hover:bg-slate-50 transition-colors animate-[slideUpFade_0.3s_ease-out_forwards]" style={{animationDelay: `${i * 50}ms`, opacity: 0}}>
                        <td className="p-4 text-slate-500">{v.date}</td>
                        <td className="p-4 text-slate-500 font-mono text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-200 inline-block">{v.sid}</td>
                        <td className="p-4 font-bold text-slate-800">{v.name}</td>
                        <td className="p-4 text-slate-600">{v.course}</td>
                        <td className="p-4 text-slate-600"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">{v.purpose}</span></td>
                        <td className="p-4 text-slate-500 text-xs font-mono">{v.timeIn} - {v.timeOut}</td>
                        <td className="p-4 text-slate-600">{v.phone}</td>
                        <td className="p-4 text-slate-600">
                            <div className="font-medium">{v.officerName}</div>
                            <div className="text-[10px] text-slate-400">{v.designation}</div>
                        </td>
                        <td className="p-4 text-slate-500 italic truncate max-w-xs opacity-70" title={v.feedback}>{v.feedback}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="9" className="p-12 text-center text-slate-400 italic">No visitors logged yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- 4. REPORTS TAB --- */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-[slideUpFade_0.4s_ease-out]">
            <div className="inline-flex space-x-1 bg-white p-1 rounded border border-slate-200 shadow-sm">
               <button 
                 onClick={() => setReportSubTab('users')}
                 className={`px-4 py-2 rounded text-sm font-bold transition-all duration-300 ${reportSubTab === 'users' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
               >
                 Registered Users
                 {userReports.filter(r => r.status === 'Pending').length > 0 && (
                   <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{userReports.filter(r => r.status === 'Pending').length}</span>
                 )}
               </button>
               <button 
                 onClick={() => setReportSubTab('public')}
                 className={`px-4 py-2 rounded text-sm font-bold transition-all duration-300 ${reportSubTab === 'public' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
               >
                 Public Enquiries
                 {publicReports.filter(r => r.status === 'Pending').length > 0 && (
                   <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{publicReports.filter(r => r.status === 'Pending').length}</span>
                 )}
               </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                  {reportSubTab === 'users' ? 'User Issue Reports' : 'Public Enquiries'}
                </h3>
                <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full font-bold shadow-sm">
                  {displayedReports.filter(r => r.status === 'Pending').length} Pending
                </span>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white text-slate-400 text-[10px] uppercase font-bold border-b border-slate-100 tracking-widest">
                  <tr>
                    {reportSubTab === 'public' ? (
                        <>
                            <th className="p-4">Date</th>
                            <th className="p-4">Name (Contact)</th>
                            <th className="p-4">Purpose</th>
                            <th className="p-4">Message</th>
                            <th className="p-4">Attended By</th>
                            <th className="p-4">Designation</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Action</th>
                        </>
                    ) : (
                        <>
                            <th className="p-4">Time</th>
                            <th className="p-4">User</th>
                            <th className="p-4">Context</th>
                            <th className="p-4">Issue Description</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Action</th>
                        </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {displayedReports.map((report, i) => (
                    <tr key={report.id} className={`${report.status === 'Pending' ? 'bg-orange-50/50' : 'bg-white'} hover:bg-slate-50 transition-colors animate-[slideUpFade_0.3s_ease-out_forwards]`} style={{animationDelay: `${i * 50}ms`, opacity: 0}}>
                      {reportSubTab === 'public' ? (
                          <>
                            <td className="p-4 text-slate-500 whitespace-nowrap font-medium">{report.date || report.time}</td>
                            <td className="p-4 font-bold text-slate-800">{report.userId}</td>
                            <td className="p-4 text-slate-600"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">{report.purpose}</span></td>
                            <td className="p-4 text-slate-700 max-w-xs">{report.issue}</td>
                            <td className="p-4">
                                <input 
                                    type="text" 
                                    className="border border-slate-200 bg-white rounded p-1.5 text-xs w-32 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm" 
                                    placeholder="Officer Name"
                                    key={report.officer || ''} defaultValue={report.officer || ''}
                                    onBlur={(e) => updateReport(report.id, 'officer', e.target.value)}
                                />
                            </td>
                            <td className="p-4">
                                <input 
                                    type="text" 
                                    className="border border-slate-200 bg-white rounded p-1.5 text-xs w-32 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm" 
                                    placeholder="Designation"
                                    key={report.designation || ''} defaultValue={report.designation || ''}
                                    onBlur={(e) => updateReport(report.id, 'designation', e.target.value)}
                                />
                            </td>
                          </>
                      ) : (
                          <>
                            <td className="p-4 text-slate-500 whitespace-nowrap font-medium">{report.time}</td>
                            <td className="p-4 font-medium text-slate-800">{report.userId}</td>
                            <td className="p-4 text-slate-600"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 font-medium">{report.context}</span></td>
                            <td className="p-4 text-slate-700 max-w-xs">{report.issue}</td>
                          </>
                      )}
                      
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${report.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => toggleReportStatus(report.id)}
                          disabled={reportSubTab === 'public' && report.status === 'Pending' && (!report.officer || !report.designation)}
                          className={`text-xs px-3 py-1.5 rounded border transition-all font-medium shadow-sm ${
                            (reportSubTab === 'public' && report.status === 'Pending' && (!report.officer || !report.designation)) 
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                            : report.status === 'Pending' 
                                ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 hover:shadow-md' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {report.status === 'Pending' ? 'Mark Resolved' : 'Re-open'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {displayedReports.length === 0 && (
                    <tr><td colSpan={reportSubTab === 'public' ? 8 : 6} className="p-12 text-center text-slate-400 italic">No reports found.</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* --- 5. BOOK STOCKS (PHYSICAL LIBRARY) TAB --- */}
        {activeTab === 'physical_library' && isSuperAdmin && (
          <div className="space-y-6 animate-[slideUpFade_0.4s_ease-out]">
            
            <form onSubmit={addStock} className="p-5 bg-white rounded-xl border grid grid-cols-2 md:grid-cols-6 gap-3">
              <h3 className="col-span-2 md:col-span-6 font-bold">Add inventory item</h3>
              {['itemId','name','type'].map(key=><label key={key} className="text-xs font-bold">{key === 'itemId' ? 'Item ID' : key}<input required value={newStock[key]} onChange={e=>setNewStock({...newStock,[key]:e.target.value})} className="block w-full border rounded p-2 font-normal" /></label>)}
              {['price','openingStock','minStock'].map(key=><label key={key} className="text-xs font-bold">{key}<input type="number" min="0" step={key==='price'?'0.01':'1'} required value={newStock[key]} onChange={e=>setNewStock({...newStock,[key]:Number(e.target.value)})} className="block w-full border rounded p-2 font-normal" /></label>)}
              <button disabled={savingStock} className="col-span-2 bg-blue-700 text-white rounded p-2">{savingStock?'Saving…':'Add item'}</button>
            </form>
            {/* MODULE 1: STOCK DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Inventory Value</div>
                <div className="text-2xl font-black text-slate-800">
                  ₹{inventory.reduce((acc, item) => acc + getStockStats(item.itemId).value, 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Items Tracked</div>
                <div className="text-2xl font-black text-blue-600">{inventory.length}</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Low Stock Alerts</div>
                <div className="text-2xl font-black text-red-500">
                  {inventory.filter(i => getStockStats(i.itemId || i.id).current <= i.minStock).length}
                </div>
              </div>
              <button 
                onClick={() => setShowTransModal(true)}
                className="bg-blue-600 text-white p-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex flex-col justify-center items-center"
              >
                <RefreshCw className="w-6 h-6 mb-1" />
                <span className="font-bold text-sm">New Transaction</span>
              </button>
            </div>

            {/* MODULE 2: INVENTORY MASTER LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-slate-800 flex items-center">
                    <Database className="w-5 h-5 mr-2 text-slate-500"/> Master Stock Register
                  </h3>
                  <button onClick={downloadMasterStock} className="text-xs flex items-center bg-white border border-slate-300 px-3 py-1 rounded hover:bg-slate-50 text-slate-600 font-bold transition-all hover:shadow-sm">
                    <Download className="w-3 h-3 mr-1" /> Export Master CSV
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400"/>
                  <input 
                    type="text" 
                    placeholder="Search items..." 
                    value={stockSearch}
                    onChange={e => setStockSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 border rounded-full text-sm outline-none focus:ring-1 focus:ring-blue-500 w-64"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100 tracking-wider">
                    <tr>
                      <th className="p-4">Item Name</th>
                      <th className="p-4 text-center">Opening</th>
                      <th className="p-4 text-center text-green-600">Receipts (+)</th>
                      <th className="p-4 text-center text-red-600">Issued (-)</th>
                      <th className="p-4 text-center">Closing Stock</th>
                      <th className="p-4 text-right">Value (₹)</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {inventory
                      .filter(i => i.name.toLowerCase().includes(stockSearch.toLowerCase()))
                      .map((item) => {
                        const stats = getStockStats(item.itemId);
                        const isLow = stats.current <= item.minStock;
                        return (
                          <tr key={item.itemId || item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-slate-700">{item.name}</div>
                              <div className="text-[10px] text-slate-400 bg-slate-100 inline-block px-1.5 rounded mt-1">{item.type}</div>
                            </td>
                            <td className="p-4 text-center text-slate-500">{item.openingStock}</td>
                            <td className="p-4 text-center font-mono text-green-600 bg-green-50/50">{stats.totalIn}</td>
                            <td className="p-4 text-center font-mono text-red-600 bg-red-50/50">{stats.totalOut}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-1 rounded font-bold ${isLow ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                {stats.current}
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono">{stats.value.toLocaleString()}</td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => setShowLedgerModal(item.itemId)}
                                className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded border border-blue-200 transition-all"
                              >
                                View Ledger
                              </button>
                            </td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODULE 3: TRANSACTION MODAL (UPDATED WITH TYPE INPUT) */}
            {showTransModal && createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-[scaleIn_0.2s_ease-out]">
                  <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center"><RefreshCw className="w-4 h-4 mr-2"/> Record Transaction</h3>
                    <button onClick={() => setShowTransModal(false)}><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Date</label>
                        <input type="date" value={transForm.date} onChange={e => setTransForm({...transForm, date: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
                        <div className="flex bg-slate-100 rounded p-1">
                          <button onClick={() => setTransForm({...transForm, type: 'RECEIPT'})} className={`flex-1 text-xs font-bold py-1.5 rounded transition-all ${transForm.type === 'RECEIPT' ? 'bg-green-500 text-white shadow' : 'text-slate-500'}`}>RECEIPT</button>
                          <button onClick={() => setTransForm({...transForm, type: 'ISSUE'})} className={`flex-1 text-xs font-bold py-1.5 rounded transition-all ${transForm.type === 'ISSUE' ? 'bg-red-500 text-white shadow' : 'text-slate-500'}`}>ISSUE</button>
                        </div>
                      </div>
                    </div>

                    <div>
                      {/* CHANGED TO INPUT + DATALIST */}
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Enter Item Name</label>
                      <input
                        list="stock-items-list"
                        type="text"
                        placeholder="Type to search item..."
                        value={transSearch}
                        onChange={(e) => {
                            const val = e.target.value;
                            setTransSearch(val);
                            const foundItem = inventory.find(i => i.name === val);
                            if (foundItem) {
                                setTransForm({...transForm, itemId: foundItem.itemId || foundItem.id});
                            } else {
                                setTransForm({...transForm, itemId: ''});
                            }
                        }}
                        className="w-full border p-2.5 rounded text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <datalist id="stock-items-list">
                        {inventory.map(i => (
                            <option key={i.itemId || i.id} value={i.name}>
                                Current Stock: {getStockStats(i.itemId).current}
                            </option>
                        ))}
                      </datalist>
                      {/* Visual confirmation of selection */}
                      {transForm.itemId && (
                        <div className="text-xs text-green-600 mt-1 font-bold animate-pulse flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1"/>
                            Selected: {inventory.find(i => i.itemId === transForm.itemId)?.name} (Stock: {getStockStats(transForm.itemId).current})
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Quantity</label>
                        <input type="number" min="1" value={transForm.quantity} onChange={e => setTransForm({...transForm, quantity: e.target.value})} className="w-full border p-2 rounded text-sm font-bold"/>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Particulars / Source</label>
                        <input type="text" value={transForm.particular} onChange={e => setTransForm({...transForm, particular: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder={transForm.type === 'ISSUE' ? 'e.g. Student Name' : 'e.g. AIILSG Mumbai'}/>
                      </div>
                    </div>

                    <button onClick={handleTransaction} className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-700 transition-all mt-2">
                      Save Entry
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* MODULE 4: LEDGER VIEW MODAL (PORTAL FIX APPLIED) */}
            {showLedgerModal && createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-[scaleIn_0.2s_ease-out]">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{inventory.find(i => i.itemId === showLedgerModal)?.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">Stock Ledger Report</p>
                    </div>
                    <button onClick={() => setShowLedgerModal(null)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold sticky top-0">
                        <tr>
                          <th className="p-3 border-b">Date</th>
                          <th className="p-3 border-b">Particulars</th>
                          <th className="p-3 border-b text-center">Receipt</th>
                          <th className="p-3 border-b text-center">Issue</th>
                          <th className="p-3 border-b text-center">Balance</th>
                          <th className="p-3 border-b text-right">User</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-slate-50">
                        <tr className="bg-yellow-50">
                          <td className="p-3 font-bold text-slate-500 italic">Opening</td>
                          <td className="p-3 text-slate-500 italic">B/F</td>
                          <td className="p-3"></td>
                          <td className="p-3"></td>
                          <td className="p-3 text-center font-bold">{inventory.find(i => i.itemId === showLedgerModal)?.openingStock}</td>
                          <td className="p-3"></td>
                        </tr>
                        {transactions
                          .filter(t => t.itemId === showLedgerModal)
                          .sort((a,b) => new Date(a.date) - new Date(b.date))
                          .reduce((acc, t, idx) => {
                            // Running balance calculation logic
                            const prevBalance = idx === 0 ? (inventory.find(i => i.itemId === showLedgerModal)?.openingStock || 0) : acc[idx-1].balance;
                            const newBalance = t.type === 'RECEIPT' ? prevBalance + t.quantity : prevBalance - t.quantity;
                            const row = { ...t, balance: newBalance };
                            acc.push(row);
                            return acc;
                          }, [])
                          .map((t) => (
                            <tr key={t.id || t._id} className="hover:bg-slate-50">
                              <td className="p-3 text-slate-600 whitespace-nowrap">{t.date}</td>
                              <td className="p-3 text-slate-800">{t.particular}</td>
                              <td className="p-3 text-center text-green-600 font-mono">{t.type === 'RECEIPT' ? t.quantity : '-'}</td>
                              <td className="p-3 text-center text-red-600 font-mono">{t.type === 'ISSUE' ? t.quantity : '-'}</td>
                              <td className="p-3 text-center font-bold text-slate-700">{t.balance}</td>
                              <td className="p-3 text-right text-xs text-slate-400">{t.user}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 border-t bg-slate-50 text-right">
                    <button 
                      onClick={() => downloadItemLedger(showLedgerModal)}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-end w-full"
                    >
                      <Download className="w-3 h-3 mr-1"/> Export Ledger to Excel
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}

        {/* --- 6. SYSTEM TAB (Full Functionality Restored) --- */}
        {activeTab === 'system' && isSuperAdmin && (
          <div className="space-y-6 animate-[slideUpFade_0.4s_ease-out]">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
               <h3 className="text-lg font-bold text-slate-800 flex items-center mb-6 border-b pb-4">
                 <ShieldAlert className="w-5 h-5 mr-2 text-purple-600" /> Admin Access Control
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                    <h4 className="font-bold text-xs text-purple-900 mb-4 uppercase tracking-widest flex items-center"><UserPlus className="w-3 h-3 mr-2"/> Create New Admin</h4>
                    <div className="space-y-3">
                       <input type="text" placeholder="Admin Username/ID" value={newAdmin.id} onChange={e => setNewAdmin({...newAdmin, id: e.target.value})} className="w-full text-xs p-3 border border-purple-200 rounded focus:ring-2 focus:ring-purple-500/20 outline-none transition-all bg-white"/>
                       <input type="password" placeholder="Password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full text-xs p-3 border border-purple-200 rounded focus:ring-2 focus:ring-purple-500/20 outline-none transition-all bg-white"/>
                       <input type="text" placeholder="Display Name" value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} className="w-full text-xs p-3 border border-purple-200 rounded focus:ring-2 focus:ring-purple-500/20 outline-none transition-all bg-white"/>
                       <select value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})} className="w-full text-xs p-3 border border-purple-200 rounded focus:ring-2 focus:ring-purple-500/20 outline-none bg-white text-slate-700 cursor-pointer">
                          <option value="limited_admin">Limited Authority (Visitors & Reports)</option>
                          <option value="super_admin">Full Authority</option>
                       </select>
                       <button onClick={handleAddAdmin} className="w-full bg-purple-600 text-white text-xs font-bold py-3 rounded hover:bg-purple-700 shadow-md transition-all mt-1 uppercase tracking-widest">Create Account</button>
                    </div>
                 </div>
                 
                 <div>
                    <h4 className="font-bold text-xs text-slate-500 mb-4 uppercase tracking-widest">Existing Admins</h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                       {admins.map(admin => (
                         <div key={admin.id} className="flex justify-between items-center p-3 border border-slate-200 rounded bg-slate-50 hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center">
                               <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-white mr-3 shadow-sm text-xs ${admin.role === 'super_admin' ? 'bg-blue-600' : 'bg-green-600'}`}>
                                  {admin.name.charAt(0)}
                               </div>
                               <div>
                                   <div className="text-xs font-bold text-slate-700">{admin.name}</div>
                                   <div className="text-[10px] text-slate-500 font-mono mt-0.5">@{admin.id} • {admin.role.replace('_', ' ')}</div>
                               </div>
                            </div>
                            {admin.id !== currentAdmin.id && (
                              <button onClick={() => handleDeleteAdmin(admin.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                            )}
                         </div>
                       ))}
                    </div>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`rounded-xl shadow-sm border p-6 flex flex-col justify-between transition-all ${settings.maintenanceMode ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center mb-3">
                    <AlertOctagon className={`w-5 h-5 mr-3 ${settings.maintenanceMode ? 'text-red-600' : 'text-slate-400'}`} /> Maintenance Mode
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {settings.maintenanceMode ? "System is presently LOCKED. Only Administrators can log in. Students are blocked." : "System is LIVE and operational. Students can access the portal."}
                  </p>
                </div>
                <button 
                  onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)}
                  className={`mt-6 w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm ${settings.maintenanceMode ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {settings.maintenanceMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center mb-3">
                    <Settings className="w-5 h-5 mr-3 text-slate-400" /> Data Management
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Audit history is retained on the server. Database backups are managed through your hosting provider.</p>
                </div>
                <p className="mt-6 text-xs text-slate-600">Audit records cannot be edited or cleared through the portal.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <Bell className="w-5 h-5 mr-3 text-orange-500" /> Global Announcement
                </h3>
                <button onClick={updateAnnouncement} className="text-xs bg-white border border-slate-200 text-slate-700 px-4 py-1 rounded font-bold hover:bg-slate-50 transition-colors shadow-sm uppercase tracking-wide">Edit</button>
              </div>
              <div className="bg-orange-50 p-4 rounded border border-orange-100 text-orange-800 text-sm font-medium italic relative">
                <span className="absolute top-2 left-2 text-4xl text-orange-200 font-serif opacity-50">"</span>
                <p className="relative z-10 px-6">{settings.announcement}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center mb-6 border-b pb-4">
                <Eye className="w-5 h-5 mr-3 text-purple-600" /> Viewer Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Watermark Text</label>
                  <input type="text" key={settings.watermarkText} defaultValue={settings.watermarkText} onBlur={e => updateSetting('watermarkText', e.target.value)} className="w-full border border-slate-200 p-3 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-slate-700"/>
                  <p className="text-[10px] text-slate-400 mt-1">Visible overlay on all protected documents.</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Admin Sticky Note</label>
                  <input type="text" key={settings.adminNote} defaultValue={settings.adminNote} onBlur={e => updateSetting('adminNote', e.target.value)} className="w-full border border-slate-200 p-3 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-slate-700" placeholder="e.g. Read Chapter 4"/>
                  <p className="text-[10px] text-slate-400 mt-1">Internal note for admins.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-lg">System Audit Log</h3>
              </div>
              <div className="max-h-60 overflow-y-auto bg-slate-50 text-slate-500 font-mono text-xs p-4 space-y-2 custom-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className="flex space-x-4 border-b border-slate-200 pb-2 mb-1 last:border-0 items-start">
                    <span className="text-slate-400 shrink-0 whitespace-nowrap w-20">{log.time}</span>
                    <span className="text-blue-600 font-bold shrink-0 w-28 truncate">{log.action}</span>
                    <span className="text-slate-600 break-all">{log.details}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer for Admin Panel */}
      <Footer className="bg-white text-slate-500 border-t border-slate-200" />
    </div>
  );
}

// ==========================================
// 4. STUDENT PORTAL
// ==========================================
function StudentPortal({ user, allBooks, settings, darkMode, setDarkMode, onLogout, onChangePassword, onReportIssue }) {
  const [activeBook, setActiveBook] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [settingsTab, setSettingsTab] = useState('profile');

  const filteredBooks = allBooks.filter(book => 
    user.access.includes(book.id || book.customId) && 
    book.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <header className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b shadow-sm sticky top-0 z-30 transition-colors`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded text-white">
              <Logo className="w-8 h-8" fallbackIcon={BookOpen} />
            </div>
            <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>My Library</span>
          </div>
          
          <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowHelp(true)}
                className="hidden md:flex items-center space-x-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition"
              >
                <HelpCircle className="w-3 h-3" /> <span>HELP</span>
              </button>

              <a
                href="https://puneaiilsglibrary.wordpress.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center space-x-1 text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded hover:bg-purple-100 transition"
              >
                <Library className="w-3 h-3" /> <span>AIILSG PUNE LIBRARY</span>
              </a>

              <button 
                  onClick={() => {
                    const issue = prompt("Please describe the issue you are facing:");
                    if (issue) onReportIssue(user.id || user.sid, "Dashboard", issue);
                  }} 
                  className="hidden md:flex items-center space-x-1 text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded hover:bg-red-100 transition"
              >
                  <Flag className="w-3 h-3" /> <span>REPORT</span>
              </button>

              <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-full transition ${darkMode ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
              </button>

              <div className="h-6 w-px bg-slate-300 mx-2"></div>

              <div className="text-right hidden sm:block leading-tight">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Student ID</div>
                <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{user.id || user.sid}</div>
              </div>
              
              <div className="relative">
                  <button aria-label="Open profile" onClick={() => setShowProfile(true)} className={`p-2 rounded-full transition ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500'}`}>
                    <User className="w-5 h-5" />
                  </button>
              </div>
          </div>
        </div>
      </header>

      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className={`rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[600px] md:h-[500px] animate-[scaleIn_0.3s_ease-out_forwards] ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}>
              
              <div className={`w-full md:w-1/4 p-6 border-r flex flex-col ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <h3 className="font-bold text-lg mb-6 flex items-center"><Settings className="w-5 h-5 mr-2"/> Settings</h3>
                  <nav className="flex flex-col space-y-2 flex-1">
                      <button 
                        onClick={() => setSettingsTab('profile')}
                        className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center ${settingsTab === 'profile' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-white shadow-md text-blue-600') : 'hover:bg-black/5'}`}
                      >
                          <User className="w-4 h-4 mr-3"/> My Profile
                      </button>
                      <button 
                        onClick={() => setSettingsTab('contact')}
                        className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center ${settingsTab === 'contact' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-white shadow-md text-blue-600') : 'hover:bg-black/5'}`}
                      >
                          <Phone className="w-4 h-4 mr-3"/> Important Contacts
                      </button>
                      <button 
                        onClick={() => setSettingsTab('security')}
                        className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center ${settingsTab === 'security' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-white shadow-md text-blue-600') : 'hover:bg-black/5'}`}
                      >
                          <Shield className="w-4 h-4 mr-3"/> Security
                      </button>
                  </nav>
                  
                  <div className="mt-auto pt-6 border-t border-slate-200/20">
                      <button aria-label="Log out" onClick={onLogout} className="w-full flex items-center justify-center px-4 py-3 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors text-sm">
                          <LogOut className="w-4 h-4 mr-2"/> Log Out
                      </button>
                  </div>
              </div>

              <div className="flex-1 p-8 relative overflow-y-auto">
                  <button onClick={() => setShowProfile(false)} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X className="w-5 h-5"/></button>
                  
                  {settingsTab === 'profile' && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                          <h2 className="text-2xl font-bold mb-6">Student Profile</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className={`p-4 rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                  <label className="text-xs uppercase font-bold opacity-50 block mb-1">Full Name</label>
                                  <div className="font-bold text-lg">{user.name}</div>
                              </div>
                              <div className={`p-4 rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                  <label className="text-xs uppercase font-bold opacity-50 block mb-1">Student ID (SID)</label>
                                  <div className="font-mono">{user.id || user.sid}</div>
                              </div>
                              <div className={`p-4 rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                  <label className="text-xs uppercase font-bold opacity-50 block mb-1">Course</label>
                                  <div>{user.course} ({user.medium})</div>
                              </div>
                              <div className={`p-4 rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                  <label className="text-xs uppercase font-bold opacity-50 block mb-1">Batch / Year</label>
                                  <div>{user.academicYear}</div>
                              </div>
                              <div className={`p-4 rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                  <label className="text-xs uppercase font-bold opacity-50 block mb-1">Center</label>
                                  <div>{user.center}</div>
                              </div>
                               <div className={`p-4 rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                  <label className="text-xs uppercase font-bold opacity-50 block mb-1">Valid Until</label>
                                  <div className="text-green-600 font-bold">{user.validUntil}</div>
                              </div>
                          </div>
                      </div>
                  )}

                  {settingsTab === 'contact' && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                          <h2 className="text-2xl font-bold mb-2">Important Contacts</h2>
                          <p className="opacity-60 text-sm mb-6">Get in touch with AIILSG Pune Administration.</p>
                          
                          <div className={`flex items-start p-4 rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                              <MapPin className="w-6 h-6 mr-4 text-red-500 shrink-0 mt-1"/>
                              <div>
                                  <h4 className="font-bold mb-1">Address</h4>
                                  <p className="text-sm opacity-80 leading-relaxed">
                                      All India Institute of Local Self Government (AIILSG)<br/>
                                      Pinnac Memories, L Building, Near Karve Statue,<br/>
                                      Kothrud, Pune, Maharashtra 411038
                                  </p>
                                  <a href="https://maps.app.goo.gl/QYYzxfcRVvzqkLaQA" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-500 text-xs font-bold mt-3 hover:underline">
                                      View on Google Maps <ChevronRight className="w-3 h-3 ml-1"/>
                                  </a>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className={`flex items-center p-4 rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                  <Phone className="w-5 h-5 mr-3 text-green-500"/>
                                  <div>
                                      <h4 className="text-xs font-bold opacity-50 uppercase">Contact Number</h4>
                                      <div className="font-mono text-sm mt-1">+91 02025455099</div>
                                  </div>
                              </div>
                              <div className={`flex items-center p-4 rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                  <Mail className="w-5 h-5 mr-3 text-blue-500"/>
                                  <div>
                                      <h4 className="text-xs font-bold opacity-50 uppercase">Email Address</h4>
                                      <a href="mailto:pune@aiilsg.org" className="font-mono text-sm mt-1 hover:text-blue-500 transition">pune@aiilsg.org</a>
                                  </div>
                              </div>
                          </div>

                          <div className={`p-5 rounded-xl border-l-4 border-l-purple-500 ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                              <h4 className="font-bold text-purple-600 mb-2 flex items-center"><HelpCircle className="w-4 h-4 mr-2"/> For Admissions Query</h4>
                              <div className="flex items-center justify-between">
                                  <span className="font-mono text-lg">+91 02025455099</span>
                                  <a href="tel:+918308345664" className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-700 transition">Voice Call</a>
                              </div>
                          </div>
                      </div>
                  )}

                  {settingsTab === 'security' && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-md">
                          <h2 className="text-2xl font-bold mb-6">Security Settings</h2>
                          <div className="space-y-4">
                              <div>
                                <label className="text-sm font-bold block mb-2">Current password<input aria-label="Current password" type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="block w-full border rounded p-3 text-slate-900" /></label><label className="text-sm font-bold opacity-70 mb-2 block">New Password</label>
                                <input 
                                  type="password" 
                                  value={newPass} 
                                  onChange={(e) => setNewPass(e.target.value)} 
                                  className={`w-full p-3 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`} 
                                  placeholder="Enter new password" 
                                />
                              </div>
                              <button 
                                onClick={async () => {
                                   if(!newPass) return alert("Please enter a password");
                                   if(await onChangePassword(user.sid, newPass, currentPassword)) { setNewPass(''); setCurrentPassword(''); }
                                }} 
                                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-md transition-all mt-4"
                              >
                                Update Password
                              </button>
                          </div>
                      </div>
                  )}

              </div>
           </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 py-8">
        {showHelp && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className={`${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'} max-w-xl w-full mx-4 rounded-xl shadow-2xl border ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-6 relative`}>
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-bold mb-2 flex items-center">
                <Info className="w-4 h-4 mr-2 text-blue-500" /> How to use this portal
              </h2>
              <p className="text-sm mb-4">
                When contacting support, share only the details needed to explain your issue. Avoid sharing passwords or personal information.
              </p>
              <div className="space-y-3 text-sm">
                <div>
                  <h3 className="font-semibold">1. Login</h3>
                  <p>Use your Student ID and password on the login page. If you forget your password, use &quot;Forgot Password&quot; or contact the admin with your ID only.</p>
                </div>
                <div>
                  <h3 className="font-semibold">2. Reading books</h3>
                  <p>Go to &quot;Assigned Books&quot; and click a title to open it. Pages unlock based on your fee payment status. Use the arrows at the bottom to change pages.</p>
                </div>
                <div>
                  <h3 className="font-semibold">3. Reporting an issue</h3>
                  <p>Use the red &quot;REPORT&quot; button on the dashboard or the flag button inside the reader. Describe the issue in words (page number, book name, and what went wrong). Avoid including private student information.</p>
                </div>
                <div>
                  <h3 className="font-semibold">4. Changing password</h3>
                  <p>Click your profile icon on the top-right, enter a new password, and click &quot;Update Password&quot;.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeBook ? (
          <SecureReader 
            book={activeBook} 
            user={user} 
            settings={settings} 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
            onReportIssue={onReportIssue} 
            onClose={() => setActiveBook(null)} 
          />
        ) : (
          <BookList user={user} allBooks={allBooks} announcement={settings.announcement} filteredBooks={filteredBooks} searchTerm={searchTerm} setSearchTerm={setSearchTerm} darkMode={darkMode} onOpen={setActiveBook} />
        )}
      </main>
      
      <Footer className={darkMode ? "text-slate-400 border-t border-slate-800" : "text-slate-500 border-t border-slate-200"} />
    </div>
  );
}

function BookList({ user, announcement, filteredBooks, searchTerm, setSearchTerm, darkMode, onOpen }) {
  const percentPaid = Math.round(user.totalFee === 0 ? 100 : Math.max(0, Math.min(100, (user.paidAmount / user.totalFee) * 100)));
  
  const validAccess = isAccessValid(user);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {announcement && (
        <div className={`border-l-4 p-4 rounded shadow-sm flex items-start ${darkMode ? 'bg-orange-900/20 border-orange-500 text-orange-200' : 'bg-orange-50 border-orange-500 text-orange-900'}`}>
          <Bell className="w-5 h-5 text-orange-500 mr-3 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm uppercase mb-1">Notice Board</h4>
            <p className="text-sm">{announcement}</p>
          </div>
        </div>
      )}

      {/* ACCESS EXPIRY WARNING */}
      {!validAccess && (
        <div className="bg-red-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 mr-3" />
              <div>
                <h3 className="font-bold text-lg">Batch Access Expired</h3>
                <p className="text-sm opacity-90">
                  Your access was valid from <span className="font-mono bg-red-700 px-1 rounded">{user.validFrom}</span> to <span className="font-mono bg-red-700 px-1 rounded">{user.validUntil}</span>.
                </p>
              </div>
            </div>
            <Lock className="w-8 h-8 opacity-50" />
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden transform hover:scale-[1.01] transition-transform duration-500">
        <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Welcome, {user.name}</h2>
            <div className="flex items-center space-x-4 text-sm text-blue-200">
               <span className="bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">Fee Status: ₹{user.paidAmount} Paid</span>
               <span>Total: ₹{user.totalFee}</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-blue-200 mt-2">
               <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> Valid: {user.validFrom} to {user.validUntil}</span>
            </div>
          </div>
          <div className="text-right">
             <div className="text-5xl font-black">{percentPaid}%</div>
             <div className="text-xs uppercase tracking-widest text-blue-300 font-bold mt-1">Content Unlocked</div>
          </div>
        </div>
        <div className="w-full bg-white/10 h-3 rounded-full mt-6 overflow-hidden">
          <div className="h-full bg-green-400 transition-all duration-1000 ease-out" style={{ width: `${percentPaid}%` }}></div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`font-bold text-lg ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Assigned Books</h3>
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search library..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-9 pr-4 py-2 border rounded-full text-sm w-64 outline-none transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:w-72' : 'bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:w-72'}`}
            />
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${!validAccess ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          {filteredBooks.map((book, i) => (
            <div key={book.id || book.customId} onClick={() => validAccess && onOpen(book)} className={`rounded-xl border shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer overflow-hidden animate-[fadeInUp_0.5s_ease-out_forwards] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} style={{animationDelay: `${i * 100}ms`, opacity: 0}}>
              <div className={`h-40 flex items-center justify-center transition-colors relative ${darkMode ? 'bg-slate-900 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
                {book.id === 'b4' ? (
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <span className={`text-4xl mb-1 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>म</span>
                    <span className="text-[10px] uppercase font-bold text-blue-500">Marathi</span>
                  </div>
                ) : (
                  <BookOpen className={`w-16 h-16 group-hover:scale-110 transition-transform duration-300 ${darkMode ? 'group-hover:text-blue-400' : 'group-hover:text-blue-300'}`} />
                )}
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-600 shadow-sm">
                  {book.totalPages} Pages
                </div>
              </div>
              <div className="p-5">
                <h4 className={`font-bold text-lg mb-2 leading-tight transition-colors line-clamp-2 ${darkMode ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>{book.title}</h4>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secure PDF</span>
                  <button className="bg-blue-600 text-white p-2 rounded-full shadow-lg group-hover:bg-blue-700 transition transform group-hover:scale-110">
                      <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
