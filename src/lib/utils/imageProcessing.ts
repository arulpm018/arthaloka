/**
 * Client-side image resize + compress sebelum disimpan sebagai Base64
 * data URL di Firestore.
 *
 * Pakai canvas API biar nggak butuh dependency baru. Output JPEG dengan
 * quality configurable. Animated GIF di-cap di file size validation —
 * kalau nggak fit di budget, ditolak (Firestore doc limit 1 MB).
 *
 * NOTE: Browser only. Pemanggil harus client-side ("use client").
 */

export interface ProcessImageOptions {
  /** Sisi terpanjang max — maintain aspect ratio. */
  maxDimension: number;
  /** JPEG/WebP starting quality 0–1. Default 0.85. */
  quality?: number;
  /**
   * Output mime. Default `image/jpeg`. WebP lebih ringan tapi compatibility
   * lebih sempit; data URL stays portable di mana pun.
   */
  outputType?: "image/jpeg" | "image/webp";
  /**
   * Hard cap output size (bytes) — kalau hasil > cap, kita auto-retry
   * dengan quality lebih rendah dan dimensi lebih kecil. Default 700 KB
   * (aman di bawah Firestore 1 MB doc limit setelah Base64 inflation 33%).
   *
   * Catatan: 700 KB binary ≈ 932 KB Base64 string. Field-only payload,
   * jadi sisanya cukup buat metadata doc.
   */
  maxBytes?: number;
}

const DEFAULTS = {
  quality: 0.85,
  outputType: "image/jpeg" as const,
  maxBytes: 700 * 1024,
};

/** File yang bukan animasi — kita bisa resize. GIF ditangani terpisah. */
const isAnimatedFormat = (mime: string): boolean =>
  mime === "image/gif" || mime === "image/apng";

/** Load File ke HTMLImageElement via blob URL. */
const loadImage = (file: File | Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal load gambar — file mungkin korup"));
    };
    img.src = url;
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("FileReader returned non-string"));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });

/** Render canvas pada dimensi tertentu, kembalikan Blob. */
const drawToBlob = (
  img: HTMLImageElement,
  width: number,
  height: number,
  outputType: "image/jpeg" | "image/webp",
  quality: number
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas 2D context tidak tersedia"));
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Gagal generate output blob"));
        resolve(blob);
      },
      outputType,
      quality
    );
  });

/**
 * Compute dimensi target — sisi terpanjang di-cap ke `maxDimension`,
 * aspect ratio dijaga.
 */
const fitWithin = (
  srcWidth: number,
  srcHeight: number,
  maxDimension: number
): { width: number; height: number } => {
  if (srcWidth <= maxDimension && srcHeight <= maxDimension) {
    return { width: srcWidth, height: srcHeight };
  }
  if (srcWidth >= srcHeight) {
    return {
      width: maxDimension,
      height: Math.round((srcHeight * maxDimension) / srcWidth),
    };
  }
  return {
    width: Math.round((srcWidth * maxDimension) / srcHeight),
    height: maxDimension,
  };
};

export interface ProcessedImage {
  /** Base64 data URL siap simpan di Firestore (`data:image/...;base64,...`). */
  dataUrl: string;
  /** Ukuran payload string dalam bytes — penting buat validasi doc size. */
  byteLength: number;
  /** Dimensi final hasil resize. */
  width: number;
  height: number;
  /** True kalau diproses (resize/compress); false kalau passthrough (GIF). */
  processed: boolean;
}

/**
 * Validasi & convert image jadi data URL compact, dengan auto-retry kalau
 * hasil masih kebesaran. Strategi:
 *
 *   1. Resize ke `maxDimension` + JPEG q={quality}.
 *   2. Kalau output > `maxBytes`, retry dengan quality −0.1 hingga 0.5.
 *   3. Masih kebesaran? Reduce dimensi 80% (rekursif sampai 256px floor).
 *   4. Tetap ga muat? Throw — caller kasih tau user untuk pilih file lebih kecil.
 */
export const processImageToDataUrl = async (
  file: File,
  options: ProcessImageOptions
): Promise<ProcessedImage> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar (JPG, PNG, GIF, WebP)");
  }

  const opts = {
    quality: DEFAULTS.quality,
    outputType: DEFAULTS.outputType,
    maxBytes: DEFAULTS.maxBytes,
    ...options,
  };

  // Animated formats: passthrough — kita ga punya GIF re-encoder ringan.
  // Tetep validasi size cap supaya doc ga overflow.
  if (isAnimatedFormat(file.type)) {
    const dataUrl = await blobToDataUrl(file);
    if (dataUrl.length > opts.maxBytes * 1.4) {
      throw new Error(
        `GIF terlalu besar (${(file.size / 1024).toFixed(0)} KB). ` +
          `Maksimal ${(opts.maxBytes / 1024).toFixed(0)} KB. ` +
          `Coba GIF yang lebih pendek atau frame lebih sedikit.`
      );
    }
    return {
      dataUrl,
      byteLength: dataUrl.length,
      width: 0,
      height: 0,
      processed: false,
    };
  }

  const img = await loadImage(file);
  let { width, height } = fitWithin(img.width, img.height, opts.maxDimension);
  let quality = opts.quality;
  const minDimension = 256;
  const minQuality = 0.5;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const blob = await drawToBlob(img, width, height, opts.outputType, quality);
    const dataUrl = await blobToDataUrl(blob);
    if (dataUrl.length <= opts.maxBytes) {
      return {
        dataUrl,
        byteLength: dataUrl.length,
        width,
        height,
        processed: true,
      };
    }
    // Step down: turunin quality dulu (lebih murah dari resize ulang).
    if (quality > minQuality) {
      quality = Math.max(minQuality, quality - 0.1);
      continue;
    }
    // Quality udah minimum → kecilin dimensi 80%.
    const next = Math.round(Math.max(width, height) * 0.8);
    if (next < minDimension) break;
    const scaled = fitWithin(width, height, next);
    width = scaled.width;
    height = scaled.height;
    quality = opts.quality; // reset quality buat dimensi baru
  }

  throw new Error(
    "Foto kebesaran setelah dicompress. Coba gambar yang lebih sederhana."
  );
};
