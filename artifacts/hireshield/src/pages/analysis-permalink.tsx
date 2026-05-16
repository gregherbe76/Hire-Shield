import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useGetAnalysis } from "@workspace/api-client-react";
import { getGetAnalysisQueryKey } from "@workspace/api-client-react";
import { AnalysisReport } from "@/components/analysis-report";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function AnalysisPermalinkPage() {
  const [, params] = useRoute("/analyses/:id");
  const id = params?.id;

  const { data: analysis, isLoading, error } = useGetAnalysis(id!, {
    query: {
      enabled: !!id,
      queryKey: getGetAnalysisQueryKey(id!)
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center space-y-6">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Analysis Not Found</h1>
        <p className="text-muted-foreground">
          The requested analysis report could not be found. It may have been removed or the ID is incorrect.
        </p>
        <Button asChild>
          <Link href="/analyze">Run New Analysis</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 -ml-4 text-muted-foreground hover:text-foreground">
          <Link href="/community">
            <ArrowLeft className="w-4 h-4" />
            Back to Community Feed
          </Link>
        </Button>
      </div>
      <AnalysisReport analysis={analysis} />
    </div>
  );
}
