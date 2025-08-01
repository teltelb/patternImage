// 修正：画像数に応じて行ごとに画像を切り替えるようオセロ盤配置ロジックを調整

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
    <div className="p-6 bg-white rounded-xl shadow w-full">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">画像パターン生成ツール</h2>
      <div className="flex gap-8">
        {/* Left Section */}
        <div className="w-7/12 overflow-auto">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">プリセット</h3>
            <div className="flex items-center gap-2">
              <select
                value={selectedPresetIndex ?? ""}
                onChange={(e) => {
                  const index = parseInt(e.target.value);
                  const preset = presets[index];
                  if (preset) {
                    setRows(preset[0]);
                    setCols(preset[1]);
                    setCanvasWidth(preset[2]);
                    setCanvasHeight(preset[3]);
                    setSelectedPresetIndex(index);
                  }
                }}
                className="border p-2 rounded-md"
              >
                <option value="">プリセット選択</option>
                {presets.map((preset, index) => (
                  <option key={index} value={index}>
                    {preset[0]}×{preset[1]} / {preset[2]}×{preset[3]}px {index < defaultPresets.length ? "(標準)" : "(カスタム)"}
                  </option>
                ))}
              </select>
              <button onClick={savePreset} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">記憶</button>
              {selectedPresetIndex != null && selectedPresetIndex >= defaultPresets.length && (
                <button onClick={() => deletePreset(selectedPresetIndex)} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">削除</button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <Stage ref={stageRef} width={canvasWidth} height={canvasHeight} pixelRatio={dpi / 72} className="bg-gray-200 rounded-md">
              <Layer>
                {[...Array(rows)].map((_, row) =>
                  [...Array(cols)].map((_, col) => {
                    if (imageList.length === 0) {
                      return null;
                    }

                    // Apply checkerboard pattern.
                    // "奇数行は奇数列を飛ばす" (skip odd columns in odd rows)
                    // This corresponds to a checkerboard where (row % 2) !== (col % 2).
                    const shouldDraw = (row % 2) !== (col % 2);

                    if (!shouldDraw) {
                      return null;
                    }

                    // Cycle through images based on the row number.
                    const imageIndex = row % imageList.length;
                    const imageToRender = imageList[imageIndex];

                    if (!imageToRender) {
                      return null;
                    }

                    const rotation = rotations[row]?.[col] || 0;
                    
                    // Make image fill the cell to have a uniform grid
                    const targetWidth = cellWidth;
                    const targetHeight = cellHeight;

                    return (
                      <KonvaImage
                        key={`${row}-${col}`}
                        image={imageToRender}
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
        </div>

        {/* Right Section */}
        <div className="w-5/12 flex flex-col">
          <h3 className="text-lg font-semibold mb-2 flex-shrink-0">設定</h3>
          <div className="space-y-4 flex-grow pr-2">
            {[0, 1, 2, 3].map((i) => (
              <label key={i} className="block">
                画像{i + 1}:
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, i)} className="mt-1 block w-full" />
              </label>
            ))}
            <hr />
            <label className="block">行数: <input type="number" value={rows} onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))} className="border p-2 rounded-md w-full" /></label>
            <label className="block">列数: <input type="number" value={cols} onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))} className="border p-2 rounded-md w-full" /></label>
            <label className="block">幅(px): <input type="number" value={canvasWidth} onChange={(e) => setCanvasWidth(Math.max(1, parseInt(e.target.value) || 1))} className="border p-2 rounded-md w-full" /></label>
            <label className="block">高さ(px): <input type="number" value={canvasHeight} onChange={(e) => setCanvasHeight(Math.max(1, parseInt(e.target.value) || 1))} className="border p-2 rounded-md w-full" /></label>
            <label className="block">DPI: <input type="number" value={dpi} onChange={(e) => setDpi(Math.max(1, parseInt(e.target.value) || 1))} className="border p-2 rounded-md w-full" /></label>
            
            <hr />
            <div className="flex flex-col gap-2">
              <button onClick={() => setRotations(generateRandomRotations())} className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">回転リセット</button>
              <button onClick={handleDownload} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">PNG保存</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternImageTool;
