import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react'
import { jwtDecode } from 'jwt-decode'
import {
  getUserByEmail,
  getUserProfile,
  createUserProfile,
} from './db'
import type { AppUser, Role } from './types'

const JWT_KEY = 'farmlog_auth_token'

interface AuthCtx {
  user: any | null // Ignored, kept for compat
  profile: AppUser | null
  ready: boolean
  configured: boolean
  login: (email: string, password: string, expectedRole: Role) => Promise<AppUser>
  logout: () => Promise<void>
  createAccount: (input: {
    email: string;
    password: string;
    name: string;
    role: Role;
    phone?: string;
    farmerRecordId?: string | null;
  }) => Promise<AppUser>
}

const AuthContext = createContext<AuthCtx | null>(null)

function generateToken(profile: AppUser): string {
  // Simple JWT-like token using btoa (browser-safe)
  const payload = {
    uid: profile.uid,
    email: profile.email,
    role: profile.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  }
  return btoa(JSON.stringify(payload))
}

function verifyToken(token: string): { uid: string; email: string; role: string; exp: number } | null {
  try {
    const payload = JSON.parse(atob(token))
    if (payload.exp < Date.now()) return null // expired
    return payload
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [ready, setReady] = useState(false)

  // On app load — check existing token
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem(JWT_KEY)
        if (token) {
          const decoded = verifyToken(token)
          if (decoded) {
            const userProfile = await getUserProfile(decoded.uid)
            if (userProfile && userProfile.active !== false) {
              setProfile(userProfile)
            } else {
              localStorage.removeItem(JWT_KEY)
            }
          } else {
            localStorage.removeItem(JWT_KEY)
          }
        }
      } catch (err) {
        console.error('Auth init error:', err)
        localStorage.removeItem(JWT_KEY)
      } finally {
        setReady(true)
      }
    }
    init()
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({
      user: profile ? { uid: profile.uid, email: profile.email } : null,
      profile,
      ready,
      configured: true,
      async login(email: string, password: string, expectedRole: Role): Promise<AppUser> {
        // Get user by email from Cosmos DB
        const user = await getUserByEmail(email.toLowerCase().trim())

        if (!user) {
          throw new Error('Invalid email or password')
        }

        // Verify password
        const { verifyPassword } = await import('./db')
        const passwordValid = await verifyPassword(password, user.passwordHash)
        if (!passwordValid) {
          throw new Error('Invalid email or password')
        }

        // Check if account is active
        if (user.active === false) {
          throw new Error('ACCOUNT_DISABLED')
        }

        if (user.role !== expectedRole) {
          throw new Error('WRONG_ROLE')
        }

        const { passwordHash: _, ...safeProfile } = user
        
        // Generate token and save
        const token = generateToken(safeProfile as AppUser)
        localStorage.setItem(JWT_KEY, token)

        setProfile(safeProfile as AppUser)
        return safeProfile as AppUser
      },

      async logout() {
        localStorage.removeItem(JWT_KEY)
        setProfile(null)
      },

      async createAccount({ email, password, name, role, phone, farmerRecordId }) {
        const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const { hashPassword } = await import('./db')
        const passwordHash = await hashPassword(password)
        
        const newUser: AppUser = {
          uid,
          email: email.toLowerCase().trim(),
          name,
          role,
          active: true,
          createdAt: Date.now(),
          createdBy: profile?.uid || 'admin',
          ...(phone ? { phone } : {}),
          ...(farmerRecordId ? { farmerRecordId } : {}),
        }
        
        await createUserProfile({ ...newUser, passwordHash } as AppUser & { passwordHash: string })
        return newUser
      },
    }),
    [profile, ready]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
