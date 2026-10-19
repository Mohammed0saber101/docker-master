import ModuleShell from '../components/layout/ModuleShell';
import Lesson from '../components/layout/Lesson';
import Callout from '../components/ui/Callout';
import Terminal from '../components/ui/Terminal';
import DockerfileParser from '../components/visualizers/DockerfileParser';
import CmdEntrypointLab from '../components/visualizers/CmdEntrypointLab';
import LayerStackExplorer from '../components/visualizers/LayerStackExplorer';
import UnionFsVisualizer from '../components/visualizers/UnionFsVisualizer';
import { QUIZZES } from '../data/quizzes';

const COMMANDS = [
  {
    cmd: 'docker build -t api:1.0 .',
    speed: 110,
    output: [
      '[+] Building 31.4s (14/14) FINISHED                         docker:default',
      ' => [internal] load build definition from Dockerfile                  0.0s',
      ' => [internal] load .dockerignore                                     0.0s',
      ' => [build 1/6] FROM docker.io/library/node:20-alpine@sha256:c13b…    5.8s',
      ' => [build 2/6] WORKDIR /app                                          0.1s',
      ' => [build 3/6] COPY package*.json ./                                 0.1s',
      ' => [build 4/6] RUN npm ci                                           19.7s',
      ' => [build 5/6] COPY . .                                              0.2s',
      ' => [build 6/6] RUN npm run build && npm prune --omit=dev             4.9s',
      ' => [runtime 3/4] COPY --from=build /app/node_modules ./node_modules  0.4s',
      ' => [runtime 4/4] COPY --from=build /app/dist ./dist                  0.1s',
      ' => exporting to image                                                0.3s',
      { text: ' => => naming to docker.io/library/api:1.0                             0.0s', tone: 'ok' },
    ],
  },
  {
    cmd: 'docker build -t api:1.1 .   # after editing src/ only',
    speed: 110,
    output: [
      '[+] Building 5.6s (14/14) FINISHED                          docker:default',
      { text: ' => CACHED [build 2/6] WORKDIR /app                                   0.0s', tone: 'ok' },
      { text: ' => CACHED [build 3/6] COPY package*.json ./                          0.0s', tone: 'ok' },
      { text: ' => CACHED [build 4/6] RUN npm ci                                     0.0s', tone: 'ok' },
      ' => [build 5/6] COPY . .                                              0.2s',
      ' => [build 6/6] RUN npm run build && npm prune --omit=dev             4.8s',
      ' => [runtime 4/4] COPY --from=build /app/dist ./dist                  0.1s',
      { text: ' => => naming to docker.io/library/api:1.1                             0.0s', tone: 'ok' },
    ],
  },
  {
    cmd: 'docker history api:1.1 --format "{{.CreatedBy}}  {{.Size}}"',
    output: [
      'CMD ["dist/server.js"]                                 0B',
      'EXPOSE map[3000/tcp:{}]                                0B',
      'USER nonroot                                           0B',
      'COPY /app/dist ./dist # buildkit                       412kB',
      'COPY /app/node_modules ./node_modules # buildkit       38.2MB',
      'ENV NODE_ENV=production                                0B',
      'WORKDIR /app                                           0B',
      { text: '… distroless base layers                              121MB', tone: 'dim' },
    ],
  },
  {
    cmd: 'docker image inspect api:1.1 --format "{{json .RootFS.Layers}}"',
    output: [
      '["sha256:6e4f1c…","sha256:0b3a9d…","sha256:a91c52…","sha256:4d7e01…",',
      ' "sha256:f2c8b7…","sha256:91aa3e…","sha256:3c55de…"]',
      { text: '# Content-addressed: identical layers are stored once and shared by every image.', tone: 'dim' },
    ],
  },
];

export default function Module2Images() {
  return (
    <ModuleShell
      id="images"
      objectives={[
        'Read a multi-stage Dockerfile line by line',
        'Predict cache hits and order instructions for fast rebuilds',
        'Explain copy-on-write, whiteouts and the writable container layer',
      ]}
      quiz={QUIZZES.images}
    >
      <Lesson eyebrow="2.1 · Dockerfile" title="Anatomy of a production Dockerfile" visual={<DockerfileParser />}>
        <p>
          A Dockerfile is a build recipe. Each instruction either produces a <strong>filesystem layer</strong>{' '}
          (<code>RUN</code>, <code>COPY</code>, <code>ADD</code>) or only changes the image’s{' '}
          <strong>metadata</strong> (<code>ENV</code>, <code>USER</code>, <code>EXPOSE</code>, <code>CMD</code>).
        </p>
        <p>
          The example is a <strong>multi-stage build</strong>. The first stage has everything needed to compile. The
          second stage starts from a minimal base and copies in only the build output. Click each line, or press
          Auto-play.
        </p>
        <Callout type="tip">
          Combine related commands into one <code>RUN</code> and clean up in the same instruction. A file deleted
          in a later layer still takes up space in the earlier one.
        </Callout>
      </Lesson>

      <Lesson eyebrow="2.2 · Process model" title="CMD vs ENTRYPOINT" visual={<CmdEntrypointLab />}>
        <p>
          Both define what runs when the container starts, and they combine. <code>ENTRYPOINT</code> is the
          executable. <code>CMD</code> is its default arguments, and anything you pass after the image name in{' '}
          <code>docker run</code> replaces <code>CMD</code>.
        </p>
        <ul>
          <li>Use <code>CMD</code> alone for general-purpose images where users may run other commands.</li>
          <li>Use <code>ENTRYPOINT</code> + <code>CMD</code> when the image is a single tool with overridable flags.</li>
          <li>Always prefer the <strong>exec form</strong> (JSON array) so your process is PID 1 and receives <code>SIGTERM</code>.</li>
        </ul>
      </Lesson>

      <Lesson eyebrow="2.3 · Build cache" title="Layers and the build cache" visual={<LayerStackExplorer />}>
        <p>
          BuildKit caches each instruction’s result. An instruction is reused if its parent layer is unchanged and
          its inputs (the command string, or the checksums of copied files) are identical.
        </p>
        <p>
          The first <strong>cache miss</strong> invalidates every instruction after it. Ordering is a performance
          decision: put rarely changing steps first and frequently changing ones (your source code) last.
        </p>
        <h3>Try this</h3>
        <ul>
          <li>Build once, toggle <em>Edited src/server.js</em>, then rebuild. The npm install stays cached.</li>
          <li>Switch to <em>Naive order</em> and repeat. Every source edit now reinstalls all dependencies.</li>
          <li>Press <code>docker run</code> to add the thin writable container layer on top.</li>
        </ul>
      </Lesson>

      <Lesson eyebrow="2.4 · Storage driver" title="The union filesystem: overlay2" visual={<UnionFsVisualizer />}>
        <p>
          Image layers are read-only directories stacked by the <strong>overlay2</strong> storage driver. A
          container adds one writable <code>upperdir</code> on top, and the kernel presents the combination as a
          single <code>merged</code> directory, which becomes the container’s <code>/</code>.
        </p>
        <ul>
          <li><strong>Read</strong>: served from the highest layer that has the file.</li>
          <li><strong>Write</strong>: the file is copied up into the writable layer first (copy-on-write).</li>
          <li><strong>Delete</strong>: a whiteout marker hides the lower file.</li>
        </ul>
        <Callout type="warn">
          Write-heavy workloads such as databases, logs and uploads should not write to the container layer. It is
          slower, and it disappears with the container. That is the topic of the next module.
        </Callout>
      </Lesson>

      <Lesson
        eyebrow="2.5 · Hands-on"
        title="Build, rebuild, inspect"
        visual={<Terminal title="bash — ~/api" commands={COMMANDS} heightClass="h-80" />}
      >
        <p>
          Compare the first build with the rebuild after a source-only change. BuildKit prints{' '}
          <code>CACHED</code> for every reused step, and the 20-second <code>npm ci</code> disappears.
        </p>
        <p>
          <code>docker history</code> shows the instruction behind each layer and its size, which is the quickest way
          to find what is bloating an image.
        </p>
      </Lesson>
    </ModuleShell>
  );
}
