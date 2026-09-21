import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const email = process.env.DEV_USER_EMAIL ?? "dev@local.dev";
const password = process.env.DEV_USER_PASSWORD ?? "dev12345";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Este endpoint está disponível apenas em desenvolvimento." },
      { status: 403 },
    );
  }

  const signInResponse = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  if (signInResponse.status === 401) {
    return NextResponse.json(
      { error: "Conta de desenvolvimento não encontrada. Execute `mise run db:seed:user`." },
      { status: 404 },
    );
  }
  if (!signInResponse.ok) {
    return NextResponse.json(
      { error: "Não foi possível criar a sessão de desenvolvimento." },
      { status: 500 },
    );
  }

  const cookies = signInResponse.headers.getSetCookie();
  if (cookies.length === 0) {
    return NextResponse.json(
      { error: "Não foi possível criar a sessão de desenvolvimento." },
      { status: 500 },
    );
  }

  const redirectTo = new URL(request.url).searchParams.get("redirect") ?? "/map";
  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  for (const cookie of cookies) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
