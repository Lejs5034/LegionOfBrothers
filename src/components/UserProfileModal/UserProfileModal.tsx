import { useState, useEffect } from 'react';
import { X, Shield, Award, TrendingUp, Calendar, Clock, Target, Zap, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

interface UserProfileData {
  id: string;
  username: string;
  avatar_url?: string;
  global_rank: string;
  rank_display_name: string;
  rank_emoji: string;
  power_level: number;
  created_at: string;
  is_banned: boolean;
  server_role?: string;
  server_role_color?: string;
}

interface UserProfileModalProps {
  userId: string;
  serverId?: string;
  onClose: () => void;
}

type TabType = 'information' | 'journey' | 'statistics';

export default function UserProfileModal({ userId, serverId, onClose }: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('information');
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserPowerLevel, setCurrentUserPowerLevel] = useState<number>(999);
  const [banning, setBanning] = useState(false);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    loadCurrentUser();
    loadProfileData();
  }, [userId, serverId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: profileView } = await supabase
        .from('profiles_with_ban_status')
        .select('power_level')
        .eq('id', user.id)
        .maybeSingle();

      if (profileView) {
        setCurrentUserPowerLevel(profileView.power_level);
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

      let serverRole = null;
      let serverRoleColor = null;

      if (serverId) {
        const { data: memberData } = await supabase
          .from('server_members')
          .select('role_in_server')
          .eq('user_id', userId)
          .eq('server_id', serverId)
          .maybeSingle();

        if (memberData) {
          serverRole = memberData.role_in_server;
          serverRoleColor = memberData.role_in_server === 'admin' ? '#f59e0b' : '#3b82f6';
        }
      }

      setProfileData({
        id: profileView.id,
        username: profileView.username,
        avatar_url: profileView.avatar_url,
        global_rank: profileView.global_rank,
        rank_display_name: profileView.rank_display_name,
        rank_emoji: profileView.rank_emoji,
        power_level: profileView.power_level,
        created_at: profileView.created_at,
        is_banned: profileView.is_banned,
        server_role: serverRole,
        server_role_color: serverRoleColor,
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

  const getRankColor = (rankName: string): string => {
    const lowerRank = rankName.toLowerCase();

    if (lowerRank.includes('the head')) {
      return '#fbbf24';
    }

    if (lowerRank.includes('app developer')) {
      return '#ef4444';
    }

    if (lowerRank.includes('professor')) {
      return '#fbbf24';
    }

    return '#06b6d4';
  };

  const getRankStyles = (rankName: string) => {
    const color = getRankColor(rankName);
    return {
      background: `${color}20`,
      color: color,
      border: `1px solid ${color}50`,
    };
  };

  const canBanUser = () => {
    if (!profileData || !currentUserId) return false;
    if (currentUserId === userId) return false;
    if (profileData.is_banned) return false;
    return currentUserPowerLevel < profileData.power_level;
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
                      <div
                        className="size-24 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-3xl"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }}
                      >
                        {profileData.username[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-3xl font-black mb-2" style={{ color: 'white' }}>
                          {profileData.username}
                        </h2>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span
                            className="px-3 py-1 rounded-full text-sm font-semibold"
                            style={getRankStyles(profileData.rank_display_name)}
                          >
                            {profileData.rank_emoji} {profileData.rank_display_name}
                          </span>
                          {profileData.server_role && (
                            <span
                              className="px-3 py-1 rounded-full text-sm font-semibold"
                              style={{
                                background: `${profileData.server_role_color}20`,
                                color: profileData.server_role_color,
                                border: `1px solid ${profileData.server_role_color}50`,
                              }}
                            >
                              <Shield size={14} className="inline mr-1" />
                              {profileData.server_role}
                            </span>
                          )}
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
                          background: 'rgba(6, 182, 212, 0.05)',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={18} style={{ color: '#06b6d4' }} />
                          <span className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Power Level
                          </span>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: 'white' }}>
                          {profileData.power_level}
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
                          background: 'rgba(251, 191, 36, 0.05)',
                          border: '1px solid rgba(251, 191, 36, 0.2)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock size={20} style={{ color: '#fbbf24' }} />
                          <span className="font-semibold" style={{ color: 'white' }}>
                            Login Streak
                          </span>
                        </div>
                        <p className="text-3xl font-bold" style={{ color: '#fbbf24' }}>
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
      </motion.div>
    </AnimatePresence>
  );
}
