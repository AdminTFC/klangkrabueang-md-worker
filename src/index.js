import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-',
});

export default {
  async fetch(request) {
    const accept = request.headers.get('Accept') || '';

    if (!accept.includes('text/markdown')) {
      return fetch(request);
    }

    const response = await fetch(request);

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    try {
      const html = await response.text();
      const markdown = turndown.turndown(html);
      const mdTokens = Math.round(markdown.length / 4);
      const htmlTokens = Math.round(html.length / 4);
      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'x-markdown-tokens': String(mdTokens),
          'x-original-tokens': String(htmlTokens),
        },
      });
    } catch (err) {
      return new Response(`# Error\n\n${err.message}\n\n\`\`\`\n${err.stack}\n\`\`\``, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      });
    }
  },
};