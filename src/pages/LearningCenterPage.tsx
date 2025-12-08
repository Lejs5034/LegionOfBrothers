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
    if (!serverId || !userId) return;

    try {
      const { data: serverData } = await supabase
        .from('servers')
        .select('id')
        .eq('slug', serverId)
        .maybeSingle();

      if (!serverData) return;

      const { data, error } = await supabase.rpc('can_upload_courses_to_server', {
        user_id: userId,
        target_server_id: serverData.id,
      });

      if (!error) {
        setCanUpload(data === true);
      }
    } catch (error) {
      console.error('Error checking upload permission:', error);
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

    setUploading(true);

    try {
      const { data: serverData } = await supabase
        .from('servers')
        .select('id')
        .eq('slug', serverId)
        .maybeSingle();

      if (!serverData) return;

      const { error } = await supabase.from('courses').insert({
        server_id: serverData.id,
        title: uploadForm.title,
        description: uploadForm.description,
        category: uploadForm.category,
        cover_image_url: uploadForm.cover_image_url || null,
        created_by: userId,
      });

      if (error) {
        console.error('Error uploading course:', error);
        alert('Failed to upload course. Please check your permissions.');
      } else {
        setShowUploadModal(false);
        setUploadForm({ title: '', description: '', category: '', cover_image_url: '' });
        loadCourses();
      }
    } catch (error) {
      console.error('Error uploading course:', error);
      alert('An error occurred while uploading the course.');
    } finally {
      setUploading(false);
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
                  disabled={uploading || !uploadForm.title || !uploadForm.description || !uploadForm.category}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-sm text-white transition-all"
                  style={{
                    background: uploading || !uploadForm.title || !uploadForm.description || !uploadForm.category
                      ? 'var(--border)'
                      : 'var(--accent-grad)',
                    cursor: uploading || !uploadForm.title || !uploadForm.description || !uploadForm.category
                      ? 'not-allowed'
                      : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading && uploadForm.title && uploadForm.description && uploadForm.category) {
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
    </div>
  );
}
