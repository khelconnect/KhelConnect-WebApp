import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  // Change 'string' to 'string | null' to fix the error
  name: string | null;
  setName: (name: string | null) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      name: null, // Initial state is null
      setName: (name) => set({ name: name }),
    }),
    {
      name: 'khelconnect-storage', // unique name for localStorage
    }
  )
)