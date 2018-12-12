import { setTimeout } from 'timers'

class AudioData {
  // 录音文件长度
  size: number = 0
  // 录音缓存
  buffer: Array<any> = []
  // 上传片段个数
  uplodingBufferLength: number = 0
  // 上传的大小
  uploadingSize: number = 0
  // 输入采样率
  inputSampleRate: any
  // 输入采样数位 8, 16
  inputSampleBits: number = 16
  // 输出采样率
  outputSampleRate: any
  // 输出采样数位 8, 16
  oututSampleBits: any

  constructor(context, config) {
    this.inputSampleRate = context.sampleRate
    this.outputSampleRate = config.sampleRate
    this.oututSampleBits = config.sampleBits
  }

  // 输入
  input(data) {
    this.buffer.push(new Float32Array(data))
    this.size += data.length
  }

  // 清空
  clear() {
    this.size = 0
    this.buffer = []
    this.uplodingBufferLength = 0
    this.uploadingSize = 0
  }

  // 合并压缩
  compress() {
    // 合并
    var data = new Float32Array(this.size)
    var offset = 0
    for (var i = 0; i < this.buffer.length; i++) {
      data.set(this.buffer[i], offset)
      offset += this.buffer[i].length
    }

    // 压缩
    const compression = this.inputSampleRate / this.outputSampleRate
    const length = data.length / compression
    const result = new Float32Array(length)
    let index = 0
    let j = 0

    while (index < length) {
      result[index] = data[j]
      j += compression
      index++
    }

    return result
  }

  // 转码
  encodeWAV(bytes) {
    if (!bytes) {
      bytes = this.compress()
    }
    var sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate)
    var sampleBits = Math.min(this.inputSampleBits, this.oututSampleBits)
    var dataLength = bytes.length * (sampleBits / 8)
    var buffer = new ArrayBuffer(44 + dataLength)
    var data = new DataView(buffer)

    var channelCount = 1 // 单声道
    var offset = 0

    var writeString = function(str) {
      for (var i = 0; i < str.length; i++) {
        data.setUint8(offset + i, str.charCodeAt(i))
      }
    }

    // 资源交换文件标识符
    writeString('RIFF')
    offset += 4
    // 下个地址开始到文件尾总字节数,即文件大小-8
    data.setUint32(offset, 36 + dataLength, true)
    offset += 4
    // WAV文件标志
    writeString('WAVE')
    offset += 4
    // 波形格式标志
    writeString('fmt ')
    offset += 4
    // 过滤字节,一般为 0x10 = 16
    data.setUint32(offset, 16, true)
    offset += 4
    // 格式类别 (PCM形式采样数据)
    data.setUint16(offset, 1, true)
    offset += 2
    // 通道数
    data.setUint16(offset, channelCount, true)
    offset += 2
    // 采样率,每秒样本数,表示每个通道的播放速度
    data.setUint32(offset, sampleRate, true)
    offset += 4
    // 波形数据传输率 (每秒平均字节数) 单声道×每秒数据位数×每样本数据位/8
    data.setUint32(offset, channelCount * sampleRate * (sampleBits / 8), true)
    offset += 4
    // 快数据调整数 采样一次占用字节数 单声道×每样本的数据位数/8
    data.setUint16(offset, channelCount * (sampleBits / 8), true)
    offset += 2
    // 每样本数据位数
    data.setUint16(offset, sampleBits, true)
    offset += 2
    // 数据标识符
    writeString('data')
    offset += 4
    // 采样数据总数,即数据总大小-44
    data.setUint32(offset, dataLength, true)
    offset += 4
    // 写入采样数据
    if (sampleBits === 8) {
      for (var i = 0; i < bytes.length; i++, offset++) {
        var s = Math.max(-1, Math.min(1, bytes[i]))
        var val = s < 0 ? s * 0x8000 : s * 0x7fff
        val = 255 / (65535 / (val + 32768))
        data.setInt8(offset, val)
      }
    } else {
      for (var i = 0; i < bytes.length; i++, offset += 2) {
        var s = Math.max(-1, Math.min(1, bytes[i]))
        data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      }
    }

    return new Blob([data], { type: 'audio/wav' })
  }

  // 取缓存第一个片段
  getRemaingBlob() {
    if (this.buffer.length === 0) {
      return null
    }

    // 更新当前上传片段个数，上传成功后删除用
    this.uplodingBufferLength = this.buffer.length
    this.uploadingSize = this.size
    const result = this.compress()
    return this.encodeWAV(result)
  }

  // 删除缓存片段
  delBuffer(len) {
    if (len === undefined) {
      len = this.uplodingBufferLength
    }
    this.buffer.splice(0, len)
    this.uplodingBufferLength = 0
    this.size -= this.uploadingSize
  }
}

class HZRecorder {
  config: any
  audioInput: any
  recorder: any
  context: any = new AudioContext()
  audioData: any
  syncuploading: boolean = false
  uploadingFix: number = 0
  uploadingComplete: Function

  constructor(stream, config) {
    config = config || {}
    config.url = '/api/interviewManagement/audio'
    config.sampleBits = config.sampleBits || 16 // 采样数位 8, 16
    config.sampleRate = config.sampleRate || 16000 // 采样率(1/6 44100)
    this.config = config
    this.audioInput = this.context.createMediaStreamSource(stream)
    this.audioData = new AudioData(this.context, this.config)
    this.recorder = this.context.createScriptProcessor(4096, 1, 1)
    this.syncuploading = config.syncuploading
    this.uploadingComplete = config.uploadingCompleteCallback
    // 音频采集
    this.recorder.onaudioprocess = e => {
      this.audioData.input(e.inputBuffer.getChannelData(0))
    }
  }

  // 开始录音
  start(audioFileAddress) {
    this.syncuploading = true
    this.audioInput.connect(this.recorder)
    this.recorder.connect(this.context.destination)
    this.syncupload(audioFileAddress)
  }

  // 停止
  stop() {
    this.syncuploading = false
    this.recorder.disconnect()
  }

  // 清空
  clear() {
    this.stop()
    this.audioData.clear()
  }

  // 获取音频文件
  getBlob() {
    this.stop()
    return this.audioData.encodeWAV()
  }

  // 回放
  play(audio) {
    audio.src = window.URL.createObjectURL(this.getBlob())
  }

  // 同步上传
  syncupload(audioFileAddress) {
    if (!this.syncuploading && this.audioData.buffer.length === 0) {
      this.uploadingComplete && this.uploadingComplete.call(this)
      return
    }
    const fd = new FormData()
    const currentBolb = this.audioData.getRemaingBlob()
    if (!currentBolb) {
      setTimeout(() => {
        this.syncupload(audioFileAddress)
      }, 60000)
      return
    }

    this.uploadingFix++
    fd.append('file', currentBolb, `${audioFileAddress}-${this.uploadingFix}.wav`)
    fd.append('audioFileAddress', audioFileAddress)
    var xhr = new XMLHttpRequest()
    xhr.open('POST', this.config.url)
    xhr.send(fd)
    xhr.addEventListener(
      'load',
      e => {
        // 成功过后删除当前上传片段
        this.audioData.delBuffer()
        if (this.syncuploading) {
          setTimeout(() => {
            // 每隔60秒传一次
            this.syncupload(audioFileAddress)
          }, 60000)
        } else {
          this.syncupload(audioFileAddress)
        }
      },
      false
    )
  }

  // 上传
  upload(url, callback) {
    url = '/api/interviewManagement/audio'
    const fd = new FormData()
    fd.append('file', this.getBlob())
    var xhr = new XMLHttpRequest()
    if (callback) {
      xhr.upload.addEventListener(
        'progress',
        function(e) {
          callback('uploading', e)
        },
        false
      )
      xhr.addEventListener(
        'load',
        function(e) {
          callback('ok', e)
        },
        false
      )
      xhr.addEventListener(
        'error',
        function(e) {
          callback('error', e)
        },
        false
      )
      xhr.addEventListener(
        'abort',
        function(e) {
          callback('cancel', e)
        },
        false
      )
    }
    xhr.open('POST', url)
    xhr.send(fd)
  }

  // 抛出异常
  static throwError(message) {
    alert(message)
  }

  // 是否支持录音
  static canRecording() {
    const navigator: any = window.navigator
    navigator.getUserMedia =
      navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
    return navigator.getUserMedia != null
  }

  // 获取录音机
  static getRecorder(callback, config) {
    if (callback) {
      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { audio: true }, // 只启用音频
          function(stream) {
            const rec = new HZRecorder(stream, config)
            callback(rec)
          },
          function(error: any) {
            switch (error.code || error.name) {
              case 'PERMISSION_DENIED':
              case 'PermissionDeniedError':
                HZRecorder.throwError('用户拒绝提供信息。')
                break
              case 'NOT_SUPPORTED_ERROR':
              case 'NotSupportedError':
                HZRecorder.throwError('浏览器不支持硬件设备。')
                break
              case 'MANDATORY_UNSATISFIED_ERROR':
              case 'MandatoryUnsatisfiedError':
                HZRecorder.throwError('无法发现指定的硬件设备。')
                break
              default:
                HZRecorder.throwError('无法打开麦克风。异常信息:' + (error.code || error.name))
                break
            }
          }
        )
      } else {
        HZRecorder.throwError('当前浏览器不支持录音功能。')
      }
    }
  }
}

export default HZRecorder
