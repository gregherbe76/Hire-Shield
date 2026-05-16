import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { 
  Shield, 
  ArrowRight, 
  Search, 
  Code, 
  CheckCircle2,
  Zap,
  Globe,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { useListAnalysisExamples, useGetCommunityStats, useJoinWaitlist, useListAnalyses } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { WaitlistRole } from "@workspace/api-client-react";

const waitlistSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(WaitlistRole).optional(),
  github: z.string().optional(),
});

type WaitlistFormValues = z.infer<typeof waitlistSchema>;

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: examples } = useListAnalysisExamples();
  const { data: stats } = useGetCommunityStats();
  const { data: recentAnalyses } = useListAnalyses({ limit: 6 });
  const joinWaitlist = useJoinWaitlist();

  const waitlistForm = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { email: "", github: "" }
  });

  const onWaitlistSubmit = async (data: WaitlistFormValues) => {
    try {
      await joinWaitlist.mutateAsync({ data });
      toast({
        title: "Added to waitlist",
        description: "We'll be in touch soon. Thank you for joining the mission.",
      });
      waitlistForm.reset();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: err.data?.error || "Could not join waitlist. You might already be on it.",
      });
    }
  };

  const handleExampleClick = (id: string) => {
    setLocation(`/analyze?example=${id}`);
  };

  const signalCategories = [
    { id: "nlp", icon: <MessageSquare className="w-5 h-5 text-blue-500" />, name: "NLP Analysis", desc: "Detects overly aggressive, urgent, or unstructured language typical of scams." },
    { id: "metadata", icon: <Code className="w-5 h-5 text-purple-500" />, name: "Metadata Checks", desc: "Flags missing company details, generic titles, or suspicious email domains." },
    { id: "urgency", icon: <AlertCircle className="w-5 h-5 text-orange-500" />, name: "Urgency Indicators", desc: "Identifies artificial pressure to apply immediately or provide payment." },
    { id: "stylometry", icon: <FileTextIcon className="w-5 h-5 text-indigo-500" />, name: "Stylometry", desc: "Compares writing style against known malicious templates." },
    { id: "duplicate", icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, name: "Duplicate Detection", desc: "Finds copied-and-pasted descriptions across hundreds of fake listings." },
    { id: "domain", icon: <Globe className="w-5 h-5 text-teal-500" />, name: "Domain Reputation", desc: "Checks URLs and email addresses against threat intelligence feeds." },
    { id: "llm", icon: <Zap className="w-5 h-5 text-primary" />, name: "LLM Reasoning", desc: "Synthesizes all signals to provide a plain-English explanation." },
  ];

  return (
    <div className="flex flex-col w-full">
      
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden cyber-grid">
        <div className="absolute inset-0 bg-background/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background/0 to-background z-0" />
        
        <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-4"
          >
            <Shield className="w-4 h-4" />
            Open-source recruitment trust intelligence
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight"
          >
            Know if a job is real <br/>
            <span className="text-muted-foreground">before you apply.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            An open-source AI system for detecting suspicious recruitment posts, ghost jobs, and phishing attempts.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
          >
            <Button size="lg" className="h-14 px-8 text-lg font-bold gap-2 w-full sm:w-auto" asChild>
              <Link href="/analyze">
                <Search className="w-5 h-5" />
                Analyze a Job
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg w-full sm:w-auto gap-2" asChild>
              <a href="https://github.com/hireshield/hireshield" target="_blank" rel="noreferrer">
                <Code className="w-5 h-5" />
                View on GitHub
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats Strip */}
      {stats && (
        <section className="py-8 border-y bg-card/50">
          <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-border/50 text-center">
            <div className="space-y-1">
              <div className="text-3xl font-bold font-mono text-primary">{stats.totalAnalyses.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Scans</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold font-mono text-primary">{stats.flaggedCount.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">High Risk Found</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold font-mono text-primary">{stats.ghostJobShare.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Ghost Job Rate</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold font-mono text-primary">{stats.averageTrustScore.toFixed(0)}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Avg Trust Score</div>
            </div>
          </div>
        </section>
      )}

      {/* How it Works */}
      <section className="py-24 bg-background relative">
        <div className="container mx-auto px-4 max-w-6xl space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">Deep Inspection Engine</h2>
            <p className="text-muted-foreground text-lg">
              We combine traditional heuristics, threat intelligence, and LLM reasoning to evaluate job descriptions across 7 distinct dimensions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signalCategories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full bg-card hover:bg-card/80 transition-colors border-border/50 shadow-none">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center mb-4">
                      {cat.icon}
                    </div>
                    <CardTitle className="text-lg">{cat.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {cat.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples Showcase */}
      {examples && examples.length > 0 && (
        <section className="py-24 bg-secondary/30 border-y">
          <div className="container mx-auto px-4 max-w-6xl space-y-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">See It In Action</h2>
                <p className="text-muted-foreground">Test the engine against known fraudulent and clean postings.</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/analyze">Try Your Own</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {examples.slice(0,3).map(ex => (
                <Card key={ex.id} className="flex flex-col group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleExampleClick(ex.id)}>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={
                        ex.expectedRisk === 'critical' ? 'border-red-500/50 text-red-500' :
                        ex.expectedRisk === 'high' ? 'border-orange-500/50 text-orange-500' :
                        ex.expectedRisk === 'medium' ? 'border-yellow-500/50 text-yellow-500' :
                        'border-green-500/50 text-green-500'
                      }>
                        Expected: {ex.expectedRisk}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                    </div>
                    <CardTitle className="text-lg">{ex.label}</CardTitle>
                    <CardDescription className="truncate font-mono text-xs mt-1">{ex.company}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <p className="text-sm text-muted-foreground line-clamp-2">{ex.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Community Feed Preview */}
      {recentAnalyses && recentAnalyses.length > 0 && (
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 max-w-6xl space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold">Live Community Feed</h2>
              <p className="text-muted-foreground">Recent job descriptions analyzed by the community. Transparency is our best defense.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentAnalyses.map((analysis) => (
                <Link key={analysis.id} href={`/analyses/${analysis.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer group shadow-none bg-card/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="overflow-hidden pr-4 space-y-1">
                        <div className="font-medium truncate text-sm">{analysis.jobTitle || "Unknown Role"}</div>
                        <div className="text-xs text-muted-foreground truncate">{analysis.company || "Unknown Company"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="font-mono font-bold text-primary">{analysis.trustScore}</div>
                        <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">{analysis.fraudRisk}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            
            <div className="text-center">
              <Button variant="ghost" asChild className="gap-2">
                <Link href="/community">
                  View Full Feed <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Waitlist / Mission */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-10 mix-blend-overlay" />
        <div className="container mx-auto px-4 max-w-5xl relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold tracking-tight">Join the Mission</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              HireShield is an open-source project. We believe the recruitment process should be transparent, verifiable, and safe. Join the waitlist for API access, or jump into the GitHub repo to start contributing rules and parsers today.
            </p>
            <div className="flex gap-4 pt-4">
              <Button variant="secondary" size="lg" asChild>
                <a href="https://github.com/hireshield/hireshield" target="_blank" rel="noreferrer">
                  <Code className="w-5 h-5 mr-2" /> GitHub Repo
                </a>
              </Button>
            </div>
          </div>
          
          <Card className="bg-primary-foreground text-background border-none shadow-xl">
            <CardHeader>
              <CardTitle>Get Early API Access</CardTitle>
              <CardDescription className="text-muted-foreground">Sign up to get a free API key for integrating HireShield into your own tools.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...waitlistForm}>
                <form onSubmit={waitlistForm.handleSubmit(onWaitlistSubmit)} className="space-y-4">
                  <FormField control={waitlistForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-background">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" className="bg-background text-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={waitlistForm.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-background">I am a...</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background text-foreground">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="candidate">Candidate</SelectItem>
                            <SelectItem value="recruiter">Recruiter</SelectItem>
                            <SelectItem value="researcher">Researcher</SelectItem>
                            <SelectItem value="contributor">Contributor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={waitlistForm.control} name="github" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-background">GitHub Handle <span className="text-muted-foreground text-xs">(Opt)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="@username" className="bg-background text-foreground" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={joinWaitlist.isPending}>
                    {joinWaitlist.isPending ? "Joining..." : "Join Waitlist"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>

    </div>
  );
}

function FileTextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}
