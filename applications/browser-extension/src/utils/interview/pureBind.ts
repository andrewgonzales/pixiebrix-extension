/*
 Direct port of pure-bind index.ts npm package https://github.com/DzoQiEuoi/pure-bind
*/
type Func = (...args: any) => any;

const cache = new WeakMap();

const node = (key: any) => {
  return cache.get(key) || cache.set(key, new Map()).get(key);
};

const bind = (func: Func, arg: any) => {
  return node(func).set(arg, func.bind(undefined, arg)).get(arg);
};

const pureBind = (func: Func, arg: any) => {
  return (cache.has(func) && cache.get(func).get(arg)) || bind(func, arg);
};

export default (func: Func, ...args: any[]) => {
  return args.reduce((bound, arg) => {
    return bound ? pureBind(bound, arg) : pureBind(func, arg);
  }, null);
};
