// lib/mail.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

//Mail de reinitialisation de mdp
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/resetPassword?token=${token}`;

  await resend.emails.send({
    from: "Expense <onboarding@resend.dev>",
    to: "arthurolivierdev@gmail.com",
    subject: "Réinitialisation de ton mot de passe",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Réinitialiser ton mot de passe</h2>
        <p style="color: #555;">Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe. Le lien est valable <strong>1 heure</strong>.</p>
        <a href="${resetUrl}"
           style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Réinitialiser mon mot de passe
        </a>
        <p style="margin-top: 24px; color: #999; font-size: 12px;">Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
      </div>
    `,
  });
}
