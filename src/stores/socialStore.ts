import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'

export interface Friend {
  id: string
  name: string
  avatar: string
  rank: string
  level: number
  lastActive: string
  online: boolean
}

export interface LeaderboardEntry {
  id: string
  name: string
  avatar: string
  rank: string
  score: number
  winRate: number
  totalMatches: number
}

const MOCK_FRIENDS: Friend[] = [
  { id: 'f1', name: '数学小天才', avatar: '🧑‍🎓', rank: '黄金', level: 15, lastActive: '刚刚', online: true },
  { id: 'f2', name: '算术达人', avatar: '👨‍🎓', rank: '白银', level: 12, lastActive: '5分钟前', online: true },
  { id: 'f3', name: '几何骑士', avatar: '👩‍🎓', rank: '铂金', level: 20, lastActive: '1小时前', online: false },
  { id: 'f4', name: '函数大师', avatar: '🧑‍💻', rank: '黄金', level: 18, lastActive: '昨天', online: false },
  { id: 'f5', name: '逻辑推理者', avatar: '👨‍💻', rank: '青铜', level: 8, lastActive: '3天前', online: false },
]

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'l1', name: '数学之神', avatar: '👑', rank: '王者', score: 9999, winRate: 95, totalMatches: 200 },
  { id: 'l2', name: '计算快手', avatar: '⚡', rank: '大师', score: 8500, winRate: 88, totalMatches: 180 },
  { id: 'l3', name: '几何天才', avatar: '🔷', rank: '钻石', score: 7200, winRate: 82, totalMatches: 150 },
  { id: 'l4', name: '方程高手', avatar: '🎯', rank: '钻石', score: 6800, winRate: 78, totalMatches: 160 },
  { id: 'l5', name: '代数精灵', avatar: '✨', rank: '铂金', score: 5500, winRate: 75, totalMatches: 120 },
  { id: 'l6', name: '概率猎手', avatar: '🎲', rank: '铂金', score: 5200, winRate: 72, totalMatches: 110 },
  { id: 'l7', name: '统计达人', avatar: '📊', rank: '黄金', score: 4800, winRate: 70, totalMatches: 100 },
  { id: 'l8', name: '数感超人', avatar: '🦸', rank: '黄金', score: 4500, winRate: 68, totalMatches: 95 },
  { id: 'l9', name: '证明达人', avatar: '📝', rank: '白银', score: 3800, winRate: 65, totalMatches: 80 },
  { id: 'l10', name: '解题能手', avatar: '💡', rank: '白银', score: 3200, winRate: 62, totalMatches: 70 },
]

export const useSocialStore = defineStore('social', () => {
  const friends = ref<Friend[]>(getStorage('friends', MOCK_FRIENDS))
  const leaderboard = ref<LeaderboardEntry[]>(MOCK_LEADERBOARD)
  const friendRequests = ref<{ id: string; name: string; avatar: string }[]>([])

  const onlineFriends = computed(() => friends.value.filter(f => f.online))
  const offlineFriends = computed(() => friends.value.filter(f => !f.online))

  function addFriend(name: string) {
    const newFriend: Friend = {
      id: `f_${Date.now()}`,
      name,
      avatar: ['🧑‍🎓', '👨‍🎓', '👩‍🎓', '🧑‍💻', '👨‍💻', '👩‍💻'][Math.floor(Math.random() * 6)] || '🧑‍🎓',
      rank: '青铜',
      level: 1,
      lastActive: '刚刚',
      online: Math.random() > 0.5,
    }
    friends.value.push(newFriend)
    setStorage('friends', friends.value)
  }

  function removeFriend(friendId: string) {
    friends.value = friends.value.filter(f => f.id !== friendId)
    setStorage('friends', friends.value)
  }

  function getFriendRank(friendId: string): string {
    const friend = friends.value.find(f => f.id === friendId)
    return friend?.rank || '青铜'
  }

  return {
    friends,
    leaderboard,
    friendRequests,
    onlineFriends,
    offlineFriends,
    addFriend,
    removeFriend,
    getFriendRank,
  }
})
