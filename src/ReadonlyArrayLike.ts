export class ReadonlyArrayLike<T> implements ReadonlyArray<T> {
  constructor(private _children: ReadonlyArray<T>) {
    _children.forEach((child, index) => {
      Object.defineProperty(this, `${index}`, {
        get() {
          return child;
        },
      });
    })
  }

  get length() {
    return this._children.length;
  }
  [index: number]: T;
  get concat() {
    return this._children.concat.bind(this._children);
  }
  get entries() {
    return this._children.entries.bind(this._children);
  }
  get every() {
    return this._children.every.bind(this._children);
  }
  get filter() {
    return this._children.filter.bind(this._children);
  }
  get find() {
    return this._children.find.bind(this._children);
  }
  get findIndex() {
    return this._children.findIndex.bind(this._children);
  }
  get flat() {
    return this._children.flat.bind(this._children);
  }
  get flatMap() {
    return this._children.flatMap.bind(this._children);
  }
  get forEach() {
    return this._children.forEach.bind(this._children);
  }
  get includes() {
    return this._children.includes.bind(this._children);
  }
  get indexOf() {
    return this._children.indexOf.bind(this._children);
  }
  get join() {
    return this._children.join.bind(this._children);
  }
  get keys() {
    return this._children.keys.bind(this._children);
  }
  get lastIndexOf() {
    return this._children.lastIndexOf.bind(this._children);
  }
  get map() {
    return this._children.map.bind(this._children);
  }
  get reduce() {
    return this._children.reduce.bind(this._children);
  }
  get reduceRight() {
    return this._children.reduceRight.bind(this._children);
  }
  get slice() {
    return this._children.slice.bind(this._children);
  }
  get some() {
    return this._children.some.bind(this._children);
  }
  get toSorted() {
    return this._children.toSorted.bind(this._children);
  }
  get values() {
    return this._children.values.bind(this._children);
  }
  get at() {
    return this._children.at.bind(this._children);
  }
  get findLast() {
    return this._children.findLast.bind(this._children);
  }
  get findLastIndex() {
    return this._children.findLastIndex.bind(this._children);
  }
  get toReversed() {
    return this._children.toReversed.bind(this._children);
  }
  get toSpliced() {
    return this._children.toSpliced.bind(this._children);
  }
  get toLocaleString() {
    return this._children.toLocaleString.bind(this._children);
  }
  get with() {
    return this._children.with.bind(this._children);
  }
  get [Symbol.iterator]() {
    return this._children[Symbol.iterator].bind(this._children);
  }
  get [Symbol.unscopables]() {
    return this._children[Symbol.unscopables];
  }
}
