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
  };
};
