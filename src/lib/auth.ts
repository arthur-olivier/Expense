import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/actionResult";
import bcrypt from "bcryptjs";

//Configuration de l'authentification de l'app
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google,
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let user;

        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });
        } catch {
          throw new Error("DatabaseError");
        }

        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(credentials.password as string, user.password);

        if (!passwordMatch) return null;

        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt", // obligatoire avec CredentialsProvider
  },
  pages: {
    signIn: "/login",
  },
  // NextAuth ne met pas l'id par défaut : on l'ajoute au jwt puis à la session pour lire session.user.id partout
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
});

export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) throw new UserError("Non autorisé");
  return session.user as {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}
