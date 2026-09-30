use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[derive(Serialize)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub extension: Option<String>,
}

// 監視インスタンスを保持するグローバルステート
pub struct WatcherState {
    pub watcher: Mutex<Option<RecommendedWatcher>>,
}

#[tauri::command]
fn get_directory_items(target_path: Option<String>) -> Result<Vec<FileItem>, String> {
    let dir = match target_path {
        Some(p) if !p.is_empty() => PathBuf::from(p),
        _ => dirs::home_dir().unwrap_or_else(|| PathBuf::from("C:\\")),
    };

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut items = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let is_dir = metadata.is_dir();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') {
            continue;
        }

        let extension = if is_dir {
            None
        } else {
            path.extension().map(|e| e.to_string_lossy().to_string())
        };

        items.push(FileItem {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            size: if is_dir { 0 } else { metadata.len() },
            extension,
        });
    }

    Ok(items)
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_terminal(path: Option<String>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let dir = match path {
            Some(p) if !p.is_empty() => PathBuf::from(p),
            _ => dirs::home_dir().unwrap_or_else(|| PathBuf::from("C:\\")),
        };

        Command::new("cmd")
            .args(["/C", "start", "powershell", "-NoExit"])
            .current_dir(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn create_directory(parent_path: String, name: String) -> Result<(), String> {
    let mut target = PathBuf::from(parent_path);
    target.push(name);
    fs::create_dir(&target).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_file(parent_path: String, name: String) -> Result<(), String> {
    let mut target = PathBuf::from(parent_path);
    target.push(name);
    fs::write(&target, "").map_err(|e| e.to_string())
}

#[tauri::command]
fn move_to_trash(path: String) -> Result<(), String> {
    trash::delete(PathBuf::from(path)).map_err(|e| e.to_string())
}

// 指定したフォルダの変更をリアルタイム監視するコマンド
#[tauri::command]
fn start_watching(app: AppHandle, state: State<'_, WatcherState>, path: String) -> Result<(), String> {
    let mut watcher_lock = state.watcher.lock().map_err(|e| e.to_string())?;

    let app_handle = app.clone();
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                // ファイルの作成、削除、リネーム等の変更を検知
                if event.kind.is_create() || event.kind.is_remove() || event.kind.is_modify() {
                    let _ = app_handle.emit("dir-changed", ());
                }
            }
        },
        notify::Config::default(),
    ).map_err(|e| e.to_string())?;

    let target_path = PathBuf::from(&path);
    if target_path.exists() {
        // 現在のディレクトリ直下のみを監視（NonRecursiveで負荷を最小化）
        watcher.watch(&target_path, RecursiveMode::NonRecursive).map_err(|e| e.to_string())?;
        *watcher_lock = Some(watcher);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WatcherState {
            watcher: Mutex::new(None),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_directory_items,
            open_path,
            open_terminal,
            create_directory,
            create_file,
            move_to_trash,
            start_watching
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}