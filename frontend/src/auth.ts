import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getApiUrl } from "@/lib/api";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const res = await fetch(getApiUrl("/api/v1/auth/login"), {
            method: "POST",
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/json" },
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || "Authentication failed");
          }

          const user = await res.json();
          if (user && user.id) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              providers: user.providers,
            };
          }
          return null;
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : "Failed to log in.";
          console.error("Authorize error:", errMsg);
          throw new Error(errMsg);
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const res = await fetch(getApiUrl("/api/v1/auth/google-login"), {
            method: "POST",
            body: JSON.stringify({
              email: user.email,
              name: user.name || "Google User",
              image: user.image || null,
              google_id: account.providerAccountId,
            }),
            headers: { "Content-Type": "application/json" },
          });

          if (res.ok) {
            const dbUser = await res.json();
            // Attach the DB user details to the token user object
            user.id = dbUser.id;
            (user as unknown as Record<string, unknown>).providers = dbUser.providers;
            return true;
          }
          console.error("Failed to sync Google user with backend");
          return false;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.providers = (user as unknown as Record<string, unknown>).providers;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).providers = token.providers as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.AUTH_SECRET,
});
