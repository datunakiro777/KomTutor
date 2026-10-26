import katex from 'katex';

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Explanations mix plain text with $…$ / $$…$$ LaTeX; render the math parts with KaTeX.
function toHtml(text) {
  return text
    .split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g)
    .map((part) => {
      const display = part.startsWith('$$') && part.endsWith('$$') && part.length > 4;
      const inline = !display && part.startsWith('$') && part.endsWith('$') && part.length > 2;
      if (!display && !inline) return escapeHtml(part);
      const tex = display ? part.slice(2, -2) : part.slice(1, -1);
      return katex.renderToString(tex, { displayMode: display, throwOnError: false });
    })
    .join('');
}

export default function MathText({ text, as: Tag = 'span', className }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: toHtml(text ?? '') }} />;
}
