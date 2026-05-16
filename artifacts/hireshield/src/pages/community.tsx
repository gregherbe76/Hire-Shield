import { useState } from "react";
import { Link } from "wouter";
import { useGetCommunityStats, useListAnalyses } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Activity, Users, AlertTriangle, Ghost, ArrowRight, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export default function CommunityPage() {
  const { data: stats, isLoading: statsLoading } = useGetCommunityStats();
  const { data: analyses, isLoading: analysesLoading } = useListAnalyses({ limit: 30 });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "hsl(var(--primary))"; // Muted fallback, but we can use specific hues
      case "medium": return "#eab308"; // yellow-500
      case "high": return "#f97316"; // orange-500
      case "critical": return "#ef4444"; // red-500
      default: return "#888888";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Community Intelligence</h1>
        <p className="text-muted-foreground max-w-2xl">
          Live telemetry from the HireShield network. We aggregate signals across all open-source analyses to identify emerging recruitment scams and ghost job patterns.
        </p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAnalyses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Processed via public API
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flagged High Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.flaggedCount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.flaggedCount / Math.max(stats.totalAnalyses, 1)) * 100).toFixed(1)}% of all jobs
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Trust Score</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageTrustScore.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all submissions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ghost Job Share</CardTitle>
              <Ghost className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ghostJobShare.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Probability &gt; 60%
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4" />
                Risk Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.riskBreakdown}>
                  <XAxis dataKey="risk" fontSize={12} tickLine={false} axisLine={false} style={{ textTransform: 'capitalize' }} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.riskBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getRiskColor(entry.risk)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4" />
                Top Detected Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topSignals.map((signal, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate pr-4">{signal.label}</span>
                    <Badge variant="secondary" className="font-mono">{signal.count.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Live Feed</h2>
        </div>
        
        {analysesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyses?.map((analysis, i) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/analyses/${analysis.id}`}>
                  <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 overflow-hidden pr-2">
                          <CardTitle className="text-base truncate">{analysis.jobTitle || "Unknown Role"}</CardTitle>
                          <CardDescription className="truncate">{analysis.company || "Unknown Company"}</CardDescription>
                        </div>
                        <div className="flex-shrink-0 w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center font-bold text-primary group-hover:bg-primary/10 transition-colors">
                          {analysis.trustScore}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          analysis.fraudRisk === 'critical' ? 'border-red-500/50 text-red-500' :
                          analysis.fraudRisk === 'high' ? 'border-orange-500/50 text-orange-500' :
                          analysis.fraudRisk === 'medium' ? 'border-yellow-500/50 text-yellow-500' :
                          'border-green-500/50 text-green-500'
                        }>
                          {analysis.fraudRisk} risk
                        </Badge>
                        {analysis.topSignal && (
                          <span className="text-xs text-muted-foreground truncate font-mono bg-muted px-2 py-0.5 rounded">
                            {analysis.topSignal}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>{formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}</span>
                        <span className="flex items-center text-primary group-hover:translate-x-1 transition-transform">
                          View Report <ArrowRight className="w-3 h-3 ml-1" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
