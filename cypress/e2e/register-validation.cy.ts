import {
  describeMissingRules,
  validatePassword,
  validateRegister,
} from "../../src/features/auth/registerValidation";

// Unit tests for the pure register validation helpers (no browser page needed).
describe("register validation helpers", () => {
  const valid = {
    firstName: "Andrei",
    lastName: "Pop",
    email: "andrei.pop@stud.ubbcluj.ro",
    password: "Secret1!",
  };

  it("validatePassword returns no rules for a valid password", () => {
    expect(validatePassword("Secret1!")).to.deep.equal([]);
    expect(validatePassword("aB3_aaaa")).to.deep.equal([]);
  });

  it("validatePassword returns each missing rule", () => {
    expect(validatePassword("Secr1!")).to.deep.equal(["length"]);
    expect(validatePassword("SECRET1!")).to.deep.equal(["lowercase"]);
    expect(validatePassword("secret1!")).to.deep.equal(["uppercase"]);
    expect(validatePassword("Secrets!")).to.deep.equal(["number"]);
    expect(validatePassword("Secret12")).to.deep.equal(["symbol"]);
    expect(validatePassword("abc")).to.deep.equal(["length", "uppercase", "number", "symbol"]);
  });

  it("validatePassword returns every rule for an empty password", () => {
    expect(validatePassword("")).to.deep.equal(["length", "lowercase", "uppercase", "number", "symbol"]);
  });

  it("validatePassword treats any non letter or digit as a symbol, like the backend", () => {
    expect(validatePassword("Secret1 x")).to.deep.equal([]);
    expect(validatePassword("Secret1ă")).to.deep.equal([]);
  });

  it("describeMissingRules lists the missing rules in the field error text", () => {
    expect(describeMissingRules(["symbol"])).to.equal("Password needs a symbol.");
    expect(describeMissingRules(["uppercase", "number"])).to.equal(
      "Password needs an uppercase letter and a number.",
    );
    expect(describeMissingRules(["length", "uppercase", "number", "symbol"])).to.equal(
      "Password needs at least 8 characters, an uppercase letter, a number and a symbol.",
    );
    expect(describeMissingRules([])).to.equal("");
  });

  it("validateRegister accepts valid values", () => {
    expect(validateRegister(valid)).to.deep.equal({});
  });

  it("validateRegister requires trimmed names and email", () => {
    expect(
      validateRegister({ firstName: "  ", lastName: "", email: " ", password: "" }),
    ).to.deep.equal({
      firstName: "First name is required",
      lastName: "Last name is required",
      email: "Email is required",
      password: "Password is required",
    });
  });

  it("validateRegister checks the email format and the password rules", () => {
    expect(validateRegister({ ...valid, email: "andrei@" })).to.deep.equal({
      email: "Enter a valid email address",
    });
    expect(validateRegister({ ...valid, email: "  andrei.pop@stud.ubbcluj.ro  " })).to.deep.equal({});
    expect(validateRegister({ ...valid, password: "secret" })).to.deep.equal({
      password: "Password needs at least 8 characters, an uppercase letter, a number and a symbol.",
    });
  });
});
