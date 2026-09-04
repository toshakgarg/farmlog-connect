import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fbAuth, isFirebaseConfigured, secondaryAuth } from "./firebase";
import { getAppUser, saveAppUser } from "./data";
import type { AppUser, Role } from "./types";

interface AuthCtx {
  user: User | null;
  profile: AppUser | null;
  ready: boolean;
  configured: boolean;
  login: (email: string, password: string, expectedRole: Role) => Promise<AppUser>;
  logout: () => Promise<void>;
  createAccount: (input: {
    email: string;
    password: string;
    name: string;
    role: Role;
    phone?: string;
    farmerRecordId?: string | null;
  }) => Promise<AppUser>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    if (!configured) return;
    const unsub = onAuthStateChanged(fbAuth(), async (u) => {
      setUser(u);
      if (u) {
        try {
          setProfile(await getAppUser(u.uid));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setReady(true);
    });
    return unsub;
  }, [configured]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      profile,
      ready,
      configured,
      async login(email, password, expectedRole): Promise<AppUser> {
        const cred = await signInWithEmailAndPassword(fbAuth(), email, password);
        let p = await getAppUser(cred.user.uid);
        if (!p) {
          // First ever login bootstraps the master admin account.
          p = {
            uid: cred.user.uid,
            email,
            name: email.split("@")[0] ?? email,
            role: expectedRole,
            createdAt: Date.now(),
          };
          await saveAppUser(p);
        }
        if (p.role !== expectedRole) {
          await signOut(fbAuth());
          throw new Error("WRONG_ROLE");
        }
        if (p.active === false) {
          await signOut(fbAuth());
          throw new Error("ACCOUNT_DISABLED");
        }
        setProfile(p);
        return p;
      },

      async logout() {
        await signOut(fbAuth());
        setProfile(null);
      },
      async createAccount({ email, password, name, role, phone, farmerRecordId }) {
        const sec = secondaryAuth();
        const cred = await createUserWithEmailAndPassword(sec, email, password);
        const newUser: AppUser = {
          uid: cred.user.uid,
          email,
          name,
          role,
          phone: phone ?? "",
          farmerRecordId: farmerRecordId ?? null,
          createdAt: Date.now(),
          createdBy: profile?.uid || "",
          active: true,
        };
        await saveAppUser(newUser);
        await signOut(sec);
        return newUser;
      },
    }),
    [user, profile, ready, configured],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
