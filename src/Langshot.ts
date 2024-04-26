// SECTION: Parse Pattern
export type ParsePattern<Format extends string, Match> = {
  readonly format: Format;
  readonly match: Match;
  parse(fileString: string, startIndex?: number): null | AstNode | AstNode[];
};
export type ParsedPattern<T> = T extends TokenPattern
  ? ParsedToken<T>
  : T extends AstNodePattern
    ? ParsedAstNode<T>
    : T extends AndPattern
      ? ParsedAnd<T>
      : T extends ManyPattern
        ? ParsedMany<T>
        : T extends BrokenAstNodePattern
          ? AstNode
          : never;

// SECTION: AstNode
type _classFormat = `class`;
export type AstNodePattern = ParsePattern<_classFormat, {}>;
export type ParsedAstNode<T extends AstNodePattern> = T extends {
  new (): AstNode;
}
  ? InstanceType<T>
  : {};
export type BrokenAstNodePattern = { new (): any };
export abstract class AstNode {
  static readonly format: `and` | `token` = `and`;
  static get nodeType() {
    return this.name;
  }
  readonly startIndex: number = -1;
  readonly endIndex: number = -1;
  readonly foreach?: (handler: (astNode: AstNode) => void) => void;
  constructor(readonly nodeType: string) {}

  static from<T>(getMatch: T): T extends () => void
    ? {
        readonly format: _classFormat;
        readonly match: ReturnType<T>;
        parse<This extends { new (): AstNode }>(
          this: This,
          fileString: string,
          startIndex?: number,
        ): InstanceType<This>;
        new (): ParsedPattern<
          ParsePattern<
            ReturnType<T> extends RegExp ? tokenFormat : andFormat,
            ReturnType<T>
          >
        >;
      }
    : never {
    let match: any = undefined;
    return class NewNodeType extends AstNode {
      static get format() {
        return this.match instanceof RegExp ? tokenFormat : andFormat;
      }
      static get match() {
        if (match === undefined) {
          match = (getMatch as any)();
        }
        return match;
      }
      static parse<This extends typeof NewNodeType>(
        this: This,
        fileString: string,
        startIndex: number = 0,
      ) {
        const newInst = new this(this.nodeType);
        const parse = this.format === tokenFormat ? _parseToken : _parseAnd;
        const parsed = parse({
          nodeType: this.nodeType,
          match: this.match,
          fileString,
          startIndex,
        });
        Object.assign(newInst, parsed);
        return newInst;
      }
    } as any;
  }
}
// export type DocumentPosition = {
//   line: number;
//   column: number;
//   index: number;
// };

// SECTION: And
export type andFormat = typeof andFormat;
export const andFormat = "and";
export type AndPattern = ParsePattern<
  andFormat,
  {
    [key: string]:
      | AstNodePattern
      | BrokenAstNodePattern
      | ManyPattern
      | OptionalPattern
      | OrPattern
      | TokenPattern;
  }
>;
export type ParsedAnd<T extends AndPattern> = {
  [K in keyof T[`match`]]: ParsedPattern<T[`match`][K]>;
} & AstNode & {
    readonly foreach: (handler: (astNode: AstNode) => void) => void;
  };
export function and<NodeType, T>(
  nodeType: NodeType,
  match: T,
): ParsePattern<andFormat, T> {
  return class extends (AstNode.from(() => match) as any) {
    static nodeType = nodeType;
  } as any;
}
function _parseAnd(config: {
  nodeType: string;
  match: AndPattern["match"];
  fileString: string;
  startIndex: number;
}) {
  const newNode = {
    // nodeType: config.nodeType as any,
    startIndex: Number.POSITIVE_INFINITY,
    endIndex: Number.NEGATIVE_INFINITY,
    foreach(
      handler: (
        astNode: AstNode,
      ) => void /**, options: { includeWhitespace: boolean } */,
    ) {
      children.forEach(handler);
    },
  } satisfies Omit<AstNode, `nodeType`>;
  const children: AstNode[] = [];
  let parseIndex = config.startIndex;
  for (const [key, pattern] of Object.entries(config.match)) {
    //@ts-ignore
    const parseResult = pattern.parse(config.fileString, parseIndex) as
      | null
      | AstNode
      | AstNode[];
    Object.assign(newNode, {
      get [key]() {
        return parseResult;
      },
    });
    if (Array.isArray(parseResult)) children.push(...parseResult);
    else if (parseResult !== null) children.push(parseResult);
    const firstNode = Array.isArray(parseResult) ? parseResult[0] : parseResult;
    const lastNode = Array.isArray(parseResult)
      ? parseResult[parseResult.length - 1]
      : parseResult;
    parseIndex = lastNode?.endIndex ?? parseIndex;
    newNode.startIndex = Math.min(
      newNode.startIndex,
      firstNode?.startIndex ?? Number.POSITIVE_INFINITY,
    );
    newNode.endIndex = Math.max(
      newNode.endIndex,
      lastNode?.endIndex ?? Number.NEGATIVE_INFINITY,
    );
  }
  return newNode;
}

// SECTION: Token
export type tokenFormat = typeof tokenFormat;
export const tokenFormat = "token";
export type TokenPattern = ParsePattern<tokenFormat, RegExp>;
export type ParsedToken<T extends TokenPattern> = {
  text: string;
  startIndex: number;
  endIndex: number;
} & AstNode;
export function token<NodeType>(
  nodeType: NodeType,
  match: RegExp,
): TokenPattern {
  return class extends (AstNode.from(() => match) as any) {
    static nodeType = nodeType;
  } as any;
}
function _parseToken(config: {
  nodeType: string;
  match: RegExp;
  fileString: string;
  startIndex: number;
}) {
  // Skip leading whitespace
  const whitespaceMatches = config.fileString
    .substring(config.startIndex)
    .match(/\s*/)?.[0];
  config.startIndex += whitespaceMatches?.length ?? 0;

  // Match the token
  const text = config.fileString
    .substring(config.startIndex)
    .match(new RegExp(`^${config.match.source}`))?.[0];
  if (text === undefined) throw new Error(`Could not parse token`);
  return {
    // nodeType: config.nodeType as any,
    text,
    startIndex: config.startIndex,
    endIndex: config.startIndex + text.length,
  };
}

// SECTION: Many
export type manyFormat = typeof manyFormat;
export const manyFormat = "many";
export type ManyPattern = ParsePattern<
  manyFormat,
  AstNodePattern | BrokenAstNodePattern | AndPattern | OrPattern | TokenPattern
>;
export type ParsedMany<T extends ManyPattern> = ParsedPattern<T["match"]>[];
export function many<T>(match: T): ParsePattern<manyFormat, T> {
  return {
    format: manyFormat,
    match,
    parse(fileString: string, startIndex: number = 0) {
      const newNodes: AstNode[] = [];
      let endIndex = startIndex;
      while (true) {
        try {
          const parseResult = (match as any).parse(fileString, endIndex);
          if (parseResult === null) break;
          else {
            newNodes.push(parseResult);
            endIndex = parseResult.endIndex;
          }
        } catch (e) {
          break;
        }
      }
      return newNodes;
    },
  };
}

// SECTION: Or
export type orFormat = typeof orFormat;
export const orFormat = "or";
export type OrPattern = ParsePattern<
  orFormat,
  (AstNodePattern | BrokenAstNodePattern | AndPattern | TokenPattern)[]
>;
export type ParsedOr<T extends OrPattern> = ParsedPattern<T["match"][number]>;
// TODO: Accept args like ...matches: T[]
export function or<T>(matches: T): ParsePattern<orFormat, T> {
  return {
    format: orFormat,
    match: matches,
    parse(fileString: string, startIndex: number) {
      for (const match of matches as any) {
        try {
          return match.parse(fileString, startIndex) as any;
        } catch (e) {}
      }
      throw new Error(`Could not parse or`);
    },
  };
}

// SECTION: Optional
export type optionalFormat = typeof optionalFormat;
export const optionalFormat = "optional";
export type OptionalPattern = ParsePattern<
  optionalFormat,
  AstNodePattern | BrokenAstNodePattern | AndPattern | OrPattern | TokenPattern
>;
export type ParsedOptional<T extends OptionalPattern> = ParsedPattern<
  T["match"]
> | null;
export function optional<T>(match: T): ParsePattern<optionalFormat, T> {
  return {
    format: optionalFormat,
    match,
    parse(fileString: string, startIndex: number) {
      try {
        return (match as any).parse(fileString, startIndex);
      } catch (e) {
        return null;
      }
    },
  };
}
