"use client";

import type { HelpArticleMeta } from "@/lib/helpers/markdown-types";
import { groupArticlesByCategory } from "@/lib/helpers/markdown-types";
import { HelpCard } from "./HelpCard";

interface HelpIndexProps {
  articles: HelpArticleMeta[];
}

export function HelpIndex({ articles }: HelpIndexProps) {
  const groupedArticles = groupArticlesByCategory(articles);
  const categories = Object.keys(groupedArticles).sort();

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No hay artículos de ayuda disponibles.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Crea archivos .md en{" "}
          <code className="bg-muted px-1 py-0.5 rounded">/public/help/</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <section key={category}>
          <h2 className="text-2xl font-semibold mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedArticles[category].map((article) => (
              <HelpCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
