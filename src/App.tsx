import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Grid, Billboard } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
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
  Search,
  X,
  Compass,
  Map,
  Eye,
} from "lucide-react";
import "./App.css";

interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  extension?: string;
}

type ViewMode = "overview" | "map" | "street";

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
      return { appName: "フォト", icon: "🖼", badgeColor: "#d97706" };
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
  isSearching,
  isMatched,
  onSelect,
  onOpen,
}: {
  item: FileItem;
  position: [number, number, number];
  isSelected: boolean;
  isSearching: boolean;
  isMatched: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const color = getBlockColor(item);
  const appInfo = getAppInfo(item);

  const height = item.is_dir ? 2.4 : 1.0;
  const width = item.is_dir ? 1.6 : 1.1;
  const depth = item.is_dir ? 1.6 : 1.1;

  useFrame((state) => {
    const baseY = position[1];
    if (isSearching && isMatched && groupRef.current) {
      groupRef.current.position.y =
        baseY + Math.abs(Math.sin(state.clock.elapsedTime * 6)) * 0.4;
    } else if (groupRef.current) {
      groupRef.current.position.y = baseY;
    }
  });

  let blockColor = color;
  let opacity = 1.0;
  let transparent = false;

  if (isSearching) {
    if (isMatched) {
      blockColor = "#eab308";
    } else {
      blockColor = "#94a3b8";
      opacity = 0.2;
      transparent = true;
    }
  }

  if (isSelected) {
    blockColor = "#22c55e";
    opacity = 1.0;
    transparent = false;
  }

  return (
    <group ref={groupRef} position={position}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={blockColor}
            transparent={transparent}
            opacity={opacity}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>

        {item.is_dir ? (
          <>
            <mesh position={[0, height + 0.35, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[width * 0.85, 0.7, 4]} />
              <meshStandardMaterial
                color={isSelected ? "#16a34a" : "#312e81"}
                transparent={transparent}
                opacity={opacity}
              />
            </mesh>
            <mesh position={[0, 0.35, depth / 2 + 0.01]}>
              <planeGeometry args={[0.4, 0.7]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>
            <mesh position={[-0.4, height * 0.65, depth / 2 + 0.01]}>
              <planeGeometry args={[0.3, 0.35]} />
              <meshStandardMaterial color="#bae6fd" />
            </mesh>
            <mesh position={[0.4, height * 0.65, depth / 2 + 0.01]}>
              <planeGeometry args={[0.3, 0.35]} />
              <meshStandardMaterial color="#bae6fd" />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, 0.06, 0]}>
              <boxGeometry args={[width + 0.15, 0.12, depth + 0.15]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            <mesh position={[0, height + 0.06, 0]}>
              <boxGeometry args={[width * 0.7, 0.1, depth * 0.7]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
          </>
        )}
      </group>

      <mesh position={[0, height + (item.is_dir ? 0.9 : 0.4), 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
        <meshStandardMaterial
          color="#94a3b8"
          transparent={isSearching && !isMatched}
          opacity={isSearching && !isMatched ? 0.2 : 1.0}
        />
      </mesh>

      <Billboard position={[0, height + (item.is_dir ? 1.25 : 0.75), 0]} follow={true}>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[2.2, 0.7]} />
          <meshBasicMaterial
            color={isSearching && isMatched ? "#fef08a" : "#ffffff"}
            transparent
            opacity={isSearching && !isMatched ? 0.2 : 0.92}
          />
        </mesh>

        <Text
          position={[0, 0.16, 0]}
          fontSize={0.16}
          color={isSearching && !isMatched ? "#94a3b8" : appInfo.badgeColor}
          fillOpacity={isSearching && !isMatched ? 0.2 : 1.0}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {`${appInfo.icon} ${appInfo.appName}`}
        </Text>

        <Text
          position={[0, -0.12, 0]}
          fontSize={0.2}
          color={isSearching && !isMatched ? "#94a3b8" : "#0f172a"}
          fillOpacity={isSearching && !isMatched ? 0.2 : 1.0}
          anchorX="center"
          anchorY="middle"
          maxWidth={2.0}
          outlineWidth={0.02}
          outlineColor={isSearching && isMatched ? "#fef08a" : "#ffffff"}
        >
          {item.name.length > 14 ? item.name.slice(0, 12) + "…" : item.name}
        </Text>
      </Billboard>
    </group>
  );
}

// カメラコントローラー（地上視点の一人称首振り回転 ＆ 俯瞰OrbitControls）
function CameraRig({
  viewMode,
  controlsRef,
}: {
  viewMode: ViewMode;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, gl } = useThree();
  const targetPos = useRef<THREE.Vector3 | null>(null);
  const lookTarget = useRef<THREE.Vector3 | null>(null);
  const isAnimating = useRef(false);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // 一人称首振り用の角度（Yaw: 左右, Pitch: 上下）
  const yaw = useRef(0);
  const pitch = useRef(0);
  const isPointerDown = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // 視点切り替えボタンが押された時のアニメーション開始
  useEffect(() => {
    let pos = new THREE.Vector3(10, 15, 18);
    let look = new THREE.Vector3(0, 0, 0);

    if (viewMode === "map") {
      pos.set(0, 28, 14);
      look.set(0, 0, 0);
    } else if (viewMode === "street") {
      pos.set(0, 1.8, 8);
      look.set(0, 1.8, 0);
      yaw.current = 0; // 手前を向く
      pitch.current = 0;
    } else {
      pos.set(10, 15, 18);
      look.set(0, 0, 0);
    }

    targetPos.current = pos;
    lookTarget.current = look;
    isAnimating.current = true;
  }, [viewMode]);

  // 地上モード時のドラッグ操作（視点位置を固定した首振り回転）
  useEffect(() => {
    const dom = gl.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      if (viewMode !== "street") return;
      isPointerDown.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (viewMode !== "street" || !isPointerDown.current) return;
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      const sensitivity = 0.003;
      yaw.current -= deltaX * sensitivity;
      pitch.current -= deltaY * sensitivity;

      // 上下の首振り角を制限（真上・真下を向きすぎないようにクランプ）
      pitch.current = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, pitch.current));
    };

    const handlePointerUp = () => {
      isPointerDown.current = false;
    };

    dom.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      dom.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [viewMode, gl.domElement]);

  // 通常モード時のドラッグ開始でアニメーション解除
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      if (viewMode !== "street") {
        isAnimating.current = false;
      }
    };
    controls.addEventListener("start", handleStart);
    return () => controls.removeEventListener("start", handleStart);
  }, [controlsRef.current, viewMode]);

  // キー入力監視
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (document.activeElement?.tagName === "INPUT") return;
      keysPressed.current[e.key.toLowerCase()] = true;
    }
    function handleKeyUp(e: KeyboardEvent) {
      keysPressed.current[e.key.toLowerCase()] = false;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;

    // 1. 視点遷移アニメーション中
    if (isAnimating.current && targetPos.current && lookTarget.current) {
      camera.position.lerp(targetPos.current, 0.08);
      if (controls && viewMode !== "street") {
        controls.target.lerp(lookTarget.current, 0.08);
        controls.update();
      }
      if (camera.position.distanceTo(targetPos.current) < 0.1) {
        isAnimating.current = false;
      }
      return;
    }

    // 2. 地上モード（一人称首振り ＆ WASD歩行）
    if (viewMode === "street") {
      // 視点位置基準での回転（首振り）をカメラに反映
      const euler = new THREE.Euler(pitch.current, yaw.current, 0, "YXZ");
      camera.quaternion.setFromEuler(euler);

      if (document.activeElement?.tagName === "INPUT") return;

      const moveSpeed = 9.0 * delta;
      const keys = keysPressed.current;

      // 首を向けた水平方向（前進・後退・横歩き）
      const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
      const moveDelta = new THREE.Vector3(0, 0, 0);

      if (keys["w"] || keys["arrowup"]) {
        moveDelta.add(forward.clone().multiplyScalar(moveSpeed));
      }
      if (keys["s"] || keys["arrowdown"]) {
        moveDelta.sub(forward.clone().multiplyScalar(moveSpeed));
      }
      if (keys["d"] || keys["arrowright"]) {
        moveDelta.add(right.clone().multiplyScalar(moveSpeed));
      }
      if (keys["a"] || keys["arrowleft"]) {
        moveDelta.sub(right.clone().multiplyScalar(moveSpeed));
      }

      if (moveDelta.lengthSq() > 0) {
        camera.position.add(moveDelta);
      }
      camera.position.y = 1.8; // 目線の高さをキープ
    }
  });

  return null;
}

export default function App() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const currentPathRef = useRef<string>("");

  currentPathRef.current = currentPath;

  async function loadDirectory(path: string | null) {
    try {
      const fileList = await invoke<FileItem[]>("get_directory_items", {
        targetPath: path,
      });
      setItems(fileList);
      setSelectedItem(null);

      let resolvedPath = path;
      if (!resolvedPath && fileList.length > 0) {
        const sample = fileList[0].path;
        resolvedPath = sample.substring(0, sample.lastIndexOf("\\"));
      }

      if (resolvedPath) {
        setCurrentPath(resolvedPath);
        await invoke("start_watching", { path: resolvedPath });
      }
    } catch (err) {
      console.error("ディレクトリ読み込みエラー:", err);
    }
  }

  useEffect(() => {
    loadDirectory(null);

    const unlistenPromise = listen("dir-changed", () => {
      if (currentPathRef.current) {
        loadDirectory(currentPathRef.current);
      }
    });

    const handleFocus = () => {
      if (currentPathRef.current) {
        loadDirectory(currentPathRef.current);
      }
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  async function handleOpenTerminal() {
    try {
      await invoke("open_terminal", { path: currentPath || null });
    } catch (err) {
      console.error("ターミナル起動エラー:", err);
    }
  }

  async function handleCreateFolder() {
    if (!currentPath) return;
    const name = window.prompt("新しいフォルダ名を入力してください:", "新しいフォルダ");
    if (!name) return;
    try {
      await invoke("create_directory", { parentPath: currentPath, name });
    } catch (err) {
      alert("フォルダ作成に失敗しました: " + err);
    }
  }

  async function handleCreateFile() {
    if (!currentPath) return;
    const name = window.prompt("新しいファイル名を入力してください（拡張子付き）:", "新規テキスト.txt");
    if (!name) return;
    try {
      await invoke("create_file", { parentPath: currentPath, name });
    } catch (err) {
      alert("ファイル作成に失敗しました: " + err);
    }
  }

  async function handleDeleteItem(item: FileItem) {
    const ok = window.confirm(`「${item.name}」をゴミ箱へ移動しますか？`);
    if (!ok) return;
    try {
      await invoke("move_to_trash", { path: item.path });
    } catch (err) {
      alert("ゴミ箱への移動に失敗しました: " + err);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        handleOpenTerminal();
      } else if (e.ctrlKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setSearchQuery("");
        searchInputRef.current?.blur();
      } else if (e.key === "Delete" && selectedItem) {
        handleDeleteItem(selectedItem);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPath, selectedItem]);

  async function handleOpenItem(item: FileItem) {
    if (item.is_dir) {
      setSearchQuery("");
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
    setSearchQuery("");
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf("\\"));
    loadDirectory(parentPath.includes("\\") ? parentPath : parentPath + "\\");
  }

  function handleBreadcrumbClick(index: number, segments: string[]) {
    setSearchQuery("");
    const target = segments.slice(0, index + 1).join("\\");
    loadDirectory(target.includes("\\") ? target : target + "\\");
  }

  const pathSegments = currentPath ? currentPath.split("\\").filter(Boolean) : [];
  const COLS = 5;
  const SPACING = 3.0;

  const isSearching = searchQuery.trim().length > 0;
  const matchedItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-container">
      <header className="header-bar">
        <button
          className="nav-btn"
          onClick={() => {
            setSearchQuery("");
            loadDirectory(null);
          }}
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

        <div className="search-bar">
          <Search size={14} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="街の中を検索 (Ctrl + F)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery("")}
              title="検索クリア (Esc)"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="view-mode-group">
          <button
            className={`view-btn ${viewMode === "map" ? "active" : ""}`}
            onClick={() => setViewMode("map")}
            title="🗺️ 俯瞰モード（上空から見下ろす）"
          >
            <Map size={14} />
            <span>俯瞰</span>
          </button>
          <button
            className={`view-btn ${viewMode === "overview" ? "active" : ""}`}
            onClick={() => setViewMode("overview")}
            title="🏘️ 街並みモード（標準見晴らし）"
          >
            <Compass size={14} />
            <span>街並み</span>
          </button>
          <button
            className={`view-btn ${viewMode === "street" ? "active" : ""}`}
            onClick={() => setViewMode("street")}
            title="🚶 地上モード（ドラッグで首振り見渡し、WASDで歩行）"
          >
            <Eye size={14} />
            <span>地上</span>
          </button>
        </div>

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

        <span className="count-badge">
          {isSearching ? `${matchedItems.length} / ${items.length} 件` : `${items.length} 件`}
        </span>
      </header>

      <div className="canvas-wrapper">
        <Canvas camera={{ position: [10, 15, 18], fov: 45 }}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[12, 22, 16]} intensity={1.2} />

          <Grid
            args={[60, 60]}
            cellSize={SPACING}
            cellColor="#cbd5e1"
            sectionSize={SPACING * 2}
            sectionColor="#94a3b8"
            fadeDistance={45}
          />

          {items.map((item, index) => {
            const col = index % COLS;
            const row = Math.floor(index / COLS);
            const x = (col - (COLS - 1) / 2) * SPACING;
            const z = (row - Math.floor(items.length / COLS) / 2) * SPACING;

            const isMatched = item.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase());

            return (
              <BuildingBlock
                key={item.path}
                item={item}
                position={[x, 0, z]}
                isSelected={selectedItem?.path === item.path}
                isSearching={isSearching}
                isMatched={isMatched}
                onSelect={() => setSelectedItem(item)}
                onOpen={() => handleOpenItem(item)}
              />
            );
          })}

          {/* 地上モードの時はOrbitControlsを無効化し、自前の一人称回転を使用 */}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enabled={viewMode !== "street"}
            maxPolarAngle={Math.PI / 2.05}
          />
          <CameraRig viewMode={viewMode} controlsRef={controlsRef} />
        </Canvas>
      </div>

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
            {viewMode === "street"
              ? "🚶 地上モード: マウスドラッグで周囲を見渡し、[W][A][S][D] でその方向へ歩行移動します"
              : "💡 「地上」ボタンを押すと、一人称視点で街を見渡しながら散策できます"}
          </span>
        )}
      </footer>
    </div>
  );
}