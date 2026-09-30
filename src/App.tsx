import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Grid, Billboard } from "@react-three/drei";
import {
  Folder,
  FileText,
  ArrowUp,
  ExternalLink,
  ChevronRight,
  Home,
  Terminal,
  FolderPlus,
  FilePlus,
  Trash2,
} from "lucide-react";
import "./App.css";

interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  extension?: string;
}

function getBlockColor(item: FileItem): string {
  if (item.is_dir) return "#4f46e5";
  const ext = item.extension?.toLowerCase();
  switch (ext) {
    case "txt":
    case "md":
    case "log":
      return "#38bdf8";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return "#facc15";
    case "mp4":
    case "mov":
    case "mp3":
    case "wav":
      return "#c084fc";
    case "pdf":
      return "#fb7185";
    case "zip":
    case "rar":
    case "7z":
      return "#f97316";
    case "exe":
    case "msi":
      return "#ef4444";
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "rs":
    case "java":
    case "py":
      return "#34d399";
    default:
      return "#94a3b8";
  }
}

function getAppInfo(item: FileItem): { appName: string; icon: string; badgeColor: string } {
  if (item.is_dir) {
    return { appName: "エクスプローラー", icon: "📁", badgeColor: "#4338ca" };
  }
  const ext = item.extension?.toLowerCase();
  switch (ext) {
    case "txt":
    case "log":
      return { appName: "メモ帳", icon: "📝", badgeColor: "#0284c7" };
    case "md":
      return { appName: "Markdown", icon: "📄", badgeColor: "#0369a1" };
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return { appName: "フォト", icon: "🖼️️", badgeColor: "#d97706" };
    case "mp4":
    case "mov":
      return { appName: "ビデオ", icon: "🎬", badgeColor: "#7c3aed" };
    case "mp3":
    case "wav":
      return { appName: "音楽", icon: "🎵", badgeColor: "#9333ea" };
    case "pdf":
      return { appName: "PDFリーダー", icon: "📕", badgeColor: "#e11d48" };
    case "zip":
    case "rar":
    case "7z":
      return { appName: "圧縮フォルダ", icon: "📦", badgeColor: "#ea580c" };
    case "exe":
    case "msi":
      return { appName: "アプリ実行", icon: "⚡", badgeColor: "#dc2626" };
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "rs":
    case "java":
    case "py":
      return { appName: "エディタ", icon: "💻", badgeColor: "#059669" };
    default:
      return { appName: ext ? `.${ext}` : "ファイル", icon: "📄", badgeColor: "#475569" };
  }
}

function BuildingBlock({
  item,
  position,
  isSelected,
  onSelect,
  onOpen,
}: {
  item: FileItem;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const color = getBlockColor(item);
  const appInfo = getAppInfo(item);

  const height = item.is_dir ? 2.0 : 0.8;
  const width = item.is_dir ? 1.4 : 1.0;
  const depth = item.is_dir ? 1.4 : 1.0;

  return (
    <group position={position}>
      <mesh
        position={[0, height / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={isSelected ? "#22c55e" : color}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[0, height + 0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      <Billboard position={[0, height + 0.65, 0]} follow={true}>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[2.2, 0.7]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.88} />
        </mesh>

        <Text
          position={[0, 0.16, 0]}
          fontSize={0.16}
          color={appInfo.badgeColor}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {`${appInfo.icon} ${appInfo.appName}`}
        </Text>

        <Text
          position={[0, -0.12, 0]}
          fontSize={0.2}
          color="#0f172a"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.0}
          outlineWidth={0.02}
          outlineColor="#ffffff"
        >
          {item.name.length > 14 ? item.name.slice(0, 12) + "…" : item.name}
        </Text>
      </Billboard>
    </group>
  );
}

export default function App() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");

  async function loadDirectory(path: string | null) {
    try {
      const fileList = await invoke<FileItem[]>("get_directory_items", {
        targetPath: path,
      });
      setItems(fileList);
      setSelectedItem(null);

      if (path) {
        setCurrentPath(path);
      } else if (fileList.length > 0) {
        const sample = fileList[0].path;
        const parent = sample.substring(0, sample.lastIndexOf("\\"));
        setCurrentPath(parent);
      }
    } catch (err) {
      console.error("ディレクトリ読み込みエラー:", err);
    }
  }

  useEffect(() => {
    loadDirectory(null);
  }, []);

  async function handleOpenTerminal() {
    try {
      await invoke("open_terminal", { path: currentPath || null });
    } catch (err) {
      console.error("ターミナル起動エラー:", err);
    }
  }

  // 新規フォルダ作成
  async function handleCreateFolder() {
    if (!currentPath) return;
    const name = window.prompt("新しいフォルダ名を入力してください:", "新しいフォルダ");
    if (!name) return;
    try {
      await invoke("create_directory", { parentPath: currentPath, name });
      await loadDirectory(currentPath);
    } catch (err) {
      alert("フォルダ作成に失敗しました: " + err);
    }
  }

  // 新規ファイル作成
  async function handleCreateFile() {
    if (!currentPath) return;
    const name = window.prompt("新しいファイル名を入力してください（拡張子付き）:", "新規テキスト.txt");
    if (!name) return;
    try {
      await invoke("create_file", { parentPath: currentPath, name });
      await loadDirectory(currentPath);
    } catch (err) {
      alert("ファイル作成に失敗しました: " + err);
    }
  }

  // ゴミ箱へ移動
  async function handleDeleteItem(item: FileItem) {
    const ok = window.confirm(`「${item.name}」をゴミ箱へ移動しますか？`);
    if (!ok) return;
    try {
      await invoke("move_to_trash", { path: item.path });
      await loadDirectory(currentPath);
    } catch (err) {
      alert("ゴミ箱への移動に失敗しました: " + err);
    }
  }

  // ショートカットキー（Ctrl + T, Delete）
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        handleOpenTerminal();
      } else if (e.key === "Delete" && selectedItem) {
        handleDeleteItem(selectedItem);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPath, selectedItem]);

  async function handleOpenItem(item: FileItem) {
    if (item.is_dir) {
      loadDirectory(item.path);
    } else {
      try {
        await invoke("open_path", { path: item.path });
      } catch (err) {
        console.error("ファイル起動エラー:", err);
      }
    }
  }

  function handleGoUp() {
    if (!currentPath || !currentPath.includes("\\")) return;
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf("\\"));
    loadDirectory(parentPath.includes("\\") ? parentPath : parentPath + "\\");
  }

  function handleBreadcrumbClick(index: number, segments: string[]) {
    const target = segments.slice(0, index + 1).join("\\");
    loadDirectory(target.includes("\\") ? target : target + "\\");
  }

  const pathSegments = currentPath ? currentPath.split("\\").filter(Boolean) : [];
  const COLS = 5;
  const SPACING = 2.8;

  return (
    <div className="app-container">
      {/* 上部ヘッダー */}
      <header className="header-bar">
        <button
          className="nav-btn"
          onClick={() => loadDirectory(null)}
          title="ホームに戻る"
        >
          <Home size={16} />
        </button>

        <button
          className="nav-btn"
          onClick={handleGoUp}
          title="1つ上の階層へ"
          disabled={pathSegments.length <= 1}
        >
          <ArrowUp size={16} />
        </button>

        <div className="breadcrumbs">
          {pathSegments.map((segment, idx) => (
            <div key={idx} className="breadcrumb-segment">
              {idx > 0 && <ChevronRight size={14} className="separator" />}
              <span
                className="segment-text"
                onClick={() => handleBreadcrumbClick(idx, pathSegments)}
              >
                {segment}
              </span>
            </div>
          ))}
        </div>

        {/* 新規作成ボタン群 */}
        <div className="action-btn-group">
          <button
            className="nav-btn action-btn"
            onClick={handleCreateFolder}
            title="新しいフォルダを作成"
          >
            <FolderPlus size={15} />
            <span>＋フォルダ</span>
          </button>
          <button
            className="nav-btn action-btn"
            onClick={handleCreateFile}
            title="新しいファイルを作成"
          >
            <FilePlus size={15} />
            <span>＋ファイル</span>
          </button>
        </div>

        <button
          className="nav-btn terminal-btn"
          onClick={handleOpenTerminal}
          title="この場所でPowerShellを開く (Ctrl + T)"
        >
          <Terminal size={15} />
          <span>ターミナル</span>
        </button>

        <span className="count-badge">{items.length} 件</span>
      </header>

      {/* 3D 街ビュー */}
      <div className="canvas-wrapper">
        <Canvas camera={{ position: [9, 14, 16], fov: 45 }}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[10, 20, 15]} intensity={1.2} />

          <Grid
            args={[50, 50]}
            cellSize={SPACING}
            cellColor="#cbd5e1"
            sectionSize={SPACING * 2}
            sectionColor="#94a3b8"
            fadeDistance={35}
          />

          {items.map((item, index) => {
            const col = index % COLS;
            const row = Math.floor(index / COLS);
            const x = (col - (COLS - 1) / 2) * SPACING;
            const z = (row - Math.floor(items.length / COLS) / 2) * SPACING;

            return (
              <BuildingBlock
                key={item.path}
                item={item}
                position={[x, 0, z]}
                isSelected={selectedItem?.path === item.path}
                onSelect={() => setSelectedItem(item)}
                onOpen={() => handleOpenItem(item)}
              />
            );
          })}

          <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} />
        </Canvas>
      </div>

      {/* 下部ステータスバー */}
      <footer className="footer-bar">
        {selectedItem ? (
          <div className="footer-content">
            {selectedItem.is_dir ? (
              <Folder size={18} className="folder-icon" />
            ) : (
              <FileText size={18} className="file-icon" />
            )}
            <span className="file-name">{selectedItem.name}</span>
            <span className="file-detail">
              {selectedItem.is_dir
                ? "フォルダ"
                : `${(selectedItem.size / 1024).toFixed(1)} KB`}
            </span>
            <span className="file-detail" style={{ color: "#0284c7", fontWeight: 500 }}>
              {getAppInfo(selectedItem).icon} {getAppInfo(selectedItem).appName}
            </span>
            <button
              className="open-btn"
              onClick={() => handleOpenItem(selectedItem)}
            >
              <ExternalLink size={14} />
              {selectedItem.is_dir ? "中に入る" : "開く"}
            </button>
            <button
              className="delete-btn"
              onClick={() => handleDeleteItem(selectedItem)}
              title="ゴミ箱へ移動 (Deleteキー)"
            >
              <Trash2 size={14} />
              ゴミ箱へ
            </button>
            <span className="file-path">{selectedItem.path}</span>
          </div>
        ) : (
          <span className="hint-text">
            💡 ブロックを選択して「Delete」キーで安全にゴミ箱へ移動できます
          </span>
        )}
      </footer>
    </div>
  );
}