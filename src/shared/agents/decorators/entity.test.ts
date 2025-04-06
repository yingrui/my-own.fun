import { describe, expect, it } from "vitest";
import { Entity, Id } from "./entity";

describe("EntityDecorators", () => {
  @Entity("table_name")
  class TestEntity {
    @Id
    uuid: string;
    name: string;
  }

  it("should get entity info", () => {
    expect(TestEntity.prototype["_from"]).toBe("table_name");
  });

  it("should get id field", () => {
    expect(TestEntity.prototype["_id"]).toBe("uuid");
  });
});
