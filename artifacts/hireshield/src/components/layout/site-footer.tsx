import { Link } from "wouter";
import { Shield, Github, Twitter } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-card/50">
      <div className="container mx-auto px-4 py-12 flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="flex flex-col gap-4 max-w-sm">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold tracking-tight">HireShield</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            An open-source AI system for detecting suspicious recruitment posts. Building the trust layer of recruitment.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Released under the MIT License.
          </p>
        </div>
        
        <div className="flex gap-16">
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-sm">Product</h4>
            <Link href="/analyze" className="text-sm text-muted-foreground hover:text-foreground">Analyze Tool</Link>
            <Link href="/community" className="text-sm text-muted-foreground hover:text-foreground">Community Feed</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-sm">Community</h4>
            <a href="https://github.com/hireshield/hireshield" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
              <Github className="w-4 h-4" /> GitHub
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
              <Twitter className="w-4 h-4" /> Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
