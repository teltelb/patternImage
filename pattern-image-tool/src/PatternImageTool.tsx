import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Rect } from "react-konva";
import Konva from "konva";
import { embedDPI } from "./embedDPI"; 

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getRandomRotation(): number {
  return Math.floor(Math.random() * 360);
}

const defaultPresets = [
  [9, 9, 720, 720],
  [12, 12, 1024, 1024],
  [6, 6, 480, 480],
  [10, 15, 1280, 720],
  [15, 10, 720, 1280]
];

const PatternImageTool: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const [imageList, setImageList] = useState<HTMLImageElement[]>([]);
  const [rotations, setRotations] = useState<number[][]>([]);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);
  const [rows, setRows] = useState(9);
  const [cols, setCols] = useState(9);
  const [canvasWidth, setCanvasWidth] = useState(720);
  const [canvasHeight, setCanvasHeight] = useState(720);
  const [dpi, setDpi] = useState(72);
  const [presets, setPresets] = useState<number[][]>(defaultPresets);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);

  const cellWidth = canvasWidth / cols;
  const cellHeight = canvasHeight / rows;

  const generateRandomRotations = (): number[][] => {
    const newRotations: number[][] = [];
    for (let row = 0; row < rows; row++) {
      const rowRot: number[] = [];
      for (let col = 0; col < cols; col++) {
        rowRot.push(getRandomRotation());
      }
      newRotations.push(rowRot);
    }
    return newRotations;
  };

  useEffect(() => {
    setRotations(generateRandomRotations());
  }, [rows, cols, imageList]);

  useEffect(() => {
    const stored = localStorage.getItem("pattern_presets");
    if (stored) {
      const parsed = JSON.parse(stored);
      setPresets([...defaultPresets, ...parsed]);
    }
  }, []);

  const savePreset = () => {
    const newPreset = [rows, cols, canvasWidth, canvasHeight];
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem(
      "pattern_presets",
      JSON.stringify(updated.filter(p => !defaultPresets.some(dp => JSON.stringify(dp) === JSON.stringify(p))))
    );
  };

  const deletePreset = (index: number) => {
    if (index < defaultPresets.length) return;
    const updated = presets.filter((_, i) => i !== index);
    setPresets(updated);
    localStorage.setItem(
      "pattern_presets",
      JSON.stringify(updated.filter(p => !defaultPresets.some(dp => JSON.stringify(dp) === JSON.stringify(p))))
    );
    setSelectedPresetIndex(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = await loadImage(file);
      setImageList((prev) => {
        const updated = [...prev];
        updated[index] = img;
        return updated;
      });
    }
  };

  const handleDownload = () => {
    if (stageRef.current) {
      const baseDataURL = stageRef.current.toDataURL({
        pixelRatio: 1, // 解像度を変えずに描画
      });
      const dataURLWithDPI = embedDPI(baseDataURL, dpi);
      const link = document.createElement("a");
      link.download = "pattern.png";
      link.href = dataURLWithDPI;
      link.click();
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">画像パターン生成ツール</h2>

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        {[0, 1, 2, 3].map((i) => (
          <label key={i} className="block">
            画像{i + 1}:
            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, i)} />
          </label>
        ))}
        <label className="block">行数: <input type="number" value={rows} onChange={(e) => setRows(parseInt(e.target.value))} className="border p-1 w-16" /></label>
        <label className="block">列数: <input type="number" value={cols} onChange={(e) => setCols(parseInt(e.target.value))} className="border p-1 w-16" /></label>
        <label className="block">幅(px): <input type="number" value={canvasWidth} onChange={(e) => setCanvasWidth(parseInt(e.target.value))} className="border p-1 w-20" /></label>
        <label className="block">高さ(px): <input type="number" value={canvasHeight} onChange={(e) => setCanvasHeight(parseInt(e.target.value))} className="border p-1 w-20" /></label>
        <label className="block">DPI: <input type="number" value={dpi} onChange={(e) => setDpi(parseInt(e.target.value))} className="border p-1 w-20" /></label>
        <label className="block">背景色: <input type="color" value={backgroundColor} disabled={transparent} onChange={(e) => setBackgroundColor(e.target.value)} /></label>
        <label className="block"><input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} /> 背景透過</label>
        <select value={selectedPresetIndex ?? ""} onChange={(e) => {
          const index = parseInt(e.target.value);
          const preset = presets[index];
          if (preset) {
            setRows(preset[0]);
            setCols(preset[1]);
            setCanvasWidth(preset[2]);
            setCanvasHeight(preset[3]);
            setSelectedPresetIndex(index);
          }
        }} className="border p-1">
          <option value="">プリセット選択</option>
          {presets.map((preset, index) => (
            <option key={index} value={index}>
              {preset[0]}×{preset[1]} / {preset[2]}×{preset[3]}px {index < defaultPresets.length ? "(標準)" : "(カスタム)"}
            </option>
          ))}
        </select>
        <button onClick={savePreset} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">記憶</button>
        {selectedPresetIndex != null && selectedPresetIndex >= defaultPresets.length && (
          <button onClick={() => deletePreset(selectedPresetIndex)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">削除</button>
        )}
        <button onClick={() => setRotations(generateRandomRotations())} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">回転リセット</button>
        <button onClick={handleDownload} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">PNG保存</button>
      </div>

      <Stage ref={stageRef} width={canvasWidth} height={canvasHeight} pixelRatio={dpi / 72}>
        <Layer>
          {!transparent && (<Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill={backgroundColor} />)}

          {[...Array(rows)].map((_, row) =>
            [...Array(cols)].map((_, col) => {
              const isEvenRow = row % 2 === 0;
              const isEvenCol = col % 2 === 0;
              const shouldDraw = isEvenRow === isEvenCol;
              if (!shouldDraw || imageList.length === 0) return null;
              const rowImageIndex = row % imageList.length;
              const img = imageList[rowImageIndex];
              const rotation = rotations[row]?.[col] || 0;
              if (!img) return null;
              const aspectRatio = img.width / img.height;
              let targetWidth = cellWidth;
              let targetHeight = cellHeight;
              if (aspectRatio > 1) {
                targetHeight = cellWidth / aspectRatio;
              } else {
                targetWidth = cellHeight * aspectRatio;
              }
              return (
                <KonvaImage
                  key={`${row}-${col}`}
                  image={img}
                  x={col * cellWidth + cellWidth / 2}
                  y={row * cellHeight + cellHeight / 2}
                  offsetX={targetWidth / 2}
                  offsetY={targetHeight / 2}
                  rotation={rotation}
                  width={targetWidth}
                  height={targetHeight}
                />

              );
            })
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default PatternImageTool; 