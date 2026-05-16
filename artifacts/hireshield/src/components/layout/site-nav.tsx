import { Link } from "wouter";
import { Shield, Github, FileText, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center w-8 h-8 rounded bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            <Shield className="w-5 h-5" />
            <div className="absolute inset-0 border border-primary/30 rounded" />
          </div>
          <span className="font-bold text-lg tracking-tight">HireShield</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/analyze" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <Activity className="w-4 h-4" /> Analyze
          </Link>
          <Link href="/community" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" /> Community
          </Link>
          <a href="https://github.com/hireshield/hireshield" target="_blank" rel="noreferrer" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <Github className="w-4 h-4" /> GitHub
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <a href="https://github.com/hireshield/hireshield" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
              <Github className="w-4 h-4" />
              Star on GitHub
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
