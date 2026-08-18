export enum AttributeType {
  Text = 'text',
  InnerHTML = 'innerHTML',
  OuterHTML = 'outerHTML',
  Href = 'href',
  Src = 'src',
  Value = 'value',
  Class = 'class',
  Id = 'id',
  DataAttribute = 'data-*',
  Custom = 'custom',
}

export enum OnErrorStrategy {
    STOP = 'stop',
    SKIP = 'skip',
    RETRY = 'retry',
}