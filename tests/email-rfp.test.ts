import { describe, it, expect, afterEach } from "vitest";
import { adminEmailRecipients } from "@/lib/email-config";

describe("adminEmailRecipients", () => {
  const prevAdmin = process.env.ADMIN_EMAIL;
  const prevResendAdmin = process.env.RESEND_ADMIN_EMAIL;

  afterEach(() => {
    if (prevAdmin === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = prevAdmin;
    if (prevResendAdmin === undefined) delete process.env.RESEND_ADMIN_EMAIL;
    else process.env.RESEND_ADMIN_EMAIL = prevResendAdmin;
  });

  it("parse une liste séparée par des virgules", () => {
    process.env.ADMIN_EMAIL = "a@solarindex.fr, B@solarindex.fr ";
    expect(adminEmailRecipients()).toEqual(["a@solarindex.fr", "b@solarindex.fr"]);
  });

  it("retombe sur contact@solarindex.fr si absent", () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.RESEND_ADMIN_EMAIL;
    expect(adminEmailRecipients()).toEqual(["contact@solarindex.fr"]);
  });
});
