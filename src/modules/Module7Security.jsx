import ModuleShell from '../components/layout/ModuleShell';
import Lesson from '../components/layout/Lesson';
import Callout from '../components/ui/Callout';
import Terminal from '../components/ui/Terminal';
import SecurityBuilder from '../components/visualizers/SecurityBuilder';
import CheatSheet from '../components/visualizers/CheatSheet';
import { QUIZZES } from '../data/quizzes';

const SCAN_COMMANDS = [
  {
    cmd: 'docker scout quickview myapp:1.0',
    speed: 120,
    output: [
      '    ✓ Image stored for indexing',
      '    ✓ Indexed 412 packages',
      '',
      '  Target             │  myapp:1.0          │    3C    19H    41M    97L',
      '    digest           │  4e1b0a2f9c11       │',
      '  Base image         │  node:20            │    3C    17H    38M    95L',
      { text: '  Updated base image │  node:20-alpine     │    0C     1H     2M     0L', tone: 'ok' },
      { text: '                     │                     │   -3    -16    -36    -95', tone: 'ok' },
    ],
  },
  {
    cmd: 'trivy image --severity HIGH,CRITICAL --ignore-unfixed myapp:1.0',
    speed: 120,
    output: [
      'myapp:1.0 (debian 12.6)',
      'Total: 7 (HIGH: 5, CRITICAL: 2)',
      '┌──────────────┬────────────────┬──────────┬───────────────────┬───────────────┐',
      '│   Library    │ Vulnerability  │ Severity │ Installed Version │ Fixed Version │',
      '├──────────────┼────────────────┼──────────┼───────────────────┼───────────────┤',
      { text: '│ libssl3      │ CVE-2024-XXXXX │ CRITICAL │ 3.0.13-1~deb12u1  │ 3.0.14-1      │', tone: 'err' },
      { text: '│ zlib1g       │ CVE-2023-XXXXX │ CRITICAL │ 1:1.2.13.dfsg-1   │ 1:1.2.13-2    │', tone: 'err' },
      { text: '│ libexpat1    │ CVE-2024-XXXXX │ HIGH     │ 2.5.0-1           │ 2.5.0-1+deb12 │', tone: 'warn' },
      '└──────────────┴────────────────┴──────────┴───────────────────┴───────────────┘',
      { text: '# Sample output. Most findings come from OS packages your app never uses. A smaller base removes them.', tone: 'dim' },
    ],
  },
  {
    cmd: 'docker history --no-trunc myapp:1.0 | grep -i token',
    output: [
      { text: 'ENV NPM_TOKEN=npm_9f3aE1c7Hq2…   0B', tone: 'err' },
      { text: '# Anyone who can pull the image can read this secret. Rotate it and switch to build secrets.', tone: 'dim' },
    ],
  },
  {
    cmd: 'docker run --rm myapp:1.0 id',
    output: ['uid=0(root) gid=0(root) groups=0(root)', { text: '# Running as root. Add a USER instruction.', tone: 'warn' }],
  },
  {
    cmd: 'docker run --rm myapp:2.0 id',
    output: [{ text: 'uid=65532(nonroot) gid=65532(nonroot) groups=65532(nonroot)', tone: 'ok' }],
  },
];

export default function Module7Security() {
  return (
    <ModuleShell
      id="security"
      objectives={[
        'Harden images: minimal bases, non-root users, no baked-in secrets',
        'Shrink build context and image size with .dockerignore and multi-stage builds',
        'Scan images for CVEs and look up any CLI command quickly',
      ]}
      quiz={QUIZZES.security}
    >
      <Lesson wide eyebrow="7.1 · Hardening" title="Defence in depth for container images" visual={<SecurityBuilder />}>
        <p>
          Container security comes in layers. Each practice below closes a different attack path. Toggle them and
          watch the Dockerfile, the run command, the image size and the vulnerability count change.
        </p>
        <ul>
          <li><strong>Less is more</strong>: distroless and alpine bases remove shells, package managers and hundreds of CVE-carrying packages.</li>
          <li><strong>Least privilege</strong>: non-root <code>USER</code>, <code>--cap-drop=ALL</code>, read-only rootfs, <code>no-new-privileges</code>.</li>
          <li><strong>Secrets never in layers</strong>: use <code>RUN --mount=type=secret</code> at build time and runtime secrets or env injection.</li>
          <li><strong>Reproducibility</strong>: pin bases by version or digest, and rebuild regularly to pick up patches.</li>
        </ul>
        <Callout type="warn">
          Deleting a secret in a later layer does not remove it. <code>RUN rm .npmrc</code> leaves the file in the
          layer that added it, and anyone can extract it with <code>docker save</code>.
        </Callout>
      </Lesson>

      <Lesson eyebrow="7.2 · Supply chain" title="Scan, verify, repeat" visual={<Terminal title="bash — security audit" commands={SCAN_COMMANDS} heightClass="h-80" />}>
        <p>
          Images age. A clean image today will have known vulnerabilities next month. Make scanning part of CI and
          fail builds on fixable critical findings:
        </p>
        <ul>
          <li><code>docker scout</code> is built into Docker and recommends base-image upgrades.</li>
          <li><code>trivy</code> and <code>grype</code> are popular open-source scanners that fit any pipeline.</li>
          <li>Generate an <strong>SBOM</strong> (<code>docker buildx build --sbom=true</code>) and sign images (cosign / Docker Content Trust).</li>
        </ul>
        <h3>.dockerignore</h3>
        <p>
          Everything in the build context is sent to the builder and can end up in a <code>COPY . .</code>.
          Exclude <code>.git</code>, <code>.env*</code>, <code>node_modules</code> and build output. Builds get faster,
          caches stay stable, and secrets stay out of images.
        </p>
      </Lesson>

      <Lesson wide eyebrow="7.3 · Reference" title="Interactive Docker CLI cheat sheet" visual={<CheatSheet />}>
        <p>
          Every command from this course in one place. Search by command, flag or intent, filter by category, and
          click any highlighted flag for a plain-English explanation. The copy button puts the command on your
          clipboard.
        </p>
      </Lesson>
    </ModuleShell>
  );
}
