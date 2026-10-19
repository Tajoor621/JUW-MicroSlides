export const isDesktop = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
export async function nativeCall<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}
export async function saveFile(name: string, data: Uint8Array, extension: string) {
  if (isDesktop()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      defaultPath: name,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });
    if (!path) return false;
    // The native command only writes the path selected through the dialog plugin's scope.
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    await writeFile(path, data);
    return true;
  }
  const url = URL.createObjectURL(new Blob([new Uint8Array(data)]));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
