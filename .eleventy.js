/* ================================================================
   ELEVENTY CONFIG — mínima y explícita. Cada línea tiene un porqué.
   ================================================================ */
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("data");

  eleventyConfig.addFilter("waUrl", (phone, message) =>
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  );

  eleventyConfig.addFilter("verifiedFor", (testimonials, courseId) =>
    (testimonials ?? []).filter((t) => t.course === courseId && t.verified === true)
  );

  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
  };
}
