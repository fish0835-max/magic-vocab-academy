import { createWorker } from 'tesseract.js'

let worker: Awaited<ReturnType<typeof createWorker>> | null = null

export async function initOCR(): Promise<void> {
  if (worker) return
  worker = await createWorker('eng')
}

export async function recognizeText(imageData: string | File | Blob): Promise<string> {
  if (!worker) await initOCR()
  const result = await worker!.recognize(imageData)
  return result.data.text
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate()
    worker = null
  }
}
