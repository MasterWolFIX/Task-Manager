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
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (token, user) => set({ token, user }),
      logout: () => {
          fetch('http://localhost:4000/api/auth/logout', { method: 'POST', credentials: 'include' });
          set({ token: null, user: null });
      },
    }),
    {
      name: 'auth-storage', // klucz pod którym stan zostanie zapisany w localStorage
    }
  )
);
