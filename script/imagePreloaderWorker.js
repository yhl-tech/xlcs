self.onmessage = async function (event) {
  const { type, imageCount, imagesBase, imageIndex } = event.data
  switch (type) {
    case "START_PRELOAD":
      await startImagePreloading(imageCount || 10, imagesBase)
      break
    case "PRELOAD_SINGLE":
      await preloadSingleImage(imageIndex, imagesBase)
      break
    default:
  }
}

async function startImagePreloading(imageCount, imagesBase) {
  for (let i = 1; i <= imageCount; i++) {
    try {
      if (!imagesBase) {
        throw new Error("imagesBase 未传入，无法定位图片")
      }
      const imagePath = `${imagesBase.replace(
        /\/$/,
        ""
      )}/rorschach-blot-${i}.webp`
      const result = await fetchImageWithRetry(imagePath, i)
      self.postMessage({
        type: "IMAGE_LOADED",
        index: i,
        blob: result.blob,
        contentType: result.contentType,
      })
      await delay(100)
    } catch (error) {
      self.postMessage({
        type: "IMAGE_ERROR",
        index: i,
        error: error.message,
      })
    }
  }
  self.postMessage({
    type: "PRELOAD_COMPLETE",
    totalImages: imageCount,
  })
}

async function preloadSingleImage(imageIndex, imagesBase) {
  try {
    if (!imagesBase) {
      throw new Error("imagesBase 未传入，无法定位图片")
    }
    const imagePath = `${imagesBase.replace(
      /\/$/,
      ""
    )}/rorschach-blot-${imageIndex}.webp`
    const result = await fetchImageWithRetry(imagePath, imageIndex)
    self.postMessage({
      type: "IMAGE_LOADED",
      index: imageIndex,
      blob: result.blob,
      contentType: result.contentType,
    })
  } catch (error) {
    self.postMessage({
      type: "IMAGE_ERROR",
      index: imageIndex,
      error: error.message,
    })
  }
}

async function fetchImageWithRetry(url, index, maxRetries = 3) {
  let lastError
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        // cache: url.startsWith("https://") ? "default" : "no-store", // 注释掉no-store，允许本地文件缓存
        cache: "default",
        mode: "cors",
        headers: {
          Accept: "image/webp,image/jpeg,image/*,*/*;q=0.8",
        },
      })

      let headersObj = {}
      try {
        for (const [k, v] of response.headers.entries()) {
          headersObj[k] = v
        }
      } catch (e) {
        headersObj = { error: "无法读取 headers" }
      }
      const diag = {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        contentLength: headersObj["content-length"] || null,
        headers: headersObj,
      }
      self.postMessage({
        type: "IMAGE_FETCH_DIAGNOSTIC",
        index,
        diagnostic: diag,
      })

      if (!response.ok) {
        let bodyText = ""
        try {
          bodyText = await response.text()
        } catch (e) {
          bodyText = "<无法读取响应体>"
        }
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}. Body: ${String(
            bodyText
          ).slice(0, 200)}`
        )
      }

      const contentType = response.headers.get("content-type") || ""
      if (!contentType.startsWith("image")) {
        let bodyText = ""
        try {
          bodyText = await response.text()
        } catch (e) {
          bodyText = "<无法读取响应体>"
        }
        throw new Error(
          `非图片响应，content-type=${contentType}. Body: ${String(
            bodyText
          ).slice(0, 200)}`
        )
      }

      let arrayBuffer
      try {
        arrayBuffer = await response.arrayBuffer()
      } catch (err) {
        if (
          err &&
          (err.name === "AbortError" || /aborted/i.test(err.message))
        ) {
          self.postMessage({
            type: "IMAGE_FETCH_DIAGNOSTIC",
            index,
            diagnostic: {
              status: response.status,
              statusText: response.statusText,
              contentType,
              note: "body-read-aborted",
              errorMessage: err.message,
            },
          })
          throw err
        }
        throw err
      }

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error("下载的文件为空")
      }

      const blob = new Blob([arrayBuffer], {
        type: contentType || "application/octet-stream",
      })
      return {
        blob,
        contentType,
        diagnostic: {
          byteLength: arrayBuffer.byteLength,
          fetchedAt: Date.now(),
        },
      }
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        const delayTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await delay(delayTime)
      }
    }
  }
  throw new Error(
    `图片${index}下载失败，已重试${maxRetries}次。最后错误: ${lastError.message}`
  )
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

self.onerror = function (error) {
  self.postMessage({
    type: "WORKER_ERROR",
    error: {
      message: error.message,
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
    },
  })
}

self.onmessageerror = function (error) {}
