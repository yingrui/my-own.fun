interface Repository<T> {
  save(value: T): Promise<void>;

  exists(id: string): Promise<boolean>;

  find(id: string, defaultValue: T): Promise<T>;

  findAll(): Promise<T[]>;
}

export type { Repository };
