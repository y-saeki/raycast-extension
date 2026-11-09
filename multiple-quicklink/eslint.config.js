const raycastConfig = require("@raycast/eslint-config");

// `eslint.config.js` itself is CommonJS, which the Raycast config's TypeScript rules reject. `ray lint`
// skips it already; ignoring it here makes a plain `eslint .` — what CI runs — agree.
module.exports = [...raycastConfig, { ignores: ["dist/**", "node_modules/**", "eslint.config.js"] }];
