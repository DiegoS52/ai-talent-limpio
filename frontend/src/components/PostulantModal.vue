<template>
    <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" @click="$emit('close')">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
  
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-lg leading-6 font-medium text-gray-900">
                    {{ title }}
                  </h3>
                  <button 
                    type="button" 
                    class="text-gray-400 hover:text-gray-500 focus:outline-none"
                    @click="$emit('close')"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </div>
                <div class="mt-2">
                  <slot></slot>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'Modal',
    props: {
      show: Boolean,
      title: String
    },
    emits: ['close']
  }
  </script>