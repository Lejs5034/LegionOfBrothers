import { useState, useEffect } from 'react';
import { UserPlus, Check, X, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: {
    username: string;
  };
  receiver?: {
    username: string;
  };
}

interface Profile {
  id: string;
  username: string;
}

interface FriendRequestProps {
  userId: string;
  onClose: () => void;
}

export default function FriendRequest({ userId, onClose }: FriendRequestProps) {
  const [activeTab, setActiveTab] = useState<'send' | 'pending' | 'friends'>('send');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadFriendRequests();
    loadFriends();
  }, [userId]);

  const loadFriendRequests = async () => {
    const { data: sent } = await supabase
      .from('friend_requests')
      .select('*, receiver:receiver_id(username)')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    const { data: received } = await supabase
      .from('friend_requests')
      .select('*, sender:sender_id(username)')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (sent) setSentRequests(sent as FriendRequest[]);
    if (received) setReceivedRequests(received as FriendRequest[]);
  };

  const loadFriends = async () => {
    const { data } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        receiver_id,
        sender:sender_id(id, username),
        receiver:receiver_id(id, username)
      `)
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (data) {
      const friendsList = data.map((req: any) => {
        if (req.sender_id === userId) {
          return { id: req.receiver_id, username: req.receiver.username };
        } else {
          return { id: req.sender_id, username: req.sender.username };
        }
      });
      setFriends(friendsList);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', userId)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.from('friend_requests').insert({
        sender_id: userId,
        receiver_id: receiverId,
        status: 'pending',
      });

      if (error) throw error;

      alert('Friend request sent!');
      setSearchQuery('');
      setSearchResults([]);
      loadFriendRequests();
    } catch (err: any) {
      if (err.code === '23505') {
        setError('Friend request already exists');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      loadFriendRequests();
      loadFriends();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      loadFriendRequests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.7)' }} onClick={onClose}>
      <div className="w-full max-w-2xl mx-4 rounded-lg shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-2xl font-bold" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>
            Friend Requests
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors duration-200"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('send')}
            className="flex-1 px-6 py-3 font-medium transition-colors"
            style={{
              background: activeTab === 'send' ? 'var(--surface-2)' : 'transparent',
              color: activeTab === 'send' ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === 'send' ? '2px solid var(--accent)' : 'none',
            }}
          >
            <UserPlus size={18} className="inline mr-2" />
            Send Request
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className="flex-1 px-6 py-3 font-medium transition-colors"
            style={{
              background: activeTab === 'pending' ? 'var(--surface-2)' : 'transparent',
              color: activeTab === 'pending' ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === 'pending' ? '2px solid var(--accent)' : 'none',
            }}
          >
            Pending {receivedRequests.length > 0 && `(${receivedRequests.length})`}
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className="flex-1 px-6 py-3 font-medium transition-colors"
            style={{
              background: activeTab === 'friends' ? 'var(--surface-2)' : 'transparent',
              color: activeTab === 'friends' ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === 'friends' ? '2px solid var(--accent)' : 'none',
            }}
          >
            <Users size={18} className="inline mr-2" />
            Friends ({friends.length})
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: '#ef4444', color: 'white' }}>
              {error}
            </div>
          )}

          {activeTab === 'send' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="input-field flex-1"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="btn-primary px-6"
                  style={{ opacity: loading ? 0.5 : 1 }}
                >
                  Search
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'var(--accent-grad)' }}>
                          {profile.username[0].toUpperCase()}
                        </div>
                        <span style={{ color: 'var(--text)' }}>{profile.username}</span>
                      </div>
                      <button
                        onClick={() => sendFriendRequest(profile.id)}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg font-medium transition-colors"
                        style={{ background: 'var(--accent)', color: 'white', opacity: loading ? 0.5 : 1 }}
                      >
                        <UserPlus size={18} className="inline mr-1" />
                        Add Friend
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {sentRequests.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-3 uppercase" style={{ color: 'var(--text-muted)' }}>
                    Sent Requests
                  </h3>
                  <div className="space-y-2">
                    {sentRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'var(--accent-grad)' }}>
                            {request.receiver?.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: 'var(--text)' }}>{request.receiver?.username}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              Status: {request.status}
                            </div>
                          </div>
                        </div>
                        {request.status === 'pending' && (
                          <button
                            onClick={() => cancelRequest(request.id)}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg font-medium transition-colors"
                            style={{ background: '#ef4444', color: 'white', opacity: loading ? 0.5 : 1 }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="space-y-2">
              {receivedRequests.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  No pending friend requests
                </div>
              ) : (
                receivedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'var(--accent-grad)' }}>
                        {request.sender?.username[0].toUpperCase()}
                      </div>
                      <div style={{ color: 'var(--text)' }}>{request.sender?.username}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondToRequest(request.id, 'accepted')}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg font-medium transition-colors"
                        style={{ background: '#10b981', color: 'white', opacity: loading ? 0.5 : 1 }}
                      >
                        <Check size={18} className="inline mr-1" />
                        Accept
                      </button>
                      <button
                        onClick={() => respondToRequest(request.id, 'rejected')}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg font-medium transition-colors"
                        style={{ background: '#ef4444', color: 'white', opacity: loading ? 0.5 : 1 }}
                      >
                        <X size={18} className="inline mr-1" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="space-y-2">
              {friends.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  No friends yet. Send some friend requests!
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  >
                    <div className="size-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'var(--accent-grad)' }}>
                      {friend.username[0].toUpperCase()}
                    </div>
                    <div style={{ color: 'var(--text)' }}>{friend.username}</div>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="size-2 rounded-full" style={{ background: '#10b981' }} />
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Friends</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
