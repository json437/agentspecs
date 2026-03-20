import chokidar, { type FSWatcher } from "chokidar";
import { join } from "node:path";

export type WatchCallback = (specId: string, filePath: string) => void;

export function watchSpecs(projectDir: string, onChange: WatchCallback): FSWatcher {
  const watchPath = join(projectDir, ".agentspecs", "specs");

  const watcher = chokidar.watch(join(watchPath, "**", "spec.md"), {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  watcher.on("change", (filePath) => {
    // Extract spec ID from path: .agentspecs/specs/{id}/spec.md
    const relative = filePath.replace(watchPath + "/", "");
    const specId = relative.split("/")[0];
    if (specId) {
      onChange(specId, filePath);
    }
  });

  return watcher;
}
