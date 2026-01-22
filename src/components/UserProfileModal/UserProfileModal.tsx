import { useState, useEffect, useRef } from 'react';
import { X, Shield, Award, TrendingUp, Calendar, Clock, Target, Zap, Ban, UserCog, Camera, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { getRankOrder } from '../../utils/rankUtils';
import { getEffectiveDisplayRole } from '../../utils/displayRankUtils';
import RoleManagementModal from '../RoleManagementModal/RoleManagementModal';

interface ServerRole {
  id: string;
  name: string;
  rank: number;
  color: string;
  icon: string;
}

interface UserProfileData {
  id: string;
  username: string;
  avatar_url?: string;
  global_rank: string;
  rank_display_name: string;
  rank_emoji: string;
  login_streak: number;
  created_at: string;
  is_banned: boolean;
  server_role?: ServerRole | null;
  role_id?: string;
}

interface UserProfileModalProps {
  userId: string;
  serverId?: string;
  onClose: () => void;
}

type TabType = 'information' | 'journey' | 'statistics';

interface RankOption {
  rank: string;
  display_name: string;
  emoji: string;
}

export default function UserProfileModal({ userId, serverId, onClose }: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('information');
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRank, setCurrentUserRank] = useState<string>('user');
  const [banning, setBanning] = useState(false);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [showRankChange, setShowRankChange] = useState(false);
  const [changingRank, setChangingRank] = useState(false);
  const [availableRanks, setAvailableRanks] = useState<RankOption[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRoleManagementModal, setShowRoleManagementModal] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadProfileData();
  }, [userId, serverId]);

  useEffect(() => {
    if (profileData && currentUserRank) {
      loadAvailableRanks();
    }
  }, [profileData, currentUserRank]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('global_rank')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setCurrentUserRank(profile.global_rank);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadProfileData = async () => {
    try {
      setLoading(true);

      const { data: profileView } = await supabase
        .from('profiles_with_ban_status')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profileView) {
        console.error('Profile not found');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('login_streak')
        .eq('id', userId)
        .maybeSingle();

      let serverRole = null;
      let roleId = null;

      if (serverId) {
        const { data: serverData } = await supabase
          .from('servers')
          .select('id')
          .eq('slug', serverId)
          .maybeSingle();

        if (serverData) {
          const { data: memberData } = await supabase
            .from('server_members')
            .select(`
              role_id,
              server_roles:role_id (
                id,
                name,
                rank,
                color,
                icon
              )
            `)
            .eq('user_id', userId)
            .eq('server_id', serverData.id)
            .maybeSingle();

          if (memberData?.server_roles) {
            serverRole = memberData.server_roles as any;
            roleId = memberData.role_id;
          }
        }
      }

      setProfileData({
        id: profileView.id,
        username: profileView.username,
        avatar_url: profileView.avatar_url,
        global_rank: profileView.global_rank,
        rank_display_name: profileView.rank_display_name,
        rank_emoji: profileView.rank_emoji,
        login_streak: profileData?.login_streak || 0,
        created_at: profileView.created_at,
        is_banned: profileView.is_banned,
        server_role: serverRole,
        role_id: roleId,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysSinceJoined = () => {
    if (!profileData) return 0;
    const joinDate = new Date(profileData.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - joinDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };


  const loadAvailableRanks = async () => {
    try {
      const { data: ranks } = await supabase
        .from('rank_hierarchy')
        .select('rank, display_name, emoji');

      if (ranks) {
        const currentUserRankOrder = getRankOrder(currentUserRank);
        const filteredRanks = ranks
          .filter(r => getRankOrder(r.rank) <= currentUserRankOrder)
          .sort((a, b) => getRankOrder(b.rank) - getRankOrder(a.rank));
        setAvailableRanks(filteredRanks);
      }
    } catch (error) {
      console.error('Error loading available ranks:', error);
    }
  };

  const canBanUser = () => {
    if (!profileData || !currentUserId) return false;
    if (currentUserId === userId) return false;
    if (profileData.is_banned) return false;
    return getRankOrder(currentUserRank) >= getRankOrder(profileData.global_rank);
  };

  const canChangeRank = () => {
    if (!profileData || !currentUserId) return false;
    if (currentUserId === userId) return false;
    if (profileData.is_banned) return false;
    return getRankOrder(currentUserRank) >= getRankOrder(profileData.global_rank);
  };

  const handleBanUser = async () => {
    if (!profileData || banning) return;

    try {
      setBanning(true);

      const { data, error } = await supabase.rpc('ban_user_from_platform', {
        target_user_id: userId,
        banner_user_id: currentUserId,
        ban_reason: banReason || 'Violation of platform rules',
        ban_expires_at: null,
      });

      if (error) throw error;

      setShowBanConfirm(false);
      setBanReason('');
      await loadProfileData();
    } catch (error: any) {
      console.error('Error banning user:', error);
      alert(error.message || 'Failed to ban user');
    } finally {
      setBanning(false);
    }
  };

  const handleChangeRank = async (newRank: string) => {
    if (!profileData || changingRank) return;

    try {
      setChangingRank(true);

      const { data, error } = await supabase.rpc('change_user_rank', {
        target_user_id: userId,
        new_rank: newRank,
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to change rank');
      }

      setShowRankChange(false);
      await loadProfileData();
    } catch (error: any) {
      console.error('Error changing rank:', error);
      alert(error.message || 'Failed to change rank');
    } finally {
      setChangingRank(false);
    }
  };

  const isOwnProfile = () => currentUserId === userId;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (PNG, JPG, JPEG, or WEBP)');
      return;
    }

    if (file.size > 5242880) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
      setShowAvatarUpload(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile || !currentUserId) return;

    try {
      setUploadingAvatar(true);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${currentUserId}/avatar-${Date.now()}.${fileExt}`;

      if (profileData?.avatar_url) {
        const oldPath = profileData.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${currentUserId}/${oldPath}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', currentUserId);

      if (updateError) throw updateError;

      setShowAvatarUpload(false);
      setSelectedFile(null);
      setAvatarPreview(null);
      await loadProfileData();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const cancelAvatarUpload = () => {
    setShowAvatarUpload(false);
    setSelectedFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'information', label: 'Information' },
    { id: 'journey', label: "Hero's Journey" },
    { id: 'statistics', label: 'Statistics' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.75)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg transition-all duration-200"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            <X size={20} />
          </button>

          <div className="flex border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 relative"
                style={{
                  color: activeTab === tab.id ? '#06b6d4' : 'rgba(255, 255, 255, 0.5)',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                  }
                }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)' }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent" />
              </div>
            ) : !profileData ? (
              <div className="text-center py-12" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Failed to load profile data
              </div>
            ) : (
              <>
                {activeTab === 'information' && (
                  <motion.div
                    key="information"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-6 mb-6">
                      <div className="relative flex-shrink-0">
                        {profileData.avatar_url ? (
                          <img
                            src={profileData.avatar_url}
                            alt={profileData.username}
                            className="size-24 rounded-full object-cover"
                            style={{ border: '3px solid rgba(6, 182, 212, 0.3)' }}
                          />
                        ) : (
                          <div
                            className="size-24 rounded-full flex items-center justify-center text-white font-bold text-3xl"
                            style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }}
                          >
                            {profileData.username[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        {isOwnProfile() && (
                          <>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute bottom-0 right-0 p-2 rounded-full transition-all duration-200"
                              style={{
                                background: 'rgba(6, 182, 212, 0.9)',
                                border: '2px solid rgba(17, 24, 39, 1)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(6, 182, 212, 1)';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.9)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              <Camera size={16} style={{ color: 'white' }} />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-3xl font-black mb-2" style={{ color: 'white' }}>
                          {profileData.username}
                        </h2>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {profileData && (() => {
                            const effectiveRole = getEffectiveDisplayRole({
                              global_rank: profileData.global_rank,
                              server_role: profileData.server_role,
                            });
                            return (
                              <span
                                className="px-3 py-1 rounded-full text-sm font-semibold"
                                style={{
                                  background: `${effectiveRole.color}20`,
                                  color: effectiveRole.color,
                                  border: `1px solid ${effectiveRole.color}50`,
                                }}
                              >
                                {effectiveRole.emoji} {effectiveRole.label}
                              </span>
                            );
                          })()}
                          {profileData.is_banned && (
                            <span
                              className="px-3 py-1 rounded-full text-sm font-semibold"
                              style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                              }}
                            >
                              🚫 Banned
                            </span>
                          )}
                          {canChangeRank() && serverId && (
                            <button
                              onClick={() => setShowRoleManagementModal(true)}
                              className="px-3 py-1 rounded-full text-sm font-semibold transition-all flex items-center gap-1"
                              style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                color: '#8b5cf6',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                              }}
                            >
                              <UserCog size={14} />
                              Manage Server Role
                            </button>
                          )}
                          {canBanUser() && (
                            <button
                              onClick={() => setShowBanConfirm(true)}
                              className="px-3 py-1 rounded-full text-sm font-semibold transition-all flex items-center gap-1"
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                              }}
                            >
                              <Ban size={14} />
                              Ban User
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div
                        className="p-4 rounded-xl"
                        style={{
                          background: 'rgba(251, 191, 36, 0.05)',
                          border: '1px solid rgba(251, 191, 36, 0.2)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock size={18} style={{ color: '#fbbf24' }} />
                          <span className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Login Streak
                          </span>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: 'white' }}>
                          {profileData.login_streak} {profileData.login_streak === 1 ? 'day' : 'days'}
                        </p>
                      </div>

                      <div
                        className="p-4 rounded-xl"
                        style={{
                          background: 'rgba(139, 92, 246, 0.05)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar size={18} style={{ color: '#8b5cf6' }} />
                          <span className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Joined
                          </span>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: 'white' }}>
                          {formatDate(profileData.created_at)}
                        </p>
                      </div>
                    </div>

                    <div
                      className="p-4 rounded-xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <h3 className="text-lg font-bold mb-3" style={{ color: 'white' }}>
                        About
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Member for</span>
                          <span style={{ color: 'white' }} className="font-semibold">
                            {getDaysSinceJoined()} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>User ID</span>
                          <span
                            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                            className="font-mono text-xs"
                          >
                            {profileData.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'journey' && (
                  <motion.div
                    key="journey"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-center py-12">
                      <Target size={48} className="mx-auto mb-4" style={{ color: 'rgba(139, 92, 246, 0.5)' }} />
                      <h3 className="text-xl font-bold mb-2" style={{ color: 'white' }}>
                        Hero's Journey
                      </h3>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Track achievements, milestones, and progress
                      </p>
                      <p className="text-sm mt-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                        Coming soon...
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'statistics' && (
                  <motion.div
                    key="statistics"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className="p-4 rounded-xl"
                        style={{
                          background: 'rgba(6, 182, 212, 0.05)',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Award size={20} style={{ color: '#06b6d4' }} />
                          <span className="font-semibold" style={{ color: 'white' }}>
                            Messages Sent
                          </span>
                        </div>
                        <p className="text-3xl font-bold" style={{ color: '#06b6d4' }}>
                          -
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                          Coming soon
                        </p>
                      </div>

                      <div
                        className="p-4 rounded-xl"
                        style={{
                          background: 'rgba(139, 92, 246, 0.05)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={20} style={{ color: '#8b5cf6' }} />
                          <span className="font-semibold" style={{ color: 'white' }}>
                            Activity Score
                          </span>
                        </div>
                        <p className="text-3xl font-bold" style={{ color: '#8b5cf6' }}>
                          -
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                          Coming soon
                        </p>
                      </div>

                      <div
                        className="p-4 rounded-xl"
                        style={{
                          background: 'rgba(34, 197, 94, 0.05)',
                          border: '1px solid rgba(34, 197, 94, 0.2)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Target size={20} style={{ color: '#22c55e' }} />
                          <span className="font-semibold" style={{ color: 'white' }}>
                            Courses Completed
                          </span>
                        </div>
                        <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>
                          -
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                          Coming soon
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.div>

        {showBanConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center p-6"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
            onClick={() => !banning && setShowBanConfirm(false)}
          >
            <div
              className="relative max-w-md w-full p-6 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-3 rounded-full"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <Ban size={24} style={{ color: '#ef4444' }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'white' }}>
                    Ban User
                  </h3>
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    This action will ban the user platform-wide
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  You are about to permanently ban <strong style={{ color: 'white' }}>{profileData?.username}</strong> from the entire platform.
                </p>
                <p className="text-xs mb-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  They will be removed from all servers and unable to send messages or participate in any activities.
                </p>

                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Violation of platform rules"
                  disabled={banning}
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'white',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBanConfirm(false)}
                  disabled={banning}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  onMouseEnter={(e) => !banning && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBanUser}
                  disabled={banning}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: banning ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                  }}
                  onMouseEnter={(e) => !banning && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)')}
                  onMouseLeave={(e) => !banning && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                >
                  {banning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      Banning...
                    </>
                  ) : (
                    <>
                      <Ban size={16} />
                      Confirm Ban
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {showRankChange && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center p-6"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
            onClick={() => !changingRank && setShowRankChange(false)}
          >
            <div
              className="relative max-w-md w-full p-6 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-3 rounded-full"
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <UserCog size={24} style={{ color: '#8b5cf6' }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'white' }}>
                    Change Rank
                  </h3>
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Update {profileData?.username}'s rank
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Select a new rank for <strong style={{ color: 'white' }}>{profileData?.username}</strong>
                </p>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {availableRanks.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      No ranks available to assign
                    </p>
                  ) : (
                    availableRanks.map((rank) => (
                      <button
                        key={rank.rank}
                        onClick={() => handleChangeRank(rank.rank)}
                        disabled={changingRank}
                        className="w-full px-4 py-3 rounded-lg text-left transition-all flex items-center gap-3"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                        onMouseEnter={(e) => {
                          if (!changingRank) {
                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                      >
                        <span className="text-2xl">{rank.emoji}</span>
                        <div className="flex-1">
                          <div className="font-semibold" style={{ color: 'white' }}>
                            {rank.display_name}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowRankChange(false)}
                disabled={changingRank}
                className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                onMouseEnter={(e) => !changingRank && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {showAvatarUpload && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center p-6"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
            onClick={() => !uploadingAvatar && cancelAvatarUpload()}
          >
            <div
              className="relative max-w-md w-full p-6 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-3 rounded-full"
                  style={{
                    background: 'rgba(6, 182, 212, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                  }}
                >
                  <Upload size={24} style={{ color: '#06b6d4' }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'white' }}>
                    Change Profile Picture
                  </h3>
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Preview your new avatar
                  </p>
                </div>
              </div>

              <div className="mb-6 flex flex-col items-center">
                <div className="mb-4">
                  {avatarPreview && (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="size-32 rounded-full object-cover"
                      style={{ border: '3px solid rgba(6, 182, 212, 0.5)' }}
                    />
                  )}
                </div>
                <p className="text-sm text-center" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  This will be your new profile picture
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelAvatarUpload}
                  disabled={uploadingAvatar}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  onMouseEnter={(e) => !uploadingAvatar && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: uploadingAvatar ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.2)',
                    color: '#06b6d4',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                  }}
                  onMouseEnter={(e) => !uploadingAvatar && (e.currentTarget.style.background = 'rgba(6, 182, 212, 0.3)')}
                  onMouseLeave={(e) => !uploadingAvatar && (e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)')}
                >
                  {uploadingAvatar ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Save Picture
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {showRoleManagementModal && profileData && serverId && (
        <RoleManagementModal
          isOpen={showRoleManagementModal}
          onClose={() => setShowRoleManagementModal(false)}
          targetUser={{
            id: profileData.id,
            username: profileData.username,
            global_rank: profileData.global_rank,
            role_id: profileData.role_id,
          }}
          currentUserRank={currentUserRank}
          serverSlug={serverId}
          onSuccess={() => {
            setShowRoleManagementModal(false);
            loadProfileData();
          }}
        />
      )}
    </AnimatePresence>
  );
}
