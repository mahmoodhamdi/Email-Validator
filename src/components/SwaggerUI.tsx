"use client";

import { useEffect, useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

interface SwaggerUIWrapperProps {
  specUrl: string;
}

export function SwaggerUIWrapper({ specUrl }: SwaggerUIWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="swagger-wrapper">
      <SwaggerUI url={specUrl} />
      <style jsx global>{`
        .swagger-wrapper .swagger-ui {
          font-family: inherit;
        }
        .swagger-wrapper .swagger-ui .topbar {
          display: none;
        }
        .swagger-wrapper .swagger-ui .info {
          margin: 20px 0;
        }
        .swagger-wrapper .swagger-ui .info .title {
          font-size: 2rem;
          font-weight: bold;
        }
        .swagger-wrapper .swagger-ui .opblock-tag {
          font-size: 1.25rem;
          border-bottom: 1px solid hsl(var(--border));
        }
        .swagger-wrapper .swagger-ui .opblock {
          border-radius: 8px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .swagger-wrapper .swagger-ui .opblock .opblock-summary {
          border-radius: 8px;
        }
        .swagger-wrapper .swagger-ui .opblock.opblock-post {
          border-color: hsl(var(--primary));
          background: rgba(var(--primary), 0.05);
        }
        .swagger-wrapper .swagger-ui .opblock.opblock-get {
          border-color: #61affe;
          background: rgba(97, 175, 254, 0.05);
        }
        .swagger-wrapper .swagger-ui .btn {
          border-radius: 6px;
        }
        .swagger-wrapper .swagger-ui .btn.execute {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
        }
        .swagger-wrapper .swagger-ui select {
          border-radius: 6px;
        }
        .swagger-wrapper .swagger-ui input[type="text"],
        .swagger-wrapper .swagger-ui textarea {
          border-radius: 6px;
        }
        .swagger-wrapper .swagger-ui .model-box {
          border-radius: 8px;
        }
        .swagger-wrapper .swagger-ui section.models {
          border-radius: 8px;
        }
        .swagger-wrapper .swagger-ui .response-col_status {
          font-weight: 600;
        }
        /* Dark mode support */
        .dark .swagger-wrapper .swagger-ui,
        .dark .swagger-wrapper .swagger-ui .info .title,
        .dark .swagger-wrapper .swagger-ui .opblock-tag,
        .dark .swagger-wrapper .swagger-ui .opblock-description-wrapper p,
        .dark .swagger-wrapper .swagger-ui .opblock-external-docs-wrapper p,
        .dark .swagger-wrapper .swagger-ui .opblock-title_normal p,
        .dark .swagger-wrapper .swagger-ui table thead tr th,
        .dark .swagger-wrapper .swagger-ui table tbody tr td,
        .dark .swagger-wrapper .swagger-ui .parameter__name,
        .dark .swagger-wrapper .swagger-ui .parameter__type,
        .dark .swagger-wrapper .swagger-ui .response-col_status,
        .dark .swagger-wrapper .swagger-ui .response-col_description,
        .dark .swagger-wrapper .swagger-ui .model-title,
        .dark .swagger-wrapper .swagger-ui .model {
          color: hsl(var(--foreground));
        }
        .dark .swagger-wrapper .swagger-ui .opblock .opblock-section-header {
          background: hsl(var(--muted));
        }
        .dark .swagger-wrapper .swagger-ui input[type="text"],
        .dark .swagger-wrapper .swagger-ui textarea {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border-color: hsl(var(--border));
        }
        .dark .swagger-wrapper .swagger-ui select {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border-color: hsl(var(--border));
        }
        .dark .swagger-wrapper .swagger-ui .model-box {
          background: hsl(var(--muted));
        }
        .dark .swagger-wrapper .swagger-ui section.models {
          background: hsl(var(--card));
          border-color: hsl(var(--border));
        }
        .dark .swagger-wrapper .swagger-ui section.models h4 {
          color: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
}
