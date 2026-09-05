/**
 * The two browser gestures behind export / import, kept out of the screen so
 * the screen stays testable: everything else in this feature is pure.
 */

/** Hands the file to the browser's download flow. */
export const downloadTextFile = (
  filename: string,
  text: string,
  mimeType = 'application/json',
): void => {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * Reads a picked file as text. `Blob.text()` would be shorter, but FileReader
 * is what jsdom implements (so the import path stays testable) and it is the
 * safer choice on older mobile Safari.
 */
export const readTextFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.readAsText(file);
  });
