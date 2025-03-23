module.exports = {
  plugins: {
    'postcss-nesting': {},
    tailwindcss: {},
    "postcss-preset-env": {
      stage: 1,
      features: {
        // Let Tailwind handle it
        "nesting-rules": false,
      },
    },
  },
};
