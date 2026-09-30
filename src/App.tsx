import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Grid, Billboard } from "@react-three/drei";
import { Folder, FileText, ArrowUp, ExternalLink, ChevronRight, Home, Terminal } from "lucide-react";
import "./App.css";

interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  extension?: string;
}

// 拡張子に応じたブロックの配色
function getBlockColor(item: FileItem): string {
  if (item.is_dir) return "#4f46e5"; // フォルダ：インディゴ
  const ext = item.extension?.toLowerCase();
  switch (ext) {
    case "txt":
    case "md":
    case "log":
      return "#38bdf8"; // テキスト：スカイブルー
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return "#facc15"; // 画像：イエロー
    case "mp4":
    case "mov":
    case "mp3":
    case "wav":
      return "#c084fc"; // メディア：パープル
    case "pdf":
      return "#fb7185"; // PDF：ローズ
    case "zip":
    case "rar":
    case "7z":
      return "#f97316"; // 圧縮：オレンジ
    case "exe":
    case "msi":
      return "#ef4444"; // 実行ファイル：レッド
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "rs":
    case "java":
    case "py":
      return "#34d399"; // ソースコード：エメラルド
    default:
      return "#94a3b8"; // その他：グレー
  }
}

// [A1] 関連付けアプリの情報を判定する関数
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
      return { appName: "フォト", icon: "🖼️", badgeColor: "#d97706" };
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

// 3Dブロック＆ミニ看板コンポーネント
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
      {/* 建物 / アイテムブロック本体 */}
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

      {/* 看板の支柱（ポール） */}
      <mesh position={[0, height + 0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* 常にカメラの視点方向を向く看板（Billboard） */}
      <Billboard position={[0, height + 0.65, 0]} follow={true}>
        {/* 看板背景プレート */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[2.2, 0.7]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.88} />
        </mesh>

        {/* [A1] 関連付けアプリバッジ（上段） */}
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

        {/* ファイル名（下段・アウトライン付きでくっきり） */}
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

  // 指定パスのファイル一覧を取得
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
      console.error("ディレクトリの読み込みに失敗しました:", err);
    }
  }

  useEffect(() => {
    loadDirectory(null);
  }, []);

  // ターミナル起動
  async function handleOpenTerminal() {
    try {
      await invoke("open_terminal", { path: currentPath || null });
    } catch (err) {
      console.error("ターミナル起動エラー:", err);
    }
  }

  // Ctrl + T ショートカット
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        handleOpenTerminal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPath]);

  // アイテム起動（フォルダなら中へ、ファイルなら開く）
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

  // 1つ上へ戻る
  function handleGoUp() {
    if (!currentPath || !currentPath.includes("\\")) return;
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf("\\"));
    loadDirectory(parentPath.includes("\\") ? parentPath : parentPath + "\\");
  }

  // パンくずクリック
  function handleBreadcrumbClick(index: number, segments: string[]) {
    const target = segments.slice(0, index + 1).join("\\");
    loadDirectory(target.includes("\\") ? target : target + "\\");
  }

  const pathSegments = currentPath ? currentPath.split("\\").filter(Boolean) : [];
  const COLS = 5;
  const SPACING = 2.8; // 看板が重ならないよう少し間隔を広げました

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
              {getAppInfo(selectedItem).icon} {getAppInfo(selectedItem).appName}で起動
            </span>
            <button
              className="open-btn"
              onClick={() => handleOpenItem(selectedItem)}
            >
              <ExternalLink size={14} />
              {selectedItem.is_dir ? "中に入る" : "ファイルを開く"}
            </button>
            <span className="file-path">{selectedItem.path}</span>
          </div>
        ) : (
          <span className="hint-text">
            💡 街を回転させても看板は常に正面を向きます。ダブルクリックで起動/中に入れます
          </span>
        )}
      </footer>
    </div>
  );
}