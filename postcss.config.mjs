const config = {
  plugins: {
    "@csstools/postcss-global-data": {
      files: ["./src/components/ui/viewport.css"],
    },
    "postcss-flexbugs-fixes": {},
    "postcss-preset-env": {
      autoprefixer: { flexbox: "no-2009" },
      stage: 3,
      features: {
        "custom-media-queries": true,
        "custom-properties": false,
      },
    },
  },
};

export default config;
