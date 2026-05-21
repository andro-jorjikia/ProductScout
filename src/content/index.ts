import { detectProduct } from '../utils/productDetector'
import { MESSAGE_TYPES } from '../utils/messageTypes'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.GET_PRODUCT_INFO) {
    sendResponse({ product: detectProduct() })
  }

  return true
})