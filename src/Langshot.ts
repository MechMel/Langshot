export type ParsedPattern<T> = T extends AndPattern
  ? ParsedAnd<T>
  : T extends ManyPattern
    ? ParsedMany<T>
    : T extends TokenPattern
      ? ParsedToken<T>
      : T extends AstNodePattern
        ? ParsedAstNode<T>
        : T extends BrokenNodePattern
          ? AstNode
          : never;
export type ParsedAnd<T extends AndPattern> = {
  [K in keyof T[`match`]]: ParsedPattern<T[`match`][K]>;
};
export type ParsedMany<T extends ManyPattern> = ParsedPattern<T["match"]>[];
export type ParsedToken<T extends TokenPattern> = string;
export type ParsedAstNode<T extends AstNodePattern> = T extends { new (): any }
  ? InstanceType<T>
  : null;
export type AndPattern = {
  format: "and";
  match: {
    [key: string]:
      | ManyPattern
      | /**OrPattern | OptionalPattern | */ TokenPattern;
  };
};
export function and<T>(match: T): {
  format: "and";
  match: T;
} {
  return { format: "and", match: (match as any)() };
}
export type ManyPattern = {
  format: "many";
  match:
    | AndPattern
    // | OrPattern
    | TokenPattern
    | AstNodePattern
    | BrokenNodePattern;
};
export function many<T>(match: T): {
  format: "many";
  match: T;
} {
  return { format: "many", match };
}
export type TokenPattern = {
  format: "token";
  match: string | RegExp;
};
export function token(match: string | RegExp): TokenPattern {
  return { format: "token", match };
}
export type AstNodePattern = {
  format: "node";
  readonly match: AndPattern;
};
type BrokenNodePattern = { new (): any };

export type AstNode = {
  start: number;
  end: number;
};
export const AstNode = <T>(
  pattern: T,
): T extends () => void
  ? {
      format: "node";
      readonly match: {
        format: "and";
        match: ReturnType<T>;
      };
      new (): ParsedPattern<{
        format: "and";
        match: ReturnType<T>;
      }>;
    }
  : never => ({ test: pattern }) as any;

// class Statement extends AstNode(() => ({
//   naming: many(CodeBlock),
// })) {
//   iAmAStatement = true;
//   test() {
//     for (const codeBlock of this.naming) {
//       console.log(codeBlock);
//     }
//   }
// }
// class CodeBlock extends AstNode(() => ({
//   openParen: token("("),
//   statements: many(Statement),
//   // statements: true,
//   closeParen: token(")"),
// })) {
//   test() {
//     for (const statement of this.statements) {
//       console.log(statement.iAmAStatement);
//     }
//   }
// }
