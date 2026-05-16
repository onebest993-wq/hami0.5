import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, ShieldAlert, BarChart3, Search, UserCheck, UserX, AlertTriangle, LogOut, Lock, PauseCircle, CheckCircle, XCircle, FileText, Filter, User, Library, Flag, Trash2, MessageSquare, type LucideIcon } from 'lucide-react';
import { PageWrapper, GlassCard, GoldButton } from './SharedComponents';
import { cn } from '@/app/components/ui/utils';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useApp } from '@/app/context/AppContext';

interface AdminDashboardProps {
  onLogout: () => void;
  /** فتح صفحة إدخال المكتبة القانونية الذكية (`src/app/admin/page.tsx`) */
  onOpenLawLibrary?: () => void;
}

interface CourtStats {
  lawsuits: number;
  transactions: number;
}

interface AdminTabProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  alert?: boolean;
  label: string;
}

// Mock Data
const PENDING_LAWYERS = [
    { id: 1, name: 'سيف الدين الحديثي', unionId: '882910', city: 'بغداد', image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400' },
    { id: 2, name: 'نور الهدى الربيعي', unionId: '102394', city: 'البصرة', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400' },
];

const ALL_USERS = [
    { id: 101, name: 'سمير جاسم', type: 'client', status: 'active', reports: 3 },
    { id: 102, name: 'المحامي علي العبيدي', type: 'lawyer', status: 'active', reports: 0 },
    { id: 103, name: 'حسين كاظم', type: 'client', status: 'banned', reports: 12 },
];

export const AdminDashboard = ({ onLogout, onOpenLawLibrary }: AdminDashboardProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'monitor' | 'consultations' | 'reports' | 'forum'>('monitor');
  const { courtStats, consultations } = useApp();

  // 1. PIN Authentication
  if (!isAuthenticated) {
      return (
          <PageWrapper>
              <div className="flex flex-col items-center justify-center min-h-screen p-6">
                  <GlassCard className="w-full max-w-sm p-8 flex flex-col items-center text-center space-y-6 border-[#D4AF37]">
                      <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                          <Lock className="w-8 h-8 text-[#D4AF37]" />
                      </div>
                      <div>
                          <h2 className="text-xl font-bold text-white">منطقة محظورة</h2>
                          <p className="text-gray-400 text-xs mt-2">يرجى إدخال رمز المرور الخاص بالمدير العام</p>
                      </div>
                      
                      <div className="w-full">
                          <input 
                            type="password" 
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value);
                                setError('');
                            }}
                            maxLength={4}
                            className="w-full text-center text-3xl tracking-[1em] bg-[#001830] border border-[#D4AF37]/30 rounded-xl py-4 text-[#D4AF37] focus:border-[#D4AF37] outline-none placeholder:tracking-normal placeholder:text-sm placeholder:text-gray-600"
                            placeholder="****"
                          />
                          {error && <p className="text-red-500 text-xs mt-2 font-bold">{error}</p>}
                      </div>

                      <GoldButton fullWidth onClick={() => {
                          if (pin === '0000' || pin === '1234') {
                              setIsAuthenticated(true);
                          } else {
                              setError('رمز المرور غير صحيح');
                              setPin('');
                          }
                      }}>
                          دخول آمن
                      </GoldButton>
                      
                      <button type="button" onClick={onLogout} className="text-gray-500 text-xs hover:text-white transition">
                          العودة للقائمة الرئيسية
                      </button>
                  </GlassCard>
              </div>
          </PageWrapper>
      );
  }

  // 2. The Dashboard Content
  return (
    <PageWrapper>
      {/* Admin Header */}
      <div className="flex justify-between items-center p-5 bg-[#001020] border-b border-[#D4AF37]/20 sticky top-0 z-50">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D4AF37] flex items-center justify-center text-[#001830] font-black shadow-[0_0_15px_rgba(212,175,55,0.5)]">
                  AD
              </div>
              <div>
                  <h1 className="text-white font-bold text-lg">لوحة الإدارة المركزية</h1>
                  <span className="text-[10px] text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      متصل بالنظام
                  </span>
              </div>
          </div>
          <div className="flex items-center gap-2">
              {onOpenLawLibrary && (
                  <button
                      type="button"
                      onClick={onOpenLawLibrary}
                      className="flex items-center gap-2 rounded-lg border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-2 text-xs font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/20"
                  >
                      <Library className="w-4 h-4 shrink-0" />
                      المكتبة القانونية الذكية
                  </button>
              )}
              <button type="button" onClick={onLogout} className="p-2 hover:bg-white/5 rounded-lg text-red-400">
                  <LogOut className="w-5 h-5" />
              </button>
          </div>
      </div>

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
          {/* Sidebar */}
          <div className="w-full md:w-24 flex md:flex-col justify-around md:justify-start items-center p-4 md:py-6 gap-6 bg-[#001020]/50 border-b md:border-b-0 md:border-l border-white/5 z-40">
              <AdminTab active={activeTab === 'monitor'} onClick={() => setActiveTab('monitor')} icon={BarChart3} label="الإحصائيات" />
              <AdminTab active={activeTab === 'consultations'} onClick={() => setActiveTab('consultations')} icon={FileText} label="الاستشارات" />
              <AdminTab active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={UserCheck} alert label="التوثيق" />
              <AdminTab active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="المستخدمين" />
              <AdminTab active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={Flag} alert label="البلاغات" />
              <AdminTab active={activeTab === 'forum'} onClick={() => setActiveTab('forum')} icon={MessageSquare} label="المنتدى" />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-y-auto pb-24 md:pb-6">
              
              {/* TAB 1: Live Monitor */}
              {activeTab === 'monitor' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-[#D4AF37] text-xl font-bold mb-4 flex items-center gap-2">
                          <BarChart3 className="w-6 h-6" /> الإحصائيات الحية للمحافظات
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(Object.entries(courtStats) as [string, CourtStats][]).map(([court, stats]) => (
                              <GlassCard key={court} className="p-5 border-t-4 border-t-[#D4AF37] relative overflow-hidden group">
                                  <div className="absolute right-[-20px] bottom-[-20px] opacity-5 group-hover:opacity-10 transition-opacity">
                                      <BarChart3 className="w-32 h-32 text-[#D4AF37]" />
                                  </div>

                                  <h3 className="text-white font-bold text-lg mb-4">{court}</h3>
                                  
                                  <div className="space-y-3">
                                      <div className="flex justify-between items-center p-2 rounded bg-white/5">
                                          <span className="text-gray-400 text-sm">دعاوى قضائية</span>
                                          <span className="text-[#D4AF37] font-bold text-lg">{stats.lawsuits}</span>
                                      </div>
                                      <div className="flex justify-between items-center p-2 rounded bg-white/5">
                                          <span className="text-gray-400 text-sm">معاملات رسمية</span>
                                          <span className="text-blue-400 font-bold text-lg">{stats.transactions}</span>
                                      </div>
                                  </div>
                              </GlassCard>
                          ))}
                      </div>
                  </div>
              )}

              {/* TAB 2: Consultations Management (New) */}
              {activeTab === 'consultations' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex justify-between items-center mb-4">
                          <h2 className="text-[#D4AF37] text-xl font-bold flex items-center gap-2">
                              <FileText className="w-6 h-6" /> مراقبة الاستشارات
                          </h2>
                          <div className="flex items-center gap-2 bg-[#001830] px-3 py-1.5 rounded-lg border border-white/10">
                              <Filter className="w-4 h-4 text-gray-500" />
                              <span className="text-xs text-gray-400">الكل</span>
                          </div>
                      </div>

                      <div className="space-y-4">
                          {consultations.length === 0 ? (
                              <div className="text-center text-gray-500 py-10">لا توجد استشارات حالياً</div>
                          ) : (
                              consultations.map((post) => (
                                  <GlassCard key={post.id} className="p-4 flex flex-col gap-2 relative">
                                      <div className="flex justify-between">
                                          <span className="text-white font-bold text-sm">{post.name}</span>
                                          <span className="text-xs text-gray-500">{post.time}</span>
                                      </div>
                                      <p className="text-gray-300 text-sm">{post.content}</p>
                                      
                                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                          <span className={cn("text-[10px] px-2 py-0.5 rounded", post.offers.length > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                              {post.offers.length > 0 ? `تم الرد (${post.offers.length})` : 'لم يتم الرد (متوقفة)'}
                                          </span>
                                          <button type="button" className="text-red-400 text-xs hover:text-red-300">حذف المنشور</button>
                                      </div>
                                  </GlassCard>
                              ))
                          )}
                      </div>
                  </div>
              )}

              {/* TAB 3: Verification Requests */}
              {activeTab === 'requests' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-[#D4AF37] text-xl font-bold mb-4 flex items-center gap-2">
                          <ShieldAlert className="w-6 h-6" /> طلبات التوثيق ({PENDING_LAWYERS.length})
                      </h2>
                      
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          {PENDING_LAWYERS.map((lawyer) => (
                              <GlassCard key={lawyer.id} className="p-0 overflow-hidden flex flex-col md:flex-row">
                                  {/* ID Image */}
                                  <div className="w-full md:w-48 h-48 md:h-auto bg-gray-900 relative group cursor-zoom-in">
                                      <img src={lawyer.image} alt="ID" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-500" />
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                          <Search className="w-8 h-8 text-white/50 group-hover:text-[#D4AF37] transition" />
                                      </div>
                                  </div>
                                  
                                  <div className="p-6 flex-1 flex flex-col justify-between">
                                      <div>
                                          <h3 className="text-white font-bold text-xl mb-1">{lawyer.name}</h3>
                                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                                              <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/20">محامي</span>
                                              <span>• {lawyer.city}</span>
                                          </div>
                                          <div className="space-y-1 mb-6">
                                              <p className="text-gray-500 text-xs">رقم هوية النقابة</p>
                                              <p className="text-white font-mono text-lg tracking-widest border-b border-white/10 pb-1 inline-block">{lawyer.unionId}</p>
                                          </div>
                                      </div>
                                      
                                      <div className="flex gap-3">
                                          <button type="button" className="flex-1 bg-[#D4AF37] hover:bg-[#FCEEA7] text-[#001830] py-2.5 rounded-lg font-bold transition flex items-center justify-center gap-2">
                                              <CheckCircle className="w-4 h-4" /> قبول
                                          </button>
                                          <button type="button" className="flex-1 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/30 py-2.5 rounded-lg font-bold transition flex items-center justify-center gap-2">
                                              <XCircle className="w-4 h-4" /> رفض
                                          </button>
                                      </div>
                                  </div>
                              </GlassCard>
                          ))}
                      </div>
                  </div>
              )}

              {/* TAB 4: User Management */}
              {activeTab === 'users' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-[#D4AF37] text-xl font-bold mb-4 flex items-center gap-2">
                          <Users className="w-6 h-6" /> إدارة الحسابات
                      </h2>
                      
                      <div className="relative mb-6">
                          <Search className="absolute right-4 top-4 text-gray-500 w-5 h-5" />
                          <input 
                            type="text" 
                            placeholder="ابحث عن اسم، رقم هاتف، أو بريد إلكتروني..." 
                            className="w-full bg-[#001020] border border-[#D4AF37]/20 rounded-xl py-3 pr-12 text-white outline-none focus:border-[#D4AF37] transition-colors"
                          />
                      </div>

                      <div className="space-y-4">
                          {ALL_USERS.map((user) => (
                              <GlassCard key={user.id} className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-[#D4AF37]/30 transition group">
                                  <div className="flex items-center gap-4 w-full sm:w-auto">
                                      <div className={cn(
                                          "w-12 h-12 rounded-full flex items-center justify-center border",
                                          user.status === 'banned' ? "bg-red-500/10 border-red-500 text-red-500" : "bg-gray-800 border-gray-600 text-gray-400"
                                      )}>
                                          {user.status === 'banned' ? <UserX className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                      </div>
                                      <div>
                                          <h3 className="text-white font-bold">{user.name}</h3>
                                          <div className="flex items-center gap-2 mt-1">
                                              <span className={cn("text-[10px] px-2 py-0.5 rounded border", user.type === 'lawyer' ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-gray-700 text-gray-300 border-gray-600")}>
                                                  {user.type === 'lawyer' ? 'محامي' : 'موكل'}
                                              </span>
                                              {user.reports > 0 && (
                                                  <span className="text-[10px] text-red-400 flex items-center gap-1">
                                                      <AlertTriangle className="w-3 h-3" /> {user.reports} بلاغات
                                                  </span>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex gap-2 w-full sm:w-auto">
                                      {user.status === 'active' ? (
                                          <>
                                              <button type="button" className="flex-1 sm:flex-none px-4 py-2 bg-yellow-600/20 text-yellow-500 border border-yellow-600/50 rounded-lg text-sm font-bold hover:bg-yellow-600 hover:text-black transition flex items-center justify-center gap-2">
                                                  <PauseCircle className="w-4 h-4" /> تجميد
                                              </button>
                                              <button type="button" className="flex-1 sm:flex-none px-4 py-2 bg-red-900/30 text-red-500 border border-red-500/50 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-2">
                                                  <UserX className="w-4 h-4" /> حظر نهائي
                                              </button>
                                          </>
                                      ) : (
                                          <button type="button" className="w-full sm:w-auto px-6 py-2 bg-green-600/20 text-green-500 border border-green-600/50 rounded-lg text-sm font-bold hover:bg-green-600 hover:text-white transition flex items-center justify-center gap-2">
                                              <CheckCircle className="w-4 h-4" /> رفع الحظر
                                          </button>
                                      )}
                                  </div>
                              </GlassCard>
                          ))}
                      </div>
                  </div>
              )}

              {/* TAB 5: Reports Inbox */}
              {activeTab === 'reports' && (
                  <ReportsInbox />
              )}

              {/* TAB 6: Forum Management */}
              {activeTab === 'forum' && (
                  <ForumAdminPanel />
              )}

          </div>
      </div>
    </PageWrapper>
  );
};

const ReportsInbox = () => {
    const [reportsData, setReportsData] = useState<{ id: string; postId: string; reporterId: string; reason: string; createdAt: string; status: string; post: { id: string; title: string; content: string; authorName?: string } | null }[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchReports = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/forum/reports');
            const data = await res.json();
            if (data.ok) {
                setReportsData(data.reports);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleDismiss = async (reportId: string) => {
        setActionLoading(reportId);
        try {
            await fetch('/api/forum/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'dismiss', reportId }),
            });
            await fetchReports();
        } catch {
            // silent
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeletePost = async (postId: string, reportId: string) => {
        setActionLoading(reportId);
        try {
            await fetch('/api/forum/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_post', postId, reportId }),
            });
            await fetchReports();
        } catch {
            // silent
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#D4AF37] text-xl font-bold flex items-center gap-2">
                    <Flag className="w-6 h-6" /> صندوق البلاغات
                    {reportsData.length > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {reportsData.length}
                        </span>
                    )}
                </h2>
                <button type="button"
                    onClick={fetchReports}
                    className="text-xs text-gray-400 hover:text-white transition flex items-center gap-1"
                >
                    <Search className="w-3 h-3" /> تحديث
                </button>
            </div>

            {loading ? (
                <div className="text-center text-gray-500 py-10">جاري تحميل البلاغات...</div>
            ) : reportsData.length === 0 ? (
                <div className="text-center text-gray-500 py-16">
                    <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد بلاغات جديدة</p>
                    <p className="text-xs text-gray-600 mt-1">جميع المنشورات آمنة حتى الآن</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reportsData.map((report) => (
                        <GlassCard key={report.id} className="p-5 border-r-4 border-r-red-500/50">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                        <span className="text-sm font-bold text-white truncate">
                                            {report.post?.title || 'منشور بدون عنوان'}
                                        </span>
                                    </div>

                                    <p className="text-gray-400 text-xs mb-2 line-clamp-2">
                                        {report.post?.content || 'المحتوى محذوف أو غير متاح'}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 mt-2">
                                        <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded">
                                            🚨 {report.reason}
                                        </span>
                                        <span>
                                            📅 {new Date(report.createdAt).toLocaleDateString('ar-IQ')}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                    <button type="button"
                                        onClick={() => handleDeletePost(report.postId, report.id)}
                                        disabled={actionLoading === report.id}
                                        className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition disabled:opacity-50 flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" /> حذف المنشور
                                    </button>
                                    <button type="button"
                                        onClick={() => handleDismiss(report.id)}
                                        disabled={actionLoading === report.id}
                                        className="px-3 py-2 bg-gray-700/30 text-gray-400 border border-gray-600/30 rounded-lg text-xs font-bold hover:bg-gray-600 hover:text-white transition disabled:opacity-50 flex items-center gap-1"
                                    >
                                        <XCircle className="w-3 h-3" /> تجاهل
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
};

const ForumAdminPanel = () => {
    const [stats, setStats] = useState<{
        totalPosts: number; totalComments: number; totalUpvotes: number;
        totalReports: number; pendingReports: number; totalDocuments: number;
        totalBannedUsers: number; topTags: { tag: string; count: number }[];
    } | null>(null);
    const [bannedUsers, setBannedUsers] = useState<{ userId: string; userName: string; reason: string; bannedAt: string; expiresAt?: string }[]>([]);
    const [forumTab, setForumTab] = useState<'stats' | 'bans' | 'pins'>('stats');
    const [loading, setLoading] = useState(true);
    const [banReason, setBanReason] = useState('');
    const [banUserId, setBanUserId] = useState('');
    const [banUserName, setBanUserName] = useState('');

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, bansRes] = await Promise.all([
                fetch('/api/forum/stats'),
                fetch('/api/forum/ban'),
            ]);
            const statsData = await statsRes.json();
            const bansData = await bansRes.json();
            if (statsData.ok) setStats(statsData.stats);
            if (bansData.ok) setBannedUsers(bansData.bannedUsers);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { fetchData(); }, [fetchData]);

    const handleBan = async () => {
        if (!banUserId.trim() || !banUserName.trim() || !banReason.trim()) {
            SmartToast.warning('يرجى ملء جميع الحقول');
            return;
        }
        try {
            const res = await fetch('/api/forum/ban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ban', userId: banUserId, userName: banUserName, reason: banReason }),
            });
            const data = await res.json();
            if (data.ok) {
                SmartToast.success('تم حظر المستخدم');
                setBanUserId(''); setBanUserName(''); setBanReason('');
                await fetchData();
            } else {
                SmartToast.error(data.error || 'فشل الحظر');
            }
        } catch {
            SmartToast.error('فشل الاتصال بالخادم');
        }
    };

    const handleUnban = async (userId: string) => {
        try {
            const res = await fetch('/api/forum/ban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'unban', userId }),
            });
            const data = await res.json();
            if (data.ok) {
                SmartToast.success('تم رفع الحظر');
                await fetchData();
            }
        } catch {
            SmartToast.error('فشل الاتصال بالخادم');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#D4AF37] text-xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" /> إدارة المنتدى القانوني
                </h2>
                <button type="button" onClick={fetchData} className="text-xs text-gray-400 hover:text-white transition">🔄 تحديث</button>
            </div>

            <div className="flex gap-2 mb-4 border-b border-white/5 pb-2">
                <button type="button" onClick={() => setForumTab('stats')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${forumTab === 'stats' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-gray-400 hover:text-white'}`}>
                    الإحصائيات
                </button>
                <button type="button" onClick={() => setForumTab('bans')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${forumTab === 'bans' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-gray-400 hover:text-white'}`}>
                    الحظر
                </button>
            </div>

            {loading ? (
                <div className="text-center text-gray-500 py-10">جاري التحميل...</div>
            ) : forumTab === 'stats' && stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <GlassCard className="p-4 text-center border-t-4 border-t-blue-500/50">
                        <p className="text-2xl font-bold text-white">{stats.totalPosts}</p>
                        <p className="text-xs text-gray-400 mt-1">إجمالي المنشورات</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center border-t-4 border-t-emerald-500/50">
                        <p className="text-2xl font-bold text-white">{stats.totalComments}</p>
                        <p className="text-xs text-gray-400 mt-1">إجمالي التعليقات</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center border-t-4 border-t-amber-500/50">
                        <p className="text-2xl font-bold text-white">{stats.totalUpvotes}</p>
                        <p className="text-xs text-gray-400 mt-1">إجمالي الإعجابات</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center border-t-4 border-t-red-500/50">
                        <p className="text-2xl font-bold text-white">{stats.pendingReports}</p>
                        <p className="text-xs text-gray-400 mt-1">بلاغات معلقة</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center border-t-4 border-t-purple-500/50">
                        <p className="text-2xl font-bold text-white">{stats.totalDocuments}</p>
                        <p className="text-xs text-gray-400 mt-1">مستندات قانونية</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center border-t-4 border-t-red-600/50">
                        <p className="text-2xl font-bold text-white">{stats.totalBannedUsers}</p>
                        <p className="text-xs text-gray-400 mt-1">مستخدمين محظورين</p>
                    </GlassCard>
                    <GlassCard className="p-4 col-span-2">
                        <p className="text-xs text-gray-400 mb-2">الوسوم الأكثر شيوعاً</p>
                        <div className="flex flex-wrap gap-1.5">
                            {stats.topTags.slice(0, 8).map((t) => (
                                <span key={t.tag} className="bg-white/5 text-white/70 px-2 py-0.5 rounded text-[11px]">
                                    {t.tag} ({t.count})
                                </span>
                            ))}
                            {stats.topTags.length === 0 && <span className="text-gray-500 text-xs">لا توجد وسوم</span>}
                        </div>
                    </GlassCard>
                    <GlassCard className="p-4 col-span-2">
                        <p className="text-xs text-gray-400 mb-2">إجمالي التقارير</p>
                        <p className="text-2xl font-bold text-white">{stats.totalReports}</p>
                        <p className="text-xs text-gray-400 mt-1">منذ بداية المنتدى</p>
                    </GlassCard>
                </div>
            ) : forumTab === 'bans' ? (
                <div className="space-y-4">
                    <GlassCard className="p-5">
                        <h3 className="text-white font-bold text-sm mb-4">حظر مستخدم</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <input
                                value={banUserId}
                                onChange={(e) => setBanUserId(e.target.value)}
                                placeholder="معرف المستخدم (User ID)"
                                className="h-11 bg-[#001830] rounded-xl px-4 text-white text-sm placeholder-gray-500 border border-white/10 focus:border-[#D4AF37]/50 focus:outline-none"
                            />
                            <input
                                value={banUserName}
                                onChange={(e) => setBanUserName(e.target.value)}
                                placeholder="اسم المستخدم"
                                className="h-11 bg-[#001830] rounded-xl px-4 text-white text-sm placeholder-gray-500 border border-white/10 focus:border-[#D4AF37]/50 focus:outline-none"
                            />
                            <input
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="سبب الحظر"
                                className="h-11 bg-[#001830] rounded-xl px-4 text-white text-sm placeholder-gray-500 border border-white/10 focus:border-[#D4AF37]/50 focus:outline-none"
                            />
                        </div>
                        <button type="button"
                            onClick={handleBan}
                            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition"
                        >
                            حظر
                        </button>
                    </GlassCard>

                    <h3 className="text-white font-bold text-sm">المستخدمون المحظورون ({bannedUsers.length})</h3>
                    {bannedUsers.length === 0 ? (
                        <p className="text-gray-500 text-xs">لا يوجد مستخدمون محظورون</p>
                    ) : (
                        bannedUsers.map((b) => (
                            <GlassCard key={b.userId} className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-white font-bold text-sm">{b.userName}</p>
                                    <p className="text-gray-400 text-xs">سبب الحظر: {b.reason}</p>
                                    <p className="text-gray-500 text-[10px]">{new Date(b.bannedAt).toLocaleDateString('ar-IQ')}</p>
                                </div>
                                <button type="button"
                                    onClick={() => handleUnban(b.userId)}
                                    className="px-4 py-2 bg-green-600/20 text-green-500 border border-green-600/50 rounded-lg text-xs font-bold hover:bg-green-600 hover:text-white transition"
                                >
                                    رفع الحظر
                                </button>
                            </GlassCard>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
};

const AdminTab = ({ active, onClick, icon: Icon, alert, label }: AdminTabProps) => (
    <button type="button" 
        onClick={onClick}
        className={cn(
            "p-3 md:w-full md:flex md:items-center md:gap-3 md:px-4 rounded-xl transition-all relative group",
            active 
                ? "bg-[#D4AF37] text-[#001830] shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
                : "text-gray-400 hover:bg-white/5 hover:text-white"
        )}
    >
        <div className="relative">
            <Icon className="w-6 h-6" />
            {alert && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#001830]" />}
        </div>
        <span className="hidden md:block text-sm font-bold">{label}</span>
    </button>
);
