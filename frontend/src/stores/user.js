import { defineStore } from 'pinia'
import request from '@/utils/request'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    role: (state) => state.user?.role,
    isAdmin: (state) => state.user?.role === 'admin',
    isAuditor: (state) => state.user?.role === 'auditor',
    isUser: (state) => state.user?.role === 'user'
  },
  actions: {
    async login(username, password) {
      const res = await request.post('/auth/login', { username, password })
      if (res.code === 200) {
        this.token = res.data.token
        this.user = res.data.user
        localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
      }
      return res
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    async fetchProfile() {
      const res = await request.get('/auth/profile')
      if (res.code === 200) {
        this.user = res.data
        localStorage.setItem('user', JSON.stringify(this.user))
      }
      return res
    }
  }
})
