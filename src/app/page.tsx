import Simulator from "@/components/Simulator";

// Simulator is a client component; the matrix-rain background lives inside it,
// so we don't need `next/dynamic` with ssr:false here (Next 16 forbids that
// in Server Components anyway).
export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-lime-200">
      <Simulator />
    </main>
  );
}
