import { SmartBuffer } from 'smart-buffer'

export type VariableType = 'LL' | 'LLL'
export type ReadFunc<T> = (/** 缓存 */ buf: SmartBuffer) => T
export type WriteFunc<T> = (/** 值 */ value: T, /** 缓存 */ buf: SmartBuffer) => void
export type FieldCodec<T> = {
  fieldId: number
  read: ReadFunc<T>
  write: WriteFunc<T>
}

export function readBitmap(buf: SmartBuffer, len: number): string {
  const bitmap = buf.readBuffer(len)
  return bitmap.reduce((s, byte) => s + byte.toString(2).padStart(8, '0'), '')
}

export function writeBitmap(bitmapStr: string, buf: SmartBuffer): void {
  const as: string[] = []
  for (let i = 0; i < bitmapStr.length / 8; i++) {
    as.push(bitmapStr.slice(i * 8, i * 8 + 8))
  }

  as.forEach(byteStr => buf.writeUInt8(parseInt(byteStr, 2)))
}
/**
 * 从缓存中读取字符串
 *
 * @param buf 缓存
 * @param len 长度
 */
export function readBCD(buf: SmartBuffer, len: number): string {
  let str = '0'
  let i = 0
  for (; i < len; i++) {
    if (buf.readUInt8() !== 0) {
      buf.readOffset = buf.readOffset - 1
      str = buf.readString(len - i, 'hex')
      if (str.charAt(0) === '0') str = str.substr(1, str.length - 1)
      break
    }
  }

  return str
}

/**
 * writeBCD函数的构造器
 *
 * @param len 长度
 */
export const writeBCDMaker = (len?: number) => <WriteFunc<string>>((value: string, buf: SmartBuffer) => {
    const num = Math.ceil(value.length / 2)
    len = len || num
    const paddingLen = len - num

    for (let i = 0; i < paddingLen; i++) {
      buf.writeUInt8(0)
    }

    buf.writeString(value.length % 2 === 0 ? value : '0' + value, 'hex')
  })

/**
 * readString构造器
 *
 * @param encoding 编码
 */
export const readStringMaker = (encoding: BufferEncoding) => (buf: SmartBuffer, len: number) => buf.readString(len, encoding)

/**
 * writeString构造器
 *
 * @param encoding 编码
 */
export const writeStringMaker = (encoding: BufferEncoding) => <WriteFunc<string>>((value: string, buf: SmartBuffer) => {
    buf.writeString(value, encoding)
  })

/**
 * 读取缓存里的Buffer
 *
 * @param buf 缓存
 * @param len 长度
 */
export function readBuffer(buf: SmartBuffer, len: number): Buffer {
  return buf.readBuffer(len)
}

/**
 * 把Buffer写入缓存
 *
 * @param value 值
 * @param buf 缓存
 */
export function writeBuffer(value: Buffer, buf: SmartBuffer): void {
  buf.writeBuffer(value)
}

/**
 * 长度是BCD表示的变长长度读取函数构造器
 *
 * @param type 变长长度类型
 * @param readFn read函数
 */
export const variableBCDLenReadMaker = <T>(type: VariableType, readFn: (buf: SmartBuffer, len: number) => T) => <ReadFunc<T>>((buf: SmartBuffer) => {
    const lenByteCount = type === 'LL' ? 1 : 2
    const len = parseInt(readBCD(buf, lenByteCount))
    return readFn(buf, len)
  })

/**
 * 长度是BCD表示的变长长度写入函数构造器
 *
 * @param type 变长长度类型
 * @param writeFn write函数
 */
export const variableBCDLenWriteMaker = <T>(type: VariableType, writeFn: WriteFunc<T>) => {
  const wb = writeBCDMaker(type === 'LL' ? 1 : 2)
  return <WriteFunc<T>>((value: T, buf: SmartBuffer) => {
    const tmp = new SmartBuffer()
    writeFn(value, tmp)
    wb(tmp.toBuffer().length.toString(), buf)
    writeFn(value, buf)
    tmp.destroy()
  })
}

/**
 * 域编码器的构造器
 *
 * @param fieldId 域Id
 * @param readFunc 读取函数
 * @param writeFunc 写入函数
 */
export function fieldCodecMaker<T>(fieldId: number, readFunc: ReadFunc<T>, writeFunc: WriteFunc<T>): FieldCodec<T> {
  return {
    fieldId,
    read: readFunc,
    write: writeFunc,
  }
}

// type FixTypeMapping = {
//   bcd: FieldCodec<string>
//   bin: FieldCodec<Buffer>
//   bit: FieldCodec<string>
// }

// type FixTypeKey = keyof FixTypeMapping

// export function fixFF(fieldId: number, len: number, type: FixTypeKey): FixTypeMapping[FixTypeKey] {
//   switch (type) {
//     case 'bcd':
//       return fieldCodecMaker(fieldId, (buf: SmartBuffer) => readBCD(buf, len), writeBCDMaker(len))
//     case 'bin':
//       return fieldCodecMaker(fieldId, (buf: SmartBuffer) => readBuffer(buf, len), writeBuffer)
//     case 'bit':
//       return fieldCodecMaker(fieldId, (buf: SmartBuffer) => readBitmap(buf, len), writeBitmap)
//   }
// }

export function fixBCDFF(fieldId: number, len: number) {
  return fieldCodecMaker(fieldId, (buf: SmartBuffer) => readBCD(buf, len), writeBCDMaker(len))
}

// export function fixBinFF(fieldId: number, len: number) {
//   return fieldCodecMaker(fieldId, (buf: SmartBuffer) => readBuffer(buf, len), writeBuffer)
// }

// TODO: 写没有判断长度也没有处理
export function fixBitFF(fieldId: number, len: number) {
  return fieldCodecMaker(fieldId, (buf: SmartBuffer) => readBitmap(buf, len), writeBitmap)
}

// type VarTypeMapping = {
//   bcd: FieldCodec<string>
//   bin: FieldCodec<Buffer>
//   bit: FieldCodec<string>
//   str: FieldCodec<string>
// }

// type VarTypeKey = keyof VarTypeMapping
// export function varFF(fieldId: number, varType: VariableType, t: VarTypeKey, encoding?: BufferEncoding): VarTypeMapping[VarTypeKey] {
//   switch (t) {
//     case 'bcd':
//       return fieldCodecMaker(fieldId, variableBCDLenReadMaker(varType, readBCD), variableBCDLenWriteMaker(varType, writeBCDMaker()))
//     case 'bin':
//       return fieldCodecMaker(fieldId, variableBCDLenReadMaker(varType, readBuffer), variableBCDLenWriteMaker(varType, writeBuffer))
//     case 'bit':
//       return fieldCodecMaker(fieldId, variableBCDLenReadMaker(varType, readBitmap), variableBCDLenWriteMaker(varType, writeBitmap))
//     case 'str':
//       return fieldCodecMaker(
//         fieldId,
//         variableBCDLenReadMaker(varType, readStringMaker(encoding || 'latin1')),
//         variableBCDLenWriteMaker(varType, writeStringMaker(encoding || 'latin1'))
//       )
//   }
// }

export function varBCDFF(fieldId: number, varType: VariableType) {
  return fieldCodecMaker(fieldId, variableBCDLenReadMaker(varType, readBCD), variableBCDLenWriteMaker(varType, writeBCDMaker()))
}

export function varBinFF(fieldId: number, varType: VariableType) {
  return fieldCodecMaker(fieldId, variableBCDLenReadMaker(varType, readBuffer), variableBCDLenWriteMaker(varType, writeBuffer))
}

// export function varBitFF(fieldId: number, varType: VariableType) {
//   return fieldCodecMaker(fieldId, variableBCDLenReadMaker(varType, readBitmap), variableBCDLenWriteMaker(varType, writeBitmap))
// }

export function varStrFF(fieldId: number, varType: VariableType, encoding?: BufferEncoding) {
  return fieldCodecMaker(
    fieldId,
    variableBCDLenReadMaker(varType, readStringMaker(encoding || 'latin1')),
    variableBCDLenWriteMaker(varType, writeStringMaker(encoding || 'latin1'))
  )
}

export function readPkg<T = {}>(buf: SmartBuffer, fs: { [K in keyof T]: FieldCodec<T[K]> }): T {
  const tmp = <T>{}
  const as = []
  for (const k in fs) {
    as.push({ id: fs[k].fieldId, do: () => (tmp[k] = fs[k].read(buf)) })
  }
  as.sort((a, b) => a.id - b.id)
  as.forEach(e => e.do())
  return tmp
}
