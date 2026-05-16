import { useRoute } from "wouter";

export default function NotFound() {
  const [match] = useRoute("/404");

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center cyber-grid relative min-h-[80vh]">
      <div className="absolute inset-0 bg-background/90" />
      <div className="relative z-10 space-y-6 max-w-md">
        <div className="font-mono text-6xl font-bold text-primary opacity-80">404</div>
        <h1 className="text-2xl font-semibold tracking-tight">Signal Not Found</h1>
        <p className="text-muted-foreground">
          The requested resource could not be located on the server. It may have been moved or the transmission was intercepted.
        </p>
        <div className="pt-4">
          <a href="/" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
