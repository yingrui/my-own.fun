export function getClassName(obj: any): string {
  const constructorStr = obj.constructor.toString();
  const classNameMatch = constructorStr.match(/^class\s+([\w\d]+)/);
  if (classNameMatch && classNameMatch[1]) {
    const className = classNameMatch[1];
    return className; // 输出 "MyExampleClass"
  } else {
    throw new Error("class name is not match : ^classs+([wd]+)");
  }
}
