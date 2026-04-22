import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const dataDir = path.join(rootDir, "data");

async function main() {
  await mkdir(distDir, { recursive: true });
  await cp(srcDir, distDir, { recursive: true, force: true });
  await rm(path.join(distDir, "data"), { recursive: true, force: true });
  await cp(dataDir, path.join(distDir, "data"), { recursive: true, force: true });

  const siteData = JSON.parse(await readFile(path.join(dataDir, "site-data.json"), "utf8"));
  const buildMeta = {
    generatedAt: siteData.generatedAt,
    workbookCount: siteData.workbooks.length
  };

  await writeFile(
    path.join(distDir, "data", "build-meta.json"),
    JSON.stringify(buildMeta, null, 2),
    "utf8"
  );

  console.log(`Built static site into ${distDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
