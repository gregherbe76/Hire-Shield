import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateAnalysis, useListAnalysisExamples } from "@workspace/api-client-react";
import { getListAnalysesQueryKey, getGetCommunityStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnalysisReport } from "@/components/analysis-report";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Zap, Loader2, Search, Link2, ClipboardPaste } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Analysis } from "@workspace/api-client-react";

const baseSchema = z.object({
  jobTitle: z.string().max(300).optional(),
  company: z.string().max(200).optional(),
  recruiterEmail: z.string().max(320).optional(),
  jobUrl: z
    .string()
    .max(2048)
    .regex(/^https?:\/\//i, "Must start with http:// or https://")
    .optional()
    .or(z.literal("")),
  jobDescription: z.string().max(20000).optional().or(z.literal("")),
});

const formSchema = baseSchema.superRefine((val, ctx) => {
  const hasDesc = (val.jobDescription ?? "").trim().length >= 20;
  const hasUrl = (val.jobUrl ?? "").trim().length > 0;
  if (!hasDesc && !hasUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["jobDescription"],
      message: "Paste a description (min 20 chars) or provide a URL to fetch.",
    });
  }
});

type FormValues = z.infer<typeof baseSchema>;

export default function AnalyzePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<Analysis | null>(null);
  
  const { data: examples } = useListAnalysisExamples();
  const createAnalysis = useCreateAnalysis();
  const [mode, setMode] = useState<"paste" | "url">("paste");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobTitle: "",
      company: "",
      recruiterEmail: "",
      jobUrl: "",
      jobDescription: "",
    },
  });

  const descriptionLength = form.watch("jobDescription")?.length || 0;

  // Handle loading state manually for the fancy animation
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const scanSteps = mode === "url"
    ? [
        "Fetching page from URL...",
        "Extracting posting text...",
        "Running heuristic patterns...",
        "Analyzing stylometry...",
        "Querying LLM reasoning...",
        "Calculating Trust Score...",
      ]
    : [
        "Parsing text content...",
        "Extracting metadata & URLs...",
        "Running heuristic patterns...",
        "Analyzing stylometry...",
        "Querying LLM reasoning...",
        "Calculating Trust Score...",
      ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      interval = setInterval(() => {
        setScanStep(s => Math.min(s + 1, scanSteps.length - 1));
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isScanning, scanSteps.length]);

  const onSubmit = async (data: FormValues) => {
    setIsScanning(true);
    setScanStep(0);
    setResult(null);
    
    try {
      // Strip empty optional strings before sending.
      const payload: FormValues = {
        ...data,
        jobUrl: data.jobUrl?.trim() || undefined,
        jobDescription: data.jobDescription?.trim() || undefined,
        jobTitle: data.jobTitle?.trim() || undefined,
        company: data.company?.trim() || undefined,
        recruiterEmail: data.recruiterEmail?.trim() || undefined,
      };
      const res = await createAnalysis.mutateAsync({ data: payload });
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCommunityStatsQueryKey() });
      // Update URL silently
      window.history.pushState({}, "", `/analyses/${res.id}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Analysis failed. Please try again.";
      form.setError("root", { message });
    } finally {
      setIsScanning(false);
    }
  };

  const loadExample = (id: string) => {
    const example = examples?.find(e => e.id === id);
    if (example) {
      form.reset({
        jobTitle: example.jobTitle || "",
        company: example.company || "",
        recruiterEmail: "",
        jobUrl: "",
        jobDescription: example.jobDescription || "",
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // If a URL param tells us to load an example (from homepage)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const exampleId = searchParams.get('example');
    if (exampleId && examples) {
      loadExample(exampleId);
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [examples]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Form */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Search className="w-6 h-6 text-primary" />
              Analyze a Job Posting
            </h1>
            <p className="text-muted-foreground text-sm">
              Paste the contents of a suspicious job posting. Our system will analyze it against known scam patterns, ghost job indicators, and phishing signals.
            </p>
          </div>

          {examples && examples.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground py-1">Try an example:</span>
              {examples.map(ex => (
                <Badge 
                  key={ex.id} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-primary/20 transition-colors font-mono text-xs"
                  onClick={() => loadExample(ex.id)}
                >
                  {ex.label}
                </Badge>
              ))}
            </div>
          )}

          <Card className="border-border/50">
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="jobTitle" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                        <FormControl><Input placeholder="e.g. Senior Frontend Engineer" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="company" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                        <FormControl><Input placeholder="e.g. Acme Corp" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="recruiterEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recruiter Email <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                      <FormControl><Input type="email" placeholder="e.g. hr@acme.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Tabs value={mode} onValueChange={(v) => setMode(v as "paste" | "url")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="paste" className="gap-2">
                        <ClipboardPaste className="w-4 h-4" /> Paste text
                      </TabsTrigger>
                      <TabsTrigger value="url" className="gap-2">
                        <Link2 className="w-4 h-4" /> From URL
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="paste" className="space-y-4 pt-4">
                      <FormField control={form.control} name="jobUrl" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job URL <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                          <FormControl><Input type="url" placeholder="https://..." {...field} /></FormControl>
                          <FormDescription>Linked from the report for context, not fetched.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="jobDescription" render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-end">
                            <FormLabel>Job Description <span className="text-destructive">*</span></FormLabel>
                            <span className={`text-xs font-mono ${descriptionLength > 20000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {descriptionLength} / 20k
                            </span>
                          </div>
                          <FormControl>
                            <Textarea
                              placeholder="Paste the full job description here..."
                              className="min-h-[260px] font-mono text-sm resize-y"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>The main body of the job post. Exclude generic site headers.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </TabsContent>

                    <TabsContent value="url" className="space-y-4 pt-4">
                      <FormField control={form.control} name="jobUrl" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job URL <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://company.com/careers/senior-engineer"
                              className="font-mono text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            We'll fetch the page and extract the posting text. Only public http(s) URLs are supported.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
                        <p className="font-mono">
                          &gt; Some sites block automated fetches or require JavaScript. If the URL fails, switch to <span className="text-foreground">Paste text</span>.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {form.formState.errors.root && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                      {form.formState.errors.root.message}
                    </div>
                  )}

                  <Button type="submit" size="lg" className="w-full gap-2 font-bold" disabled={isScanning}>
                    {isScanning ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Analyze Posting
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results / Loading / Empty */}
        <div className="relative min-h-[600px] flex flex-col">
          {isScanning ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-primary">
                  <Shield className="w-10 h-10 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-mono font-bold tracking-tight text-primary">ANALYZING SIGNAL</h3>
                <p className="text-sm font-mono text-muted-foreground h-6 animate-pulse">
                  &gt; {scanSteps[scanStep]}
                </p>
              </div>
            </div>
          ) : result ? (
            <AnalysisReport analysis={result} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/50 rounded-xl bg-card/30">
              <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Awaiting Target</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Paste a job posting or drop in a URL on the left to begin. The engine will parse the text, evaluate heuristics, and generate a comprehensive trust report.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm text-left">
                <div className="p-3 bg-card rounded border text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span> Checks NLP stylometry
                </div>
                <div className="p-3 bg-card rounded border text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span> Detects known phishing patterns
                </div>
                <div className="p-3 bg-card rounded border text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span> Scores ghost job probability
                </div>
                <div className="p-3 bg-card rounded border text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span> LLM-powered reasoning
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
