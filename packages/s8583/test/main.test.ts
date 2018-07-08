import {
  readBCD,
  writeBCDMaker,
  readStringMaker,
  writeStringMaker,
  readBuffer,
  writeBuffer,
  variableBCDLenReadMaker,
  variableBCDLenWriteMaker,
  fieldCodecMaker,
  readBitmap,
  writeBitmap,
  fixBCDFF,
  fixBitFF,
  varBCDFF,
  varBinFF,
  varStrFF,
  readPkg,
} from '../src/index'
import { SmartBuffer } from 'smart-buffer'

describe('reader and writer test', () => {
  it('read bitmap', () => {
    expect(readBitmap(SmartBuffer.fromBuffer(Buffer.from([0x01, 0x23, 0x45])), 2)).toBe('0000000100100011')
  })

  it('write bitmap', () => {
    const buf = new SmartBuffer()
    writeBitmap('0000000100100011', buf)
    expect(buf.toBuffer().toString('hex')).toBe('0123')
  })
  it('read bcd', () => {
    expect(readBCD(SmartBuffer.fromBuffer(Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89])), 5)).toBe('123456789')
    expect(readBCD(SmartBuffer.fromBuffer(Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90])), 5)).toBe('1234567890')
    expect(readBCD(SmartBuffer.fromBuffer(Buffer.from([0x0, 0x0, 0x0, 0x01, 0x23, 0x45, 0x67, 0x89])), 8)).toBe('123456789')
  })

  it('write bcd', () => {
    const buf = new SmartBuffer()
    writeBCDMaker()('123456789', buf)
    expect(buf.toBuffer()).toMatchObject(Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89]))
    buf.readOffset = buf.writeOffset
    writeBCDMaker()('1234567890', buf)
    expect(buf.readBuffer()).toMatchObject(Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90]))
    writeBCDMaker(6)('1234567890', buf)
    expect(buf.readBuffer()).toMatchObject(Buffer.from([0x0, 0x12, 0x34, 0x56, 0x78, 0x90]))
  })

  it('read string', () => {
    const buf = SmartBuffer.fromBuffer(Buffer.from('test'))
    expect(readStringMaker('latin1')(buf, 4)).toBe('test')
  })

  it('write string', () => {
    const buf = new SmartBuffer()
    writeStringMaker('latin1')('test', buf)
    expect(buf.toBuffer().toString('latin1')).toBe('test')
  })

  it('read buffer', () => {
    const buf = Buffer.from([0x01, 0x02, 0x03])
    expect(readBuffer(SmartBuffer.fromBuffer(buf), 2)).toMatchObject(Buffer.from([0x01, 0x02]))
  })

  it('write buffer', () => {
    const buf = new SmartBuffer()
    const rawBuf = Buffer.from([0x01, 0x02])
    writeBuffer(rawBuf, buf)
    expect(buf.toBuffer()).toMatchObject(rawBuf)
  })

  it('LL variable BCD length read', () => {
    const readFn = variableBCDLenReadMaker('LL', readStringMaker('latin1'))
    const buf = SmartBuffer.fromBuffer(Buffer.from([0x02, 0x30, 0x31, 0x32]))
    expect(readFn(buf)).toBe('01')
  })

  it('LLL variable BCD length read', () => {
    const readFn = variableBCDLenReadMaker('LLL', readStringMaker('latin1'))
    const buf = SmartBuffer.fromBuffer(Buffer.from([0x00, 0x02, 0x30, 0x31, 0x32]))
    expect(readFn(buf)).toBe('01')
  })

  it('LL variable BCD length write', () => {
    const write = variableBCDLenWriteMaker('LL', writeStringMaker('latin1'))
    const buf = new SmartBuffer()
    write('123', buf)
    expect(buf.toBuffer().toString('hex')).toBe('03313233')
  })

  it('LLL variable BCD length write', () => {
    const write = variableBCDLenWriteMaker('LLL', writeStringMaker('latin1'))
    const buf = new SmartBuffer()
    write('123', buf)
    expect(buf.toBuffer().toString('hex')).toBe('0003313233')
  })

  it('field Codec', () => {
    const read = (buf: SmartBuffer) => readBCD(buf, 10)
    const write = writeBCDMaker(10)
    const codec = fieldCodecMaker(2, read, write)
    expect(codec.fieldId).toBe(2)
    expect(codec.read).toBe(read)
    expect(codec.write).toBe(write)
  })

  it('fix bcd field factory', () => {
    const fieldCodec = fixBCDFF(3, 2)
    const buf = new SmartBuffer()
    expect(fieldCodec.fieldId).toBe(3)
    fieldCodec.write('10', buf)
    expect(buf.toBuffer().toString('hex')).toBe('0010')
    expect(fieldCodec.read(buf)).toBe('10')
  })

  it('fix bit field factory', () => {
    const fieldCodec = fixBitFF(4, 2)
    const buf = new SmartBuffer()
    expect(fieldCodec.fieldId).toBe(4)
    fieldCodec.write('0111111100011111', buf)
    expect(buf.toBuffer().toString('hex')).toBe('7f1f')
    expect(fieldCodec.read(buf)).toBe('0111111100011111')
  })

  it('var bcd field factory', () => {
    const fieldCodec = varBCDFF(5, 'LLL')
    const buf = new SmartBuffer()
    expect(fieldCodec.fieldId).toBe(5)
    fieldCodec.write('101', buf)
    expect(buf.toBuffer().toString('hex')).toBe('00020101')
    expect(fieldCodec.read(buf)).toBe('101')
  })

  it('var bin field factory', () => {
    const fieldCodec = varBinFF(6, 'LLL')
    const buf = new SmartBuffer()
    expect(fieldCodec.fieldId).toBe(6)
    fieldCodec.write(Buffer.from([0x02, 0x03]), buf)
    expect(buf.toBuffer().toString('hex')).toBe('00020203')
    expect(fieldCodec.read(buf).toString('hex')).toBe('0203')
  })

  it('var str field factory', () => {
    const fieldCodec = varStrFF(6, 'LLL')
    const buf = new SmartBuffer()
    expect(fieldCodec.fieldId).toBe(6)
    fieldCodec.write('123', buf)
    expect(buf.toBuffer().toString('hex')).toBe('0003313233')
    expect(fieldCodec.read(buf)).toBe('123')
  })

  it('read pkg', () => {
    const buf = new SmartBuffer()
    buf.writeBuffer(Buffer.from('000110023139', 'hex'))
    const fieldDef = {
      b: varStrFF(2, 'LL'),
      a: varBCDFF(1, 'LLL'),
    }
    const v = readPkg(buf, fieldDef)
    console.log(v)
    // console.log(fieldDef.a.read(buf))
  })
})
