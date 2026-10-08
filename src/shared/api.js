// Compatibility entry point: `import { api, request, ApiError } from "../shared/api.js"` keeps working.
// The implementation lives in ./api/ (client.js, session.js, endpoints/*, keys.js).
export * from "./api/index.js";
export { default } from "./api/index.js";
