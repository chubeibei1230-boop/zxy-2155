import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页看板', icon: 'DataBoard' }
      },
      {
        path: 'seat-mats',
        name: 'SeatMats',
        component: () => import('@/views/SeatMats.vue'),
        meta: { title: '座席垫管理', icon: 'Goods', roles: ['admin'] }
      },
      {
        path: 'batches',
        name: 'Batches',
        component: () => import('@/views/Batches.vue'),
        meta: { title: '清洗批次', icon: 'Files' }
      },
      {
        path: 'batches/:id',
        name: 'BatchDetail',
        component: () => import('@/views/BatchDetail.vue'),
        meta: { title: '批次详情', hidden: true }
      },
      {
        path: 'operations',
        name: 'Operations',
        component: () => import('@/views/Operations.vue'),
        meta: { title: '操作记录', icon: 'List' }
      },
      {
        path: 'operation',
        name: 'Operation',
        component: () => import('@/views/Operation.vue'),
        meta: { title: '提交操作', icon: 'Edit', roles: ['admin', 'user'] }
      },
      {
        path: 'anomalies',
        name: 'Anomalies',
        component: () => import('@/views/Anomalies.vue'),
        meta: { title: '异常记录', icon: 'Warning', roles: ['admin', 'auditor'] }
      },
      {
        path: 'areas',
        name: 'Areas',
        component: () => import('@/views/Areas.vue'),
        meta: { title: '区域管理', icon: 'Location', roles: ['admin'] }
      },
      {
        path: 'boxes',
        name: 'Boxes',
        component: () => import('@/views/Boxes.vue'),
        meta: { title: '周转箱管理', icon: 'Box', roles: ['admin'] }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue'),
        meta: { title: '用户管理', icon: 'User', roles: ['admin'] }
      },
      {
        path: 'rules',
        name: 'Rules',
        component: () => import('@/views/Rules.vue'),
        meta: { title: '检查规则', icon: 'Setting', roles: ['admin'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (to.meta.public) {
    if (userStore.isLoggedIn && to.path === '/login') {
      next('/')
    } else {
      next()
    }
  } else {
    if (!userStore.isLoggedIn) {
      next('/login')
    } else if (to.meta.roles && !to.meta.roles.includes(userStore.role)) {
      next('/dashboard')
    } else {
      next()
    }
  }
})

export default router
