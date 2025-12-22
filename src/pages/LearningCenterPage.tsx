import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Play, Bookmark, BookmarkCheck, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  category: string;
  created_at: string;
  video_url: string | null;
}

interface CourseProgress {
  id: string;
  course_id: string;
  progress_percent: number;
  is_bookmarked: boolean;
  started_at: string;
  last_accessed_at: string;
  completed_at: string | null;
}

interface CourseWithProgress extends Course {
  progress?: CourseProgress;
}

type TabType = 'categories' | 'in-progress' | 'bookmarks';

export default function LearningCenterPage() {
  const navigate = useNavigate();
  const { serverId } = useParams<{ serverId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverName, setServerName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [canUpload, setCanUpload] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: '',
    cover_image_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithProgress | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    userId: '',
    serverIdReal: '',
    serverNameReal: '',
    globalRole: '',
    globalPowerLevel: 999,
    serverRoles: [] as string[],
    allowedUploaderRoles: [] as string[],
    canUpload: false,
    reason: '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/signin');
        return;
      }
      setUserId(user.id);
    };
    fetchUser();
  }, [navigate]);

  const checkUploadPermission = useCallback(async () => {
    console.log('🔍 [PERMISSION CHECK] Starting permission check...');
    console.log('🔍 [PERMISSION CHECK] serverId:', serverId);
    console.log('🔍 [PERMISSION CHECK] userId:', userId);

    if (!serverId || !userId) {
      console.log('❌ [PERMISSION CHECK] Missing serverId or userId, aborting');
      return;
    }

    try {
      const { data: serverData } = await supabase
        .from('servers')
        .select('id, name')
        .eq('slug', serverId)
        .maybeSingle();

      console.log('🔍 [PERMISSION CHECK] Server data:', serverData);

      if (!serverData) {
        console.log('❌ [PERMISSION CHECK] Server not found, aborting');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('global_rank, rank_hierarchy(display_name, power_level)')
        .eq('id', userId)
        .maybeSingle();

      console.log('🔍 [PERMISSION CHECK] Profile data:', profileData);

      const globalRankDisplay = profileData?.rank_hierarchy?.display_name || 'User';
      const globalPowerLevel = profileData?.rank_hierarchy?.power_level || 999;

      console.log('🔍 [PERMISSION CHECK] Global role:', globalRankDisplay, 'Power level:', globalPowerLevel);

      const { data: serverRolesData } = await supabase
        .from('server_members')
        .select('role_id, server_roles(name)')
        .eq('user_id', userId)
        .eq('server_id', serverData.id);

      console.log('🔍 [PERMISSION CHECK] Server roles data:', serverRolesData);

      const serverRoles = serverRolesData?.map((m: any) => m.server_roles?.name).filter(Boolean) || [];
      const roleInThisServer = serverRoles[0] || 'No server role';

      const { data: allowedRolesData } = await supabase
        .from('server_roles')
        .select('name, role_permissions(can_upload_courses_own_server)')
        .eq('server_id', serverData.id);

      console.log('🔍 [PERMISSION CHECK] Allowed roles data:', allowedRolesData);

      const allowedUploaderRoles = allowedRolesData
        ?.filter((role: any) => role.role_permissions?.can_upload_courses_own_server === true)
        .map((role: any) => role.name) || [];

      console.log('🔍 [PERMISSION CHECK] Allowed uploader roles:', allowedUploaderRoles);

      console.log('🔍 [PERMISSION CHECK] Calling can_upload_courses_to_server RPC...');
      const { data, error } = await supabase.rpc('can_upload_courses_to_server', {
        user_id: userId,
        target_server_id: serverData.id,
      });

      console.log('🔍 [PERMISSION CHECK] RPC result - data:', data, 'error:', error);

      const canUploadResult = !error && data === true;

      console.log('✅ [PERMISSION CHECK] Final result - canUpload:', canUploadResult);

      setCanUpload(canUploadResult);

      let reason = '';
      const isGlobalRole = globalPowerLevel <= 2;

      if (isGlobalRole) {
        reason = canUploadResult
          ? `Global role override: ${globalRankDisplay} can upload to any server`
          : `Global role detected but permission check failed`;
      } else {
        const userHasAllowedRole = serverRoles.some((r: string) => allowedUploaderRoles.includes(r));

        if (canUploadResult && userHasAllowedRole) {
          const userAllowedRole = serverRoles.find((r: string) => allowedUploaderRoles.includes(r));
          reason = `Server role "${userAllowedRole}" has upload permission in ${serverData.name}`;
        } else if (!canUploadResult && serverRoles.length > 0) {
          reason = `Server role "${roleInThisServer}" does not have upload permission in ${serverData.name}`;
        } else if (!canUploadResult) {
          reason = `Not a member of ${serverData.name} or no upload permission`;
        } else {
          reason = `No upload permission in ${serverData.name}`;
        }
      }

      console.log('🔍 [PERMISSION CHECK] Reason:', reason);

      setShowDebugPanel(true);

      setDebugInfo({
        userId,
        serverIdReal: serverData.id,
        serverNameReal: serverData.name,
        globalRole: globalRankDisplay,
        globalPowerLevel,
        serverRoles,
        allowedUploaderRoles,
        canUpload: canUploadResult,
        reason,
      });

      console.log('🔍 [PERMISSION CHECK] Debug panel visible: true (always shown)');
    } catch (error) {
      console.error('❌ [PERMISSION CHECK] Error checking upload permission:', error);
    }
  }, [serverId, userId]);

  const loadServerName = useCallback(async () => {
    if (!serverId) return;

    const { data } = await supabase
      .from('servers')
      .select('name')
      .eq('slug', serverId)
      .maybeSingle();

    if (data) {
      setServerName(data.name);
    }
  }, [serverId]);

  const loadCourses = useCallback(async () => {
    if (!serverId || !userId) return;

    setLoading(true);

    try {
      const { data: serverData } = await supabase
        .from('servers')
        .select('id')
        .eq('slug', serverId)
        .maybeSingle();

      if (!serverData) return;

      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('server_id', serverData.id)
        .order('created_at', { ascending: false });

      if (!coursesData) {
        setCourses([]);
        return;
      }

      const { data: progressData } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('server_id', serverData.id);

      const coursesWithProgress: CourseWithProgress[] = coursesData.map(course => ({
        ...course,
        progress: progressData?.find(p => p.course_id === course.id),
      }));

      setCourses(coursesWithProgress);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  }, [serverId, userId]);

  useEffect(() => {
    loadServerName();
  }, [loadServerName]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    checkUploadPermission();
  }, [checkUploadPermission]);

  const handleStartCourse = async (course: CourseWithProgress) => {
    if (!userId || !serverId) return;

    const { data: serverData } = await supabase
      .from('servers')
      .select('id')
      .eq('slug', serverId)
      .maybeSingle();

    if (!serverData) return;

    if (!course.progress) {
      await supabase.from('course_progress').insert({
        user_id: userId,
        course_id: course.id,
        server_id: serverData.id,
        progress_percent: 0,
        is_bookmarked: false,
      });
    } else {
      await supabase
        .from('course_progress')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', course.progress.id);
    }

    setSelectedCourse(course);
    loadCourses();
  };

  const handleToggleBookmark = async (course: CourseWithProgress) => {
    if (!userId || !serverId) return;

    const { data: serverData } = await supabase
      .from('servers')
      .select('id')
      .eq('slug', serverId)
      .maybeSingle();

    if (!serverData) return;

    if (!course.progress) {
      await supabase.from('course_progress').insert({
        user_id: userId,
        course_id: course.id,
        server_id: serverData.id,
        progress_percent: 0,
        is_bookmarked: true,
      });
    } else {
      await supabase
        .from('course_progress')
        .update({ is_bookmarked: !course.progress.is_bookmarked })
        .eq('id', course.progress.id);
    }

    loadCourses();
  };

  const getFilteredCourses = () => {
    switch (activeTab) {
      case 'in-progress':
        return courses.filter(c => c.progress && c.progress.progress_percent > 0 && c.progress.progress_percent < 100);
      case 'bookmarks':
        return courses.filter(c => c.progress?.is_bookmarked);
      default:
        return courses;
    }
  };

  const handleUploadCourse = async () => {
    if (!serverId || !userId) return;
    if (!uploadForm.title || !uploadForm.description || !uploadForm.category) return;
    if (!videoFile) {
      alert('Please select a video file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: serverData } = await supabase
        .from('servers')
        .select('id')
        .eq('slug', serverId)
        .maybeSingle();

      if (!serverData) return;

      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      setUploadProgress(25);

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, videoFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading video:', uploadError);
        alert('Failed to upload video file.');
        return;
      }

      setUploadProgress(75);

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      const videoUrl = urlData.publicUrl;

      const { error } = await supabase.from('courses').insert({
        server_id: serverData.id,
        title: uploadForm.title,
        description: uploadForm.description,
        category: uploadForm.category,
        cover_image_url: uploadForm.cover_image_url || null,
        video_url: videoUrl,
        created_by: userId,
      });

      if (error) {
        console.error('Error creating course:', error);
        alert('Failed to create course. Please check your permissions.');
      } else {
        setUploadProgress(100);
        setShowUploadModal(false);
        setUploadForm({ title: '', description: '', category: '', cover_image_url: '' });
        setVideoFile(null);
        loadCourses();
      }
    } catch (error) {
      console.error('Error uploading course:', error);
      alert('An error occurred while uploading the course.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const filteredCourses = getFilteredCourses();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header className="p-4 md:p-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 mb-4 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={16} />
          <span>Back to {serverName || 'Server'}</span>
        </button>

        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent-grad)' }}
          >
            <BookOpen size={20} className="md:w-6 md:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate" style={{ color: 'var(--text)' }}>
              Learning Center
            </h1>
            <p className="text-xs md:text-sm truncate" style={{ color: 'var(--text-muted)' }}>
              {serverName}
            </p>
          </div>
          {canUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="md:hidden p-2 rounded-lg text-white transition-all flex-shrink-0"
              style={{ background: 'var(--accent-grad)' }}
              title="Upload Course"
            >
              <Plus size={20} />
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === 'categories' ? 'shadow-md' : ''
              }`}
              style={{
                background: activeTab === 'categories' ? 'var(--accent-grad)' : 'var(--surface)',
                color: activeTab === 'categories' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab('in-progress')}
              className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === 'in-progress' ? 'shadow-md' : ''
              }`}
              style={{
                background: activeTab === 'in-progress' ? 'var(--accent-grad)' : 'var(--surface)',
                color: activeTab === 'in-progress' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              In Progress
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === 'bookmarks' ? 'shadow-md' : ''
              }`}
              style={{
                background: activeTab === 'bookmarks' ? 'var(--accent-grad)' : 'var(--surface)',
                color: activeTab === 'bookmarks' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              Bookmarks
            </button>
          </div>

          {canUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white transition-all"
              style={{ background: 'var(--accent-grad)' }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
            >
              <Plus size={18} />
              <span>Upload Course</span>
            </button>
          )}
        </div>
      </header>

      {showDebugPanel && (
        <div
          className="mx-4 md:mx-6 mt-4 p-4 rounded-xl text-xs font-mono"
          style={{
            background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
            border: '2px solid #fbbf24',
            boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm" style={{ color: '#fbbf24' }}>
                DEBUG MODE (Temporary)
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Permission check diagnostic panel - visible to all users
              </p>
            </div>
            <span
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                background: debugInfo.canUpload ? '#10b981' : '#ef4444',
                color: '#ffffff',
              }}
            >
              {debugInfo.canUpload ? 'CAN UPLOAD' : 'CANNOT UPLOAD'}
            </span>
          </div>
          <div className="space-y-1" style={{ color: 'var(--text-muted)' }}>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>User ID:</span> {debugInfo.userId}
            </div>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Server ID:</span> {debugInfo.serverIdReal}
            </div>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Server Name:</span> {debugInfo.serverNameReal}
            </div>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Global Role:</span>{' '}
              {debugInfo.globalRole} (Power Level: {debugInfo.globalPowerLevel})
            </div>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Server-Specific Roles:</span>{' '}
              {debugInfo.serverRoles.length > 0 ? debugInfo.serverRoles.join(', ') : 'None'}
            </div>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Allowed Uploader Roles in This Server:</span>{' '}
              <span style={{ color: '#10b981' }}>
                {debugInfo.allowedUploaderRoles.length > 0 ? debugInfo.allowedUploaderRoles.join(', ') : 'None'}
              </span>
            </div>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Detected Highest Role:</span>{' '}
              {debugInfo.globalPowerLevel <= 2
                ? `${debugInfo.globalRole} (Global Override)`
                : debugInfo.serverRoles.length > 0
                  ? debugInfo.serverRoles[0]
                  : debugInfo.globalRole}
            </div>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Can Upload Courses:</span>{' '}
              <span style={{ color: debugInfo.canUpload ? '#10b981' : '#ef4444' }}>
                {debugInfo.canUpload ? 'true' : 'false'}
              </span>
            </div>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Reason:</span> {debugInfo.reason}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p style={{ color: 'var(--text-muted)' }}>Loading courses...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>
              {activeTab === 'in-progress'
                ? 'No courses in progress'
                : activeTab === 'bookmarks'
                ? 'No bookmarked courses'
                : 'No courses yet'}
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              {activeTab === 'categories'
                ? 'Courses will appear here when they are added to this server.'
                : activeTab === 'in-progress'
                ? 'Start a course to see it here.'
                : 'Bookmark courses to find them easily later.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl overflow-hidden transition-transform hover:scale-105"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  className="h-40 flex items-center justify-center"
                  style={{
                    background: course.cover_image_url
                      ? `url(${course.cover_image_url}) center/cover`
                      : 'var(--accent-grad)',
                  }}
                >
                  {!course.cover_image_url && (
                    <BookOpen size={48} className="text-white opacity-60" />
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>
                      {course.title}
                    </h3>
                    <button
                      onClick={() => handleToggleBookmark(course)}
                      className="p-1 rounded transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#fbbf24'}
                      onMouseLeave={(e) =>
                        e.currentTarget.style.color = course.progress?.is_bookmarked
                          ? '#fbbf24'
                          : 'var(--text-muted)'
                      }
                    >
                      {course.progress?.is_bookmarked ? (
                        <BookmarkCheck size={20} style={{ color: '#fbbf24' }} />
                      ) : (
                        <Bookmark size={20} />
                      )}
                    </button>
                  </div>

                  <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                    {course.description}
                  </p>

                  <div className="mb-3">
                    <span
                      className="inline-block px-2 py-1 text-xs font-medium rounded"
                      style={{
                        background: 'var(--accent-grad)',
                        color: '#ffffff',
                      }}
                    >
                      {course.category}
                    </span>
                  </div>

                  {course.progress && course.progress.progress_percent > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                        <span>Progress</span>
                        <span>{course.progress.progress_percent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${course.progress.progress_percent}%`,
                            background: 'var(--accent-grad)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleStartCourse(course)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white transition-all"
                    style={{ background: 'var(--accent-grad)' }}
                    onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                  >
                    <Play size={16} />
                    <span>{course.progress ? 'Continue Course' : 'Start Course'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showUploadModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                Upload New Course
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                  Course Title
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  placeholder="Enter course title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg resize-none"
                  rows={4}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  placeholder="Enter course description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                  Category
                </label>
                <input
                  type="text"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  placeholder="e.g., Marketing, Technical, Fundamentals"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                  Video File <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
                {videoFile && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                  Cover Image URL (optional)
                </label>
                <input
                  type="text"
                  value={uploadForm.cover_image_url}
                  onChange={(e) => setUploadForm({ ...uploadForm, cover_image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {uploading && uploadProgress > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${uploadProgress}%`,
                        background: 'var(--accent-grad)',
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-muted)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadCourse}
                  disabled={uploading || !uploadForm.title || !uploadForm.description || !uploadForm.category || !videoFile}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-sm text-white transition-all"
                  style={{
                    background: uploading || !uploadForm.title || !uploadForm.description || !uploadForm.category || !videoFile
                      ? 'var(--border)'
                      : 'var(--accent-grad)',
                    cursor: uploading || !uploadForm.title || !uploadForm.description || !uploadForm.category || !videoFile
                      ? 'not-allowed'
                      : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading && uploadForm.title && uploadForm.description && uploadForm.category && videoFile) {
                      e.currentTarget.style.filter = 'brightness(1.1)';
                    }
                  }}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                >
                  {uploading ? 'Uploading...' : 'Upload Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCourse && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setSelectedCourse(null)}
        >
          <div
            className="rounded-xl w-full max-w-4xl"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                  {selectedCourse.title}
                </h2>
                <span
                  className="inline-block px-2 py-1 text-xs font-medium rounded mt-1"
                  style={{
                    background: 'var(--accent-grad)',
                    color: '#ffffff',
                  }}
                >
                  {selectedCourse.category}
                </span>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4">
              {selectedCourse.video_url ? (
                <video
                  controls
                  className="w-full rounded-lg"
                  style={{ maxHeight: '60vh' }}
                  src={selectedCourse.video_url}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div
                  className="w-full h-64 flex items-center justify-center rounded-lg"
                  style={{ background: 'var(--bg)' }}
                >
                  <p style={{ color: 'var(--text-muted)' }}>No video available for this course</p>
                </div>
              )}

              <div className="mt-4">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {selectedCourse.description}
                </p>
              </div>

              {selectedCourse.progress && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text)' }}>
                    <span className="font-medium">Your Progress</span>
                    <span>{selectedCourse.progress.progress_percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${selectedCourse.progress.progress_percent}%`,
                        background: 'var(--accent-grad)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
