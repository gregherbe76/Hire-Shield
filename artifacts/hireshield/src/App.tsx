import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Layout
import { SiteNav } from "@/components/layout/site-nav";
import { SiteFooter } from "@/components/layout/site-footer";

// Pages
import HomePage from "@/pages/home";
import AnalyzePage from "@/pages/analyze";
import AnalysisPermalinkPage from "@/pages/analysis-permalink";
import CommunityPage from "@/pages/community";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full selection:bg-primary/20">
      <SiteNav />
      <main className="flex-1 flex flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/analyze" component={AnalyzePage} />
      <Route path="/analyses/:id" component={AnalysisPermalinkPage} />
      <Route path="/community" component={CommunityPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
