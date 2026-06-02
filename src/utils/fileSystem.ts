import { LabelMeAnnotation } from "../features/image-labeler/types";

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
 * 使用 <input type="file"> 选择图片文件
 * 兼容性更好，适用于所有浏览器
 */
export function selectImageFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) {
        resolve(file);
      } else {
        reject(new Error("未选择任何文件"));
      }
      document.body.removeChild(input);
    });

    input.addEventListener("cancel", () => {
      reject(new Error("用户取消了文件选择"));
      document.body.removeChild(input);
    });

    document.body.appendChild(input);
    input.click();
  });
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
 * 自动在同目录下查找对应的 JSON 文件，无需手动选择
 */
export async function loadAnnotationFile(
  imageFile: File
): Promise<LabelMeAnnotation | null> {
  // 获取图片文件名（不含扩展名）
  const imageName = imageFile.name.replace(/\.[^/.]+$/, "");
  const jsonFileName = `${imageName}.json`;

  try {
    // 尝试使用 File System Access API 查找同目录下的 JSON 文件
    if (checkFileSystemAccessSupport()) {
      showBrowserWarning();

      const dirHandle = await window.showDirectoryPicker();

      try {
        const fileHandle = await dirHandle.getFileHandle(jsonFileName);
        const file = await fileHandle.getFile();
        const content = await file.text();
        return JSON.parse(content) as LabelMeAnnotation;
      } catch {
        return null;
      }
    }

    // 降级方案：使用 input 选择 JSON 文件
    return await loadAnnotationFileFallback(jsonFileName);
  } catch (error) {
    if (error instanceof Error && error.message.includes("用户取消")) {
      return null;
    }
    handlePermissionError(error, "读取标注文件");
  }
}

/**
 * 降级方案：使用 input 选择 JSON 文件
 */
function loadAnnotationFileFallback(
  _suggestedName: string
): Promise<LabelMeAnnotation | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          const content = await file.text();
          const annotation = JSON.parse(content) as LabelMeAnnotation;
          resolve(annotation);
        } catch (parseError) {
          reject(new Error("解析标注文件失败：无效的 JSON 格式"));
        }
      } else {
        resolve(null);
      }
      document.body.removeChild(input);
    });

    input.addEventListener("cancel", () => {
      resolve(null);
      document.body.removeChild(input);
    });

    document.body.appendChild(input);
    input.click();
  });
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

export async function selectImageFileWithDirectory(): Promise<{
  file: File;
  dirHandle: FileSystemDirectoryHandle | null;
}> {
  const file = await selectImageFile();

  if (checkFileSystemAccessSupport()) {
    showBrowserWarning();
    try {
      const dirHandle = await window.showDirectoryPicker();
      return { file, dirHandle };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { file, dirHandle: null };
      }
      console.warn("[FileSystem] 无法获取目录权限，将使用降级方案:", error);
      return { file, dirHandle: null };
    }
  }

  return { file, dirHandle: null };
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
