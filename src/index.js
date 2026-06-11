import { parseHTML } from 'linkedom';

const BLOCK = new Set(['div','section','article','main','header','footer','nav','aside','p','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','table','hr','br','form','figure','figcaption','details','summary']);
const SKIP = new Set(['script','style','noscript','svg','canvas','template']);
const STATIC_EXT = /\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|mp4|webm|pdf|zip|gz|avif)(\?|$)/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (STATIC_EXT.test(url.pathname)) return fetch(request);

    const dest = request.headers.get('Sec-Fetch-Dest');
    if (dest && dest !== 'document' && dest !== 'iframe' && dest !== 'nested-document') return fetch(request);

    const accept = request.headers.get('Accept') || '';
    if (!accept.includes('text/markdown')) return fetch(request);

    const cacheUrl = new URL(url.toString());
    cacheUrl.searchParams.set('_fmt', 'markdown');
    const cacheKey = new Request(cacheUrl.toString());
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;

    const response = await fetch(request);
    const ct = (response.headers.get('Content-Type') || '');
    if (!ct.includes('text/html')) return response;

    const html = await response.text();
    if (html.length > 2_000_000) return response;

    const { document } = parseHTML(html);
    const markdown = convert(document.body);

    const result = new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'x-markdown-tokens': String(Math.round(markdown.length / 4)),
        'x-original-tokens': String(Math.round(html.length / 4)),
      },
    });

    ctx.waitUntil(caches.default.put(cacheKey, result.clone()));
    return result;
  },
};

function isBlock(el) { return el && BLOCK.has(el.tagName.toLowerCase()); }

function convert(node, depth = 0) {
  let out = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      const t = child.textContent.replace(/\s+/g, ' ');
      if (t) out += t;
    } else if (child.nodeType === 1) {
      out += tag(child, depth);
    }
  }
  if (depth > 0) return out;
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

function tag(el, depth) {
  const t = el.tagName.toLowerCase();
  if (SKIP.has(t)) return '';
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  if (!text && !['br','hr','img'].includes(t)) return '';

  switch (t) {
    case 'h1': return '# ' + text + '\n\n';
    case 'h2': return '## ' + text + '\n\n';
    case 'h3': return '### ' + text + '\n\n';
    case 'h4': return '#### ' + text + '\n\n';
    case 'h5': return '##### ' + text + '\n\n';
    case 'h6': return '###### ' + text + '\n\n';
    case 'p': return convert(el) + '\n\n';
    case 'br': return '\n';
    case 'hr': return '---\n\n';
    case 'blockquote': return '> ' + convert(el).replace(/\n/g, '\n> ') + '\n\n';
    case 'pre': return '```\n' + el.textContent.trim() + '\n```\n\n';
    case 'code': return '`' + text + '`';
    case 'strong': case 'b': return '**' + text + '**';
    case 'em': case 'i': return '*' + text + '*';
    case 'a': {
      const h = el.getAttribute('href') || '';
      return (h && text) ? '[' + text + '](' + h + ')' : (text || '');
    }
    case 'img': {
      const s = el.getAttribute('src') || '';
      const a = el.getAttribute('alt') || '';
      return s ? '![' + a + '](' + s + ')' : '';
    }
    case 'ul': case 'ol': {
      let o = '\n';
      for (const li of el.children) {
        const prefix = t === 'ol' ? '1. ' : '- ';
        o += '  '.repeat(depth) + prefix + convert(li) + '\n';
      }
      return o + '\n';
    }
    case 'li': return convert(el, depth + 1);
    case 'table': {
      let o = '\n';
      for (const tr of el.querySelectorAll('tr')) {
        const cells = [...tr.querySelectorAll('th,td')].map(c => ' ' + c.textContent.trim() + ' ');
        o += '|' + cells.join('|') + '|\n';
        if (tr.querySelectorAll('th').length > 0)
          o += '|' + cells.map(() => '---').join('|') + '|\n';
      }
      return o + '\n';
    }
    default: return isBlock(el) ? convert(el) + '\n\n' : text;
  }
}
