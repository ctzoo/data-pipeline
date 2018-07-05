export interface ICodec<T> {
  encode(value: T, buf: Buffer, startIndex: number): number
  decode(buf: Buffer, startIndex: number, len: number): T
}

export class StringCodec implements ICodec<string> {
  constructor(protected encoding: string) {}
  encode(value: string, buf: Buffer, startIndex: number): number {
    return buf.write(value, startIndex, undefined, this.encoding)
  }
  decode(buf: Buffer, startIndex: number, len: number): string {
    return buf.toString(this.encoding, startIndex, startIndex + len)
  }
}

type PadingDirection = 'left' | 'right'

export class StringCodecFixField extends StringCodec {
  constructor(encoding: string, private len: number, private padChar: string, private direction: PadingDirection) {
    super(encoding)
  }

  encode(value: string, buf: Buffer, startIndex: number): number {
    let retLen
    const valueByteLength = Buffer.byteLength(value, this.encoding)
    const paddingLen = this.len - Buffer.byteLength(value, this.encoding)

    // TODO:
    if (paddingLen < 0) throw new Error('')

    if (this.direction === 'left') {
      buf.fill(this.padChar, startIndex, startIndex + paddingLen).write(value, startIndex + paddingLen, undefined, this.encoding)
    } else {
      buf.write(value, startIndex, undefined, this.encoding)
      buf.fill(this.padChar, valueByteLength + startIndex, valueByteLength + startIndex + paddingLen)
    }
    return this.len
  }

  decode(buf: Buffer, startIndex: number): string {
    return super.decode(buf, startIndex, this.len)
  }
}
