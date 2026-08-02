"use server";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mail";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────
// Inscription
// ─────────────────────────────────────────────────────────────

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password || !name) {
    return { error: "Tous les champs sont requis" };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return { error: "Un compte existe déjà avec cet email" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { email, name, password: hashedPassword },
  });

  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// Réinitialisation du mot de passe
// ─────────────────────────────────────────────────────────────

export async function sendResetEmail(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) return { error: "Email requis" };

  const user = await prisma.user.findUnique({ where: { email } });

  // On ne révèle pas si l'email existe ou non
  if (!user) return { success: true };

  // Supprimer un éventuel token existant
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt },
  });

  await sendPasswordResetEmail(email, token);

  return { success: true };
}

export async function resetPassword(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!token || !password) return { error: "Données manquantes" };

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken) return { error: "Lien invalide" };
  if (resetToken.expiresAt < new Date()) return { error: "Lien expiré" };

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { password: hashedPassword },
  });

  await prisma.passwordResetToken.delete({ where: { token } });

  return { success: true };
}
