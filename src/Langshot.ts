// SECTION: Parse Pattern
export type ParsePattern<Format extends string, Match> = {
  readonly format: Format;
  readonly match: Match;
  parse(
    fileString: string,
    startIndex?: number,
    parent?: AstNode,
  ): null | AstNode;
};
export type ParsedPattern<T> = T extends AstNodePattern
  ? ParsedAstNode<T>
  : T extends TokenPattern
    ? ParsedToken<T>
    : T extends AndPattern
      ? ParsedAnd<T>
      : T extends OrPattern
        ? ParsedOr<T>
        : T extends OptionalPattern
          ? ParsedOptional<T>
          : T extends ManyPattern
            ? ParsedMany<T>
            : T extends BrokenAstNodePattern
              ? AstNode
              : // TODO: Embed error messages in Symbols.
                never;

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
  static readonly format: `and` | `token` | `many` = `and`;
  static get nodeType() {
    return this.name;
  }
  readonly startIndex: number = -1;
  readonly endIndex: number = -1;
  readonly foreach?: (handler: (astNode: AstNode) => void) => void;
  constructor(readonly nodeType: string) {}
  get parent(): AstNode | null {
    return null;
  }

  // TODO: Need a similar and elegant way to handle "or" and "many"
  // NOTE: Maybe do many as () => many() and or as () => or()
  static from<This, T>(
    this: This,
    getMatch: T,
  ): T extends () => void
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
            ReturnType<T> extends RegExp
              ? tokenFormat
              : ReturnType<T> extends Array<any>
                ? manyFormat
                : andFormat,
            ReturnType<T>
          >
        >;
      }
    : never {
    let match: any = undefined;
    return class NewNodeType extends AstNode {
      static get format() {
        return this.match instanceof RegExp
          ? tokenFormat
          : Array.isArray(this.match)
            ? manyFormat
            : andFormat;
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
        parent: AstNode | null = null,
      ) {
        const newInst = new this(this.nodeType);
        const parse = {
          [tokenFormat]: _parseToken,
          [andFormat]: _parseAnd,
          [manyFormat]: _parseMany,
        }[this.format];
        const parsed = parse({
          nodeType: this.nodeType,
          match: this.match,
          fileString,
          startIndex,
          thisNode: newInst,
        });
        Object.assign(newInst, parsed);
        Object.defineProperty(newInst, `parent`, { get: () => parent });
        return newInst;
      }
    } as any;
  }
}
// TODO: export type DocumentPosition = {
//   line: number;
//   column: number;
//   index: number;
// };

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
    text,
    startIndex: config.startIndex,
    endIndex: config.startIndex + text.length,
  } satisfies Omit<AstNode, `nodeType` | `parent`> & { text: string };
}

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
  thisNode: AstNode;
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
  } satisfies Omit<AstNode, `nodeType` | `parent`>;
  const children: AstNode[] = [];
  let parseIndex = config.startIndex;
  console.log(config.nodeType);
  for (const [key, pattern] of Object.entries(config.match)) {
    //@ts-ignore
    if (pattern.parse === undefined) {
      console.log(key, pattern);
    }
    //@ts-ignore
    const parseResult = pattern.parse(
      config.fileString,
      parseIndex,
      config.thisNode,
    ) as null | AstNode | AstNode[];
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

// SECTION: Many
export type manyFormat = typeof manyFormat;
export const manyFormat = "many";
export type ManyPattern = ParsePattern<
  manyFormat,
  ManyMatch<
    | AstNodePattern
    | BrokenAstNodePattern
    | AndPattern
    | OrPattern
    | TokenPattern,
    | AstNodePattern
    | BrokenAstNodePattern
    | AndPattern
    | OrPattern
    | TokenPattern
    | null
    | unknown
  >
>;
export type ManyMatch<Pattern, Separator> =
  | [Pattern]
  | [Pattern, { separator?: Separator }];
export type ParsedMany<T extends ManyPattern> = AstNode &
  ParsedPattern<T["match"][0]>[];
// TODO: Add support for separators
export function many<NodeType, Pattern, Separator>(
  nodeType: NodeType,
  pattern: Pattern,
  options?: {
    separator?: Separator;
  },
): ParsePattern<manyFormat, ManyMatch<Pattern, Separator>> {
  return class extends (AstNode.from(() => [
    pattern,
    {
      separator: options?.separator,
    },
  ]) as any) {
    static nodeType = nodeType;
  } as any;
}
function _parseMany(config: {
  nodeType: string;
  match: ManyMatch<AstNodePattern, AstNodePattern>;
  fileString: string;
  startIndex: number;
  thisNode: AstNode;
}) {
  const newNodes: AstNode[] = [];
  let endIndex = config.startIndex;
  while (true) {
    let newNode: AstNode | null = null;
    try {
      newNode = config.match[0].parse(config.fileString, endIndex);
    } catch (e) {}
    if (newNode === null) break;
    endIndex = newNode?.endIndex ?? config.startIndex;
    newNodes.push(newNode);
    if (config.match[1]?.separator) {
      while (true) {
        let separator: AstNode | null = null;
        try {
          separator = config.match[1]?.separator.parse(
            config.fileString,
            endIndex,
          );
        } catch (e) {}
        if (separator === null) break;
        endIndex = separator.endIndex;
      }
    }
  }
  return newNodes;
}

// SECTION: Or
export type orFormat = typeof orFormat;
export const orFormat = "or";
export type OrPattern = ParsePattern<
  orFormat,
  (AstNodePattern | BrokenAstNodePattern | AndPattern | TokenPattern)[]
>;
export type ParsedOr<T extends OrPattern> = ParsedPattern<T["match"][number]>;
export function or<T extends any[]>(...matches: T): ParsePattern<orFormat, T> {
  return {
    format: orFormat,
    match: matches,
    parse(fileString: string, startIndex?: number, parent?: AstNode) {
      for (const match of matches as any) {
        try {
          return match.parse(fileString, startIndex, parent) as any;
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
    parse(fileString: string, startIndex?: number, parent?: AstNode) {
      try {
        return (match as any).parse(fileString, startIndex, parent);
      } catch (e) {
        return null;
      }
    },
  };
}
