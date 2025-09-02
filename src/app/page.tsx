export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Gusto PoC</h1>
        <div className="space-x-3">
          <a className="underline" href="/register">Register</a>
          <a className="underline" href="/login">Login</a>
          <a className="underline" href="/gusto">Gusto</a>
        </div>
      </main>
    </div>
  );
}
