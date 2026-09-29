use serde::Serialize;
use std::fs;
use std::path::PathBuf;

// フロントエンド（React）に渡すファイル情報の構造体（JavaのDTOやクラスに相当）
#[derive(Serialize)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub extension: Option<String>,
}

// Reactから呼び出せるTauriコマンド
#[tauri::command]
fn get_directory_items(target_path: Option<String>) -> Result<Vec<FileItem>, String> {
    // パスが指定されていなければ、Windowsのユーザーホーム（例: C:\Users\ユーザー名）を取得
    let dir = match target_path {
        Some(p) => PathBuf::from(p),
        None => dirs::home_dir().unwrap_or_else(|| PathBuf::from("C:\\")),
    };

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut items = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue, // アクセス権限がないファイル等はスキップ
        };

        let is_dir = metadata.is_dir();
        let name = entry.file_name().to_string_lossy().to_string();

        // 隠しファイル（ドット始まりなど）は初期フェーズでは除外
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

// ファイルまたはフォルダをWindowsの既定アプリで開くコマンド
#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000; // 黒いコンソール画面を出さずに起動
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // open_path を追加
        .invoke_handler(tauri::generate_handler![get_directory_items, open_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}