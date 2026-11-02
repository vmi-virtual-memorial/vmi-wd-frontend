// Award images live in /public; image_filename may or may not carry an extension.
const EXTENSIONS = ['.jpg', '.png', '.jpeg', '.gif'];

export function awardImagePath(filename: string): string {
  const lower = filename.toLowerCase();
  return EXTENSIONS.some(ext => lower.endsWith(ext)) ? `/${filename}` : `/${filename}.jpg`;
}
