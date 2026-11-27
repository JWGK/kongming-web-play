const decoded = new Map();

/** Prebuilt native story pictures, requested only when their route becomes active. */
export function prepareNativeStillFiles(paths) {
  if (typeof Image !== "function") return Promise.resolve();
  return Promise.all([...new Set(paths)].map(path => {
    const url = new URL("../" + path, import.meta.url).href;
    if (!decoded.has(url)) {
      const image = new Image();
      image.src = url;
      decoded.set(url, image.decode().then(() => {
        if (image.naturalWidth !== 240 || image.naturalHeight !== 160) {
          throw new RangeError("Invalid native story image dimensions");
        }
        return image;
      }).catch(error => { decoded.delete(url); throw error; }));
    }
    return decoded.get(url);
  }));
}

/** Use the existing story image surface, not a snapshot of a live canvas. */
export function renderNativeStillFile(image, url, description) {
  if (image.src !== url) image.src = url;
  image.alt = description || "三國志孔明傳・原作畫面";
  image.hidden = false;
}
