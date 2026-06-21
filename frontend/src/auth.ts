import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import api from "@/lib/api/client";
import logger from "@/lib/logger";
import { UserResponse } from "@/types/carbon";

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
          const user = await api.post<UserResponse>("/api/v1/auth/login", {
            email: credentials.email,
            password: credentials.password,
          });

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
          logger.error("Authorize error", error);
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
          const dbUser = await api.post<UserResponse>("/api/v1/auth/google-login", {
            email: user.email || "",
            name: user.name || "Google User",
            image: user.image || null,
            google_id: account.providerAccountId,
          });

          if (dbUser && dbUser.id) {
            // Attach the DB user details to the token user object
            user.id = dbUser.id;
            user.providers = dbUser.providers;
            return true;
          }
          logger.error("Failed to sync Google user with backend: No user returned");
          return false;
        } catch (error) {
          logger.error("Error in signIn callback", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.providers = user.providers;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.picture as string;
        session.user.providers = token.providers as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.AUTH_SECRET || (process.env.NODE_ENV === "development" ? "default_auth_secret_key_for_development_purposes_only" : undefined),
});

