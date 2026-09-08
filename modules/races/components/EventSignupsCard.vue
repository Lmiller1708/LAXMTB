<script setup lang="ts">
import type { SignUpLinks } from '../types/race'

defineProps<{
  signups?: SignUpLinks
}>()

const getSignUpUrl = (code?: string | null) => {
  if (!code) return '#'
  if (code.startsWith('http://') || code.startsWith('https://')) return code
  return `https://signup.com/client/invitation2/secure/${code}/false#/invitation`
}
</script>

<template>
  <div class="bg-[#171717] border border-[#262626] rounded-xl p-5 mb-6">
    <div class="flex items-center gap-2 border-b border-[#262626] pb-3 mb-4">
      <span class="text-xl">✍️</span>
      <h2 class="text-base font-bold text-white uppercase tracking-wide">Team Sign-ups & Volunteer Shifts</h2>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <!-- Volunteer Shifts -->
      <a
        :href="signups?.volunteer ? getSignUpUrl(signups.volunteer) : '#'"
        :target="signups?.volunteer ? '_blank' : undefined"
        rel="noopener noreferrer"
        class="flex flex-col p-3 rounded-lg border transition text-left"
        :class="signups?.volunteer 
          ? 'bg-[#222222] border-[#333333] hover:border-red-500/50 hover:bg-[#282828]' 
          : 'bg-[#1a1a1a] border-[#222222] opacity-60 pointer-events-none'"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white">Volunteer Shifts</span>
          <span class="text-xs">{{ signups?.volunteer ? '↗' : '⏳' }}</span>
        </div>
        <span class="text-[11px] text-gray-400 mt-1">
          {{ signups?.volunteer ? 'Sign up on SignUp.com' : 'Opening 2 weeks prior' }}
        </span>
      </a>

      <!-- Food & Meals -->
      <a
        :href="signups?.food ? getSignUpUrl(signups.food) : '#'"
        :target="signups?.food ? '_blank' : undefined"
        rel="noopener noreferrer"
        class="flex flex-col p-3 rounded-lg border transition text-left"
        :class="signups?.food 
          ? 'bg-[#222222] border-[#333333] hover:border-red-500/50 hover:bg-[#282828]' 
          : 'bg-[#1a1a1a] border-[#222222] opacity-60 pointer-events-none'"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white">Team Meals & Food</span>
          <span class="text-xs">{{ signups?.food ? '↗' : '⏳' }}</span>
        </div>
        <span class="text-[11px] text-gray-400 mt-1">
          {{ signups?.food ? 'Contribute food / prep' : 'Menu posted race week' }}
        </span>
      </a>

      <!-- League Shift -->
      <a
        :href="signups?.league ? getSignUpUrl(signups.league) : '#'"
        :target="signups?.league ? '_blank' : undefined"
        rel="noopener noreferrer"
        class="flex flex-col p-3 rounded-lg border transition text-left"
        :class="signups?.league 
          ? 'bg-[#222222] border-[#333333] hover:border-red-500/50 hover:bg-[#282828]' 
          : 'bg-[#1a1a1a] border-[#222222] opacity-60 pointer-events-none'"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white">Coach & League Volunteer</span>
          <span class="text-xs">{{ signups?.league ? '↗' : '⏳' }}</span>
        </div>
        <span class="text-[11px] text-gray-400 mt-1">
          {{ signups?.league ? 'Course marshals & sweeps' : 'Assigned by league' }}
        </span>
      </a>
    </div>
  </div>
</template>
