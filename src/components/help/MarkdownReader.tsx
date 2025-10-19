"use client";

interface MarkdownReaderProps {
  htmlContent: string;
  className?: string;
}

/**
 * Componente para renderizar contenido HTML generado desde Markdown
 * Aplica estilos de Tailwind Typography para formato apropiado
 */
export function MarkdownReader({
  htmlContent,
  className = "",
}: MarkdownReaderProps) {
  return (
    <article
      className={`
        prose prose-slate max-w-none
        prose-headings:font-bold prose-headings:text-gray-900
        prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-8
        prose-h2:text-1xl prose-h2:mb-3 prose-h2:mt-6
        prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-5
        prose-p:text-base prose-p:leading-7 prose-p:mb-4
        prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4 prose-ul:space-y-2
        prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4 prose-ol:space-y-2
        prose-li:text-gray-700 prose-li:leading-relaxed
        prose-strong:text-gray-900 prose-strong:font-semibold
        prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-gray-800 prose-code:font-mono
        prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
        prose-pre:border prose-pre:border-gray-700
        [&_pre_code]:bg-transparent [&_pre_code]:text-gray-100 [&_pre_code]:p-0
        prose-a:text-lime-600 prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-l-4 prose-blockquote:border-lime-500 prose-blockquote:pl-4 prose-blockquote:italic
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
