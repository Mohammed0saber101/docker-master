/**
 * Compose file analysis for the live topology editor.
 *
 * parseCompose(text) → { services, networks, volumes, warnings, order, error }
 * Each service is normalized (long/short syntax for depends_on, ports, volumes,
 * networks, environment) and assigned a `level`: 0 for services with no
 * dependencies, 1 + max(level of deps) otherwise. `order` is a valid startup order.
 */
import yaml from 'js-yaml';

const asList = (v) => (Array.isArray(v) ? v : []);

function normalizeService(name, raw) {
  const s = raw && typeof raw === 'object' ? raw : {};

  let deps = [];
  if (Array.isArray(s.depends_on)) deps = s.depends_on.map((d) => ({ name: String(d), condition: 'service_started' }));
  else if (s.depends_on && typeof s.depends_on === 'object')
    deps = Object.entries(s.depends_on).map(([n, v]) => ({ name: n, condition: v?.condition || 'service_started' }));

  let networks = ['default'];
  if (Array.isArray(s.networks)) networks = s.networks.map(String);
  else if (s.networks && typeof s.networks === 'object') networks = Object.keys(s.networks);

  const ports = asList(s.ports).map((p) =>
    typeof p === 'object' && p !== null ? `${p.published ?? '?'}:${p.target ?? '?'}` : String(p),
  );

  const volumes = asList(s.volumes).map((v) => {
    if (typeof v === 'object' && v !== null) {
      return { str: `${v.source ?? ''}:${v.target ?? ''}`, kind: v.type || 'volume', source: v.source };
    }
    const str = String(v);
    const source = str.includes(':') ? str.split(':')[0] : null;
    const kind = !source ? 'anonymous' : /^[./~]/.test(source) ? 'bind' : 'volume';
    return { str, kind, source };
  });

  let env = [];
  if (Array.isArray(s.environment)) env = s.environment.map((e) => String(e).split('=')[0]);
  else if (s.environment && typeof s.environment === 'object') env = Object.keys(s.environment);

  let image = s.image ? String(s.image) : '';
  if (!image && s.build) image = `build: ${typeof s.build === 'string' ? s.build : s.build.context || '.'}`;

  return {
    name,
    image: image || '(no image)',
    deps,
    networks,
    ports,
    volumes,
    env,
    health: Boolean(s.healthcheck),
    replicas: s.deploy?.replicas,
    restart: s.restart,
  };
}

export function parseCompose(text) {
  let doc;
  try {
    doc = yaml.load(text);
  } catch (e) {
    return { error: `YAML error: ${e.reason || e.message}${e.mark ? ` (line ${e.mark.line + 1})` : ''}` };
  }
  if (!doc || typeof doc !== 'object' || !doc.services || typeof doc.services !== 'object') {
    return { error: 'A compose file needs a top-level "services:" mapping.' };
  }

  const services = Object.entries(doc.services).map(([n, s]) => normalizeService(n, s));
  const byName = Object.fromEntries(services.map((s) => [s.name, s]));
  const declaredNets = doc.networks && typeof doc.networks === 'object' ? Object.keys(doc.networks) : [];
  const declaredVols = doc.volumes && typeof doc.volumes === 'object' ? Object.keys(doc.volumes) : [];
  const warnings = [];

  services.forEach((s) => {
    s.deps.forEach((d) => {
      const t = byName[d.name];
      if (!t) {
        warnings.push(`${s.name} depends on undefined service "${d.name}"`);
        return;
      }
      if (!s.networks.some((n) => t.networks.includes(n)))
        warnings.push(`${s.name} → ${d.name}: no shared network, so they cannot reach each other`);
      if (d.condition === 'service_healthy' && !t.health)
        warnings.push(`${s.name} waits for ${d.name} to be healthy, but ${d.name} has no healthcheck`);
    });
    s.networks.forEach((n) => {
      if (n !== 'default' && !declaredNets.includes(n))
        warnings.push(`network "${n}" (used by ${s.name}) is not declared under top-level networks:`);
    });
    s.volumes.forEach((v) => {
      if (v.kind === 'volume' && v.source && !declaredVols.includes(v.source))
        warnings.push(`named volume "${v.source}" (used by ${s.name}) is not declared under top-level volumes:`);
    });
    if (s.ports.some((p) => /^(5432|3306|6379|27017):/.test(p)))
      warnings.push(`${s.name} publishes a database port to the host. Is that intentional?`);
  });

  // Dependency levels with cycle detection.
  const level = {};
  const visiting = new Set();
  let cycle = null;
  const visit = (n, path) => {
    if (level[n] !== undefined) return level[n];
    if (visiting.has(n)) {
      cycle = [...path.slice(path.indexOf(n)), n];
      return 0;
    }
    visiting.add(n);
    let l = 0;
    byName[n].deps.forEach((d) => {
      if (byName[d.name]) l = Math.max(l, visit(d.name, [...path, n]) + 1);
    });
    visiting.delete(n);
    level[n] = l;
    return l;
  };
  services.forEach((s) => visit(s.name, []));
  services.forEach((s) => { s.level = level[s.name]; });

  if (cycle) return { error: `Dependency cycle detected: ${cycle.join(' → ')}` };

  const order = [...services].sort((a, b) => a.level - b.level).map((s) => s.name);
  const networks = [...new Set(services.flatMap((s) => s.networks))];
  const volumes = [...new Set(services.flatMap((s) => s.volumes.filter((v) => v.kind === 'volume').map((v) => v.source)))];

  return { services, networks, volumes, warnings, order, error: null };
}
