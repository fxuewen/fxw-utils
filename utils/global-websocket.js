import { getWSUrl } from '@/api/caseHandle/caseHandle'
const GlobalWebsocket = {
  websocket: null,
  handles: null,
  wsUrl: null,
  // 是否是手动关闭连接，若是手动关闭连接则不需要重连，若是网络原因连接被断开则需要重连
  isManualClose: false,
  init() {
    if (this.websocket) {
      return
    }
    this.connectWs()
  },
  connectWs() {
    if ('WebSocket' in window) {
      getWSUrl().then(
        res => {
          this.wsUrl = res.data?.data
          // this.wsUrl = `ws://10.90.131.220:81/ws`
          const userId = localStorage.getItem('userId')
          const url = `${this.wsUrl}?userId=${userId}`
          this._connect(url)
        },
        () => {
          // 获取wsUrl失败，从localstory中获取上一次成功登录的ws地址
          const wsUrl = window.getItem('PIF_LAST_WSURL')
          const userId = localStorage.getItem('userId')
          const url = `${wsUrl}?userId=${userId}`
          this._connect(url)
        }
      )
    } else {
      console.log('当前浏览器 Not support websocket')
    }
  },
  _connect(url) {
    this.websocket = new WebSocket(url)
    this.websocket.onerror = event => this.handleError(event)
    this.websocket.onopen = wsUrl => this.handleOpen(wsUrl)
    this.websocket.onmessage = event => this.handleMessage(event)
    this.websocket.onclose = () => this.handleClose()
    window.onbeforeunload = () => this.handleUnload()
  },
  // 发送消息
  send(message) {
    this.websocket.send(message)
  },
  // 连接错误
  handleError(e) {
    // 因为网络原因，服务器原因或其他原因 连接ws失败后 间隔1s秒重新连接
    setTimeout(() => {
      this.init()
    }, 1 * 10000)
  },
  // 连接成功
  handleOpen() {
    // ws连接成功后 将最近一次成功连接的ws地址放入localstory中
    window.setItem('PIF_LAST_WSURL', this.wsUrl)
  },
  // 收到消息的回调
  handleMessage(event) {
    const data = JSON.parse(event.data)
    if (!data) {
      return
    }

    const eventName = data.type
    if (!this.handles || !this.handles[eventName]) {
      return
    }

    this.handles[eventName].forEach(callback => {
      callback(data)
    })
  },
  // 连接关闭的回调
  handleClose() {
    // 若是网络原因连接被断开则需要重连
    if (!this.isManualClose) {
      // console.log('执行重连')
      this.connectWs()
    } else {
      // alert('不执行重连')
    }
    this.isManualClose = false
  },
  // 监听窗口关闭事件，当窗口关闭时，主动去关闭websocket连接，防止连接还没断开就关闭窗口，server端会抛异常。
  handleUnload() {
    this.close()
  },
  // 关闭websocket
  close(isManual = true) {
    this.isManualClose = isManual
    this.websocket && this.websocket.close()
    this.websocket = null
    this.handles = null
  },
  // 注册websocket消息回调事件
  registeEvent(eventName, callback) {
    if (!this.handles) {
      // this.handles={};
      Object.defineProperty(this, 'handles', {
        value: {},
        enumerable: false,
        configurable: true,
        writable: true
      })
    }

    if (!this.handles[eventName]) {
      this.handles[eventName] = []
    }
    this.handles[eventName].push(callback)
  },
  // 注销事件
  offEvent(eventName, callback) {
    if (!this.handles || !this.handles[eventName]) {
      return
    }

    const index = this.handles[eventName].findIndex(item => item === callback)
    index > -1 && this.handles[eventName].splice(index)
  }
}

export default GlobalWebsocket
