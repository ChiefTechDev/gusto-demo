/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";


export default function RegisterPage() {
	const r = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);


	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/auth/register`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password }),
			});

			const { data, error } = await response.json();
			console.log(data, error)
			if (!error) {
				r.push("/login");
			} else {
				setError(error.code);
			}
			setLoading(false);
		} catch (error: any) {
			console.log('error', error)
			setLoading(false);
			if (error && typeof error === "object" && "code" in error) {
				setError(error.code);
			} else if (error) {
				setError("An unknown error occurred.");
			}
		}
	}


	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border rounded-xl p-6">
				<h1 className="text-xl font-semibold">Create account</h1>
				<input className="w-full border rounded p-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
				<input className="w-full border rounded p-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
				{error && <div className="text-red-600 text-sm">{error}</div>}
				<button disabled={loading} className="w-full border rounded p-2 hover:bg-gray-50">{loading ? "Creating…" : "Create account"}</button>
				<p className="text-sm text-center">Already have an account? <a className="underline" href="/login">Sign in</a></p>
			</form>
		</div>
	);
}