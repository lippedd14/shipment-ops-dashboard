import type { Metadata } from "next";

import { signIn } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <AuthForm
      action={signIn}
      title="Entrar"
      submitLabel="Entrar"
      pendingLabel="Entrando..."
      passwordAutoComplete="current-password"
      footer={{
        prompt: "Não tem conta?",
        href: "/signup",
        linkLabel: "Criar conta",
      }}
    />
  );
}
