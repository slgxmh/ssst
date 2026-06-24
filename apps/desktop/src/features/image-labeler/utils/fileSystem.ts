import { open, save } from "@tauri-apps/plugin-dialog";
import { readDir, readFile, writeFile } from "@tauri-apps/plugin-fs";
import { LabelMeAnnotation } from "../types";

/**
 * 选择目录
 * 使用 Tauri dialog plugin
 */
export async function selectDirectory(): Promise<string> {
  const result = await open({ directory: true });
  if (typeof result !== "string") {
    throw new Error("未选择目录");
  }
  return result;
}

/**
 * 扫描目录中的图片文件
 * 支持 jpg, jpeg, png, gif, webp, bmp 格式
 */
export async function scanDirectoryForImages(dirPath: string): Promise<string[]> {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
  const entries = await readDir(dirPath);

  const imageFiles = entries
    .filter((entry) => entry.isFile)
    .map((entry) => entry.name)
    .filter((name) => {
      const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
      return imageExtensions.includes(ext);
    });

  return imageFiles.sort((a, b) => a.localeCompare(b));
}

/**
 * 从目录中获取指定图片文件的 File 对象
 */
export async function getImageFileFromDirectory(
  dirPath: string,
  fileName: string
): Promise<File> {
  const path = `${dirPath}/${fileName}`;
  const bytes = await readFile(path);
  const blob = new Blob([bytes]);
  return new File([blob], fileName);
}

/**
 * 使用 FileReader 将图片文件读取为 DataURL (base64)
 */
export function readImageAsDataURL(file: File): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const reader = new FileReader();

  reader.onload = () => {
    if (typeof reader.result === "string") {
      resolve(reader.result);
    } else {
      reject(new Error("读取图片失败：结果不是字符串"));
    }
  };

  reader.onerror = () => {
    reject(new Error(`读取图片失败：${reader.error?.message || "未知错误"}`));
  };

  reader.readAsDataURL(file);
  return promise;
}

/**
 * 根据图片文件名查找并读取同名的 JSON 标注文件
 * 例如：image.jpg -> image.json
 */
export async function loadAnnotationFile(
  dirPath: string,
  imageFileName: string
): Promise<LabelMeAnnotation | null> {
  const imageName = imageFileName.replace(/\.[^/.]+$/, "");
  const jsonPath = `${dirPath}/${imageName}.json`;

  try {
    const bytes = await readFile(jsonPath);
    const text = new TextDecoder().decode(bytes);
    // JSON.parse 返回 any；此处信任本地 JSON 文件结构
    return JSON.parse(text) as unknown as LabelMeAnnotation;
  } catch {
    return null;
  }
}

/**
 * 保存标注文件为 JSON
 * 使用 Tauri save dialog + fs plugin
 */
export async function saveAnnotationFile(
  annotation: LabelMeAnnotation,
  suggestedName: string
): Promise<void> {
  const filePath = await save({
    defaultPath: suggestedName,
    filters: [
      {
        name: "LabelMe 标注文件",
        extensions: ["json"],
      },
    ],
  });

  if (!filePath) return;

  const bytes = new TextEncoder().encode(JSON.stringify(annotation, null, 2));
  await writeFile(filePath, bytes);
}

/**
 * 向指定目录写入文件
 */
export async function writeFileToDirectory(
  dirPath: string,
  filename: string,
  content: Blob
): Promise<void> {
  const path = `${dirPath}/${filename}`;
  const buffer = await content.arrayBuffer();
  await writeFile(path, new Uint8Array(buffer));
}
