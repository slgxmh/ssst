import { useImageLabeler } from "./hooks/useImageLabeler";
import Toolbar from "./components/Toolbar";
import Viewport from "./components/Viewport";
import LabelList from "./components/LabelList";

export default function ImageLabelerPage() {
  const {
    // refs
    imageRef, viewportRef,
    // state
    imagePath, imageUrl, labels, zoom, pan, naturalSize,
    categories, currentCategoryId,
    // actions
    pickImage, saveLabels, resetView, clearAll,
    deleteLabel, editLabel,
    // viewport handlers
    handleWheel, handleViewportMouseDown, handleViewportMouseMove,
    handleViewportMouseUp, handleViewportClick,
    // label handlers
    startDrag, handleContextMenu,
    handleImageLoad,
    // category actions
    addCategory, removeCategory, editCategory, setCurrentCategoryId,
  } = useImageLabeler();

  return (
    <div class="flex flex-col h-screen bg-base-200 text-base-content select-none">
      <Toolbar
        imagePath={imagePath}
        zoom={zoom}
        pickImage={pickImage}
        saveLabels={saveLabels}
        resetView={resetView}
        clearAll={clearAll}
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
        imageRef={imageRef}
        viewportRef={viewportRef}
        handleWheel={handleWheel}
        handleViewportMouseDown={handleViewportMouseDown}
        handleViewportMouseMove={handleViewportMouseMove}
        handleViewportMouseUp={handleViewportMouseUp}
        handleViewportClick={handleViewportClick}
        startDrag={startDrag}
        handleContextMenu={handleContextMenu}
        handleImageLoad={handleImageLoad}
      />
      <LabelList
        labels={labels}
        categories={categories}
        editLabel={editLabel}
        deleteLabel={deleteLabel}
      />
    </div>
  );
}
