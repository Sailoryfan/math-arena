import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/login/LoginPage.vue'),
    },
    {
      path: '/onboarding/test',
      name: 'diagnostic-test',
      component: () => import('@/pages/onboarding/DiagnosticTest.vue'),
    },
    {
      path: '/onboarding/result',
      name: 'diagnostic-result',
      component: () => import('@/pages/onboarding/DiagnosticResult.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/index/HomePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my',
      name: 'my',
      component: () => import('@/pages/my/MyPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/plan',
      name: 'plan',
      component: () => import('@/pages/plan/PlanPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/knowledge/:id',
      name: 'knowledge',
      component: () => import('@/pages/knowledge/KnowledgePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/practice',
      name: 'practice',
      component: () => import('@/pages/practice/PracticePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/errors',
      name: 'errors',
      component: () => import('@/pages/errors/ErrorPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/adventure',
      name: 'adventure',
      component: () => import('@/pages/adventure/AdventureMap.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/adventure/battle/:id',
      name: 'adventure-battle',
      component: () => import('@/pages/adventure/AdventureBattle.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dungeon',
      name: 'dungeon',
      component: () => import('@/pages/dungeon/DungeonEntrance.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dungeon/map',
      name: 'dungeon-map',
      component: () => import('@/pages/dungeon/DungeonMap.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dungeon/battle/:id',
      name: 'dungeon-battle',
      component: () => import('@/pages/dungeon/DungeonBattle.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/rhythm',
      name: 'rhythm',
      component: () => import('@/pages/rhythm/RhythmPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/pvp',
      name: 'pvp',
      component: () => import('@/pages/pvp/PvPPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/social',
      name: 'social',
      component: () => import('@/pages/social/SocialPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/achievements',
      name: 'achievements',
      component: () => import('@/pages/achievements/AchievementsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/data',
      name: 'data-center',
      component: () => import('@/pages/data/DataCenterPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/teacher',
      name: 'teacher',
      component: () => import('@/pages/teacher/TeacherPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/parent',
      name: 'parent',
      component: () => import('@/pages/parent/ParentPage.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return { name: 'login' }
  }
  if (to.name === 'login' && userStore.isLoggedIn) {
    return { name: 'home' }
  }
})

export default router
