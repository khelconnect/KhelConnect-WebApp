import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  name: string | null
  role: string | null // <--- Added Role
  setName: (name: string | null) => void
  setRole: (role: string | null) => void // <--- Added Setter
  clearUser: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      name: null,
      role: null, // Default
      setName: (name) => set({ name }),
      setRole: (role) => set({ role }),
      clearUser: () => set({ name: null, role: null }),
    }),
    {
      name: 'khelconnect-user-storage',
    }
  )
)