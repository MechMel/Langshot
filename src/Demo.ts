import { AstNode, many, optional, token } from "./Langshot";

class Statement extends AstNode.from(() => ({
  statement: CodeBlock,
  separator: optional(token(`Separator`, /,|;/)),
})) {
  iAmAStatement = true;
  test() {
    console.log(this.statement);
  }
}
class Ident extends AstNode.from(() => ({
  token: token(`Ident`, /_*[A-Za-z][A-Za-z0-9_]*/),
})) {
  get ident() {
    return this.token.contents;
  }
  get isTypeIdent() {
    const firstLetter = this.ident.replace(/^_+/, "")[0];
    return firstLetter === firstLetter.toUpperCase();
  }
  get isInstIdent() {
    return !this.isTypeIdent;
  }
}
class LitNum extends AstNode.from(() => ({
  token: token(`LitNum`, /-?[0-9]+(\.[0-9]+)?/),
})) {
  get num() {
    return parseFloat(this.token.contents);
  }
}
class CodeBlock extends AstNode.from(() => ({
  openParen: token(`OpenParen`, /\(/),
  statements: many(Statement),
  // statements: true,
  closeParen: token(`CloseParen`, /\)/),
})) {
  test() {
    console.log(this.openParen.contents.startsWith("("));
    for (const statement of this.statements) {
      console.log(statement.statement);
      console.log(statement.iAmAStatement);
      console.log(statement.startIndex);
    }
  }
}
console.log(JSON.stringify(CodeBlock.parse("((),)"), null, 2));
