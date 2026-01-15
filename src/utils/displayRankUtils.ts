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

export interface RoleConfig {
  key: string;
  label: string;
  emoji: string;
  color: string;
  order: number;
}

export interface RankGroup {
  key: string;
  label: string;
  emoji: string;
  color: string;
  order: number;
}

const RANK_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  'the_head': { label: 'The Head', emoji: '🏆', color: '#fbbf24' },
  'app_developer': { label: 'App Developers', emoji: '💻', color: '#ef4444' },
  'admin': { label: 'Admins', emoji: '🛡️', color: '#f59e0b' },
  'business_mastery_professor': { label: 'Business Mastery Professor', emoji: '🎓', color: '#3b82f6' },
  'crypto_trading_professor': { label: 'Crypto Trading Professor', emoji: '🎓', color: '#10b981' },
  'copywriting_professor': { label: 'Copywriting Professor', emoji: '🎓', color: '#ec4899' },
  'fitness_professor': { label: 'Fitness Professor', emoji: '🎓', color: '#f59e0b' },
  'business_mentor': { label: 'Business Mentor', emoji: '🧠', color: '#6366f1' },
  'crypto_trading_mentor': { label: 'Crypto Trading Mentor', emoji: '🧠', color: '#14b8a6' },
  'copywriting_mentor': { label: 'Copywriting Mentor', emoji: '🧠', color: '#f472b6' },
  'coach': { label: 'Coach', emoji: '🧠', color: '#fb923c' },
  'user': { label: 'Member', emoji: '👤', color: '#64748b' },
};

const SERVER_ROLE_CONFIG: Record<string, RoleConfig[]> = {
  'Headquarters': [
    { key: 'the_head', label: 'The Head', emoji: '🏆', color: '#fbbf24', order: 1 },
    { key: 'app_developer', label: 'App Developers', emoji: '💻', color: '#ef4444', order: 1 },
    { key: 'admin', label: 'Admins', emoji: '🛡️', color: '#f59e0b', order: 2 },
  ],
  'Business Mastery': [
    { key: 'business_mastery_professor', label: 'Business Mastery Professor', emoji: '🎓', color: '#3b82f6', order: 1 },
    { key: 'business_mentor', label: 'Business Mentor', emoji: '🧠', color: '#6366f1', order: 2 },
  ],
  'Crypto Trading': [
    { key: 'crypto_trading_professor', label: 'Crypto Trading Professor', emoji: '🎓', color: '#10b981', order: 1 },
    { key: 'crypto_trading_mentor', label: 'Crypto Trading Mentor', emoji: '🧠', color: '#14b8a6', order: 2 },
  ],
  'Copywriting': [
    { key: 'copywriting_professor', label: 'Copywriting Professor', emoji: '🎓', color: '#ec4899', order: 1 },
    { key: 'copywriting_mentor', label: 'Copywriting Mentor', emoji: '🧠', color: '#f472b6', order: 2 },
  ],
  'Fitness': [
    { key: 'fitness_professor', label: 'Fitness Professor', emoji: '🎓', color: '#f59e0b', order: 1 },
    { key: 'coach', label: 'Coaches', emoji: '🧠', color: '#fb923c', order: 2 },
  ],
};

const SERVER_RANK_GROUPS: Record<string, RankGroup[]> = {
  'Headquarters': [
    { key: 'the_head', label: 'The Head', emoji: '🏆', color: '#fbbf24', order: 1 },
    { key: 'app_developer', label: 'App Developers', emoji: '💻', color: '#ef4444', order: 1 },
    { key: 'admin', label: 'Admins', emoji: '🛡️', color: '#f59e0b', order: 2 },
  ],
  'Business Mastery': [
    { key: 'business_mastery_professor', label: 'Business Mastery Professor', emoji: '🎓', color: '#3b82f6', order: 1 },
    { key: 'business_mentor', label: 'Business Mentor', emoji: '🧠', color: '#6366f1', order: 2 },
  ],
  'Crypto Trading': [
    { key: 'crypto_trading_professor', label: 'Crypto Trading Professor', emoji: '🎓', color: '#10b981', order: 1 },
    { key: 'crypto_trading_mentor', label: 'Crypto Trading Mentor', emoji: '🧠', color: '#14b8a6', order: 2 },
  ],
  'Copywriting': [
    { key: 'copywriting_professor', label: 'Copywriting Professor', emoji: '🎓', color: '#ec4899', order: 1 },
    { key: 'copywriting_mentor', label: 'Copywriting Mentor', emoji: '🧠', color: '#f472b6', order: 2 },
  ],
  'Fitness': [
    { key: 'fitness_professor', label: 'Fitness Professor', emoji: '🎓', color: '#f59e0b', order: 1 },
    { key: 'coach', label: 'Coaches', emoji: '🧠', color: '#fb923c', order: 2 },
  ],
};

export function getServerRoleConfig(serverName: string): RoleConfig[] {
  return SERVER_ROLE_CONFIG[serverName] || [];
}

export function getServerRankGroups(serverName: string): RankGroup[] {
  return SERVER_RANK_GROUPS[serverName] || [];
}

export function isRankedUser(globalRank: string | undefined): boolean {
  if (!globalRank || globalRank === 'user') return false;
  return Object.keys(RANK_LABELS).includes(globalRank) && globalRank !== 'user';
}

export function getUserDisplayRankForServer(user: User, server: Server): DisplayRank {
  const globalRank = user.global_rank || 'user';

  if (server.name === 'Headquarters' || server.type === 'headquarters') {
    return RANK_LABELS[globalRank] || RANK_LABELS['user'];
  }

  if (['the_head', 'app_developer', 'admin'].includes(globalRank)) {
    return RANK_LABELS[globalRank];
  }

  const serverRankGroups = getServerRankGroups(server.name);
  const matchingRank = serverRankGroups.find(rg => rg.key === globalRank);
  if (matchingRank) {
    return RANK_LABELS[globalRank];
  }

  return RANK_LABELS['user'];
}

export function getRankDisplayInfo(rankKey: string): DisplayRank {
  return RANK_LABELS[rankKey] || RANK_LABELS['user'];
}
