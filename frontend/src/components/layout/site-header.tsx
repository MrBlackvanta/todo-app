import ThemeToggle from "./theme-toggle";

export default function SiteHeader() {
  return (
    <header className="flex items-start justify-between pt-12 pb-8.5 sm:pt-19.75 sm:pb-9.75">
      <h1 className="text-logo sm:text-logo-lg font-bold text-white">TODO</h1>
      <ThemeToggle />
    </header>
  );
}
