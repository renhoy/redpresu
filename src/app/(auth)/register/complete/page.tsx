import { Suspense } from "react";
import { redirect } from "next/navigation";
import CompleteRegistrationForm from "@/components/auth/CompleteRegistrationForm";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Componente wrapper para manejar searchParams
function CompleteRegistrationContent({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  // Si no hay token, redirigir al registro
  if (!token) {
    redirect("/register");
  }

  return <CompleteRegistrationForm token={token} />;
}

// Loading fallback
function LoadingFallback() {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-lime-600 mb-4" />
        <p className="text-muted-foreground">Cargando...</p>
      </CardContent>
    </Card>
  );
}

export default function CompleteRegistrationPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-lime-50 to-white flex items-center justify-center p-4 py-8">
      <Suspense fallback={<LoadingFallback />}>
        <CompleteRegistrationContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
