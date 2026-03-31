import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'student';
}

interface AuthState {
  user: User | null;
  token: string | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      login: (token, user) => set({ token, user }),
      logout: () => {
          fetch('http://localhost:4000/api/auth/logout', { method: 'POST', credentials: 'include' });
          set({ token: null, user: null });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
