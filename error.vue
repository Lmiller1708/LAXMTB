<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const handleError = () => {
  clearError({ redirect: '/' })
}

if (import.meta.client) {
  // If user lands on an unhandled route, recover gracefully to root
  setTimeout(() => {
    clearError({ redirect: '/' })
  }, 100)
}
</script>

<template>
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#0d0d0d;color:#ffffff;font-family:sans-serif;padding:20px;text-align:center;">
    <h1 style="font-size:3rem;font-weight:800;margin-bottom:12px;color:#ef4444;">{{ error.statusCode || 404 }}</h1>
    <p style="font-size:16px;color:#a3a3a3;margin-bottom:24px;">{{ error.message || 'Page not found' }}</p>
    <button
      type="button"
      @click="handleError"
      style="padding:10px 24px;border-radius:8px;background:#ef4444;color:#fff;border:none;font-weight:700;font-size:14px;cursor:pointer;"
    >
      Return to Race Central
    </button>
  </div>
</template>
