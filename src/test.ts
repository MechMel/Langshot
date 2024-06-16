const t = Object.assign(`a` as any, { test: 0 });
console.log(typeof new String(`a`));
console.log(t.test);

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;
const mxSymKey = Symbol(`mxSyms`);
type MxSym = ReturnType<typeof MxSym<string>>;
const MxSym = <Id extends string>(id: Id) => ({
  [mxSymKey]: [id] as Id[],
});
const applySyms = <Obj, Syms extends MxSym[]>(
  obj: Obj,
  ...syms: Syms
): Obj & UnionToIntersection<Syms> => {
  for (const sym of syms) {
    (obj as any)[mxSymKey].push(sym[mxSymKey][0]);
  }
  return obj as any;
};
type invalid = typeof invalid;
const invalid = MxSym(`invalid`);
type pending = typeof pending;
const pending = applySyms(invalid, MxSym(`pending`));
type none = typeof none;
const none = MxSym(`none`);
type deleted = typeof deleted;
const deleted = MxSym(`deleted`);
