import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email ou senha incorretos.",
  Default: "Não foi possível entrar. Tente novamente.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/login",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=${err.type}`);
      }
      throw err;
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src={BRAND.logo.src}
            alt={BRAND.logo.alt}
            width={BRAND.logo.width}
            height={BRAND.logo.height}
            priority
            className="mx-auto -mt-4 mb-2 h-auto w-full max-w-[200px]"
          />
          <h1 className="text-xl font-semibold text-foreground">{BRAND.appName}</h1>
          <p className="mt-1 text-sm text-text-secondary">Entre com sua conta para continuar</p>
        </div>

        <form action={login} className="space-y-4 rounded-2xl border border-[color:var(--color-border)] bg-surface p-6">
          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default}
            </p>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Email</label>
            <Input type="email" name="email" placeholder="voce@empresa.com" required autoFocus />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Senha</label>
            <Input type="password" name="password" placeholder="••••••••" required />
          </div>

          <Button type="submit" className="w-full">
            Entrar
          </Button>

          <p className="text-center text-xs text-text-secondary">
            Sua imobiliária ainda não tem conta?{" "}
            <Link href="/signup" className="text-accent underline">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
