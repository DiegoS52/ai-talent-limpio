<template>
  <div class="min-h-screen bg-white">
    <header class="bg-primary-blue text-white p-4">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <nav>
          <router-link to="/" class="text-white hover:text-secondary-cyan">Inicio</router-link>
        </nav>
      </div>
    </header>

    <main class="container mx-auto p-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Panel de Estadísticas -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold text-primary-dark mb-4">Estadísticas</h2>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span>CVs Procesados</span>
              <span class="text-primary-blue font-bold">0</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Entrevistas Pendientes</span>
              <span class="text-secondary-orange font-bold">0</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Candidatos Aprobados</span>
              <span class="text-primary-green font-bold">0</span>
            </div>
          </div>
        </div>

        <!-- Panel de Acciones Rápidas -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold text-primary-dark mb-4">Acciones Rápidas</h2>
          <div class="space-y-4">
            <button class="w-full bg-primary-blue text-white py-2 px-4 rounded hover:bg-opacity-90">
              Procesar CVs
            </button>
            <button class="w-full bg-primary-green text-white py-2 px-4 rounded hover:bg-opacity-90">
              Generar Cuestionario
            </button>
            <button class="w-full bg-secondary-orange text-white py-2 px-4 rounded hover:bg-opacity-90">
              Ver Entrevistas
            </button>
          </div>
        </div>

        <!-- Panel de Actividad Reciente -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold text-primary-dark mb-4">Actividad Reciente</h2>
          <div class="space-y-4">
            <p class="text-gray-600">No hay actividad reciente</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
// Dashboard component logic here
</script> 