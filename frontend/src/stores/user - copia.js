import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: {
      name: 'Usuario Demo',
      email: 'usuario@demo.com',
      avatar: 'https://ui-avatars.com/api/?name=Usuario+Demo'
    },
    isAuthenticated: true
  }),
  actions: {
    logout() {
      this.user = null
      this.isAuthenticated = false
    },
    login(userData) {
      this.user = userData
      this.isAuthenticated = true
    }
  }
}) 