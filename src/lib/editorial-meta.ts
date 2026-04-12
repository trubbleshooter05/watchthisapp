import fs from "fs";
import path from "path";

/** Last modified time for a repo file (ISO), for visible “updated” lines. */
export function getProjectFileMtimeIso(relativePath: string): string {
  try {
    return fs.statSync(path.join(process.cwd(), relativePath)).mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
