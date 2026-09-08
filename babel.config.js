module.exports = function (api) {
  api.cache(false);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@/app": "./src/app",
            "@/constants": "./src/constants",
            "@/hooks": "./src/hooks",
            "@/assets": "./src/assets",
            "@/context": "./src/context",
            "@/localization": "./src/localization",
            "@/helpers": "./src/helpers",
            "@/components": "./src/components",
            "@/interfaces": "./src/interfaces",
          },
        },
      ],
    ],
    env: {
      // ponytail: jest runs CommonJS, and babel-preset-expo leaves dynamic
      // import() as native syntax for Metro's own runtime to handle. Node's
      // Jest VM can't execute a bare import() without --experimental-vm-modules,
      // so rewrite it to require() under test only (scoped here, not global —
      // Metro/production bundling must keep the real dynamic import).
      test: {
        plugins: ["babel-plugin-dynamic-import-node"],
      },
    },
  };
};
