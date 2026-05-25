import { useImageLabeler } from "./hooks/useImageLabeler";
import Toolbar from "./components/Toolbar";
import Viewport from "./components/Viewport";
import LabelList from "./components/LabelList";
import LabelModal from "./components/LabelModal";

export default function ImageLabelerPage() {
  const {
    // refs
    imageRef, viewportRef,
    // state
    imagePath, imageUrl, labels, zoom, pan, naturalSize,
    modalOpen, labelText, editingId, pendingX, pendingY,
    // actions
    pickImage, saveLabels, resetView, clearAll,
    confirmLabel, deleteLabel, editLabel,
    // viewport handlers
    handleWheel, handleViewportMouseDown, handleViewportMouseMove,
    handleViewportMouseUp, handleViewportClick,
    // label handlers
    startDrag, handleContextMenu,
    handleImageLoad,
    // setters
    setModalOpen,
    setLabelText,
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
      />
      <Viewport
        imageUrl={imageUrl}
        naturalSize={naturalSize}
        zoom={zoom}
        pan={pan}
        labels={labels}
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
        editLabel={editLabel}
        deleteLabel={deleteLabel}
      />
      <LabelModal
        modalOpen={modalOpen}
        pendingX={pendingX}
        pendingY={pendingY}
        labelText={labelText}
        editingId={editingId}
        confirmLabel={confirmLabel}
        setModalOpen={setModalOpen}
        setLabelText={setLabelText}
      />
    </div>
  );
}
