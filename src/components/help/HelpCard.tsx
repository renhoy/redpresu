"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Play } from "lucide-react";
import type { HelpArticleMeta } from "@/lib/helpers/markdown-types";

interface HelpCardProps {
  article: HelpArticleMeta;
}

export function HelpCard({ article }: HelpCardProps) {
  return (
    <Link href={`/help/${article.id}`}>
      <Card className="h-full hover:border-primary transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <CardTitle className="text-base">{article.title}</CardTitle>
            </div>
            {article.tourId && (
              <Badge variant="secondary" className="gap-1 flex-shrink-0">
                <Play className="w-3 h-3" />
                Tour
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
