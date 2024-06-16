import { ReadonlyArrayLike } from "./ReadonlyArrayLike";

type DocRange = {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly text: string;
};
class LangNode<Children extends DocRange = DocRange>
  extends ReadonlyArrayLike<Children>
  implements DocRange
{
  get startIndex() {
    return this[0].startIndex;
  }
  get endIndex() {
    return this[this.length - 1].endIndex;
  }
  get leadingWhitespace(): ReadonlyArray<LangNode> {
    return [];
  }
  get trailingWhitespace(): ReadonlyArray<LangNode> {
    return [];
  }
  get text() {
    let text = ``;
    for (let i = 0; i < this.length; i++) {
      const child = this[i];
      text += child.text;
      if (child instanceof LangNode && i < this.length - 1) {
        text += child.trailingWhitespace.map((ws) => ws.text).join(``);
      }
    }
    return text;
  }

  // Setup the base class
  constructor(setup: {
    children: ReadonlyArray<Children>;
    leadingWhitespace: ReadonlyArray<LangNode>;
    trailingWhitespace: ReadonlyArray<LangNode>;
  }) {
    super(setup.children);
    Object.defineProperty(this, `leadingWhitespace`, {
      get() {
        return setup.leadingWhitespace;
      },
    });
    Object.defineProperty(this, `trailingWhitespace`, {
      get() {
        return setup.trailingWhitespace;
      },
    });
  }
}
// Setup a subtype of LangNode
function subtype<Match, Options>(getMatch: Match, getOptions?: Options) {
  // TODO: Flesh this out
  return class extends LangNode<any> {
    constructor(props: { [key: string | number | symbol]: DocRange }) {
      super({
        startIndex: 0,
        endIndex: 0,
        text: ``,
        children: [],
      });
      Object.assign(this, props);
    }
  } as any;
}
