import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => {
    // Solo recuperar del localStorage si existe
    const savedUser = localStorage.getItem('user')
    const savedToken = localStorage.getItem('hr_token')
    
    return {
      user: savedUser ? JSON.parse(savedUser) : null,
      isAuthenticated: !!savedToken
    }
  },
  
  actions: {
    logout() {
      localStorage.removeItem('hr_token')
      localStorage.removeItem('user')
      this.user = null
      this.isAuthenticated = false
    },
    
    login(userData) {
      this.user = userData
      this.isAuthenticated = true
      localStorage.setItem('user', JSON.stringify(userData))
    }
  }
})