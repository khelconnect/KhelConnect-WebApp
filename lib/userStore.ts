// lib/userStore.ts
import { create } from 'zustand'

interface UserState {
  name: string | null
  setName: (name: string) => void
}

export const useUserStore = create<UserState>((set) => ({
  name: null,
  setName: (name) => set({ name }),
}))
