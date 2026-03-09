import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

interface AuthUser {
    id: string;
    email: string;
    name?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'synkra_dev_token';
const LEGACY_TOKEN_KEY = 'token';

function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (
        window.localStorage.getItem(TOKEN_KEY) ||
        window.localStorage.getItem(LEGACY_TOKEN_KEY) ||
        null
    );
}

function storeToken(token: string) {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(LEGACY_TOKEN_KEY, token);
}

function clearToken() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const isAuthenticated = !!user && !!token;

    // Validate existing token on mount
    useEffect(() => {
        const existingToken = getStoredToken();
        if (!existingToken) {
            setIsLoading(false);
            return;
        }

        setToken(existingToken);

        fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${existingToken}` },
        })
            .then(async (res) => {
                if (!res.ok) throw new Error('Token inválido');
                const data = await res.json();
                setUser({ id: data.id || data.sub, email: data.email, name: data.name });
            })
            .catch(() => {
                clearToken();
                setToken(null);
                setUser(null);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const login = useCallback(
        async (email: string, password: string) => {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Falha ao entrar');
            }

            const data = await res.json();
            storeToken(data.token);
            setToken(data.token);
            setUser(data.user || { id: '', email });
            await router.push('/');
        },
        [router]
    );

    const signup = useCallback(
        async (email: string, password: string, name?: string) => {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Falha ao criar conta');
            }

            const data = await res.json();
            storeToken(data.token);
            setToken(data.token);
            setUser(data.user || { id: '', email });
            await router.push('/');
        },
        [router]
    );

    const logout = useCallback(() => {
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => { });
        clearToken();
        setToken(null);
        setUser(null);
        router.replace('/auth/login');
    }, [router]);

    return (
        <AuthContext.Provider
            value={{ user, token, isLoading, isAuthenticated, login, signup, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
    }
    return context;
}
