import React, { useState, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage, Rect } from "react-konva";

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
  const [imageA, setImageA] = useState<HTMLImageElement | null>(null);
  const [imageB, setImageB] = useState<HTMLImageElement | null>(null);
  const [rotations, setRotations] = useState<number[][]>([]);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [rows, setRows] = useState(9);
  const [cols, setCols] = useState(9);
  const [canvasWidth, setCanvasWidth] = useState(720);
  const [canvasHeight, setCanvasHeight] = useState(720);
  const [presets, setPresets] = useState<number[][]>(defaultPresets);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);

  const cellWidth = canvasWidth / cols;
  const cellHeight = canvasHeight / rows;

  const activeImageA = imageA || imageB;
  const activeImageB = imageB || imageA;

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
  }, [rows, cols, activeImageA, activeImageB]);

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
      JSON.stringify(
        updated.filter(
          (p) =>
            !defaultPresets.some((dp) => JSON.stringify(dp) === JSON.stringify(p))
        )
      )
    );
  };

  const deletePreset = (index: number) => {
    const isDefault = index < defaultPresets.length;
    if (isDefault) return;
    const updated = presets.filter((_, i) => i !== index);
    setPresets(updated);
    localStorage.setItem(
      "pattern_presets",
      JSON.stringify(
        updated.filter(
          (p) =>
            !defaultPresets.some((dp) => JSON.stringify(dp) === JSON.stringify(p))
        )
      )
    );
    setSelectedPresetIndex(null);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<HTMLImageElement | null>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        const img = await loadImage(file);
        setImage(img);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">画像パターン生成ツール</h2>

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <label className="flex flex-col text-sm font-medium text-gray-700">
          画像A
          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setImageA, setLoadingA)} />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700">
          画像B
          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setImageB, setLoadingB)} />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700">
          背景色
          <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700">
          行数
          <input type="number" value={rows} onChange={(e) => setRows(Number(e.target.value))} className="w-20" />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700">
          列数
          <input type="number" value={cols} onChange={(e) => setCols(Number(e.target.value))} className="w-20" />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700">
          幅(px)
          <input type="number" value={canvasWidth} onChange={(e) => setCanvasWidth(Number(e.target.value))} className="w-24" />
        </label>
        <label className="flex flex-col text-sm font-medium text-gray-700">
          高さ(px)
          <input type="number" value={canvasHeight} onChange={(e) => setCanvasHeight(Number(e.target.value))} className="w-24" />
        </label>
        <button
          onClick={() => setRotations(generateRandomRotations())}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          回転リセット
        </button>
        <button
          onClick={savePreset}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          記憶
        </button>
        <select
          onChange={(e) => {
            const index = parseInt(e.target.value);
            const [r, c, w, h] = presets[index];
            setRows(r);
            setCols(c);
            setCanvasWidth(w);
            setCanvasHeight(h);
            setSelectedPresetIndex(index);
          }}
          className="border px-2 py-1 rounded"
        >
          <option value="">プリセット選択</option>
          {presets.map(([r, c, w, h], i) => {
            const label = `${r}×${c} / ${w}×${h}px`;
            const isCustom = i >= defaultPresets.length;
            return (
              <option key={i} value={i}>
                {label} {isCustom ? "(カスタム)" : "(標準)"}
              </option>
            );
          })}
        </select>
        {selectedPresetIndex !== null && selectedPresetIndex >= defaultPresets.length && (
          <button
            onClick={() => deletePreset(selectedPresetIndex)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            削除
          </button>
        )}
      </div>

      {(loadingA || loadingB) && <div className="text-gray-500 mb-4">画像を読み込み中...</div>}

      <Stage width={canvasWidth} height={canvasHeight}>
        <Layer>
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill={backgroundColor} />

          {[...Array(rows)].map((_, row) =>
            [...Array(cols)].map((_, col) => {
              const isEvenCol = col % 2 === 0;
              const isOddRow = row % 2 === 0;

              const shouldPlaceA = isEvenCol && isOddRow;
              const shouldPlaceB = !isEvenCol && !isOddRow;

              const img = shouldPlaceA ? (imageA || imageB) : shouldPlaceB ? (imageB || imageA) : null;
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
