// SECTION: Parse Pattern
export type ParsePattern<Format extends string, Match> = {
  readonly format: Format;
  readonly match: Match;
  parse(fileString: string, startIndex?: number): null | AstNode | AstNode[];
};
export type ParsedPattern<T> = (T extends AndPattern
  ? ParsedAnd<T>
  : T extends ManyPattern
    ? ParsedMany<T>
    : T extends TokenPattern
      ? ParsedToken<T>
      : T extends AstNodePattern
        ? ParsedAstNode<T>
        : T extends BrokenAstNodePattern
          ? {}
          : never) &
  AstNode;

// SECTION: AstNode
export type AstNodePattern = ParsePattern<"class", AndPattern>;
export type ParsedAstNode<T extends AstNodePattern> = T extends {
  new (): AstNode;
}
  ? InstanceType<T>
  : {};
export type BrokenAstNodePattern = { new (): any };
export abstract class AstNode {
  static readonly format = "class";
  readonly nodeType: string = `Unnamed`;
  readonly startIndex: number = -1;
  readonly endIndex: number = -1;
  readonly contents: string | AstNode[] = [];

  static from<T>(pattern: T): T extends () => void
    ? {
        readonly format: "class";
        readonly match: ParsePattern<andFormat, ReturnType<T>>;
        parse<This extends { new (): AstNode }>(
          this: This,
          fileString: string,
          startIndex?: number,
        ): InstanceType<This>;
        new (): ParsedPattern<ParsePattern<andFormat, ReturnType<T>>>;
      }
    : never {
    let match: AndPattern | undefined = undefined;
    return class NewNodeType extends AstNode {
      static get match() {
        if (match === undefined) match = and(this.name, (pattern as any)());
        return match;
      }
      static parse<This extends typeof NewNodeType>(
        this: This,
        fileString: string,
        startIndex: number = 0,
      ) {
        const parsedAnd = this.match.parse(fileString, startIndex);
        const newInst = new this();
        Object.assign(newInst, parsedAnd);
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
};
export function and<NodeType, T>(
  nodeType: NodeType,
  match: T,
): ParsePattern<andFormat, T> {
  return {
    format: andFormat,
    match,
    parse(fileString: string, startIndex: number = 0) {
      const newNode = {
        nodeType: nodeType as any,
        startIndex: Number.POSITIVE_INFINITY,
        endIndex: Number.NEGATIVE_INFINITY,
        contents: [] as AstNode[],
      } satisfies AstNode;
      let parseIndex = startIndex;
      let contentIndex = 0;
      for (const [key, pattern] of Object.entries(match as any)) {
        //@ts-ignore
        const parseResult = pattern.parse(fileString, parseIndex);
        newNode.contents[contentIndex] = parseResult;
        Object.assign(newNode, {
          get [key]() {
            return newNode.contents[contentIndex];
          },
        });
        parseIndex = parseResult?.endIndex ?? parseIndex;
        newNode.startIndex = Math.min(
          newNode.startIndex,
          parseResult?.startIndex ?? Number.POSITIVE_INFINITY,
        );
        newNode.endIndex = Math.max(
          newNode.endIndex,
          parseResult?.endIndex ?? Number.NEGATIVE_INFINITY,
        );
        contentIndex++;
      }
      return newNode;
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

// SECTION: Many
export type manyFormat = typeof manyFormat;
export const manyFormat = "many";
export type ManyPattern = ParsePattern<
  manyFormat,
  AndPattern | OrPattern | TokenPattern | AstNodePattern | BrokenAstNodePattern
>;
export type ParsedMany<T extends ManyPattern> = ParsedPattern<T["match"]>[];
export function many<T>(match: T): ParsePattern<manyFormat, T> {
  return {
    format: manyFormat,
    match,
    parse(fileString: string, startIndex: number = 0) {
      const newNode = {
        nodeType: `many` as const,
        startIndex: startIndex,
        endIndex: startIndex,
        contents: [] as AstNode[],
      } satisfies AstNode;
      while (true) {
        try {
          const parseResult = (match as any).parse(
            fileString,
            newNode.endIndex,
          );
          if (parseResult === null) break;
          else {
            newNode.contents.push(parseResult);
            newNode.endIndex = parseResult.endIndex;
          }
        } catch (e) {
          break;
        }
      }
      return newNode;
    },
  };
}

// SECTION: Token
export type tokenFormat = typeof tokenFormat;
export const tokenFormat = "token";
export type TokenPattern = ParsePattern<tokenFormat, RegExp>;
export type ParsedToken<T extends TokenPattern> = {
  contents: string;
  startIndex: number;
  endIndex: number;
};
export function token<NodeType>(
  nodeType: NodeType,
  match: RegExp,
): TokenPattern {
  return {
    format: tokenFormat,
    match,
    parse(fileString: string, startIndex: number = 0) {
      // Skip leading whitespace
      const whitespaceMatches = fileString
        .substring(startIndex)
        .match(/\s*/)?.[0];
      startIndex += whitespaceMatches?.length ?? 0;

      // Match the token
      const text = fileString
        .substring(startIndex)
        .match(new RegExp(`^${match.source}`))?.[0];
      if (text === undefined) throw new Error(`Could not parse token`);
      return {
        nodeType: nodeType as any,
        contents: text,
        startIndex,
        endIndex: startIndex + text.length,
      };
    },
  };
}
