import { http, HttpResponse } from "msw";
import { makePassport } from "../factories";
export const handlers = [
  http.get("*/api/backend/passport/:userId", () =>
    HttpResponse.json({ success: true, data: makePassport(), timestamp: new Date().toISOString() }),
  ),
];
