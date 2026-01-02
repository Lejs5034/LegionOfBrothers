export const getRankOrder = (rank: string): number => {
  const rankMap: Record<string, number> = {
    'the_head': 100,
    'app_developer': 90,
    'admin': 70,
    'business_mastery_professor': 40,
    'crypto_trading_professor': 40,
    'copywriting_professor': 40,
    'fitness_professor': 40,
    'business_mentor': 30,
    'crypto_trading_mentor': 30,
    'copywriting_mentor': 30,
    'coach': 20,
    'user': 10,
  };

  return rankMap[rank] || 10;
};

export const canManageRank = (currentUserRank: string, targetUserRank: string): boolean => {
  const currentOrder = getRankOrder(currentUserRank);
  const targetOrder = getRankOrder(targetUserRank);
  return currentOrder > targetOrder;
};

export const getAssignableRanks = (currentUserRank: string, allRanks: any[]): any[] => {
  const currentOrder = getRankOrder(currentUserRank);
  return allRanks.filter(rank => getRankOrder(rank.rank) < currentOrder);
};
