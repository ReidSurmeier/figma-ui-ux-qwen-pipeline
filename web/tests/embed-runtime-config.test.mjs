import assert from "node:assert/strict";
import test from "node:test";

import { extractClientId } from "../scripts/figma-embed-runtime-qa.mjs";

test("extractClientId reads the labeled Bitwarden value without returning the client secret", () => {
  const clientId = extractClientId("Client ID: public-client\nClient Secret: private-secret");

  assert.equal(clientId, "public-client");
  assert.doesNotMatch(clientId, /private-secret/);
});

test("extractClientId errors never echo malformed credential content", () => {
  const malformed = "private-secret-without-a-label";

  assert.throws(
    () => extractClientId(malformed),
    (error) => !error.message.includes(malformed) && /no labeled Client ID/.test(error.message),
  );
});
