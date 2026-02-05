import { Buffer } from "node:buffer";
import minifyHtml from "@minify-html/node";
import { minify as swcMinify } from "@swc/html";
import { minify as htmlMinifierTerser } from "html-minifier-terser";
import htmlnano from "htmlnano";
import { minify as htmlMinifierNext } from "html-minifier-next";
import fs from "node:fs/promises";
import path from "node:path";

function convertBytes(bytes) {
  const sizeNames = ["Bytes", "KB", "MB", "GB", "TB"];

  if (bytes === 0) return "0 Bytes";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** i;
  // Show up to 2 decimals for non-bytes
  const rounded = i === 0 ? value.toFixed(0) : value.toFixed(2);
  return `${rounded} ${sizeNames[i]}`;
}

(async () => {
  const distDir = path.resolve("dist");
  const indexPath = path.join(distDir, "index.html");

  // Read original HTML from Vite build
  const originalHtml = await fs.readFile(indexPath, "utf8");
  const originalSize = Buffer.from(originalHtml).length;

  console.log("\n📊 HTML MINIFICATION COMPARISON:\n");
  console.log("original size:        ", convertBytes(originalSize));

  // 1. @minify-html/node
  const minifyHtmlResult = minifyHtml.minify(Buffer.from(originalHtml), {
    allow_noncompliant_unquoted_attribute_values: true,
    allow_optimal_entities: true,
    keep_html_and_head_opening_tags: true,
    keep_input_type_text_attr: true,
    minify_css: true,
    minify_doctype: true,
    minify_js: true,
  });
  const mhSize = minifyHtmlResult.length;
  await fs.writeFile(path.join(distDir, "index.minify-html.html"), minifyHtmlResult);
  console.log("@minify-html/node:    ", convertBytes(mhSize), ` (${(((originalSize - mhSize) / originalSize) * 100).toFixed(2)}% smaller)`);

  // 2. @swc/html (via @swc/html)
  const swcResult = await swcMinify(originalHtml, {
    collapseWhitespaces: "smart",
    removeEmptyMetadataElements: true,
    collapseBooleanAttributes: true,
    removeComments: true,
    removeEmptyAttributes: false,
    removeRedundantAttributes: "none",
    minifyJson: true,
    minifyJs: true,
    minifyCss: true,
  });
  const swcCode = typeof swcResult.code === "string" ? swcResult.code : swcResult.code.toString();
  const swcSize = swcCode.length;
  await fs.writeFile(path.join(distDir, "index.swc.html"), swcResult.code);
  console.log("@swc/html:            ", convertBytes(swcSize), ` (${(((originalSize - swcSize) / originalSize) * 100).toFixed(2)}% smaller)`);

  // 3. html-minifier-terser
  const terserResult = await htmlMinifierTerser(originalHtml, {
    collapseBooleanAttributes: true,
    collapseInlineTagWhitespace: true,
    collapseWhitespace: true,
    decodeEntities: true,
    minifyCSS: true,
    minifyJS: true,
    minifyURLs: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
  });
  const terserSize = terserResult.length;
  await fs.writeFile(path.join(distDir, "index.terser.html"), terserResult);
  console.log("html-minifier-terser: ", convertBytes(terserSize), ` (${(((originalSize - terserSize) / originalSize) * 100).toFixed(2)}% smaller)`);

  // 4. htmlnano
  const htmlnanoResult = await htmlnano.process(originalHtml, {
    collapseWhitespace: "conservative",
    collapseBooleanAttributes: true,
    minifyCss: true,
    minifyHtmlTemplate: true,
    minifyJs: true,
    minifyJson: true,
    normalizeAttributeValues: true,
    removeComments: true,
  });
  const htmlnanoSize = htmlnanoResult.html.length;
  await fs.writeFile(path.join(distDir, "index.htmlnano.html"), htmlnanoResult.html);
  console.log("htmlnano:             ", convertBytes(htmlnanoSize), ` (${(((originalSize - htmlnanoSize) / originalSize) * 100).toFixed(2)}% smaller)`);

  // 5. html-minifier-next
  const nextResult = await htmlMinifierNext(originalHtml, {
    collapseAttributeWhitespace: true,
    collapseBooleanAttributes: true,
    collapseInlineTagWhitespace: true,
    collapseWhitespace: true,
    decodeEntities: true,
    minifyCSS: true,
    minifyJS: true,
    minifyURLs: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
  });
  const nextSize = nextResult.length;
  await fs.writeFile(path.join(distDir, "index.next.html"), nextResult);
  console.log("html-minifier-next:   ", convertBytes(nextSize), ` (${(((originalSize - nextSize) / originalSize) * 100).toFixed(2)}% smaller)`);

  // Optionally overwrite main index.html with the smallest one
  const results = [
    { name: "@minify-html", size: mhSize },
    { name: "@swc/html", size: swcSize },
    { name: "html-minifier-terser", size: terserSize },
    { name: "htmlnano", size: htmlnanoSize },
    { name: "html-minifier-next", size: nextSize },
  ];

  const smallest = results.reduce((prev, curr) => (prev.size < curr.size ? prev : curr));
  console.log(`\n🥇 Winner: ${smallest.name} (${smallest.size} bytes)`);
})();
