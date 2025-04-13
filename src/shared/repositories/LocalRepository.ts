import type { Repository } from "@src/shared/repositories/Repository";

class LocalRepository<T> implements Repository<T> {
  private readonly storage: chrome.storage.StorageArea;
  private readonly entityPrototype: T;

  constructor(
    storage: chrome.storage.StorageArea = chrome.storage.local,
    prototype: T = null,
  ) {
    this.storage = storage;
    this.entityPrototype = prototype;
  }

  protected toEntity(pojo: any): T {
    try {
      return pojo as T;
    } catch (e) {
      throw new Error(`Failed to convert pojo to entity: ${e}`);
    }
  }

  private from(): string {
    const from = this.entityPrototype["_from"];
    if (!from) {
      throw new Error("Please use decorator @Entity to specify 'from'.");
    }
    return from;
  }

  private id(value: T): string {
    if (value["id"]) {
      return value["id"];
    }

    const idField = this.entityPrototype["_id"];
    if (!idField) {
      throw new Error("Please use decorator @Id to specify 'id' field.");
    }
    return value[idField];
  }

  async save(value: T): Promise<void> {
    await this.storage.set({ [this.id(value)]: value });
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.storage.get([key]);
    return !!value[key];
  }

  async find(key: string, defaultValue: T = null): Promise<T> {
    const value = await this.storage.get([key]);
    const obj = value[key];
    if (obj) {
      return this.toEntity(obj);
    }
    return defaultValue;
  }

  async delete(key: string): Promise<void> {
    await this.storage.remove(key);
  }

  private async getKeys(startWith: string): Promise<string[]> {
    const keys = await this.storage.getKeys();
    return keys.filter((key) => key.startsWith(startWith)).sort();
  }

  private async all(startWith: string): Promise<T[]> {
    const elements: T[] = [];
    for (const key of await this.getKeys(startWith)) {
      elements.push(await this.find(key));
    }
    return elements;
  }

  findAll(): Promise<T[]> {
    return this.all(this.from());
  }
}

export default LocalRepository;
