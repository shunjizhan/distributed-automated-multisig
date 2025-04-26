// deals with bigint values
export const jsonStringify = (obj: any) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }, 2);
}

export const jsonParse = (data: any) => {
  return JSON.parse(jsonStringify(data));
}
