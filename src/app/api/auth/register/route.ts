import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { email, password } = await req.json();
    const { data, error } = await supabase.auth.signUp({ email, password });

    return new Response(JSON.stringify({ data, error }), {
      status: error ? 400 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error during sign-in:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}