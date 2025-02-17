function Entity(from: string) {
  return function (constructor: new (...args: any[]) => any) {
    constructor.prototype._from = from;
  };
}

function Id(target: any, propertyKey: string) {
  target["_id"] = propertyKey;
}

export { Entity, Id };
