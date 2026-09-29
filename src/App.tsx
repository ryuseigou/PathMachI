import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Grid } from "@react-three/drei";
import { Folder, FileText, ArrowUp, ExternalLink, ChevronRight, Home } from "lucide-react";
import "./App.css";

interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  extension?: string;
}

function getBlockColor(item: FileItem): string {
  if (item.is_dir) return "#4f46e5"; // フォルダ：インディゴ
  const ext = item.extension?.toLowerCase();
  switch (ext) {
    case "txt":
    case "md":
    case "pdf":
    case "docx":
      return "#38bdf8"; // ドキュメント：スカイブルー
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
      return "#facc15"; // 画像：イエロー
    case "mp4":
    case "mov":
    case "mp3":
      return "#c084fc"; // メディア：パープル
    case "zip":
    case "rar":
    case "7z":
      return "#f97316"; // 圧縮：オレンジ
    case "exe":
    case "msi":
      return "#ef4444"; // 実行ファイル：レッド
    default:
      return "#94a3b8"; // その他：スレートグレー
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

      <Text
        position={[0, height + 0.3, 0]}
        fontSize={0.25}
        color="#1e293b"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.0}
      >
        {item.name.length > 12 ? item.name.slice(0, 10) + "…" : item.name}
      </Text>
    </group>
  );
}

export default function App() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");

  // 指定パスのファイル一覧を取得する関数
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

  // 初期ロード（ホームディレクトリ）
  useEffect(() => {
    loadDirectory(null);
  }, []);

  // アイテムを開く（フォルダなら階層移動、ファイルなら既定アプリ起動）
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

  // 1つ上の階層へ移動
  function handleGoUp() {
    if (!currentPath || !currentPath.includes("\\")) return;
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf("\\"));
    // C:\ などのルートで止める
    loadDirectory(parentPath.includes("\\") ? parentPath : parentPath + "\\");
  }

  // パンくずリスト用のパスクリック
  function handleBreadcrumbClick(index: number, segments: string[]) {
    const target = segments.slice(0, index + 1).join("\\");
    loadDirectory(target.includes("\\") ? target : target + "\\");
  }

  const pathSegments = currentPath ? currentPath.split("\\").filter(Boolean) : [];
  const COLS = 5;
  const SPACING = 2.5;

  return (
    <div className="app-container">
      {/* 上部ヘッダー：ナビゲーション ＆ パンくずリスト */}
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

        <span className="count-badge">{items.length} 件</span>
      </header>

      {/* 3D 街ビュー */}
      <div className="canvas-wrapper">
        <Canvas camera={{ position: [8, 12, 14], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 20, 15]} intensity={1.2} />

          <Grid
            args={[40, 40]}
            cellSize={SPACING}
            cellColor="#cbd5e1"
            sectionSize={SPACING * 2}
            sectionColor="#94a3b8"
            fadeDistance={30}
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
            💡 ダブルクリックで「フォルダに入る」または「ファイルを開く」ことができます
          </span>
        )}
      </footer>
    </div>
  );
}