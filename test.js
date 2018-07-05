const base64 = `graph LR
  数据提供者((数据提供者))-->解码流水线
  解码流水线-->处理
  处理-->编码流水线
  编码流水线-->数据提供者`

console.log(Buffer.from(base64).toString('base64'))
