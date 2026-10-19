/**
 * Prism setup for prism-react-renderer.
 *
 * The bundled Prism build ships yaml/json/js but not Dockerfile or shell, so we
 * register small, focused grammars for both here. Importing this module once
 * (CodeBlock does) is enough to make `language="dockerfile"` / `"bash"` work.
 */
import { Prism, themes } from 'prism-react-renderer';

Prism.languages.dockerfile = {
  comment: { pattern: /(^|\s)#.*/m, lookbehind: true, greedy: true },
  string: { pattern: /"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'/, greedy: true },
  keyword: {
    pattern:
      /(^\s*)(?:ADD|ARG|CMD|COPY|ENTRYPOINT|ENV|EXPOSE|FROM|HEALTHCHECK|LABEL|MAINTAINER|ONBUILD|RUN|SHELL|STOPSIGNAL|USER|VOLUME|WORKDIR)\b/im,
    lookbehind: true,
  },
  'class-name': /\bAS\s+[\w-]+/,
  'attr-name': /--[\w-]+(?==)?/,
  variable: /\$\{?\w+\}?/,
  operator: /&&|\|\||\\$/m,
  punctuation: /[[\],]/,
};
Prism.languages.docker = Prism.languages.dockerfile;

Prism.languages.bash = {
  comment: { pattern: /(^|\s)#.*/, lookbehind: true, greedy: true },
  string: { pattern: /"(?:\\.|[^"\\\r\n])*"|'[^'\r\n]*'/, greedy: true },
  variable: /\$\(?\{?[\w]+\}?\)?/,
  function: {
    pattern:
      /(^|[\s|;&(])(?:docker|sudo|curl|cat|echo|ls|mkdir|cd|ping|ps|grep|trivy|npm|node|kubectl|ip|iptables|nslookup)(?=\s|$)/,
    lookbehind: true,
  },
  'attr-name': { pattern: /(^|\s)--?[\w-]+/, lookbehind: true },
  operator: /&&|\|\||[|>]/,
  number: /\b\d+\b/,
};
Prism.languages.shell = Prism.languages.bash;
Prism.languages.sh = Prism.languages.bash;

/** Night Owl, but with a transparent background so it blends into our panels. */
export const codeTheme = {
  ...themes.nightOwl,
  plain: { ...themes.nightOwl.plain, backgroundColor: 'transparent' },
};
