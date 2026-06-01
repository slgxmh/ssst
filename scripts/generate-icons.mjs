import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const svgPath = join(process.cwd(), "src", "assets", "logo.svg");
const outputDir = join(process.cwd(), "public", "icons");

const svgBuffer = readFileSync(svgPath);

// Generate 192x192 PNG
const resvg192 = new Resvg(svgBuffer, {
  fitTo: {
    mode: "width",
    value: 192,
  },
});
const png192 = resvg192.render();
writeFileSync(join(outputDir, "icon-192x192.png"), png192.asPng());
console.log("Generated icon-192x192.png");

// Generate 512x512 PNG
const resvg512 = new Resvg(svgBuffer, {
  fitTo: {
    mode: "width",
    value: 512,
  },
});
const png512 = resvg512.render();
writeFileSync(join(outputDir, "icon-512x512.png"), png512.asPng());
console.log("Generated icon-512x512.png");

console.log("All icons generated successfully!");
