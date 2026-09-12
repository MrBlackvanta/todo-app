import { SiteFooter, SiteHeader } from "@/components/layout";
import { TodoBoard } from "@/views/home";

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col px-6">
      <div className="v-band pointer-events-none absolute inset-x-0 top-0 h-50 bg-cover bg-center sm:h-75" />
      <div className="max-w-app relative mx-auto flex w-full flex-1 flex-col">
        <SiteHeader />
        <main>
          <TodoBoard />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
