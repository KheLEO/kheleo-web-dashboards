import { describe, expect, it } from "vitest";
import { AxiosHeaders, type AxiosRequestConfig } from "axios";
import { browserClient, createOperation, ApiError } from "@/lib/api-client";
import { subscribeNamespace, disposeRealtime } from "@/lib/socket";
async function headersFor(config: AxiosRequestConfig): Promise<AxiosHeaders> {
  const response = await browserClient.request({
    ...config,
    adapter: async (request) => ({
      data: request.headers,
      status: 200,
      statusText: "OK",
      headers: {},
      config: request,
    }),
  });
  return response.data as AxiosHeaders;
}
describe("core client aliases", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "adds a unique UUID v4 for %s without overriding explicit keys",
    async (method) => {
      const first = await headersFor({ method });
      const second = await headersFor({ method });
      expect(first.get("Idempotency-Key")).toMatch(
        /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i,
      );
      expect(second.get("Idempotency-Key")).not.toBe(first.get("Idempotency-Key"));
      const operation = createOperation({ value: 1 });
      expect(
        (await headersFor({ method, headers: { "idempotency-key": operation.id } })).get(
          "Idempotency-Key",
        ),
      ).toBe(operation.id);
    },
  );
  it("leaves reads without mutation keys and exposes the shared realtime and error APIs", async () => {
    expect((await headersFor({ method: "GET" })).has("Idempotency-Key")).toBe(false);
    expect(subscribeNamespace).toBeTypeOf("function");
    expect(disposeRealtime).toBeTypeOf("function");
    expect(ApiError).toBeTypeOf("function");
  });
});
