// Browser side of presigned uploads, shared by the PDF dropzone and the image library.

/**
 * PUTs the file straight to storage, reporting progress (0–1). Resolves false if the
 * request was aborted through `xhrRef`.
 */
export function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (ratio: number) => void,
  xhrRef?: { current: XMLHttpRequest | null },
) {
  return new Promise<boolean>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (xhrRef) xhrRef.current = xhr;
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(true) : reject(new Error(`Storage answered ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("The connection dropped during the upload."));
    xhr.onabort = () => resolve(false);
    xhr.send(file);
  });
}
