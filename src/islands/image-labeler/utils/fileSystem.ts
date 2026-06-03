import { LabelMeAnnotation } from "../types";

/**
 * 检查浏览器是否支持 File System Access API
 */
function checkFileSystemAccessSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    "showOpenFilePicker" in window &&
    "showSaveFilePicker" in window &&
    "showDirectoryPicker" in window
  );
}

/**
 * 检查是否为 Chrome/Edge 浏览器
 */
function isChromeOrEdge(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("chrome") ||
    ua.includes("chromium") ||
    ua.includes("edg")
  );
}

/**
 * 显示浏览器兼容性警告
 */
function showBrowserWarning(): void {
  if (!isChromeOrEdge()) {
    console.warn(
      "[FileSystem] 当前浏览器可能不完全支持 File System Access API。建议使用 Chrome 或 Edge 以获得最佳体验。"
    );
  }
}

/**
 * 处理权限错误，转换为友好错误消息
 */
function handlePermissionError(error: unknown, operation: string): never {
  if (error instanceof DOMException) {
    if (error.name === "AbortError") {
      throw new Error(`用户取消了${operation}操作`);
    }
    if (error.name === "NotAllowedError") {
      throw new Error(
        `权限被拒绝：无法${operation}。请在浏览器提示时允许文件访问权限。`
      );
    }
    if (error.name === "SecurityError") {
      throw new Error(
        `安全限制：无法${operation}。请确保页面是通过 HTTPS 或 localhost 访问的。`
      );
    }
  }
  throw new Error(`${operation}失败：${error instanceof Error ? error.message : String(error)}`);
}

/**
 * 扫描目录中的图片文件
 * 支持 jpg, jpeg, png, gif, webp, bmp 格式
 */
export async function scanDirectoryForImages(
  dirHandle: FileSystemDirectoryHandle
): Promise<string[]> {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
  const imageFiles: string[] = [];

  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === "file") {
        const ext = entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase();
        if (imageExtensions.includes(ext)) {
          imageFiles.push(entry.name);
        }
      }
    }
  } catch (error) {
    handlePermissionError(error, "扫描目录");
  }

  return imageFiles.sort((a, b) => a.localeCompare(b));
}

/**
 * 从目录中获取指定图片文件的 File 对象
 */
export async function getImageFileFromDirectory(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<File> {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName);
    return await fileHandle.getFile();
  } catch (error) {
    handlePermissionError(error, `获取图片文件 "${fileName}"`);
  }
}

/**
 * 使用 FileReader 将图片文件读取为 DataURL (base64)
 */
export function readImageAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
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
  });
}

/**
 * 根据图片文件名查找并读取同名的 JSON 标注文件
 * 例如：image.jpg -> image.json
 * 在指定目录下查找对应的 JSON 文件
 */
export async function loadAnnotationFile(
  dirHandle: FileSystemDirectoryHandle,
  imageFileName: string
): Promise<LabelMeAnnotation | null> {
  const imageName = imageFileName.replace(/\.[^/.]+$/, "");
  const jsonFileName = `${imageName}.json`;

  try {
    const fileHandle = await dirHandle.getFileHandle(jsonFileName);
    const file = await fileHandle.getFile();
    const content = await file.text();
    return JSON.parse(content) as LabelMeAnnotation;
  } catch {
    return null;
  }
}

/**
 * 保存标注文件为 JSON
 * 使用 showSaveFilePicker API
 */
export async function saveAnnotationFile(
  annotation: LabelMeAnnotation,
  suggestedName: string
): Promise<void> {
  if (!checkFileSystemAccessSupport()) {
    throw new Error(
      "当前浏览器不支持文件保存功能。请使用 Chrome 或 Edge 浏览器。"
    );
  }

  showBrowserWarning();

  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: "LabelMe 标注文件",
          accept: { "application/json": [".json"] },
        },
      ],
    });

    const writable = await fileHandle.createWritable();
    const blob = new Blob([JSON.stringify(annotation, null, 2)], {
      type: "application/json",
    });
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    handlePermissionError(error, "保存标注文件");
  }
}

/**
 * 选择目录
 * 使用 showDirectoryPicker API
 */
export async function selectDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!checkFileSystemAccessSupport()) {
    throw new Error(
      "当前浏览器不支持目录选择功能。请使用 Chrome 或 Edge 浏览器。"
    );
  }

  showBrowserWarning();

  try {
    const dirHandle = await window.showDirectoryPicker();
    return dirHandle;
  } catch (error) {
    handlePermissionError(error, "选择目录");
  }
}

/**
 * 向指定目录写入文件
 */
export async function writeFileToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  content: Blob
): Promise<void> {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (error) {
    handlePermissionError(error, `写入文件 "${filename}"`);
  }
}
