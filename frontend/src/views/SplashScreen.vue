<template>
    <div class="app-container">
      <div class="main-logo-container" :class="{ 'initial-state': showSplash, 'final-state': !showSplash }">
        <img src="@/assets/logo3.png" alt="AITALENT" 
             class="main-logo" 
             :class="{ 'fade-in': showMainLogo }" />
      </div>
  
      <div class="button-container" v-show="!showSplash">
        <button 
          @click="showLoginModal = true"
          class="login-button"
        >
          Iniciar Sesión
        </button>
      </div>
  
      <div class="sooft-logo-container" v-show="!showSplash">
        <img src="@/assets/logo-sooft1.png" alt="Sooft Technology" 
             class="sooft-logo" 
             :class="{ 'fade-in': showSooftLogo }" />
      </div>
  
      <LoginModal 
        v-if="showLoginModal"
        :show="showLoginModal"
        @close="showLoginModal = false"
        @success="handleLoginSuccess"
      />
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import LoginModal from '@/components/LoginModal.vue';
  
  const router = useRouter();
  const showSplash = ref(true);
  const showMainLogo = ref(false);
  const showSooftLogo = ref(false);
  const showLoginModal = ref(false);
  
  const handleLoginSuccess = () => {
    showLoginModal.value = false;
    const redirectPath = localStorage.getItem('redirectAfterLogin') || '/app';
    localStorage.removeItem('redirectAfterLogin');
    router.push(redirectPath);
  };
  
  onMounted(() => {
    // Mostrar el logo principal primero
    setTimeout(() => {
      showMainLogo.value = true;
      
      // Mostrar el logo de Sooft después
      setTimeout(() => {
        showSooftLogo.value = true;
        
        // Cambiar a estado final
        setTimeout(() => {
          showSplash.value = false;
        }, 1500);
      }, 800);
    }, 500);
  });
  </script>
  
  <style scoped>
  .app-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: rgb(17 24 39 / var(--tw-bg-opacity, 1));
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }
  
  .main-logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
  }
  
  .button-container {
    position: absolute;
    bottom: 25%;
    opacity: 0;
    animation: containerFadeIn 1s ease forwards;
  }
  
  .sooft-logo-container {
    position: absolute;
    bottom: 5%;
    opacity: 0;
    animation: containerFadeIn 1s ease 0.3s forwards;
  }
  
  .initial-state .main-logo {
    width: 300px;
    height: auto;
    opacity: 0;
    transform: translateY(20px);
  }
  
  .final-state .main-logo {
    width: 300px;
    height: auto;
    opacity: 1;
    transform: translateY(0);
    transition: all 0.8s ease;
  }
  
  .sooft-logo {
    width: 150px;
    height: auto;
  }
  
  .fade-in {
    animation: fadeInUp 0.8s ease forwards;
  }
  
  .login-button {
    padding: 0.75rem 2rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
    background: linear-gradient(to right, #2D89FF, #00E1FF);
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(45, 137, 255, 0.2);
  }
  
  .login-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 8px rgba(45, 137, 255, 0.3);
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes containerFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    50% {
      opacity: 0.5;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  </style>