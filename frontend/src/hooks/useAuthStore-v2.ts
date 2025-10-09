import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserType } from '../services/authService-v2';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  userType: UserType | null;
  
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  
  // Helper getters
  isCourtRep: () => boolean;
  isParticipant: () => boolean;
}

export const useAuthStoreV2 = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      userType: null,

      login: (token: string, user: User) => {
        set({
          token,
          user,
          isAuthenticated: true,
          userType: user.userType,
        });
      },

      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          userType: null,
        });
        localStorage.removeItem('proofmeet-auth-v2');
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData } as User,
          });
        }
      },

      // Helper functions
      isCourtRep: () => {
        return get().userType === 'COURT_REP';
      },

      isParticipant: () => {
        return get().userType === 'PARTICIPANT';
      },
    }),
    {
      name: 'proofmeet-auth-v2',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        userType: state.userType,
      }),
    }
  )
);

