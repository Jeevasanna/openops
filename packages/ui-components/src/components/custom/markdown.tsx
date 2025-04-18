import { Alert, AlertDescription } from '../../ui/alert';

import { Button } from '../../ui/button';
import { useToast } from '../../ui/use-toast';

import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { Check, Copy } from 'lucide-react';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import validator from 'validator';

function applyVariables(markdown: string, variables: Record<string, string>) {
  return markdown
    .replaceAll('<br>', '\n')
    .replaceAll(/\{\{(.*?)\}\}/g, (_, variableName) => {
      return variables[variableName] ?? '';
    });
}

type MarkdownProps = {
  markdown: string | undefined;
  variables?: Record<string, string>;
  className?: string;
  withBorder?: boolean;
};

const Container = ({
  withBorder,
  children,
}: {
  withBorder: boolean;
  children: React.ReactNode;
}) =>
  withBorder ? (
    <Alert className="rounded">
      <AlertDescription className="w-full">{children}</AlertDescription>
    </Alert>
  ) : (
    children
  );

const LanguageText = ({ content }: { content: string }) => {
  return (
    <input
      type="text"
      className="col-span-6 bg-background border border-solid text-sm rounded block w-full p-2.5"
      value={content}
      disabled
    />
  );
};

const LanguageUrl = ({ content }: { content: string }) => {
  if (
    validator.isURL(content, {
      require_protocol: true,
      // localhost links lack a tld
      require_tld: false,
    })
  ) {
    return (
      <a
        href={content}
        target="_blank"
        rel="noopener noreferrer"
        className="col-span-6 bg-background border border-solid text-sm rounded block w-full p-2.5 truncate hover:underline"
      >
        <span className="w-[calc(100%-23px)] inline-flex truncate">
          {content}
        </span>
      </a>
    );
  }

  return <LanguageText content={content} />;
};

/*
  Renders a markdown component with support for variables and language text.
*/
const Markdown = React.memo(
  ({ markdown, variables, withBorder = true }: MarkdownProps) => {
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const { toast } = useToast();

    const { mutate: copyToClipboard } = useMutation({
      mutationFn: async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedText(text);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setCopiedText(null);
      },
      onError: () => {
        toast({
          title: t('Failed to copy to clipboard'),
          duration: 3000,
        });
      },
    });

    if (!markdown) {
      return null;
    }

    const markdownProcessed = applyVariables(markdown, variables ?? {});
    return (
      <Container withBorder={withBorder}>
        <ReactMarkdown
          components={{
            code(props) {
              const isLanguageText = props.className?.includes('language-text');
              const isLanguageUrl = props.className?.includes('language-url');

              if (!isLanguageText && !isLanguageUrl) {
                return <code {...props} className="text-wrap" />;
              }

              const codeContent = String(props.children).trim();
              const isCopying = codeContent === copiedText;
              return (
                <div className="relative py-2 w-full">
                  {isLanguageUrl ? (
                    <LanguageUrl content={codeContent} />
                  ) : (
                    <LanguageText content={codeContent} />
                  )}
                  <Button
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background rounded p-2 inline-flex items-center justify-center"
                    onClick={() => copyToClipboard(codeContent)}
                  >
                    {isCopying ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              );
            },
            h1: ({ node, ...props }) => (
              <h1
                className="scroll-m-20 text-3xl font-bold tracking-tight mt-1"
                {...props}
              />
            ),
            h2: ({ node, ...props }) => (
              <h2
                className="scroll-m-20 text-2xl font-semibold tracking-tight mt-4"
                {...props}
              />
            ),
            h3: ({ node, ...props }) => (
              <h3
                className="scroll-m-20 text-xl font-semibold tracking-tight mt-2"
                {...props}
              />
            ),
            p: ({ node, ...props }) => (
              <p
                className="leading-7 mt-2 [&:not(:first-child)]:my-2"
                {...props}
              />
            ),
            ul: ({ node, ...props }) => (
              <ul className="my-2 ml-6 list-disc [&>li]:mt-2" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props} />
            ),
            li: ({ node, ...props }) => <li {...props} />,
            a: ({ node, ...props }) => (
              <a
                className="font-medium text-primary underline underline-offset-4"
                {...props}
              />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote className="mt-6 border-l-2 pl-6 italic" {...props} />
            ),
          }}
        >
          {markdownProcessed}
        </ReactMarkdown>
      </Container>
    );
  },
);

Markdown.displayName = 'Markdown';
export { Markdown };
