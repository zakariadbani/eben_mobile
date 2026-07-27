// metro.config.js
// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ---------------------------------------------------------------------------
// Work around react-async-hook@3.6.1 malformed package.json:
//   "module": "react-async-hook.esm.js"  (missing "dist/" prefix)
// Metro's web resolver follows the `module` field and can't find the file.
// `main: "dist/index.js"` IS correct, so native is unaffected.
// We shim only this one module; everything else falls through unchanged.
// ---------------------------------------------------------------------------
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-async-hook') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(
        __dirname,
        'node_modules/react-async-hook/dist/index.js'
      ),
    };
  }
  // Delegate to any pre-existing custom resolver, or the default Metro one.
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
