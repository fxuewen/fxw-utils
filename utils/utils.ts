export default class Utils {
  // 获取uuid
  static getUuid(len: number, radix?: number): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(
      ''
    )
    let uuid: any = []
    let i
    radix = radix || chars.length

    if (len) {
      // Compact form
      for (i = 0; i < len; i++) uuid[i] = chars[0 | (Math.random() * radix)]
    } else {
      // rfc4122, version 4 form
      var r

      // rfc4122 requires these characters
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-'
      uuid[14] = '4'

      // Fill in random data.  At i==19 set the high bits of clock sequence as
      // per rfc4122, sec. 4.1.5
      for (i = 0; i < 36; i++) {
        if (!uuid[i]) {
          r = 0 | (Math.random() * 16)
          uuid[i] = chars[i === 19 ? (r & 0x3) | 0x8 : r]
        }
      }
    }

    return uuid.join('')
  }

  // 树数据格式化
  static categoryTreeDataFormat(data) {
    data.checked = false
    data.draging = false
    data.move = false
    data.input = {
      show: false,
      value: '',
      type: 'edit'
    }
    if (!data.id) {
      data.id = Utils.getUuid(32)
    }
    data.children.forEach(child => {
      return this.categoryTreeDataFormat(child)
    })
  }

  // 获取文件扩展名
  static getNameExtension(name: string): string {
    var startIndex = name.lastIndexOf('.')
    if (startIndex !== -1) {
      return name
        .substring(startIndex + 1, name.length)
        .toLowerCase()
    } else {
      return ''
    }
  }
}
