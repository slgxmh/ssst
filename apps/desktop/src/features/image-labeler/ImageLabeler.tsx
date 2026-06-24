import { useImageLabeler } from "./hooks/useImageLabeler";
import Toolbar from "./components/Toolbar";
import Viewport from "./components/Viewport";
import LabelList from "./components/LabelList";
import CropModal from "./components/CropModal";
import { selectDirectory as selectDirectoryFromFS } from "./utils/fileSystem";

export default function ImageLabeler() {
  const {
    // state
    imagePath, imageUrl, labels, zoom, pan, naturalSize,
    categories, currentCategoryId,
    // actions
    selectDirectory, saveLabels, resetView, clearAll,
    deleteLabel, editLabel,
    // viewport handlers
    handleWheel, handleViewportMouseDown, handleViewportMouseMove,
    handleViewportMouseUp, handleViewportClick,
    // label handlers
    startDrag, handleContextMenu,
    handleImageLoad, fitToViewport,
    // category actions
    addCategory, removeCategory, editCategory, setCurrentCategoryId,
    // crop export
    cropModalOpen, setCropModalOpen,
    cropConfig, setCropConfig,
    showCropGrid, setShowCropGrid,
    exportCrops,
    imageList, currentImageIndex, loadImageByIndex,
  } = useImageLabeler();

  async function handleExportCrops(config: { tileWidth: number; tileHeight: number; overlap: number }) {
    const dirPath = await selectDirectoryFromFS();
    return exportCrops(config, dirPath);
  }

  return (
    <div class="flex h-screen bg-base-200 text-base-content select-none">
      {/* 左侧：已标注列表 */}
      <LabelList
        labels={labels}
        categories={categories}
        editLabel={editLabel}
        deleteLabel={deleteLabel}
      />
      {/* 右侧主区域：工具栏 + 视口 */}
      <div class="flex flex-col flex-1 min-w-0">
        <Toolbar
          imagePath={imagePath}
          zoom={zoom}
          imageList={imageList}
          currentImageIndex={currentImageIndex}
          onSelectImage={loadImageByIndex}
          onSelectDirectory={selectDirectory}
          saveLabels={saveLabels}
          categories={categories}
          currentCategoryId={currentCategoryId}
          setCurrentCategoryId={setCurrentCategoryId}
          addCategory={addCategory}
          removeCategory={removeCategory}
          editCategory={editCategory}
        />
        <Viewport
          imageUrl={imageUrl}
          naturalSize={naturalSize}
          zoom={zoom}
          pan={pan}
          labels={labels}
          categories={categories}
          handleWheel={handleWheel}
          handleViewportMouseDown={handleViewportMouseDown}
          handleViewportMouseMove={handleViewportMouseMove}
          handleViewportMouseUp={handleViewportMouseUp}
          handleViewportClick={handleViewportClick}
          startDrag={startDrag}
          handleContextMenu={handleContextMenu}
          handleImageLoad={handleImageLoad}
          fitToViewport={fitToViewport}
          resetView={resetView}
          clearAll={clearAll}
          onOpenCropModal={() => setCropModalOpen(true)}
          cropConfig={cropConfig}
          showCropGrid={showCropGrid}
        />
        <CropModal
          open={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setCropConfig(null);
            setShowCropGrid(false);
          }}
          onExport={handleExportCrops}
          onConfigChange={setCropConfig}
          onPreviewChange={setShowCropGrid}
          naturalSize={naturalSize}
        />
      </div>
    </div>
  );
}
