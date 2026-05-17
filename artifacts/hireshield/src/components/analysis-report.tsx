import { useState } from "react";
import { ShieldAlert, ShieldCheck, Shield, Activity, Zap, CheckCircle2, AlertTriangle, AlertCircle, FileText, Share2, History } from "lucide-react";
import { Analysis, TrustSignal, FraudRisk, SignalSeverity, SignalCategory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface AnalysisReportProps {
  analysis: Analysis;
}

const getRiskColor = (risk: FraudRisk) => {
  switch (risk) {
    case "low": return "bg-green-500/10 text-green-500 border-green-500/20";
    case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "critical": return "bg-red-500/10 text-red-500 border-red-500/20";
    default: return "bg-muted text-muted-foreground";
  }
};

const getRiskIcon = (risk: FraudRisk) => {
  switch (risk) {
    case "low": return <ShieldCheck className="w-5 h-5 text-green-500" />;
    case "medium": return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    case "high": return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    case "critical": return <ShieldAlert className="w-5 h-5 text-red-500" />;
    default: return <Shield className="w-5 h-5" />;
  }
};

const getSeverityColor = (severity: SignalSeverity) => {
  switch (severity) {
    case "info": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "low": return "bg-green-500/10 text-green-500 border-green-500/20";
    case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "high": return "bg-red-500/10 text-red-500 border-red-500/20";
    default: return "bg-muted text-muted-foreground";
  }
};

export function AnalysisReport({ analysis }: AnalysisReportProps) {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<SignalCategory | "all">("all");

  const copyPermalink = () => {
    const url = `${window.location.origin}/analyses/${analysis.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Permalink copied",
      description: "Link copied to clipboard.",
    });
  };

  const signalsByCategory = analysis.signals.reduce((acc, signal) => {
    if (!acc[signal.category]) {
      acc[signal.category] = [];
    }
    acc[signal.category].push(signal);
    return acc;
  }, {} as Record<string, TrustSignal[]>);

  const categories = Object.keys(signalsByCategory) as SignalCategory[];

  const displayedSignals = activeCategory === "all" 
    ? analysis.signals 
    : analysis.signals.filter(s => s.category === activeCategory);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header / Score Strip */}
      <Card className="border-primary/20 bg-primary/5 shadow-[0_0_20px_rgba(255,165,0,0.05)]">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
          
          <div className="flex-1 flex flex-col justify-center gap-2 w-full">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Trust Score</span>
              <span className="font-mono text-xs text-muted-foreground">ID: {analysis.id.slice(0,8)}</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl md:text-7xl font-bold tracking-tighter text-primary">
                {analysis.trustScore}
              </span>
              <span className="text-xl text-muted-foreground">/ 100</span>
            </div>
            <Progress value={analysis.trustScore} className="h-2 mt-2 bg-primary/20" />
          </div>

          <div className="w-full md:w-px md:h-24 bg-border/50" />

          <div className="flex-1 w-full grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Risk Level</span>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border ${getRiskColor(analysis.fraudRisk)}`}>
                {getRiskIcon(analysis.fraudRisk)}
                <span className="font-semibold capitalize">{analysis.fraudRisk}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Confidence</span>
              <div className="text-xl font-semibold">{analysis.confidenceLevel}%</div>
            </div>
            <div className="space-y-1 col-span-2">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Ghost Job Probability</span>
              <div className="flex items-center gap-3">
                <Progress value={analysis.ghostJobProbability} className="h-2 w-24 bg-muted" />
                <span className="text-sm font-semibold">{analysis.ghostJobProbability}%</span>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Target Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              Target Assessment
            </span>
            <Button variant="ghost" size="sm" onClick={copyPermalink} className="h-8 gap-2">
              <Share2 className="w-4 h-4" />
              Permalink
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Job Title</span>
              <div className="font-medium truncate">{analysis.jobTitle || "N/A"}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Company</span>
              <div className="font-medium truncate">{analysis.company || "N/A"}</div>
            </div>
            {analysis.recruiterEmail && (
              <div>
                <span className="text-sm text-muted-foreground">Recruiter Email</span>
                <div className="font-medium truncate font-mono text-sm">{analysis.recruiterEmail}</div>
              </div>
            )}
            {analysis.jobUrl && (
              <div>
                <span className="text-sm text-muted-foreground">Job URL</span>
                <div className="font-medium truncate">
                  <a href={analysis.jobUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {analysis.jobUrl}
                  </a>
                </div>
              </div>
            )}
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold mb-2">Candidate Summary</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{analysis.candidateSummary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Posting history */}
      {(analysis.postedAt || analysis.postingHistory) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              Posting Timeline
            </CardTitle>
            <CardDescription>
              How long this listing has been around and whether we've seen the same content before.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {analysis.postedAt && (
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Originally posted</span>
                <div className="font-medium mt-1">
                  {new Date(analysis.postedAt).toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.max(
                    0,
                    Math.round(
                      (Date.now() - new Date(analysis.postedAt).getTime()) / 86_400_000,
                    ),
                  )}{" "}
                  days ago
                </div>
              </div>
            )}
            {analysis.postingHistory && (
              <>
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Submissions seen</span>
                  <div className="font-medium mt-1">
                    {analysis.postingHistory.seenCount}× identical content
                  </div>
                  <div className="text-xs text-muted-foreground">
                    First on{" "}
                    {new Date(analysis.postingHistory.firstSeenAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Last submitted</span>
                  <div className="font-medium mt-1">
                    {new Date(analysis.postingHistory.lastSeenAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.max(
                      0,
                      Math.round(
                        (Date.now() -
                          new Date(analysis.postingHistory.lastSeenAt).getTime()) /
                          86_400_000,
                      ),
                    )}{" "}
                    days ago
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Explanation (Terminal Style) */}
      <Card className="bg-black text-green-500 border-green-500/20 shadow-none font-mono overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500/0 via-green-500/50 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="border-b border-green-500/20 bg-green-500/5 pb-3 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            system_reasoning.log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs leading-relaxed whitespace-pre-wrap">
          {analysis.aiExplanation}
        </CardContent>
      </Card>

      {/* Trust Signals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Detected Signals ({analysis.signals.length})
          </h3>
          <div className="flex flex-wrap gap-2 justify-end">
            <Badge 
              variant={activeCategory === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setActiveCategory("all")}
            >
              All
            </Badge>
            {categories.map(cat => (
              <Badge 
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                className="cursor-pointer capitalize font-mono text-xs"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {displayedSignals.map((signal, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-lg border bg-card flex flex-col md:flex-row md:items-start gap-4"
            >
              <div className="flex flex-col gap-2 min-w-[120px]">
                <Badge variant="outline" className={`w-fit uppercase text-[10px] ${getSeverityColor(signal.severity)}`}>
                  {signal.severity}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">[{signal.category}]</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="font-medium">{signal.label}</div>
                <div className="text-sm text-muted-foreground">{signal.detail}</div>
              </div>
            </motion.div>
          ))}
          {displayedSignals.length === 0 && (
            <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground">
              No signals found for this category.
            </div>
          )}
        </div>
      </div>

      {/* Recommended Actions */}
      {analysis.recommendedActions && analysis.recommendedActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.recommendedActions.map((action, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-xs">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
