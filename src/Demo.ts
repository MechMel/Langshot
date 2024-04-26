import { AstNode, token, and, or, optional, many } from "./Langshot";

class File extends AstNode.from(() => ({
  statements: many(Statement),
})) {}

class Statement extends AstNode.from(() => ({
  statement: or([IdentDef, CodeBlock]),
  trailingSeparators: many(token(`Separator`, /,|;/)),
})) {
  iAmAStatement = true;
  test() {
    console.log(this.statement);
  }
}
class IdentDef extends AstNode.from(() => ({
  ident: Ident,
  defOp: token(`DefOp`, /:|:=|:>/),
  right: or([CodeBlock, Ident, LitNum, LitStr]),
})) {}
class Ident extends AstNode.from(() => /_*[A-Za-z][A-Za-z0-9_]*/) {
  get isTypeIdent() {
    const firstLetter = this.text.replace(/^_+/, "")[0];
    return firstLetter === firstLetter.toUpperCase();
  }
  get isInstIdent() {
    return !this.isTypeIdent;
  }
}
class CodeBlock extends AstNode.from(() => ({
  openParen: token(`OpenParen`, /\(/),
  statements: many(Statement),
  // statements: true,
  closeParen: token(`CloseParen`, /\)/),
})) {
  test() {
    console.log(this.openParen.text.startsWith("("));
    for (const statement of this.statements) {
      console.log(statement.statement);
      console.log(statement.iAmAStatement);
      console.log(statement.startIndex);
    }
  }
}
class LitNum extends AstNode.from(() => /-?[0-9]+(\.[0-9]+)?/) {
  get asFloat() {
    return parseFloat(this.text);
  }
}
class LitStr extends AstNode.from(() => /"([^"\\]*(\\.[^"\\]*)*)"/) {
  get asString() {
    return this.text.slice(1, -1);
  }
}
console.log(JSON.stringify(File.parse("(( a: 5; ),)"), null, 2));
