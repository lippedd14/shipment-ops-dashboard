import type { Metadata } from "next";

import { signUp } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default function SignupPage() {
  return (
    <AuthForm
      action={signUp}
      title="Criar conta"
      submitLabel="Criar conta"
      pendingLabel="Criando..."
      passwordAutoComplete="new-password"
      footer={{
        prompt: "Já tem conta?",
        href: "/login",
        linkLabel: "Entrar",
      }}
    />
  );
}
