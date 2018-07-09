import { FieldCodec, varBCDFF, varBinFF } from './base'

const a = {
  f1: varBCDFF(1, 'LL'),
  f2: varBinFF(2, 'LL'),
}

class Pkger<T> {
  constructor(allFields: { [K in keyof T]: FieldCodec<T[K]> }) {}
}

const c = {
  a: 1,
  b: 2,
  c: 3,
}

type d = keyof typeof c

function strEnum<T extends string>(o: Array<T>): T {
  throw ''
}

const arr = ['1', '2', '3', '4']
strEnum(arr)
