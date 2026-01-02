interface User {
  id: string;
  username: string;
  global_rank?: string;
  avatar_url?: string;
}

interface Server {
  id: string;
  name: string;
  type?: string;
}

export interface DisplayRank {
  key: string;
  label: string;
  emoji: string;
  color: string;
}

const RANK_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  'the_head': { label: 'The Head', emoji: '👑', color: '#ef4444' },
  'app_developer': { label: 'App Developers', emoji: '💻', color: '#8b5cf6' },
  'admin': { label: 'Admins', emoji: '🛡️', color: '#f59e0b' },
  'business_mastery_professor': { label: 'Business Mastery Professor', emoji: '💼', color: '#3b82f6' },
  'crypto_trading_professor': { label: 'Crypto Trading Professor', emoji: '📈', color: '#10b981' },
  'copywriting_professor': { label: 'Copywriting Professor', emoji: '✍️', color: '#ec4899' },
  'fitness_professor': { label: 'Fitness Professor', emoji: '💪', color: '#f59e0b' },
  'business_mentor': { label: 'Business Mentor', emoji: '🎓', color: '#6366f1' },
  'crypto_trading_mentor': { label: 'Crypto Trading Mentor', emoji: '📊', color: '#14b8a6' },
  'copywriting_mentor': { label: 'Copywriting Mentor', emoji: '📝', color: '#f472b6' },
  'coach': { label: 'Coach', emoji: '🏆', color: '#fb923c' },
  'user': { label: 'Member', emoji: '👤', color: '#64748b' },
};

const SERVER_PROFESSOR_MAP: Record<string, string> = {
  'Business Mastery': 'business_mastery_professor',
  'Crypto Trading': 'crypto_trading_professor',
  'Copywriting': 'copywriting_professor',
  'Fitness': 'fitness_professor',
};

export function getUserDisplayRankForServer(user: User, server: Server): DisplayRank {
  const globalRank = user.global_rank || 'user';

  if (server.name === 'Headquarters' || server.type === 'headquarters') {
    return RANK_LABELS[globalRank] || RANK_LABELS['user'];
  }

  if (['the_head', 'app_developer', 'admin'].includes(globalRank)) {
    return RANK_LABELS[globalRank];
  }

  const professorRankForServer = SERVER_PROFESSOR_MAP[server.name];
  if (professorRankForServer && globalRank === professorRankForServer) {
    return RANK_LABELS[globalRank];
  }

  return RANK_LABELS['user'];
}

export function getRankDisplayInfo(rankKey: string): DisplayRank {
  return RANK_LABELS[rankKey] || RANK_LABELS['user'];
}
