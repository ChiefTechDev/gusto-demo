import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { email, password } = await req.json();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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

export async function GET() {
  const supabase = createClient();

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    return new Response(JSON.stringify({ user, error }), {
      status: error ? 400 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE() {
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }

    return new Response(JSON.stringify({ status: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error during sign-out:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
